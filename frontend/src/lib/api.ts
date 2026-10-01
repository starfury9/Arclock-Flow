const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface CommitmentDto {
  id: string;
  onchainId: string | null;
  payer: string;
  recipient: string;
  verifier: string;
  amount: string;
  description: string;
  deadline: number;
  conditions: string[];
  verificationMethod: "deterministic" | "ai" | "hybrid";
  status: string;
  createdAt: string;
}

export interface EvidenceDto {
  id: string;
  commitmentId: string;
  type: "url" | "github" | "tx_hash" | "file" | "text";
  value: string;
  contentHash: string | null;
  submittedAt: string;
}

export interface VerificationDto {
  id: string;
  commitmentId: string;
  result: "PASS" | "FAIL";
  checks: { name: string; passed: boolean; detail: string }[];
  verifiedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function listCommitments() {
  return request<{ commitments: CommitmentDto[] }>("/api/commitments");
}

export function getCommitment(id: string) {
  return request<{ commitment: CommitmentDto; evidence: EvidenceDto[]; verifications: VerificationDto[] }>(
    `/api/commitments/${id}`
  );
}

export function createCommitment(input: {
  payer: string;
  recipient: string;
  verifier?: string;
  amount: string;
  description: string;
  deadline: string;
  conditions: string[];
  verificationMethod: "deterministic" | "ai" | "hybrid";
}) {
  return request<{ commitmentId: string; status: string }>("/api/commitments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fundCommitment(id: string, onchainId: string) {
  return request<{ commitmentId: string; status: string }>(`/api/commitments/${id}/fund`, {
    method: "POST",
    body: JSON.stringify({ onchainId }),
  });
}

export function submitEvidence(
  id: string,
  input: { type: EvidenceDto["type"]; value: string; contentHash?: string }
) {
  return request<{ evidence: EvidenceDto }>(`/api/commitments/${id}/evidence`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyCommitment(id: string) {
  return request<{ verification: VerificationDto; status: string }>(`/api/commitments/${id}/verify`, {
    method: "POST",
  });
}
