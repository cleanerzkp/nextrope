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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// This would typically come from an API or blockchain call
const getMockEscrow = (id: string) => {
  return {
    id,
    title: 'MacBook Pro (2023)',
    description: 'Selling my MacBook Pro, 16-inch, M2 Pro, 32GB RAM, 1TB SSD. The device is in excellent condition with only minor signs of use. Includes original packaging and accessories.',
    counterparty: '0x1234...5678',
    arbitrator: '0xabcd...ef01',
    seller: '0x9876...5432',
    buyer: '0x1234...5678',
    amount: '3.5',
    token: 'ETH',
    status: 'active',
    created: '2023-05-15',
    expires: '2023-06-15',
    timeline: [
      { date: '2023-05-15', event: 'Escrow created by seller', actor: '0x9876...5432' },
      { date: '2023-05-17', event: 'Funds deposited by buyer', actor: '0x1234...5678' },
    ]
  };
};

export default function EscrowDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isConnected, address } = useAppKitAccount();
  const [isLoading, setIsLoading] = useState(false);
  
  const escrow = getMockEscrow(params.id);
  
  // Determine the user's role in this escrow
  const isSeller = address && address.startsWith('0x9876'); // Mock check
  const isBuyer = address && address.startsWith('0x1234'); // Mock check
  const isArbitrator = address && address.startsWith('0xabcd'); // Mock check
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Active</Badge>;
      case 'dispute':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Dispute</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const handleAction = (action: string) => {
    setIsLoading(true);
    
    // Simulate blockchain transaction
    setTimeout(() => {
      setIsLoading(false);
      
      // For the demo, just navigate back to the escrows list
      router.push('/escrows');
    }, 2000);
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/escrows">Back</Link>
            </Button>
            <h1 className="text-3xl font-bold">Escrow Details</h1>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(escrow.status)}
          </div>
        </div>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to view escrow details
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{escrow.title}</CardTitle>
                <CardDescription>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span>{escrow.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{escrow.created}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span>{escrow.expires}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{escrow.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Transaction Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">{escrow.amount} {escrow.token}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seller:</span>
                          <span className="font-medium">{escrow.seller}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Buyer:</span>
                          <span className="font-medium">{escrow.buyer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Arbitrator:</span>
                          <span className="font-medium">{escrow.arbitrator}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Timeline</h3>
                      <div className="space-y-2">
                        {escrow.timeline.map((event, index) => (
                          <div key={index} className="text-sm border-l-2 border-muted pl-3 py-1">
                            <div className="font-medium">{event.event}</div>
                            <div className="text-muted-foreground flex justify-between">
                              <span>{event.date}</span>
                              <span>{event.actor}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {escrow.status === 'active' && isBuyer && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Report Issue</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Report an Issue</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will initiate a dispute process. The arbitrator will review your case and make a decision.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('dispute')}>
                          {isLoading ? 'Processing...' : 'Confirm'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {escrow.status === 'active' && isBuyer && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button>Release Funds</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Release Funds</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will release the escrowed funds to the seller. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('release')}>
                          {isLoading ? 'Processing...' : 'Confirm'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {escrow.status === 'active' && isSeller && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Cancel Escrow</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Escrow</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel the escrow and return funds to the buyer. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('cancel')}>
                          {isLoading ? 'Processing...' : 'Confirm'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {escrow.status === 'dispute' && isArbitrator && (
                  <Tabs defaultValue="buyer">
                    <TabsList>
                      <TabsTrigger value="buyer">Favor Buyer</TabsTrigger>
                      <TabsTrigger value="seller">Favor Seller</TabsTrigger>
                      <TabsTrigger value="split">Split Funds</TabsTrigger>
                    </TabsList>
                    <TabsContent value="buyer" className="mt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Refund to Buyer</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Refund to Buyer</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will refund the full amount to the buyer and close the escrow.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleAction('refund')}>
                              {isLoading ? 'Processing...' : 'Confirm'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TabsContent>
                    <TabsContent value="seller" className="mt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Release to Seller</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Release to Seller</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will release the full amount to the seller and close the escrow.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleAction('release')}>
                              {isLoading ? 'Processing...' : 'Confirm'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TabsContent>
                    <TabsContent value="split" className="mt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Split 50/50</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Split Funds</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will split the funds equally between buyer and seller and close the escrow.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleAction('split')}>
                              {isLoading ? 'Processing...' : 'Confirm'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TabsContent>
                  </Tabs>
                )}
              </CardFooter>
            </Card>
          </>
        )}
      </main>
    </div>
  );
} 