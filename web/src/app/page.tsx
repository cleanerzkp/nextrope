'use client'

import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Shield, Globe, Clock, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { escrowContract } from "@/lib/contracts";
import { usePublicClient } from "wagmi";
import { useIsApprovedArbiter, useNextDealId } from "@/lib/hooks";
import { EscrowCharts } from "@/components/escrow-charts";

// Arbiter Alert Component
function ArbiterAlert() {
  const { isConnected, address } = useAppKitAccount();
  const publicClient = usePublicClient({ chainId: escrowContract.chainId });
  const { data: nextDealId } = useNextDealId();
  const { data: isArbiter } = useIsApprovedArbiter(
    address as `0x${string}` || '0x0000000000000000000000000000000000000000'
  );
  
  const [pendingDisputes, setPendingDisputes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkForDisputes = async () => {
      if (!isConnected || !address || !isArbiter || !nextDealId || !publicClient) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const maxId = Number(nextDealId);
        let disputeCount = 0;
        
        // Loop through all escrows to find disputes where the current user is the arbiter
        for (let i = 0; i < maxId; i++) {
          try {
            const dealData = await publicClient.readContract({
              address: escrowContract.address as `0x${string}`,
              abi: escrowContract.abi,
              functionName: 'getDeal',
              args: [BigInt(i)],
            });
            
            // Check if the current user is the arbiter and the escrow is in disputed state
            if (
              dealData && 
              dealData[2].toLowerCase() === address.toLowerCase() && // arbiter
              Number(dealData[5]) === 3 // DISPUTED state
            ) {
              disputeCount++;
            }
          } catch (error) {
            console.error(`Error checking escrow ${i}:`, error);
          }
        }
        
        setPendingDisputes(disputeCount);
      } catch (error) {
        console.error("Error checking for disputes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkForDisputes();
  }, [isConnected, address, isArbiter, nextDealId, publicClient]);
  
  if (isLoading || !isConnected || !isArbiter || pendingDisputes === 0) {
    return null;
  }
  
  return (
    <div className="container mx-auto max-w-6xl px-4 mt-4">
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Pending Disputes</AlertTitle>
        <AlertDescription className="flex justify-between items-center">
          <span>You have {pendingDisputes} {pendingDisputes === 1 ? 'dispute' : 'disputes'} waiting for your arbitration.</span>
          <Button size="sm" asChild>
            <Link href="/arbitrate">Review Disputes</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main>
        {/* Arbiter Alert */}
        <ArbiterAlert />
        
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2 space-y-6">
                <h1 className="text-5xl font-bold leading-tight">
                  Secure Blockchain Escrow Platform
                </h1>
                <p className="text-xl text-muted-foreground">
                  NextEscrow provides a trustless escrow service powered by blockchain technology.
                  Buy and sell with confidence, without having to trust the other party.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/escrows">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/learn">
                      Learn More
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-md aspect-square">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl font-bold text-primary/30 tracking-tighter">NextEscrow</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Platform Statistics Charts */}
        <EscrowCharts />
        
        {/* Features Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose NextEscrow</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Secure Smart Contracts</h3>
                <p className="text-muted-foreground">
                  All escrow agreements are secured by audited smart contracts that cannot be altered once deployed.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Multi-Token Support</h3>
                <p className="text-muted-foreground">
                  Our platform supports both ETH and any ERC-20 token, giving you flexibility in how you conduct transactions.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Trusted Arbitrators</h3>
                <p className="text-muted-foreground">
                  Our arbitrator network consists of trusted community members with a track record of fair dispute resolution.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Simple Process</h3>
                <p className="text-muted-foreground">
                  Create an escrow, deposit funds, and release payment when satisfied - all with a user-friendly interface.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Quick Resolution</h3>
                <p className="text-muted-foreground">
                  In case of disputes, our arbitration process ensures quick and fair resolution for all parties involved.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No Middlemen</h3>
                <p className="text-muted-foreground">
                  Eliminate expensive middlemen and reduce fees while maintaining security through blockchain technology.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect your wallet and create your first escrow agreement in minutes. 
              Experience the security and convenience of blockchain escrow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/escrows">
                  View Escrows
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/create">
                  Create New Escrow
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
