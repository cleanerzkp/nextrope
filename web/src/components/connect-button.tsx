'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'
import '@reown/appkit-wallet-button/react'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected, status } = useAppKitAccount()
  const [isMounted, setIsMounted] = useState(false)
  
  // Prevent hydration errors by ensuring this component only renders after client-side hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Don't render anything until the component has mounted on the client
  if (!isMounted) {
    return <Button>Connect Wallet</Button>
  }
  
  const isLoading = status === 'connecting' || status === 'reconnecting'
  
  if (isLoading) {
    return (
      <Button disabled={true}>
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