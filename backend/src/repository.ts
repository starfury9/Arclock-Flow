import { randomUUID } from "crypto";
import { db } from "./db";
import { Commitment, Evidence, Verification } from "./types";

interface CommitmentRow {
  id: string;
  onchain_id: string | null;
  payer: string;
  recipient: string;
  verifier: string;
  amount: string;
  description: string;
  deadline: number;
  conditions: string;
  verification_method: string;
  status: string;
  created_at: string;
}

function rowToCommitment(row: CommitmentRow): Commitment {
  return {
    id: row.id,
    onchainId: row.onchain_id,
    payer: row.payer,
    recipient: row.recipient,
    verifier: row.verifier,
    amount: row.amount,
    description: row.description,
    deadline: row.deadline,
    conditions: JSON.parse(row.conditions),
    verificationMethod: row.verification_method as Commitment["verificationMethod"],
    status: row.status as Commitment["status"],
    createdAt: row.created_at,
  };
}

export function createCommitment(input: {
  payer: string;
  recipient: string;
  verifier: string;
  amount: string;
  description: string;
  deadline: number;
  conditions: string[];
  verificationMethod: Commitment["verificationMethod"];
}): Commitment {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO commitments
      (id, onchain_id, payer, recipient, verifier, amount, description, deadline, conditions, verification_method, status, created_at)
     VALUES (@id, NULL, @payer, @recipient, @verifier, @amount, @description, @deadline, @conditions, @verificationMethod, 'CREATED', @createdAt)`
  ).run({
    id,
    payer: input.payer,
    recipient: input.recipient,
    verifier: input.verifier,
    amount: input.amount,
    description: input.description,
    deadline: input.deadline,
    conditions: JSON.stringify(input.conditions),
    verificationMethod: input.verificationMethod,
    createdAt,
  });
  return getCommitment(id)!;
}

export function getCommitment(id: string): Commitment | null {
  const row = db.prepare(`SELECT * FROM commitments WHERE id = ?`).get(id) as CommitmentRow | undefined;
  return row ? rowToCommitment(row) : null;
}

export function listCommitments(): Commitment[] {
  const rows = db.prepare(`SELECT * FROM commitments ORDER BY created_at DESC`).all() as CommitmentRow[];
  return rows.map(rowToCommitment);
}

export function setCommitmentStatus(id: string, status: Commitment["status"]): void {
  db.prepare(`UPDATE commitments SET status = ? WHERE id = ?`).run(status, id);
}

export function setOnchainId(id: string, onchainId: string): void {
  db.prepare(`UPDATE commitments SET onchain_id = ? WHERE id = ?`).run(onchainId, id);
}

export function addEvidence(input: {
  commitmentId: string;
  type: Evidence["type"];
  value: string;
  contentHash?: string;
}): Evidence {
  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO evidence (id, commitment_id, type, value, content_hash, submitted_at)
     VALUES (@id, @commitmentId, @type, @value, @contentHash, @submittedAt)`
  ).run({
    id,
    commitmentId: input.commitmentId,
    type: input.type,
    value: input.value,
    contentHash: input.contentHash ?? null,
    submittedAt,
  });
  return {
    id,
    commitmentId: input.commitmentId,
    type: input.type,
    value: input.value,
    contentHash: input.contentHash ?? null,
    submittedAt,
  };
}

export function listEvidence(commitmentId: string): Evidence[] {
  const rows = db
    .prepare(`SELECT * FROM evidence WHERE commitment_id = ? ORDER BY submitted_at ASC`)
    .all(commitmentId) as any[];
  return rows.map((r) => ({
    id: r.id,
    commitmentId: r.commitment_id,
    type: r.type,
    value: r.value,
    contentHash: r.content_hash,
    submittedAt: r.submitted_at,
  }));
}

export function recordVerification(input: {
  commitmentId: string;
  result: Verification["result"];
  checks: Verification["checks"];
}): Verification {
  const id = randomUUID();
  const verifiedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO verifications (id, commitment_id, result, checks, verified_at)
     VALUES (@id, @commitmentId, @result, @checks, @verifiedAt)`
  ).run({
    id,
    commitmentId: input.commitmentId,
    result: input.result,
    checks: JSON.stringify(input.checks),
    verifiedAt,
  });
  return { id, commitmentId: input.commitmentId, result: input.result, checks: input.checks, verifiedAt };
}

export function listVerifications(commitmentId: string): Verification[] {
  const rows = db
    .prepare(`SELECT * FROM verifications WHERE commitment_id = ? ORDER BY verified_at ASC`)
    .all(commitmentId) as any[];
  return rows.map((r) => ({
    id: r.id,
    commitmentId: r.commitment_id,
    result: r.result,
    checks: JSON.parse(r.checks),
    verifiedAt: r.verified_at,
  }));
}
