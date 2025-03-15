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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Badge
} from "@/components/ui/badge";
import Link from "next/link";

// Define an interface for our escrow data
interface Escrow {
  id: string;
  title: string;
  description: string;
  counterparty: string;
  arbitrator: string;
  amount: string;
  token: string;
  status: 'pending' | 'active' | 'dispute' | 'completed';
  created: string;
}

// Mock data for UI demonstration
const mockEscrowsAsSeller: Escrow[] = [
  {
    id: '1',
    title: 'MacBook Pro (2023)',
    description: 'Selling my MacBook Pro, 16-inch, M2 Pro, 32GB RAM, 1TB SSD',
    counterparty: '0x1234...5678',
    arbitrator: '0xabcd...ef01',
    amount: '3.5',
    token: 'ETH',
    status: 'pending',
    created: '2023-05-15',
  },
  {
    id: '2',
    title: 'iPhone 15 Pro Max',
    description: 'Brand new iPhone 15 Pro Max, 256GB, Titanium finish',
    counterparty: '0x2345...6789',
    arbitrator: '0xbcde...f012',
    amount: '1000',
    token: 'USDC',
    status: 'active',
    created: '2023-05-10',
  },
];

const mockEscrowsAsBuyer: Escrow[] = [
  {
    id: '3',
    title: 'Sony A7IV Camera',
    description: 'Sony A7IV mirrorless camera with 28-70mm lens',
    counterparty: '0x3456...7890',
    arbitrator: '0xcdef...0123',
    amount: '2.2',
    token: 'ETH',
    status: 'active',
    created: '2023-05-08',
  },
];

const mockEscrowsAsArbitrator: Escrow[] = [
  {
    id: '4',
    title: 'Gaming PC Setup',
    description: 'Complete gaming PC setup with RTX 4080',
    counterparty: '0x4567...8901',
    arbitrator: '0xdef0...1234',
    amount: '4500',
    token: 'USDT',
    status: 'dispute',
    created: '2023-05-01',
  },
];

export default function Escrows() {
  const { isConnected } = useAppKitAccount();
  
  const getStatusBadge = (status: Escrow['status']) => {
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
  
  const renderEscrowCard = (escrow: Escrow) => (
    <Card key={escrow.id} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{escrow.title}</CardTitle>
            <CardDescription>{escrow.description}</CardDescription>
          </div>
          {getStatusBadge(escrow.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Amount</p>
            <p className="font-medium">{escrow.amount} {escrow.token}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Created</p>
            <p className="font-medium">{escrow.created}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Counterparty</p>
            <p className="font-medium">{escrow.counterparty}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Arbitrator</p>
            <p className="font-medium">{escrow.arbitrator}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/escrows/${escrow.id}`}>View Details</Link>
        </Button>
        {escrow.status === 'active' && (
          <Button>Release Funds</Button>
        )}
        {escrow.status === 'dispute' && (
          <Button variant="destructive">Resolve Dispute</Button>
        )}
      </CardFooter>
    </Card>
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Escrows</h1>
          <Button asChild>
            <Link href="/create">Create New Escrow</Link>
          </Button>
        </div>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to view your escrow agreements
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Tabs defaultValue="seller">
            <TabsList className="mb-6">
              <TabsTrigger value="seller">As Seller ({mockEscrowsAsSeller.length})</TabsTrigger>
              <TabsTrigger value="buyer">As Buyer ({mockEscrowsAsBuyer.length})</TabsTrigger>
              <TabsTrigger value="arbitrator">As Arbitrator ({mockEscrowsAsArbitrator.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="seller">
              {mockEscrowsAsSeller.length > 0 ? (
                mockEscrowsAsSeller.map(renderEscrowCard)
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Escrows Found</CardTitle>
                    <CardDescription>
                      You have not created any escrow agreements as a seller yet.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild>
                      <Link href="/create">Create New Escrow</Link>
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="buyer">
              {mockEscrowsAsBuyer.length > 0 ? (
                mockEscrowsAsBuyer.map(renderEscrowCard)
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Escrows Found</CardTitle>
                    <CardDescription>
                      You do not have any escrow agreements as a buyer yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="arbitrator">
              {mockEscrowsAsArbitrator.length > 0 ? (
                mockEscrowsAsArbitrator.map(renderEscrowCard)
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Escrows Found</CardTitle>
                    <CardDescription>
                      You do not have any escrow agreements as an arbitrator yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
} 