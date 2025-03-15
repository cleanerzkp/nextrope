'use client'

import { NavBar } from "@/components/nav-bar";
import { useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Mock data for UI demonstration
const mockDisputedEscrows = [
  {
    id: '4',
    title: 'Gaming PC Setup',
    description: 'Complete gaming PC setup with RTX 4080',
    seller: '0x4567...8901',
    buyer: '0x5678...9012',
    amount: '4500',
    token: 'USDT',
    status: 'dispute',
    created: '2023-05-01',
    disputeReason: 'Item not as described, missing components',
  },
  {
    id: '5',
    title: 'Vintage Watch Collection',
    description: 'Collection of 5 vintage watches from 1960s',
    seller: '0x6789...0123',
    buyer: '0x7890...1234',
    amount: '2.8',
    token: 'ETH',
    status: 'dispute',
    created: '2023-05-05',
    disputeReason: 'One watch is non-functional, seller refusing return',
  },
];

export default function Arbitrate() {
  const { isConnected } = useAppKitAccount();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Arbitrate Disputes</h1>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to view disputes requiring arbitration
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>About Arbitration</CardTitle>
                <CardDescription>
                  As an arbitrator, you are responsible for resolving disputes between buyers and sellers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  When you arbitrate a dispute, you will review the evidence provided by both parties and make a fair decision.
                  Arbitrators are compensated with a small fee for each successfully resolved dispute.
                </p>
                <div className="bg-primary/10 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Arbitrator Guidelines:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Review all evidence carefully before making a decision</li>
                    <li>Consider both buyer and seller perspectives</li>
                    <li>Aim for fair resolution based on facts and evidence</li>
                    <li>Make decisions in a timely manner (within 7 days)</li>
                    <li>Maintain neutrality and confidentiality</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Disputes Requiring Arbitration</h2>
              <Badge>{mockDisputedEscrows.length} Active</Badge>
            </div>
            
            {mockDisputedEscrows.length > 0 ? (
              <div className="space-y-4">
                {mockDisputedEscrows.map((escrow) => (
                  <Card key={escrow.id}>
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle>{escrow.title}</CardTitle>
                        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          Dispute
                        </Badge>
                      </div>
                      <CardDescription>{escrow.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <div>
                          <h3 className="font-medium mb-2">Transaction Details</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Amount:</span>
                              <span>{escrow.amount} {escrow.token}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Seller:</span>
                              <span>{escrow.seller}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Buyer:</span>
                              <span>{escrow.buyer}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span>{escrow.created}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Dispute Reason</h3>
                          <p className="text-sm text-muted-foreground">{escrow.disputeReason}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button asChild>
                        <Link href={`/escrows/${escrow.id}`}>Review Case</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Disputes Found</CardTitle>
                  <CardDescription>
                    There are currently no disputes requiring arbitration.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
} 