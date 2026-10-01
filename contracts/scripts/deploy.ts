import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// USDC address is the same on Arc mainnet and testnet.
// https://developers.circle.com/stablecoins/usdc-contract-addresses
const ARC_USDC_ADDRESS =
  process.env.ARC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying ArcLock to network "${network.name}" from ${deployer.address}`);

  const ArcLock = await ethers.getContractFactory("ArcLock");
  const arcLock = await ArcLock.deploy(ARC_USDC_ADDRESS);
  await arcLock.waitForDeployment();

  const address = await arcLock.getAddress();
  console.log(`ArcLock deployed at: ${address}`);

  // Persist the address so other workspaces (backend/frontend) can pick it up.
  const outFile = path.resolve(__dirname, `../deployments.${network.name}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        network: network.name,
        chainId: network.config.chainId,
        arcLockAddress: address,
        usdcAddress: ARC_USDC_ADDRESS,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`Wrote deployment info to ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
