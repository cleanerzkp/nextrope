import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Nextrope Escrow System...");

  // deploy the Nextrope token
  console.log("Deploying Nextrope Token...");
  const NextropeToken = await ethers.getContractFactory("NextropeToken");
  const token = await NextropeToken.deploy(18);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`Nextrope Token deployed to: ${tokenAddress}`);

  // deploy the Escrow contract with no constructor arguments
  console.log("Deploying Escrow Contract...");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`Escrow Contract deployed to: ${escrowAddress}`);

  console.log("Deployment complete!");
  console.log("--------------------");
  console.log(`Nextrope Token: ${tokenAddress}`);
  console.log(`Escrow Contract: ${escrowAddress}`);
}

// we recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 