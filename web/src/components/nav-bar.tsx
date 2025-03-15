'use client'

import { ConnectButton } from '@/components/connect-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAppKitAccount } from '@reown/appkit/react'
import Link from 'next/link'

export function NavBar() {
  const { isConnected } = useAppKitAccount();
  
  return (
    <div className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold">
            NextTrope
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
          {isConnected && (
            <Link href="/profile" className="text-sm font-medium transition-colors hover:text-primary">
              Profile
            </Link>
          )}
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </div>
  )
} 