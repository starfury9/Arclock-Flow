export type VerificationMethod = "deterministic" | "ai" | "hybrid";

export type CommitmentStatus =
  | "CREATED"
  | "FUNDED"
  | "EVIDENCE_SUBMITTED"
  | "VERIFYING"
  | "APPROVED"
  | "REJECTED"
  | "SETTLED"
  | "REFUNDED"
  | "EXPIRED";

export interface Commitment {
  id: string;
  onchainId: string | null;
  payer: string;
  recipient: string;
  verifier: string;
  amount: string;
  description: string;
  deadline: number; // unix seconds
  conditions: string[];
  verificationMethod: VerificationMethod;
  status: CommitmentStatus;
  createdAt: string;
}

export interface Evidence {
  id: string;
  commitmentId: string;
  type: "url" | "github" | "tx_hash" | "file" | "text";
  value: string;
  contentHash: string | null;
  submittedAt: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface Verification {
  id: string;
  commitmentId: string;
  result: "PASS" | "FAIL";
  checks: CheckResult[];
  verifiedAt: string;
}
