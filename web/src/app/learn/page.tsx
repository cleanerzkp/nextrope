import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LearnMore() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-6">How NextTrope Works</h1>
        
        <div className="max-w-3xl mx-auto space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What is Blockchain Escrow?</h2>
            <p className="text-muted-foreground">
              Blockchain escrow provides a secure way to buy and sell goods and services without having to trust the other party. 
              The funds are locked in a smart contract until both parties agree that the terms of the transaction have been met.
            </p>
            <p className="text-muted-foreground">
              Unlike traditional escrow services, blockchain escrow is decentralized, transparent, and immutable, 
              providing a higher level of security and trust for all parties involved.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">The Escrow Process</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-muted/50 p-6 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-4">1</div>
                <h3 className="text-xl font-medium mb-2">Create Escrow</h3>
                <p className="text-muted-foreground">Seller creates an escrow, defining the terms, price, and selecting an arbitrator.</p>
              </div>
              
              <div className="bg-muted/50 p-6 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-4">2</div>
                <h3 className="text-xl font-medium mb-2">Buyer Deposits</h3>
                <p className="text-muted-foreground">Buyer reviews and agrees to the terms, then deposits the funds into the smart contract.</p>
              </div>
              
              <div className="bg-muted/50 p-6 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mb-4">3</div>
                <h3 className="text-xl font-medium mb-2">Completion</h3>
                <p className="text-muted-foreground">After the buyer receives the item/service, they release the funds to the seller.</p>
              </div>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Dispute Resolution</h2>
            <p className="text-muted-foreground">
              If a dispute arises, the arbitrator chosen during escrow creation can step in to resolve it. 
              The arbitrator reviews evidence from both buyer and seller before making a decision on how 
              to allocate the escrowed funds.
            </p>
            <div className="bg-muted p-4 rounded-md border border-muted-foreground/20 mt-4">
              <h3 className="font-medium mb-2">Dispute Process:</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                <li>Buyer or seller initiates a dispute</li>
                <li>Both parties submit evidence and statements</li>
                <li>Arbitrator reviews the case</li>
                <li>Arbitrator makes a decision on fund allocation</li>
                <li>Smart contract automatically executes the decision</li>
              </ol>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Security Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Smart Contract Security</h3>
                <p className="text-muted-foreground">
                  All escrow agreements are secured by audited smart contracts that cannot be altered once deployed. 
                  The code is open-source and transparent.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Multi-Token Support</h3>
                <p className="text-muted-foreground">
                  Our platform supports both ETH and any ERC-20 token, giving you flexibility in how you 
                  want to conduct your transactions.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Timelock Protection</h3>
                <p className="text-muted-foreground">
                  Escrows include a timelock feature that automatically resolves the transaction if 
                  no action is taken within the specified timeframe.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Trusted Arbitrators</h3>
                <p className="text-muted-foreground">
                  Our arbitrator network consists of trusted community members with high reputation scores 
                  and a track record of fair dispute resolution.
                </p>
              </div>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Get Started</h2>
            <p className="text-muted-foreground">
              Ready to use blockchain escrow for your transactions? Connect your wallet and create your 
              first escrow agreement in minutes.
            </p>
            <div className="flex gap-4 mt-6">
              <Button asChild size="lg">
                <Link href="/create">Create Escrow</Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
} 