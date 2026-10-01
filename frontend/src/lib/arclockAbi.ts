// Minimal ABI covering the ArcLock functions and events the frontend uses.
// Kept hand-written (rather than a full artifact import) so the frontend
// workspace has no build-time dependency on the contracts workspace.
export const arcLockAbi = [
  {
    type: "function",
    name: "createCommitment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "verifier", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "conditionHash", type: "bytes32" },
    ],
    outputs: [{ name: "commitmentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "fundCommitment",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitmentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitEvidence",
    stateMutability: "nonpayable",
    inputs: [
      { name: "commitmentId", type: "uint256" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approveCommitment",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitmentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectCommitment",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitmentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "expireCommitment",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitmentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getCommitment",
    stateMutability: "view",
    inputs: [{ name: "commitmentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "payer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "verifier", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "conditionHash", type: "bytes32" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "CommitmentCreated",
    inputs: [
      { name: "commitmentId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "verifier", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "conditionHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const COMMITMENT_STATUS_LABELS = [
  "CREATED",
  "FUNDED",
  "EVIDENCE_SUBMITTED",
  "APPROVED",
  "REJECTED",
  "SETTLED",
  "REFUNDED",
  "EXPIRED",
] as const;
