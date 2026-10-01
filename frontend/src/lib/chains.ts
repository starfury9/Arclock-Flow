import { arc, arcTestnet } from "viem/chains";

export const activeNetwork = (process.env.NEXT_PUBLIC_ARC_NETWORK || "testnet") as
  | "mainnet"
  | "testnet";

export const activeChain = activeNetwork === "mainnet" ? arc : arcTestnet;

export const ARC_EXPLORER_URL =
  activeNetwork === "mainnet" ? "https://explorer.arc.io" : "https://explorer.testnet.arc.io";

// USDC on Arc is the same address on mainnet and testnet.
// https://developers.circle.com/stablecoins/usdc-contract-addresses
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

// USDC's ERC-20 view on Arc uses 6 decimals (native coin view uses 18).
// https://docs.arc.io/arc/references/evm-differences
export const USDC_DECIMALS = 6;

export const ARCLOCK_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARCLOCK_CONTRACT_ADDRESS ||
  "") as `0x${string}`;
