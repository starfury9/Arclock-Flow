import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

// Arc enforces a 20 Gwei minimum maxFeePerGas; transactions below this are
// silently dropped by the mempool. See:
// https://docs.arc.io/arc/references/evm-differences
const ARC_MIN_GAS_PRICE = 20_000_000_000; // 20 Gwei in wei

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arcMainnet: {
      url: process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io",
      chainId: Number(process.env.ARC_MAINNET_CHAIN_ID || 5042),
      accounts,
      gasPrice: ARC_MIN_GAS_PRICE,
    },
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io",
      chainId: Number(process.env.ARC_TESTNET_CHAIN_ID || 5042002),
      accounts,
      gasPrice: ARC_MIN_GAS_PRICE,
    },
  },
};

export default config;
