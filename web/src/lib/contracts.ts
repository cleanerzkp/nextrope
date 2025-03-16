import { ESCROW_CONTRACT_ADDRESS, ESCROW_CONTRACT_CHAIN } from '@/config'

// Escrow contract ABI 
export const escrowAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "arbiter",
        "type": "address"
      }
    ],
    "name": "ArbiterAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "arbiter",
        "type": "address"
      }
    ],
    "name": "ArbiterRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      }
    ],
    "name": "DealCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      }
    ],
    "name": "DealCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "arbiter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "DealCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "initiator",
        "type": "address"
      }
    ],
    "name": "DisputeRaised",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      }
    ],
    "name": "DisputeResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      }
    ],
    "name": "ItemShipped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      }
    ],
    "name": "PaymentReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dealId",
        "type": "uint256"
      }
    ],
    "name": "Refunded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_arbiter",
        "type": "address"
      }
    ],
    "name": "addArbiter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "approvedArbiters",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      }
    ],
    "name": "cancelDeal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      }
    ],
    "name": "confirmReceipt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      }
    ],
    "name": "confirmShipment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "_seller",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "_arbiter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "createDeal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "deals",
    "outputs": [
      {
        "internalType": "address payable",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "arbiter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "enum Escrow.State",
        "name": "state",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "disputeReason",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      }
    ],
    "name": "depositETH",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      }
    ],
    "name": "depositToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      }
    ],
    "name": "getDeal",
    "outputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "arbiter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "enum Escrow.State",
        "name": "state",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "disputeReason",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextDealId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_reason",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "_isCancellationRequest",
        "type": "bool"
      }
    ],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_arbiter",
        "type": "address"
      }
    ],
    "name": "removeArbiter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_dealId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_refundToBuyer",
        "type": "bool"
      }
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

// Enum for states of a deal
export enum EscrowState {
  AWAITING_PAYMENT = 0,
  AWAITING_DELIVERY = 1,
  SHIPPED = 2,
  DISPUTED = 3,
  COMPLETED = 4,
  REFUNDED = 5,
  CANCELLED = 6
}

// Known arbiters from the contract 
export const knownArbiters = [
  { 
    address: "0xcd3B766CCDd6AE721141F452C550Ca635964ce71" as `0x${string}`, 
    name: "Arbiter 1" 
  },
  { 
    address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30" as `0x${string}`, 
    name: "Arbiter 2" 
  },
  { 
    address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E" as `0x${string}`, 
    name: "Arbiter 3" 
  },
  { 
    address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0" as `0x${string}`, 
    name: "Arbiter 4" 
  },
  { 
    address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199" as `0x${string}`, 
    name: "Arbiter 5" 
  }
]

// Common token addresses on Sepolia
export const knownTokens = [
  {
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
    icon: "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png"
  },
  {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
    name: "Sepolia USDC",
    symbol: "USDC",
    decimals: 6,
    icon: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
  }
]

// Predefined counterparties for testing
export const sampleCounterparties = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
    name: "Account 1"
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
    name: "Account 2"
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`,
    name: "Account 3"
  }
]

// Contract configuration object
export const escrowContract = {
  address: ESCROW_CONTRACT_ADDRESS as `0x${string}`,
  abi: escrowAbi,
  chainId: ESCROW_CONTRACT_CHAIN
}

// Predefined item templates for the escrow creation form
export const itemTemplates = [
  {
    title: "MacBook Pro 2023",
    description: "My previous MacBook Pro with M2 chip. Barely used, in excellent condition with original packaging and accessories.",
    emoji: "💻"
  },
  {
    title: "iPhone 15 Pro",
    description: "iPhone 15 Pro in titanium finish. Includes charger, original box, and protective case. No scratches or damages.",
    emoji: "📱"
  },
  {
    title: "Web Development Service",
    description: "Full-stack web development service including design, frontend, and backend. Includes 3 revision rounds and 1 month support.",
    emoji: "🌐"
  },
  {
    title: "Gaming Console",
    description: "Latest gaming console with 2 controllers and 3 games. All cables included. Only used for a few months.",
    emoji: "🎮"
  },
  {
    title: "Digital Art Commission",
    description: "Custom digital artwork commission. High-resolution file delivered in multiple formats (PNG, JPG, SVG, and PSD).",
    emoji: "🎨"
  }
]; 