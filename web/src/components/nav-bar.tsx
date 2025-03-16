'use client'

import { useState } from 'react'
import { ConnectButton } from '@/components/connect-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { WalletStatus } from '@/components/wallet-status'
import { useAppKitAccount } from '@reown/appkit/react'
import Link from 'next/link'
import { ShieldIcon } from '@/components/icons/shield'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NavBar() {
  const { isConnected } = useAppKitAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  
  const NavLinks = () => (
    <>
      {isConnected && (
        <>
          <Link 
            href="/escrows" 
            className="text-sm font-medium transition-colors hover:text-primary"
            onClick={() => setMobileMenuOpen(false)}
          >
            My Escrows
          </Link>
          <Link 
            href="/create" 
            className="text-sm font-medium transition-colors hover:text-primary"
            onClick={() => setMobileMenuOpen(false)}
          >
            Create Escrow
          </Link>
          <Link 
            href="/arbitrate" 
            className="text-sm font-medium transition-colors hover:text-primary"
            onClick={() => setMobileMenuOpen(false)}
          >
            Arbitrate
          </Link>
        </>
      )}
    </>
  );
  
  return (
    <div className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <ShieldIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">NextEscrow</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <WalletStatus />
          <ConnectButton />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out border-l"
          style={{ transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <ShieldIcon className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">NextEscrow</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>
          <nav className="flex flex-col space-y-6">
            <NavLinks />
          </nav>
        </div>
      </div>
    </div>
  )
} 