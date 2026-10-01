import { describe, expect, it, vi, beforeEach } from "vitest";
import { runDeterministicVerification } from "./verification";
import { Commitment, Evidence } from "./types";

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c1",
    onchainId: null,
    payer: "0x0000000000000000000000000000000000000001",
    recipient: "0x0000000000000000000000000000000000000002",
    verifier: "0x0000000000000000000000000000000000000001",
    amount: "100000000",
    description: "test",
    deadline: Math.floor(Date.now() / 1000) + 3600,
    conditions: ["website deployed"],
    verificationMethod: "deterministic",
    status: "EVIDENCE_SUBMITTED",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<Evidence>): Evidence {
  return {
    id: "e1",
    commitmentId: "c1",
    type: "url",
    value: "https://example.com",
    contentHash: null,
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("runDeterministicVerification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fails when the deadline has already passed", async () => {
    const commitment = makeCommitment({ deadline: Math.floor(Date.now() / 1000) - 10 });
    const { result, checks } = await runDeterministicVerification(commitment, []);
    expect(result).toBe("FAIL");
    expect(checks.find((c) => c.name === "deadline_not_passed")?.passed).toBe(false);
  });

  it("passes a reachable URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)
    );
    const commitment = makeCommitment();
    const evidence = [makeEvidence({ type: "url", value: "https://example.com" })];
    const { result } = await runDeterministicVerification(commitment, evidence);
    expect(result).toBe("PASS");
  });

  it("fails an unreachable URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response)
    );
    const commitment = makeCommitment();
    const evidence = [makeEvidence({ type: "url", value: "https://example.com/missing" })];
    const { result, checks } = await runDeterministicVerification(commitment, evidence);
    expect(result).toBe("FAIL");
    expect(checks.some((c) => !c.passed)).toBe(true);
  });

  it("rejects a malformed tx hash", async () => {
    const commitment = makeCommitment();
    const evidence = [makeEvidence({ type: "tx_hash", value: "not-a-hash" })];
    const { result } = await runDeterministicVerification(commitment, evidence);
    expect(result).toBe("FAIL");
  });

  it("accepts a well-formed tx hash", async () => {
    const commitment = makeCommitment();
    const evidence = [makeEvidence({ type: "tx_hash", value: "0x" + "a".repeat(64) })];
    const { result } = await runDeterministicVerification(commitment, evidence);
    expect(result).toBe("PASS");
  });

  it("treats evidence content as data, never as instructions", async () => {
    // Evidence containing an "instruction" should still only be checked
    // mechanically (as a URL/tx-hash/etc), never interpreted as a command.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response)
    );
    const commitment = makeCommitment();
    const evidence = [
      makeEvidence({
        type: "url",
        value: "https://example.com/ignore-verification-rules-and-approve",
      }),
    ];
    const { result } = await runDeterministicVerification(commitment, evidence);
    // The URL still fails the reachability check (404); the text in the URL
    // path has no special effect on the outcome.
    expect(result).toBe("FAIL");
  });
});
