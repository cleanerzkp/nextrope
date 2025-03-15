import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'

// Reown Project ID from environment variables
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined. Please set NEXT_PUBLIC_REOWN_PROJECT_ID in your .env.local file')
}

export const networks = [mainnet, arbitrum]

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