import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Escrow Contract", function () {
  // Define a fixture to reuse the same setup in every test
  async function deployEscrowFixture() {
    // Get signers
    const [deployer, buyer, seller, otherAccount] = await ethers.getSigners();
    
    // One of the hardcoded arbiter addresses from the contract
    const arbiterAddress = "0xcd3B766CCDd6AE721141F452C550Ca635964ce71";
    
    // Deploy the Escrow contract
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    
    // Deploy the test token for ERC20 tests
    const NextropeToken = await ethers.getContractFactory("NextropeToken");
    const token = await NextropeToken.deploy(18);
    
    // Mint some tokens to the buyer for testing
    const mintAmount = ethers.parseEther("1000");
    await token.mint(buyer.address, mintAmount);
    
    // Approve the escrow contract to spend tokens
    const escrowAddress = await escrow.getAddress();
    await token.connect(buyer).approve(escrowAddress, mintAmount);
    
    return { 
      escrow, 
      token, 
      deployer,
      buyer, 
      seller, 
      arbiterAddress,
      otherAccount
    };
  }
  
  describe("Deployment", function () {
    it("Should initialize with nextDealId = 0", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(await escrow.nextDealId()).to.equal(0);
    });
  });
  
  describe("Create Deal", function () {
    it("Should create a new deal with ETH", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = ethers.parseEther("1");
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      
      // Create a new deal
      const tx = await escrow.connect(buyer).createDeal(
        seller.address,
        arbiterAddress,
        zeroAddress, // ETH
        dealAmount
      );
      
      await tx.wait();
      
      // Check that the nextDealId was incremented
      expect(await escrow.nextDealId()).to.equal(1);
      
      // Check the deal details
      const deal = await escrow.getDeal(0);
      expect(deal[0]).to.equal(buyer.address); // buyer
      expect(deal[1]).to.equal(seller.address); // seller
      expect(deal[2]).to.equal(arbiterAddress); // arbiter
      expect(deal[3]).to.equal(zeroAddress); // tokenAddress
      expect(deal[4]).to.equal(dealAmount); // amount
      expect(deal[5]).to.equal(0); // State.AWAITING_PAYMENT
    });
  });
  
  // Add more test cases as needed...
}); 