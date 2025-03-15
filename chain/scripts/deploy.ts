import hre from "hardhat";

async function main() {
  console.log("Deploying Nextrope Escrow System...");

  // deploy the Nextrope token
  console.log("Deploying Nextrope Token...");
  const token = await hre.viem.deployContract("NextropeToken", [18]);
  console.log(`Nextrope Token deployed to: ${token.address}`);

  // deploy the Escrow contract with no constructor arguments
  console.log("Deploying Escrow Contract...");
  const escrow = await hre.viem.deployContract("Escrow");
  console.log(`Escrow Contract deployed to: ${escrow.address}`);

  console.log("Deployment complete!");
  console.log("--------------------");
  console.log(`Nextrope Token: ${token.address}`);
  console.log(`Escrow Contract: ${escrow.address}`);
}

// we recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 