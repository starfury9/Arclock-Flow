import { Router } from "express";
import { z } from "zod";
import {
  addEvidence,
  createCommitment,
  getCommitment,
  listCommitments,
  listEvidence,
  listVerifications,
  recordVerification,
  setCommitmentStatus,
  setOnchainId,
} from "../repository";
import { runDeterministicVerification } from "../verification";

export const commitmentsRouter = Router();

const isEthAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

const createCommitmentSchema = z.object({
  recipient: z.string().refine(isEthAddress, "recipient must be a 0x-prefixed address"),
  verifier: z.string().refine(isEthAddress, "verifier must be a 0x-prefixed address").optional(),
  payer: z.string().refine(isEthAddress, "payer must be a 0x-prefixed address"),
  amount: z.string().min(1),
  description: z.string().min(1),
  deadline: z.union([z.string(), z.number()]),
  conditions: z.array(z.string()).default([]),
  verificationMethod: z.enum(["deterministic", "ai", "hybrid"]).default("deterministic"),
});

function toUnixSeconds(deadline: string | number): number {
  if (typeof deadline === "number") return deadline;
  const asNumber = Number(deadline);
  if (!Number.isNaN(asNumber) && String(asNumber) === deadline) return asNumber;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) throw new Error("deadline must be a unix timestamp or ISO date string");
  return Math.floor(parsed / 1000);
}

// POST /api/commitments
// Agent/human entrypoint for creating a commitment. Mirrors README section 23.
commitmentsRouter.post("/", (req, res) => {
  const parsed = createCommitmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
  }
  const input = parsed.data;

  let deadlineSeconds: number;
  try {
    deadlineSeconds = toUnixSeconds(input.deadline);
  } catch (err) {
    return res.status(400).json({ error: "invalid_deadline", message: (err as Error).message });
  }

  const commitment = createCommitment({
    payer: input.payer,
    recipient: input.recipient,
    verifier: input.verifier ?? input.payer, // defaults to payer as verifier (self-verification) if none provided
    amount: input.amount,
    description: input.description,
    deadline: deadlineSeconds,
    conditions: input.conditions,
    verificationMethod: input.verificationMethod,
  });

  res.status(201).json({ commitmentId: commitment.id, status: commitment.status });
});

// GET /api/commitments
commitmentsRouter.get("/", (_req, res) => {
  res.json({ commitments: listCommitments() });
});

// GET /api/commitments/:id
commitmentsRouter.get("/:id", (req, res) => {
  const commitment = getCommitment(req.params.id);
  if (!commitment) return res.status(404).json({ error: "not_found" });
  res.json({
    commitment,
    evidence: listEvidence(commitment.id),
    verifications: listVerifications(commitment.id),
  });
});

// POST /api/commitments/:id/fund
// Called by the frontend/agent after the on-chain fundCommitment tx confirms,
// to link the on-chain commitment id and move backend state to FUNDED.
const fundSchema = z.object({
  onchainId: z.string().min(1),
});
commitmentsRouter.post("/:id/fund", (req, res) => {
  const commitment = getCommitment(req.params.id);
  if (!commitment) return res.status(404).json({ error: "not_found" });
  const parsed = fundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });

  if (commitment.status !== "CREATED") {
    return res.status(409).json({ error: "invalid_status", status: commitment.status });
  }

  setOnchainId(commitment.id, parsed.data.onchainId);
  setCommitmentStatus(commitment.id, "FUNDED");
  res.json({ commitmentId: commitment.id, status: "FUNDED" });
});

// POST /api/commitments/:id/evidence
const evidenceSchema = z.object({
  type: z.enum(["url", "github", "tx_hash", "file", "text"]),
  value: z.string().min(1),
  contentHash: z.string().optional(),
});
commitmentsRouter.post("/:id/evidence", (req, res) => {
  const commitment = getCommitment(req.params.id);
  if (!commitment) return res.status(404).json({ error: "not_found" });
  const parsed = evidenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });

  if (commitment.status !== "FUNDED" && commitment.status !== "EVIDENCE_SUBMITTED") {
    return res.status(409).json({ error: "invalid_status", status: commitment.status });
  }

  const evidence = addEvidence({ commitmentId: commitment.id, ...parsed.data });
  setCommitmentStatus(commitment.id, "EVIDENCE_SUBMITTED");
  res.status(201).json({ evidence });
});

// POST /api/commitments/:id/verify
// Runs the deterministic verification engine against all submitted evidence.
// This endpoint only ever produces a recorded PASS/FAIL verdict - it never
// moves funds. Settlement happens on-chain via approveCommitment/
// rejectCommitment, which the frontend/agent calls after reading this result.
commitmentsRouter.post("/:id/verify", async (req, res) => {
  const commitment = getCommitment(req.params.id);
  if (!commitment) return res.status(404).json({ error: "not_found" });

  if (commitment.status !== "EVIDENCE_SUBMITTED") {
    return res.status(409).json({ error: "invalid_status", status: commitment.status });
  }

  setCommitmentStatus(commitment.id, "VERIFYING");
  const evidenceList = listEvidence(commitment.id);
  const { result, checks } = await runDeterministicVerification(commitment, evidenceList);
  const verification = recordVerification({ commitmentId: commitment.id, result, checks });
  setCommitmentStatus(commitment.id, result === "PASS" ? "APPROVED" : "REJECTED");

  res.json({ verification, status: result === "PASS" ? "APPROVED" : "REJECTED" });
});

// POST /api/commitments/:id/settled | /api/commitments/:id/refunded
// Called by the indexer/frontend after on-chain FundsReleased/FundsRefunded
// events confirm the terminal state.
commitmentsRouter.post("/:id/settled", (req, res) => {
  const commitment = getCommitment(req.params.id);
  if (!commitment) return res.status(404).json({ error: "not_found" });
  setCommitmentStatus(commitment.id, "SETTLED");
  res.json({ commitmentId: commitment.id, status: "SETTLED" });
});

commitmentsRouter.post("/:id/refunded", (req, res) => {
  const commitment = getCommitment(req.params.id);
  if (!commitment) return res.status(404).json({ error: "not_found" });
  setCommitmentStatus(commitment.id, "REFUNDED");
  res.json({ commitmentId: commitment.id, status: "REFUNDED" });
});
