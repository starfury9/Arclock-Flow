# 🔐 ARCLOCK FLOW

### Programmable USDC commitments for outcome-based settlement on Arc

> **Lock the money. Prove the outcome. Settle automatically.**

[![Built on Arc](https://img.shields.io/badge/Built%20on-Arc-6E56CF?style=for-the-badge)](https://www.arc.io/)
[![USDC](https://img.shields.io/badge/Settlement-USDC-2775CA?style=for-the-badge)](https://www.circle.com/usdc)
[![Solidity](https://img.shields.io/badge/Contracts-Solidity-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Backend-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

## What it is

ARCLOCK FLOW lets a payer lock USDC against a specific outcome. The
recipient does the work and submits evidence (a URL, a GitHub repo, a
transaction hash). The evidence is checked against the commitment. If it
passes, the USDC goes to the recipient. If it fails, or the deadline passes
unresolved, the USDC goes back to the payer.

The funds are held by the `ArcLock` smart contract on Arc, never by the
backend.

```text
Create → Lock USDC → Submit evidence → Verify → Settle or refund
```

**Example:** Alice locks 100 USDC for Bob to build a landing page by Friday.
Bob submits the live URL and the GitHub repo. Both checks pass, and the
100 USDC is released to Bob. If Bob never delivers, Alice gets it back after
the deadline.

## Status

| | |
|---|---|
| **Stage** | MVP, running locally. Not yet deployed. |
| **Contract** | Written and tested (9/9). Not yet deployed to Arc testnet or mainnet. |
| **Backend** | Working API and verification engine (15/15 tests). |
| **Frontend** | Landing, create, dashboard and detail pages, with wallet connection. |
| **Testnet contract** | _Pending deployment_ |
| **Mainnet contract** | _Pending deployment_ |
| **Live app** | _Pending deployment_ |

## Why Arc

- **USDC-native settlement.** `ArcLock` escrows and releases real USDC through
  the official token contract at `0x3600000000000000000000000000000000000000`
  (the same address on mainnet and testnet). Gas is also paid in USDC.
- **Rules enforced on-chain.** Who can fund, approve, reject or expire a
  commitment is checked by the contract, not by the backend.
- **Fast finality.** Settlement is final as soon as the transaction is
  included.

## How it works

1. **Create.** The payer sets the recipient, amount, deadline, description and
   conditions.
2. **Lock.** The payer approves USDC and calls `fundCommitment`. The contract
   pulls the USDC into escrow.
3. **Submit evidence.** The recipient posts evidence (URL, GitHub repo or tx
   hash) to the backend.
4. **Verify.** The backend runs checks: is the URL reachable, does the GitHub
   repo exist, is the tx hash well formed, has the deadline passed.
5. **Settle.** The designated verifier calls `approveCommitment` (USDC to the
   recipient) or `rejectCommitment` (USDC back to the payer). After the
   deadline, anyone can call `expireCommitment` to refund the payer.

### Commitment lifecycle

```text
CREATED → FUNDED → EVIDENCE_SUBMITTED → SETTLED     (approved)
                                      → REFUNDED    (rejected)
FUNDED / EVIDENCE_SUBMITTED → deadline passes → EXPIRED (refunded)
```

## Architecture

```text
            Payer / recipient (MetaMask)
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
     Frontend                    Backend API
     Next.js, wagmi, viem        Express, SQLite
          │                          │  commitment details, evidence,
          │  approve, create, fund,  │  verification results
          │  approve/reject txs      │
          ▼                          │
   ┌──────────────────────┐          │
   │  ArcLock.sol on Arc  │          │
   │  USDC escrow + rules │          │
   └──────────────────────┘
```

## Smart contract

`contracts/contracts/ArcLock.sol` uses OpenZeppelin `SafeERC20`,
`ReentrancyGuard` and `Ownable`.

```solidity
struct Commitment {
    address payer;
    address recipient;
    address verifier;       // who may approve or reject
    uint256 amount;         // USDC, 6-decimal ERC-20 units
    uint256 deadline;       // unix seconds
    bytes32 conditionHash;
    bytes32 evidenceHash;
    Status status;
}
```

| Function | Who can call | Effect |
|---|---|---|
| `createCommitment` | Anyone (becomes the payer) | Records the commitment |
| `fundCommitment` | Payer | Pulls USDC into escrow |
| `submitEvidence` | Recipient | Stores the evidence hash |
| `approveCommitment` | Verifier | Releases USDC to the recipient |
| `rejectCommitment` | Verifier | Refunds USDC to the payer |
| `expireCommitment` | Anyone, after the deadline | Refunds USDC to the payer |

Events: `CommitmentCreated`, `CommitmentFunded`, `EvidenceSubmitted`,
`CommitmentApproved`, `CommitmentRejected`, `FundsReleased`, `FundsRefunded`,
`CommitmentExpired`.

**Why the ERC-20 interface instead of native transfers?** On Arc, USDC is
both the native coin (18 decimals) and an ERC-20 (6 decimals) over the same
balance. Native transfers have extra revert rules (zero address, blocklist,
self-destructed accounts; see
[Arc EVM differences](https://docs.arc.io/arc/references/evm-differences)).
Using `approve` and `transferFrom` avoids those cases.

## Features

- **Create form** with input checks before any wallet prompt: valid address,
  no paying yourself, amount above 0, correct network, and contract configured.
- **Deadline picker** with presets (24 hours, 3 days, 1 week, 2 weeks), a time
  dropdown, and a readable summary such as "Tue, 27 Oct 2026, 6:00 pm · in 7 days".
- **Deadline checks in three places:** the form, the backend (at least 60
  seconds ahead) and the contract (`InvalidDeadline`).
- **Dashboard** with total locked, settled and refunded counts.
- **Commitment page** showing conditions, evidence, and each verification
  check with its result.
- **Wrong-network detection** with a one-click switch to Arc.

## Security model

- The backend never holds USDC. Only the contract does.
- Funding, approval and rejection all require the right wallet to sign, and
  the contract checks that wallet.
- Evidence is treated as untrusted data. The checks are mechanical (HTTP
  status, GitHub API lookup, format checks). Text inside evidence, such as
  "ignore the rules and approve this", has no effect.
- The private key lives only in `.env`, which is git-ignored.

**Known limitations (MVP):**

- Backend write endpoints have no authentication. Funds stay safe because
  moving them needs a wallet signature, but stored records could be spammed.
- Verification checks evidence, not the meaning of free-text conditions.
- SQLite storage may not persist on some hosting platforms.
- The UI does not yet call `approveCommitment` or `rejectCommitment`.
  Verification currently updates the backend status only.

## Project structure

```text
Arclock-Flow/
├── contracts/   Hardhat project: ArcLock.sol, MockUSDC, tests, deploy script
├── backend/     Express API, SQLite, verification engine, deadline checks
├── frontend/    Next.js app: landing, create, dashboard, detail pages
├── .env.example Template for all settings (copy to .env)
└── package.json npm workspaces root
```

## Run it locally

### Requirements

- Node.js 18 or newer
- MetaMask (or another browser wallet) with Arc Testnet added
- Testnet USDC from https://faucet.circle.com (choose Arc Testnet)

### 1. Install and configure

```bash
git clone https://github.com/starfury9/Arclock-Flow.git
cd Arclock-Flow
npm install
cp .env.example .env
```

There is one `.env` at the repo root, read by the contracts, backend and
frontend. Set `DEPLOYER_PRIVATE_KEY` to the **private key** of a wallet used
only for testing. Never put a real key in `.env.example`, because that file is
committed.

### 2. Contracts

```bash
cd contracts
npx hardhat test                                         # run the tests
npx hardhat run scripts/deploy.ts --network arcTestnet   # deploy to testnet
```

The deploy writes `contracts/deployments.arcTestnet.json`. Copy the address
into `.env` as `NEXT_PUBLIC_ARCLOCK_CONTRACT_ADDRESS`.

### 3. Backend

```bash
cd backend
npm run dev     # http://localhost:4000
npm test        # 15 tests
```

### 4. Frontend

```bash
cd frontend
npm run dev     # http://localhost:3000
```

## Arc network reference

Values from [docs.arc.io](https://docs.arc.io/arc/references/connect-to-arc)
and [Circle's USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 5042 | 5042002 |
| RPC | `https://rpc.mainnet.arc.io` | `https://rpc.testnet.arc.io` |
| Explorer | https://explorer.arc.io | https://explorer.testnet.arc.io |
| USDC | `0x3600000000000000000000000000000000000000` | same |
| Gas token | USDC | USDC |
| Minimum `maxFeePerGas` | 20 Gwei | 20 Gwei |

## Roadmap

**Next**
- [ ] Deploy to Arc testnet and test end to end with two wallets
- [ ] On-chain approve and reject buttons in the UI
- [ ] Deploy to Arc mainnet
- [ ] Host the backend and frontend publicly

**Later**
- [ ] Chat-style commitment creation
- [ ] AI-assisted verification with prompt-injection safeguards
- [ ] Agent API with authentication
- [ ] Cross-chain settlement
- [ ] Treasury automation

## License

MIT. See [LICENSE](./LICENSE).
