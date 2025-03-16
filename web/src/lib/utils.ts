import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

/**
 * Fetches token metadata from Alchemy API
 * @param tokenAddress The contract address of the token
 * @param chainId The chain ID (1 for Ethereum mainnet, 11155111 for Sepolia)
 * @returns TokenMetadata object or null if not found
 */
export async function fetchTokenMetadata(tokenAddress: string, chainId: number = 11155111): Promise<TokenMetadata | null> {
  try {
    // Get API key from environment
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    
    if (!apiKey) {
      console.error("Alchemy API key not found");
      return null;
    }
    
    // Determine network based on chainId
    const network = chainId === 1 ? 'eth-mainnet' : 'eth-sepolia';
    
    const url = `https://${network}.g.alchemy.com/v2/${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenMetadata',
        params: [tokenAddress]
      })
    });
    
    const data = await response.json();
    
    if (data.error || !data.result) {
      console.error('Error fetching token metadata:', data.error);
      return null;
    }

    const metadata = data.result;
    const symbol = metadata.symbol || '???';
    
    // Use fallback logo if Alchemy doesn't provide one
    let logo = metadata.logo;
    if (!logo && KNOWN_TOKEN_LOGOS[symbol]) {
      logo = KNOWN_TOKEN_LOGOS[symbol];
    }
    
    return {
      name: metadata.name || 'Unknown Token',
      symbol,
      decimals: metadata.decimals || 18,
      logo
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

/**
 * Get the block explorer URL for a transaction, address, or token
 * @param chainId The chain ID (1 for Ethereum mainnet, 11155111 for Sepolia)
 * @param type The type of URL to generate ('tx', 'address', or 'token')
 * @param value The transaction hash, address, or token address
 * @returns The complete block explorer URL
 */
export function getExplorerUrl(chainId: number, type: 'tx' | 'address' | 'token', value: string): string {
  let baseUrl = '';
  
  // Set base URL based on chainId
  switch (chainId) {
    case 1: // Ethereum Mainnet
      baseUrl = 'https://etherscan.io';
      break;
    case 11155111: // Sepolia
      baseUrl = 'https://sepolia.etherscan.io';
      break;
    case 5: // Goerli
      baseUrl = 'https://goerli.etherscan.io';
      break;
    case 42161: // Arbitrum One
      baseUrl = 'https://arbiscan.io';
      break;
    case 10: // Optimism
      baseUrl = 'https://optimistic.etherscan.io';
      break;
    case 8453: // Base
      baseUrl = 'https://basescan.org';
      break;
    default:
      baseUrl = 'https://etherscan.io';
  }
  
  // Return the full URL
  return `${baseUrl}/${type}/${value}`;
}
