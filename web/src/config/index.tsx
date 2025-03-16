import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, sepolia } from '@reown/appkit/networks'

// Reown Project ID from environment variables
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined. Please set NEXT_PUBLIC_REOWN_PROJECT_ID in your .env.local file')
}

// Use all three networks
export const networks = [mainnet, arbitrum, sepolia]

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig

// Escrow contract configuration
export const ESCROW_CONTRACT_ADDRESS = '0x5e3B94f2eA6ed8EA07C83aBfaC8e9b6D52EFA511'
export const ESCROW_CONTRACT_CHAIN = 11155111 // Sepolia chain ID 