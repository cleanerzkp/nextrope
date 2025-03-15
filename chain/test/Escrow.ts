import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, getAddress, zeroAddress } from "viem";

describe("Escrow Contract", function () {
  // define a fixture to reuse the same setup in every test
  async function deployEscrowFixture() {
    // get wallet clients
    const [buyer, seller, otherAccount] = await hre.viem.getWalletClients();
    
    // get public client for balance checks
    const publicClient = await hre.viem.getPublicClient();
    
    // one of the hardcoded arbiter addresses from the contract
    const arbiterAddress = "0xcd3B766CCDd6AE721141F452C550Ca635964ce71" as `0x${string}`;
    
    // deploy the Escrow contract
    const escrow = await hre.viem.deployContract("Escrow");
    
    // deploy the Nextrope token for testing
    const token = await hre.viem.deployContract("NextropeToken", [18]);
    
    // mint some tokens to the buyer for testing
    const mintAmount = parseEther("1000");
    await token.write.mint([getAddress(buyer.account.address), mintAmount]);
    
    // approve the escrow contract to spend tokens
    await token.write.approve([escrow.address, mintAmount], { account: buyer.account });
    
    return { 
      escrow, 
      token, 
      buyer, 
      seller, 
      arbiterAddress,
      otherAccount,
      publicClient
    };
  }
  
  describe("Deployment", function () {
    it("Should initialize with nextDealId = 0", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(Number(await escrow.read.nextDealId())).to.equal(0);
    });
  });
  
  describe("Create Deal", function () {
    it("Should create a new deal with ETH", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      const tx = await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress, // use hardcoded arbiter
        zeroAddress, // eth
        dealAmount],
        { account: buyer.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for the DealCreated event
      const dealCreatedEvents = await escrow.getEvents.DealCreated();
      expect(dealCreatedEvents).to.have.lengthOf(1);
      expect(Number(dealCreatedEvents[0].args.dealId)).to.equal(0);
      expect(dealCreatedEvents[0].args.buyer).to.equal(getAddress(buyer.account.address));
      expect(dealCreatedEvents[0].args.seller).to.equal(getAddress(seller.account.address));
      expect(dealCreatedEvents[0].args.arbiter).to.equal(arbiterAddress);
      expect(dealCreatedEvents[0].args.tokenAddress).to.equal(zeroAddress);
      expect(dealCreatedEvents[0].args.amount).to.equal(dealAmount);
      
      // check that the nextDealId was incremented
      expect(Number(await escrow.read.nextDealId())).to.equal(1);
      
      // check the deal details
      const deal = await escrow.read.getDeal([0n]);
      expect(deal[0]).to.equal(getAddress(buyer.account.address)); // buyer
      expect(deal[1]).to.equal(getAddress(seller.account.address)); // seller
      expect(deal[2]).to.equal(arbiterAddress); // arbiter
      expect(deal[3]).to.equal(zeroAddress); // tokenAddress
      expect(deal[4]).to.equal(dealAmount); // amount
      expect(Number(deal[5])).to.equal(0); // State.AWAITING_PAYMENT
    });
    
    it("Should revert if seller address is zero", async function () {
      const { escrow, buyer, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      await expect(escrow.write.createDeal(
        [zeroAddress,
        arbiterAddress,
        zeroAddress,
        parseEther("1")],
        { account: buyer.account }
      )).to.be.rejectedWith("Invalid seller");
    });
    
    it("Should revert if arbiter address is zero", async function () {
      const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
      
      await expect(escrow.write.createDeal(
        [getAddress(seller.account.address),
        zeroAddress,
        zeroAddress,
        parseEther("1")],
        { account: buyer.account }
      )).to.be.rejectedWith("Not an approved arbiter");
    });
    
    it("Should revert if amount is zero", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      await expect(escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        0n],
        { account: buyer.account }
      )).to.be.rejectedWith("Amount must be > 0");
    });
  });
  
  describe("Deposit ETH", function () {
    it("Should deposit ETH and update deal state", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      const tx = await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for PaymentReceived event
      const paymentEvents = await escrow.getEvents.PaymentReceived();
      expect(paymentEvents).to.have.lengthOf(1);
      expect(Number(paymentEvents[0].args.dealId)).to.equal(0);
      
      // check deal state
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(1); // State.AWAITING_DELIVERY
    });
    
    it("Should revert if not buyer", async function () {
      const { escrow, buyer, seller, arbiterAddress, otherAccount } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // try to deposit ETH from another account
      await expect(escrow.write.depositETH(
        [0n],
        { account: otherAccount.account, value: dealAmount }
      )).to.be.rejectedWith("Only buyer can call");
    });
  });
  
  describe("Confirm Shipment and Receipt", function () {
    it("Should allow seller to confirm shipment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // confirm shipment
      const tx = await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for ItemShipped event
      const shippedEvents = await escrow.getEvents.ItemShipped();
      expect(shippedEvents).to.have.lengthOf(1);
      expect(Number(shippedEvents[0].args.dealId)).to.equal(0);
      
      // check deal state
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(2); // State.SHIPPED
    });
    
    it("Should allow buyer to confirm receipt and release payment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // confirm shipment
      await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      // get initial seller balance
      const initialSellerBalance = await publicClient.getBalance({
        address: getAddress(seller.account.address),
      });
      
      // confirm receipt and release payment
      const tx = await escrow.write.confirmReceipt(
        [0n],
        { account: buyer.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for DealCompleted event
      const completedEvents = await escrow.getEvents.DealCompleted();
      expect(completedEvents).to.have.lengthOf(1);
      expect(Number(completedEvents[0].args.dealId)).to.equal(0);
      
      // check seller received payment
      const finalSellerBalance = await publicClient.getBalance({
        address: getAddress(seller.account.address),
      });
      expect(finalSellerBalance - initialSellerBalance).to.equal(dealAmount);
      
      // check deal state
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(4); // State.COMPLETED
    });
  });
  
  describe("Raise Dispute", function () {
    it("Should allow buyer to raise a dispute after shipment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      const disputeReason = "Item not as described";
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // confirm shipment
      await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      // raise dispute
      const tx = await escrow.write.raiseDispute(
        [0n, disputeReason, false], // not a cancellation request
        { account: buyer.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for DisputeRaised event
      const disputeEvents = await escrow.getEvents.DisputeRaised();
      expect(disputeEvents).to.have.lengthOf(1);
      expect(Number(disputeEvents[0].args.dealId)).to.equal(0);
      expect(disputeEvents[0].args.reason).to.equal(disputeReason);
      expect(disputeEvents[0].args.initiator).to.equal(getAddress(buyer.account.address));
      
      // check deal state and dispute reason
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(3); // State.DISPUTED
      expect(deal[6]).to.equal(disputeReason); // disputeReason
    });
    
    it("Should allow buyer to request cancellation after payment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      const cancellationReason = "Item no longer needed";
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // request cancellation
      const tx = await escrow.write.raiseDispute(
        [0n, cancellationReason, true], // is a cancellation request
        { account: buyer.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for DisputeRaised event
      const disputeEvents = await escrow.getEvents.DisputeRaised();
      expect(disputeEvents).to.have.lengthOf(1);
      expect(Number(disputeEvents[0].args.dealId)).to.equal(0);
      expect(disputeEvents[0].args.initiator).to.equal(getAddress(buyer.account.address));
      expect(disputeEvents[0].args.reason).to.include(cancellationReason);
      
      // check deal state and dispute reason
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(3); // State.DISPUTED
      expect(deal[6]).to.include("Cancellation request");
      expect(deal[6]).to.include(cancellationReason);
    });
    
    it("Should allow seller to raise a dispute after payment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      const disputeReason = "Payment issue";
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // seller raises dispute
      const tx = await escrow.write.raiseDispute(
        [0n, disputeReason, false], // not a cancellation request
        { account: seller.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for DisputeRaised event
      const disputeEvents = await escrow.getEvents.DisputeRaised();
      expect(disputeEvents).to.have.lengthOf(1);
      expect(Number(disputeEvents[0].args.dealId)).to.equal(0);
      expect(disputeEvents[0].args.reason).to.equal(disputeReason);
      expect(disputeEvents[0].args.initiator).to.equal(getAddress(seller.account.address));
      
      // check deal state and dispute reason
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(3); // State.DISPUTED
      expect(deal[6]).to.equal(disputeReason);
    });
    
    it("Should allow seller to request cancellation after shipment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      const cancellationReason = "Unable to ship item";
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // confirm shipment
      await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      // request cancellation
      const tx = await escrow.write.raiseDispute(
        [0n, cancellationReason, true], // is a cancellation request
        { account: seller.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for DisputeRaised event
      const disputeEvents = await escrow.getEvents.DisputeRaised();
      expect(disputeEvents).to.have.lengthOf(1);
      expect(Number(disputeEvents[0].args.dealId)).to.equal(0);
      expect(disputeEvents[0].args.initiator).to.equal(getAddress(seller.account.address));
      expect(disputeEvents[0].args.reason).to.include(cancellationReason);
      
      // check deal state and dispute reason
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(3); // State.DISPUTED
      expect(deal[6]).to.include("Cancellation request");
      expect(deal[6]).to.include(cancellationReason);
    });
    
    it("Should revert if seller tries to raise non-cancellation dispute after shipment", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit ETH
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // confirm shipment
      await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      // try to raise non-cancellation dispute as seller after shipment
      await expect(escrow.write.raiseDispute(
        [0n, "Invalid dispute", false], // not a cancellation request
        { account: seller.account }
      )).to.be.rejectedWith("Seller can only request cancellation in SHIPPED state");
    });
  });
  
  // we can't easily test arbitration in this environment since we don't have access
  // to the private keys of the hardcoded arbiters
  
  describe("Cancellation", function () {
    it("Should allow cancellation in AWAITING_PAYMENT state", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // cancel the deal
      const tx = await escrow.write.cancelDeal(
        [0n],
        { account: buyer.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for DealCancelled event
      const cancelledEvents = await escrow.getEvents.DealCancelled();
      expect(cancelledEvents).to.have.lengthOf(1);
      expect(Number(cancelledEvents[0].args.dealId)).to.equal(0);
      
      // check deal state
      const deal = await escrow.read.getDeal([0n]);
      expect(Number(deal[5])).to.equal(6); // State.CANCELLED
    });
  });
}); 