import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { createPublicClient, http, PublicClient } from 'viem'
import { sepolia } from 'viem/chains'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Define a type for token metadata
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

// Well-known token logos for fallback
export const KNOWN_TOKEN_LOGOS: Record<string, string> = {
  // Common stablecoins
  'USDT': 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  'USDC': 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  'DAI': 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  // Major tokens
  'WETH': 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
  'WBTC': 'https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png',
  'UNI': 'https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png',
  'LINK': 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png',
  'AAVE': 'https://tokens.1inch.io/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9.png',
  'CRV': 'https://tokens.1inch.io/0xd533a949740bb3306d119cc777fa900ba034cd52.png',
  // Add more as needed
};

// Cache token decimals to avoid duplicate calls
const tokenDecimalsCache: Record<string, number> = {}

// ERC20 ABI for token decimals
const erc20Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Function to get token decimals directly from the token contract
export async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  // Check cache first
  const cacheKey = `${tokenAddress.toLowerCase()}`
  if (tokenDecimalsCache[cacheKey] !== undefined) {
    return tokenDecimalsCache[cacheKey]
  }
  
  try {
    // Get public client for the chain
    const publicClient = getPublicClientForChain()
    
    // Call decimals() function on the token contract
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    }) as number
    
    // Cache the result
    tokenDecimalsCache[cacheKey] = decimals
    console.log(`Got token decimals for ${tokenAddress}: ${decimals}`)
    
    return decimals
  } catch (error) {
    console.error(`Error getting decimals for token ${tokenAddress}:`, error)
    // Default to 18 decimals (most common) if we can't read from the contract
    return 18
  }
}

// Function to fetch token metadata (symbol, name, decimals)
export async function fetchTokenMetadata(tokenAddress: `0x${string}`): Promise<TokenMetadata | null> {
  try {
    const publicClient = getPublicClientForChain()
    
    // Try to get decimals, symbol and name
    const decimals = await getTokenDecimals(tokenAddress)
    
    let symbol = ""
    try {
      symbol = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'symbol',
      }) as string
    } catch (error) {
      console.error(`Error getting symbol for token ${tokenAddress}:`, error)
      symbol = tokenAddress.slice(0, 6)
    }
    
    let name = ""
    try {
      name = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'name',
      }) as string
    } catch (error) {
      console.error(`Error getting name for token ${tokenAddress}:`, error)
    }
    
    // Try to get token logo from Alchemy if API key is available
    let logo: string | undefined = undefined
    
    // Check if we have a known logo for this symbol
    if (symbol && KNOWN_TOKEN_LOGOS[symbol.toUpperCase()]) {
      logo = KNOWN_TOKEN_LOGOS[symbol.toUpperCase()]
    } else {
      // Try to fetch from Alchemy token API if we have an API key
      const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      if (alchemyApiKey) {
        try {
          const response = await fetch(
            `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}/getTokenMetadata?contractAddress=${tokenAddress}`
          )
          const data = await response.json()
          if (data && data.metadata && data.metadata.logo) {
            logo = data.metadata.logo
          }
        } catch (logoError) {
          console.error(`Error fetching logo for token ${tokenAddress}:`, logoError)
        }
      }
    }
    
    return {
      name,
      symbol,
      decimals,
      logo
    }
  } catch (error) {
    console.error(`Error fetching metadata for token ${tokenAddress}:`, error)
    return null
  }
}

// Helper function to get a public client for a specific chain
function getPublicClientForChain(): PublicClient {
  // Use Alchemy API Key to construct the RPC URL
  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const alchemyRpcUrl = alchemyApiKey 
    ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`
    : process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  
  console.log("Using RPC URL:", alchemyRpcUrl ? "Custom RPC URL" : "Default Public RPC");
  
  return createPublicClient({
    chain: sepolia,
    transport: alchemyRpcUrl 
      ? http(alchemyRpcUrl)
      : http()
  });
}

/**
 * Get the block explorer URL for a transaction, address, or token
 * @param chainId The chain ID (1 for Ethereum mainnet, 11155111 for Sepolia)
 * @param type The type of URL to generate ('tx', 'address', or 'token')
 * @param value The transaction hash, address, or token address
 * @returns The complete block explorer URL
 */
export function getExplorerUrl(chainId: number, type: 'tx' | 'address' | 'token', value: string): string {
  // Only support Sepolia since that's the only network we use
  return `https://sepolia.etherscan.io/${type}/${value}`;
}

// Get state name from numeric state 
export function getEscrowStateName(state: number): string {
  switch (state) {
    case 0: return "Awaiting Payment";
    case 1: return "Awaiting Delivery";
    case 2: return "Shipped";
    case 3: return "Disputed";
    case 4: return "Completed";
    case 5: return "Refunded";
    case 6: return "Cancelled";
    default: return "Unknown";
  }
}

// Chart utilities
export function createVarStyles(config: Record<string, { color: string | { light: string; dark: string } }>) {
  const style: Record<string, string> = {}

  for (const [key, value] of Object.entries(config)) {
    if (typeof value.color === "string") {
      style[`--color-${key}`] = value.color
    } else if (typeof value.color === "object") {
      // Handle light/dark mode colors (CSS Variables)
      style[`--color-${key}`] = `var(--color-${key}-light, ${value.color.light})`
      style[`--color-${key}-light`] = value.color.light
      style[`--color-${key}-dark`] = value.color.dark
    }
  }

  return style
}

export function createShapeStyles(names: string[]) {
  const style: Record<string, { background: string }> = {}

  for (const name of names) {
    style[name] = {
      background: `var(--color-${name})`,
    }
  }

  return style
}
