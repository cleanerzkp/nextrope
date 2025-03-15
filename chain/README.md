# Escrow Smart Contract

This repository contains a secure and flexible escrow system implemented in Solidity. The escrow smart contract allows two parties to safely conduct transactions for physical goods using ETH or Nextrope tokens (NXT), with a third-party arbitrator available to resolve disputes.

## Features

- Support for ETH and Nextrope (NXT) tokens
- Complete escrow flow:
  - Deal creation
  - Payment deposit
  - Shipment confirmation
  - Receipt confirmation
  - Dispute resolution
- Built-in security features:
  - Reentrancy protection
  - Role-based access control
  - State transition checks
  - Secure transfer mechanisms
- Comprehensive test suite
- Well-documented code

## Contract Overview

The `Escrow` contract allows buyers and sellers to engage in trustless transactions with the following workflow:

1. A buyer creates a new escrow deal specifying:
   - Seller address
   - Arbitrator address
   - Token address (zero address for ETH, or Nextrope token address)
   - Amount

2. The buyer deposits the funds into the escrow contract

3. The seller ships the physical item and confirms shipment on-chain

4. The buyer either:
   - Confirms receipt (releasing funds to the seller)
   - Raises a dispute (requiring arbitration)
   - Requests cancellation (requiring arbitration)

5. The seller can also:
   - Raise a dispute after payment (requiring arbitration)
   - Request cancellation after shipment (requiring arbitration)

6. If a dispute or cancellation request is raised, the arbitrator can:
   - Rule in favor of the buyer (refunding the buyer)
   - Rule in favor of the seller (releasing funds to the seller)

## Getting Started

### Prerequisites

- Node.js v16+
- NPM or Yarn
- Hardhat

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Testing

Run the test suite to verify everything works as expected:

```bash
npx hardhat test
```

### Deployment

To deploy the contracts to a testnet or mainnet:

1. Set up your environment variables in a `.env` file:

```
PRIVATE_KEY=your_wallet_private_key
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. Run the deployment script:

```bash
npx hardhat run scripts/deploy.js --network <network_name>
```

## Usage

### Creating a Deal

```javascript
const escrow = await Escrow.deployed();
const dealAmount = ethers.utils.parseEther("1");

// For ETH
await escrow.createDeal(
  sellerAddress, 
  arbitratorAddress, 
  ethers.constants.AddressZero, // ETH
  dealAmount
);

// For Nextrope tokens
await escrow.createDeal(
  sellerAddress, 
  arbitratorAddress, 
  nextropeTokenAddress, 
  dealAmount
);
```

### Depositing Funds

```javascript
// For ETH
await escrow.depositETH(dealId, { value: dealAmount });

// For Nextrope tokens (requires approval first)
await nextropeToken.approve(escrow.address, dealAmount);
await escrow.depositToken(dealId);
```

### Confirming Shipment

```javascript
await escrow.confirmShipment(dealId);
```

### Confirming Receipt

```javascript
await escrow.confirmReceipt(dealId);
```

### Raising a Dispute or Requesting Cancellation

```javascript
// Raise a dispute
await escrow.raiseDispute(dealId, "Item not as described", false);

// Request cancellation
await escrow.raiseDispute(dealId, "Unable to complete the transaction", true);
```

### Resolving a Dispute

```javascript
// In favor of the buyer (true)
await escrow.resolveDispute(dealId, true);

// In favor of the seller (false)
await escrow.resolveDispute(dealId, false);
```

### Cancelling a Deal

```javascript
// Early cancellation (only in AWAITING_PAYMENT state)
await escrow.cancelDeal(dealId);
```

## Security Considerations

The contract has been designed with security as a priority:

- `ReentrancyGuard` is used to prevent reentrancy attacks
- Access control checks ensure only authorized parties can call specific functions
- State validation prevents invalid state transitions
- Proper error handling with informative error messages

## License

This project is licensed under the MIT License.

## Acknowledgments

- [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts) for secure contract components
