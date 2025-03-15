import { ethers, run } from "hardhat";

async function main() {
  console.log("Deploying Escrow Contract to Sepolia...");

  // Get the contract factory
  const Escrow = await ethers.getContractFactory("Escrow");
  
  // Deploy the Escrow contract
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  
  const escrowAddress = await escrow.getAddress();
  console.log(`Escrow Contract deployed to: ${escrowAddress}`);
  
  // Allow some time for Etherscan to index the new contract
  console.log("Waiting for 30 seconds before verification...");
  await new Promise((resolve) => setTimeout(resolve, 30000));
  
  // Verify the contract on Etherscan
  console.log("Verifying contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: escrowAddress,
      contract: "contracts/Escrow.sol:Escrow"
      // No constructor arguments needed
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
  
  console.log("Deployment complete!");
  console.log("--------------------");
  console.log(`Escrow Contract: ${escrowAddress}`);
  
  // Print info about testing with existing tokens on Sepolia
  console.log("\nTo test with tokens on Sepolia testnet:");
  console.log("1. You can use these token addresses:");
  console.log("   - Sepolia USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
  console.log("   - Or use the zero address (0x0000000000000000000000000000000000000000) for ETH");
  console.log("2. Use that token address when creating escrow deals");
}

// we recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 