'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'
import '@reown/appkit-wallet-button/react'
import { Loader2 } from 'lucide-react'

export function ConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected, status } = useAppKitAccount()
  
  const isLoading = status === 'connecting' || status === 'reconnecting'
  
  if (isLoading) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    )
  }
  
  if (isConnected && address) {
    return (
      <Button onClick={() => open({ view: 'Account' })}>
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    )
  }
  
  return (
    <Button onClick={() => open({ view: 'Connect' })}>
      Connect Wallet
    </Button>
  )
} 