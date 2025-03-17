import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, getAddress, zeroAddress } from "viem";
import { Escrow } from "../typechain-types";
import { NextropeToken } from "../typechain-types";

describe("escrow contract", function () {
  // define a fixture to reuse the same setup in every test
  async function deployEscrowFixture() {
    // get wallet clients
    const [owner, buyer, seller, otherAccount] = await hre.viem.getWalletClients();
    
    // get public client for balance checks
    const publicClient = await hre.viem.getPublicClient();
    
    // one of the hardcoded arbiter addresses from the contract
    const arbiterAddress = "0xcd3B766CCDd6AE721141F452C550Ca635964ce71" as `0x${string}`;
    
    // deploy the escrow contract
    const escrow = await hre.viem.deployContract("Escrow") as unknown as Escrow;
    
    return { 
      escrow, 
      owner,
      buyer, 
      seller, 
      arbiterAddress,
      otherAccount,
      publicClient
    };
  }
  
  describe("deployment", function () {
    it("should initialize with nextDealId = 0", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      expect(Number(await escrow.read.nextDealId())).to.equal(0);
    });

    it("should initialize with 5 hardcoded arbiters", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);
      
      // check all 5 hardcoded arbiters are approved
      const hardcodedArbiters = [
        "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
        "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
        "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
        "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
        "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
      ] as const;

      for (const arbiter of hardcodedArbiters) {
        const isApproved = await escrow.read.isArbiterApproved([arbiter]);
        expect(isApproved).to.be.true;
      }
    });
  });

  describe("arbiter management", function () {
    it("should allow owner to add a new arbiter", async function () {
      const { escrow, owner, otherAccount } = await loadFixture(deployEscrowFixture);
      await escrow.write.addArbiter([getAddress(otherAccount.account.address)], { account: owner.account });
      expect(await escrow.read.isArbiterApproved([getAddress(otherAccount.account.address)])).to.be.true;
    });
    
    it("should revert when adding arbiter that already exists", async function () {
      const { escrow, owner, arbiterAddress } = await loadFixture(deployEscrowFixture);
      await expect(escrow.write.addArbiter([arbiterAddress], { account: owner.account }))
        .to.be.rejectedWith("ArbiterAlreadyExists");
    });
    
    it("should allow owner to remove an arbiter", async function () {
      const { escrow, owner, arbiterAddress } = await loadFixture(deployEscrowFixture);
      await escrow.write.removeArbiter([arbiterAddress], { account: owner.account });
      expect(await escrow.read.isArbiterApproved([arbiterAddress])).to.be.false;
    });

    it("should revert when removing non-existent arbiter", async function () {
      const { escrow, owner, otherAccount } = await loadFixture(deployEscrowFixture);
      await expect(escrow.write.removeArbiter([getAddress(otherAccount.account.address)], { account: owner.account }))
        .to.be.rejected;
    });
  });
  
  describe("create deal", function () {
    it("should create a new deal with eth", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create a new deal
      const tx = await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for the dealcreated event
      const dealCreatedEvents = await escrow.getEvents.DealCreated();
      expect(dealCreatedEvents).to.have.lengthOf(1);
      expect(Number(dealCreatedEvents[0].args.dealId)).to.equal(0);
      expect(dealCreatedEvents[0].args.buyer).to.equal(getAddress(buyer.account.address));
      expect(dealCreatedEvents[0].args.seller).to.equal(getAddress(seller.account.address));
      expect(dealCreatedEvents[0].args.arbiter).to.equal(arbiterAddress);
      expect(dealCreatedEvents[0].args.tokenAddress).to.equal(zeroAddress);
      expect(dealCreatedEvents[0].args.amount).to.equal(dealAmount);
      
      // check that the nextdealid was incremented
      expect(Number(await escrow.read.nextDealId())).to.equal(1);
      
      // check the deal details
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(dealInfo[0]).to.equal(getAddress(buyer.account.address)); // buyer
      expect(dealInfo[1]).to.equal(getAddress(seller.account.address)); // seller
      expect(dealInfo[2]).to.equal(arbiterAddress); // arbiter
      expect(dealInfo[3]).to.equal(zeroAddress); // tokenAddress
      expect(dealInfo[4]).to.equal(dealAmount); // amount
      expect(Number(dealInfo[5])).to.equal(0); // state.awaiting_payment
    });

    it("should revert if seller address is zero", async function () {
      const { escrow, buyer, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      await expect(escrow.write.createDeal(
        [zeroAddress,
        arbiterAddress,
        zeroAddress,
        parseEther("1")],
        { account: buyer.account }
      )).to.be.rejected;
    });
    
    it("should revert if arbiter address is zero", async function () {
      const { escrow, buyer, seller } = await loadFixture(deployEscrowFixture);
      
      await expect(escrow.write.createDeal(
        [getAddress(seller.account.address),
        zeroAddress,
        zeroAddress,
        parseEther("1")],
        { account: buyer.account }
      )).to.be.rejected;
    });
    
    it("should revert if amount is zero", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      await expect(escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        0n],
        { account: buyer.account }
      )).to.be.rejectedWith("InvalidAmount");
    });
  });
  
  describe("deposit", function () {
    it("should deposit eth and update deal state", async function () {
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
      
      // deposit eth
      const tx = await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for paymentreceived event
      const paymentEvents = await escrow.getEvents.PaymentReceived();
      expect(paymentEvents).to.have.lengthOf(1);
      expect(Number(paymentEvents[0].args.dealId)).to.equal(0);
      
      // check deal state
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(1); // state.awaiting_delivery
    });

    it("should revert if not buyer", async function () {
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
      
      // try to deposit eth from another account
      await expect(escrow.write.depositETH(
        [0n],
        { account: otherAccount.account, value: dealAmount }
      )).to.be.rejectedWith("UnauthorizedCaller");
    });

    it("should revert if depositing incorrect eth amount", async function () {
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
      
      // try to deposit wrong amount
      await expect(escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: parseEther("0.5") }
      )).to.be.rejectedWith("InvalidAmount");
    });
  });
  
  describe("confirm shipment and receipt", function () {
    it("should allow seller to confirm shipment", async function () {
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
      
      // deposit eth
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
      
      // check for itemshipped event
      const shippedEvents = await escrow.getEvents.ItemShipped();
      expect(shippedEvents).to.have.lengthOf(1);
      expect(Number(shippedEvents[0].args.dealId)).to.equal(0);
      
      // check deal state
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(2); // state.shipped
    });
    
    it("should allow buyer to confirm receipt and release payment", async function () {
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
      
      // deposit eth
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
      
      // check for dealcompleted event
      const completedEvents = await escrow.getEvents.DealCompleted();
      expect(completedEvents).to.have.lengthOf(1);
      expect(Number(completedEvents[0].args.dealId)).to.equal(0);
      
      // check seller received payment
      const finalSellerBalance = await publicClient.getBalance({
        address: getAddress(seller.account.address),
      });
      expect(finalSellerBalance - initialSellerBalance).to.equal(dealAmount);
      
      // check deal state
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(4); // state.completed
    });

    it("should revert if non-seller tries to confirm shipment", async function () {
      const { escrow, buyer, seller, arbiterAddress, otherAccount } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create and fund deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // try to confirm shipment as non-seller
      await expect(escrow.write.confirmShipment(
        [0n],
        { account: otherAccount.account }
      )).to.be.rejectedWith("UnauthorizedCaller");
    });
  });
  
  describe("dispute resolution", function () {
    it("should allow buyer to raise a dispute after shipment", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      const disputeReason = "item not as described";
      
      // create a new deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // deposit eth
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
      
      // check for disputeraised event
      const disputeEvents = await escrow.getEvents.DisputeRaised();
      expect(disputeEvents).to.have.lengthOf(1);
      expect(Number(disputeEvents[0].args.dealId)).to.equal(0);
      expect(disputeEvents[0].args.reason).to.equal(disputeReason);
      expect(disputeEvents[0].args.initiator).to.equal(getAddress(buyer.account.address));
      
      // check deal state and dispute reason
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(3); // state.disputed
      expect(await escrow.read.disputeReasons([0n])).to.equal(disputeReason);
    });

    it("should allow arbiter to resolve dispute in favor of buyer", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create and setup disputed deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      await escrow.write.raiseDispute(
        [0n, "item damaged", false],
        { account: buyer.account }
      );
      
      // get initial buyer balance
      const initialBuyerBalance = await publicClient.getBalance({
        address: getAddress(buyer.account.address),
      });
      
      // resolve in favor of buyer
      const tx = await escrow.write.resolveDispute(
        [0n, true], // true = refund to buyer
        { account: arbiterAddress }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for dispute resolved event
      const resolvedEvents = await escrow.getEvents.DisputeResolved();
      expect(resolvedEvents).to.have.lengthOf(1);
      expect(Number(resolvedEvents[0].args.dealId)).to.equal(0);
      expect(resolvedEvents[0].args.winner).to.equal(getAddress(buyer.account.address));
      expect(resolvedEvents[0].args.isRefund).to.be.true;
      
      // check buyer received refund
      const finalBuyerBalance = await publicClient.getBalance({
        address: getAddress(buyer.account.address),
      });
      expect(finalBuyerBalance - initialBuyerBalance).to.equal(dealAmount);
      
      // check deal state
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(5); // state.refunded
    });

    it("should allow arbiter to resolve dispute in favor of seller", async function () {
      const { escrow, buyer, seller, arbiterAddress, publicClient } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create and setup disputed deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      await escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      );
      
      await escrow.write.raiseDispute(
        [0n, "item damaged", false],
        { account: buyer.account }
      );
      
      // get initial seller balance
      const initialSellerBalance = await publicClient.getBalance({
        address: getAddress(seller.account.address),
      });
      
      // resolve in favor of seller
      const tx = await escrow.write.resolveDispute(
        [0n, false], // false = release to seller
        { account: arbiterAddress }
      );
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      // check for dispute resolved event
      const resolvedEvents = await escrow.getEvents.DisputeResolved();
      expect(resolvedEvents).to.have.lengthOf(1);
      expect(Number(resolvedEvents[0].args.dealId)).to.equal(0);
      expect(resolvedEvents[0].args.winner).to.equal(getAddress(seller.account.address));
      expect(resolvedEvents[0].args.isRefund).to.be.false;
      
      // check seller received payment
      const finalSellerBalance = await publicClient.getBalance({
        address: getAddress(seller.account.address),
      });
      expect(finalSellerBalance - initialSellerBalance).to.equal(dealAmount);
      
      // check deal state
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(4); // state.completed
    });
  });
  
  describe("cancellation", function () {
    it("should allow cancellation in awaiting_payment state", async function () {
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
      
      // check for dealcancelled event
      const cancelledEvents = await escrow.getEvents.DealCancelled();
      expect(cancelledEvents).to.have.lengthOf(1);
      expect(Number(cancelledEvents[0].args.dealId)).to.equal(0);
      
      // check deal state
      const dealInfo = await escrow.read.getDeal([0n]);
      expect(Number(dealInfo[5])).to.equal(6); // state.cancelled
    });

    it("should revert cancellation in non-awaiting_payment state", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create and fund deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // try to cancel after payment
      await expect(escrow.write.cancelDeal(
        [0n],
        { account: buyer.account }
      )).to.be.rejectedWith("InvalidState");
    });
  });

  describe("invalid state transitions", function () {
    it("should revert deposit in non-awaiting_payment state", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create and fund deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      await escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      );
      
      // try to deposit again
      await expect(escrow.write.depositETH(
        [0n],
        { account: buyer.account, value: dealAmount }
      )).to.be.rejectedWith("InvalidState");
    });

    it("should revert shipment confirmation in wrong state", async function () {
      const { escrow, buyer, seller, arbiterAddress } = await loadFixture(deployEscrowFixture);
      
      const dealAmount = parseEther("1");
      
      // create deal but don't fund
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        zeroAddress,
        dealAmount],
        { account: buyer.account }
      );
      
      // try to confirm shipment before payment
      await expect(escrow.write.confirmShipment(
        [0n],
        { account: seller.account }
      )).to.be.rejectedWith("InvalidState");
    });
  });

  describe("token deals", function () {
    async function deployTokenDealFixture() {
      const base = await deployEscrowFixture();
      const token = await hre.viem.deployContract("NextropeToken", [18]) as unknown as NextropeToken;
      await token.write.mint([base.buyer.account.address, parseEther("10")], { account: base.owner.account });
      await token.write.approve([base.escrow.address, parseEther("10")], { account: base.buyer.account });
      return { ...base, token };
    }

    it("should create and complete a token deal", async function () {
      const { escrow, buyer, seller, arbiterAddress, token, publicClient } = await loadFixture(deployTokenDealFixture);
      const dealAmount = parseEther("1");

      // Create token deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        token.address,
        dealAmount],
        { account: buyer.account }
      );

      // Check initial token balances
      const initialSellerBalance = await token.read.balanceOf([getAddress(seller.account.address)]);
      const initialEscrowBalance = await token.read.balanceOf([escrow.address]);
      expect(initialSellerBalance).to.equal(0n);
      expect(initialEscrowBalance).to.equal(0n);

      // Deposit tokens
      await escrow.write.depositToken([0n], { account: buyer.account });

      // Verify escrow received tokens
      expect(await token.read.balanceOf([escrow.address])).to.equal(dealAmount);

      // Complete the deal
      await escrow.write.confirmShipment([0n], { account: seller.account });
      await escrow.write.confirmReceipt([0n], { account: buyer.account });

      // Verify seller received tokens
      expect(await token.read.balanceOf([getAddress(seller.account.address)])).to.equal(dealAmount);
      expect(await token.read.balanceOf([escrow.address])).to.equal(0n);
    });

    it("should refund tokens to buyer when dispute resolved in their favor", async function () {
      const { escrow, buyer, seller, arbiterAddress, token } = await loadFixture(deployTokenDealFixture);
      const dealAmount = parseEther("1");

      // Setup disputed deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        token.address,
        dealAmount],
        { account: buyer.account }
      );
      await escrow.write.depositToken([0n], { account: buyer.account });
      await escrow.write.confirmShipment([0n], { account: seller.account });
      await escrow.write.raiseDispute([0n, "defective item", false], { account: buyer.account });

      // Get initial balances
      const initialBuyerBalance = await token.read.balanceOf([getAddress(buyer.account.address)]);
      const initialEscrowBalance = await token.read.balanceOf([escrow.address]);

      // Resolve in buyer's favor
      await escrow.write.resolveDispute([0n, true], { account: arbiterAddress });

      // Verify token refund
      expect(await token.read.balanceOf([getAddress(buyer.account.address)])).to.equal(initialBuyerBalance + dealAmount);
      expect(await token.read.balanceOf([escrow.address])).to.equal(initialEscrowBalance - dealAmount);
    });

    it("should revert token deposit if allowance is insufficient", async function () {
      const { escrow, buyer, seller, arbiterAddress, token } = await loadFixture(deployTokenDealFixture);
      const dealAmount = parseEther("1");

      // Create token deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        token.address,
        dealAmount],
        { account: buyer.account }
      );

      // Remove approval
      await token.write.approve([escrow.address, 0n], { account: buyer.account });

      // Try to deposit
      await expect(escrow.write.depositToken(
        [0n],
        { account: buyer.account }
      )).to.be.rejectedWith("ERC20InsufficientAllowance");
    });

    it("should revert token deposit if balance is insufficient", async function () {
      const { escrow, buyer, seller, arbiterAddress, token } = await loadFixture(deployTokenDealFixture);
      const dealAmount = parseEther("100"); // More than minted

      // Create token deal
      await escrow.write.createDeal(
        [getAddress(seller.account.address),
        arbiterAddress,
        token.address,
        dealAmount],
        { account: buyer.account }
      );

      // Try to deposit more than balance
      await expect(escrow.write.depositToken(
        [0n],
        { account: buyer.account }
      )).to.be.rejectedWith("ERC20InsufficientAllowance");
    });
  });
}); 