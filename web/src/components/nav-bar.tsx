'use client'

import { ConnectButton } from '@/components/connect-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { WalletStatus } from '@/components/wallet-status'
import { useAppKitAccount } from '@reown/appkit/react'
import Link from 'next/link'
import { ShieldIcon } from '@/components/icons/shield'

export function NavBar() {
  const { isConnected } = useAppKitAccount();
  
  return (
    <div className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <ShieldIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">NextEscrow</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {isConnected && (
              <>
                <Link href="/escrows" className="text-sm font-medium transition-colors hover:text-primary">
                  My Escrows
                </Link>
                <Link href="/create" className="text-sm font-medium transition-colors hover:text-primary">
                  Create Escrow
                </Link>
                <Link href="/arbitrate" className="text-sm font-medium transition-colors hover:text-primary">
                  Arbitrate
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <WalletStatus />
          <ConnectButton />
        </div>
      </div>
    </div>
  )
} 