'use client'

import { NavBar } from "@/components/nav-bar";
import { useAppKitAccount } from "@reown/appkit/react";
import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { AddressDisplay } from "@/components/address-display";
import { knownArbiters, escrowContract } from "@/lib/contracts";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";
import { useNextDealId, useIsApprovedArbiter } from "@/lib/hooks";
import { toast } from "sonner";

// Define a type for escrow data (matching the contract)
interface EscrowData {
  buyer: `0x${string}`;
  seller: `0x${string}`;
  arbiter: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  state: number;
  disputeReason: string;
  createdAt: bigint;
}

interface Escrow {
  id: number;
  data: EscrowData;
}

export default function Arbitrate() {
  const { isConnected, address } = useAppKitAccount();
  const publicClient = usePublicClient({ chainId: escrowContract.chainId });
  const router = useRouter();
  const { data: nextDealId, isLoading: isLoadingNextDealId } = useNextDealId();
  
  // Check if current user is an approved arbiter
  const { data: isArbiter, isLoading: isCheckingArbiter } = useIsApprovedArbiter(
    address as `0x${string}` || '0x0000000000000000000000000000000000000000'
  );
  
  // State for loaded escrows
  const [allEscrows, setAllEscrows] = useState<Escrow[]>([]);
  const [isLoadingEscrows, setIsLoadingEscrows] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Load all escrows
  const loadEscrows = async () => {
    if (!nextDealId || !isConnected || !publicClient) {
      return;
    }
    
    setIsLoadingEscrows(true);
    
    try {
      const maxId = Number(nextDealId);
      const loadedEscrows: Escrow[] = [];
      
      // Load all escrows
      for (let i = 0; i < maxId; i++) {
        try {
          const dealData = await publicClient.readContract({
            address: escrowContract.address as `0x${string}`,
            abi: escrowContract.abi,
            functionName: 'getDeal',
            args: [BigInt(i)],
          });
          
          if (dealData) {
            const escrowData: EscrowData = {
              buyer: dealData[0] as `0x${string}`,
              seller: dealData[1] as `0x${string}`,
              arbiter: dealData[2] as `0x${string}`,
              token: dealData[3] as `0x${string}`,
              amount: dealData[4] as bigint,
              state: Number(dealData[5]),
              disputeReason: dealData[6] as string,
              createdAt: dealData[7] as bigint
            };
            
            // Add escrows where the current user is the arbiter (regardless of state)
            if (address && escrowData.arbiter.toLowerCase() === address.toLowerCase()) {
              loadedEscrows.push({
                id: i,
                data: escrowData
              });
            }
          }
        } catch (error) {
          console.error(`Error loading escrow ${i}:`, error);
        }
      }
      
      setAllEscrows(loadedEscrows);
    } catch (error) {
      console.error("Error loading escrows:", error);
      toast.error("Failed to load escrows");
    } finally {
      setIsLoadingEscrows(false);
    }
  };
  
  // Load escrows when component mounts, nextDealId changes, or address changes
  useEffect(() => {
    loadEscrows();
  }, [nextDealId, isConnected, publicClient, address]);
  
  // Filter escrows based on the active tab and search/status filters
  const filteredEscrows = allEscrows
    .filter(escrow => {
      // Filter by tab (escrow state)
      if (activeTab === "pending" && [4, 5, 6].includes(escrow.data.state)) {
        // In pending tab, exclude completed (4), refunded (5), cancelled (6)
        return false;
      }
      if (activeTab === "resolved" && ![4, 5, 6].includes(escrow.data.state)) {
        // In resolved tab, only show completed (4), refunded (5), cancelled (6)
        return false;
      }
      
      // Apply status filter if not set to "all"
      if (statusFilter !== "all" && escrow.data.state !== parseInt(statusFilter)) {
        return false;
      }
      
      // Apply search filter if search term exists
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          escrow.id.toString().includes(searchLower) ||
          escrow.data.buyer.toLowerCase().includes(searchLower) ||
          escrow.data.seller.toLowerCase().includes(searchLower) ||
          escrow.data.disputeReason.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by state first (disputed first), then by createdAt (newest first)
      if (a.data.state === 3 && b.data.state !== 3) return -1;
      if (a.data.state !== 3 && b.data.state === 3) return 1;
      return Number(b.data.createdAt - a.data.createdAt);
    });
  
  // Helper function to get status badge
  const getStatusBadge = (state: number) => {
    switch (state) {
      case 0: // AWAITING_PAYMENT
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting Payment</Badge>;
      case 1: // AWAITING_DELIVERY
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Awaiting Delivery</Badge>;
      case 2: // SHIPPED
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Shipped</Badge>;
      case 3: // DISPUTED
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Disputed</Badge>;
      case 4: // COMPLETED
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 5: // REFUNDED
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Refunded</Badge>;
      case 6: // CANCELLED
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Helper function to format amount
  const formatAmount = (amount: bigint, decimals: number = 18): string => {
    try {
      return formatUnits(amount, decimals);
    } catch (error) {
      console.error("Error formatting amount:", error);
      return "0";
    }
  };
  
  // Loading states
  if (isLoadingNextDealId || isCheckingArbiter) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        
        <main className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Check if the user is not an arbiter
  if (isConnected && address && !isArbiter && !isCheckingArbiter) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        
        <main className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-6">Arbitrate Disputes</h1>
          
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Not Authorized</CardTitle>
              <CardDescription>
                Your wallet is not registered as an approved arbiter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                To become an arbiter, you need to be approved by the contract owner.
                Please contact the platform administrator if you believe this is an error.
              </p>
              
              <div className="mt-4 p-4 bg-muted/40 rounded-md">
                <h3 className="font-medium mb-2">Current registered arbiters:</h3>
                <div className="space-y-2">
                  {knownArbiters.map((arbiter, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AddressDisplay address={arbiter.address} name={arbiter.name} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/escrows">View All Escrows</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }
  
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
                <CardTitle>Arbiter Dashboard</CardTitle>
                <CardDescription>
                  Review and resolve disputes for escrows where you are assigned as the arbiter.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  When you arbitrate a dispute, you will review the evidence provided by both parties and make a fair decision.
                  You can either award the funds to the seller (completing the deal) or refund the buyer.
                </p>
                <div className="bg-primary/10 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Arbitrator Guidelines:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Review all evidence carefully before making a decision</li>
                    <li>Consider both buyer and seller perspectives</li>
                    <li>Review the dispute reason provided by the buyer</li>
                    <li>Make decisions in a timely manner</li>
                    <li>Once a decision is made, it cannot be reversed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <div className="mb-6">
              <Tabs 
                defaultValue="pending" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                    <TabsTrigger value="pending" className="px-4">
                      Active Escrows
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="px-4">
                      Resolved Cases
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-60">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by ID, address..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select 
                      value={statusFilter} 
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="0">Awaiting Payment</SelectItem>
                        <SelectItem value="1">Awaiting Delivery</SelectItem>
                        <SelectItem value="2">Shipped</SelectItem>
                        <SelectItem value="3">Disputed</SelectItem>
                        <SelectItem value="4">Completed</SelectItem>
                        <SelectItem value="5">Refunded</SelectItem>
                        <SelectItem value="6">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <TabsContent value="pending" className="mt-0">
                  {isLoadingEscrows ? (
                    <div className="flex items-center justify-center min-h-[20vh]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-sm">Loading escrows...</p>
                      </div>
                    </div>
                  ) : (
                    filteredEscrows.length > 0 ? (
                      <div className="space-y-4">
                        {filteredEscrows.map((escrow) => (
                          <Card key={escrow.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <CardTitle className="mr-2">Escrow #{escrow.id}</CardTitle>
                                  {getStatusBadge(escrow.data.state)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Created: {new Date(Number(escrow.data.createdAt) * 1000).toLocaleString()}
                                </p>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                <div>
                                  <h3 className="font-medium text-sm mb-2">Transaction Details</h3>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">Amount:</span>
                                      <span className="font-medium">
                                        {formatAmount(escrow.data.amount)} {escrow.data.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'Tokens'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm text-muted-foreground">Buyer:</span>
                                      <AddressDisplay address={escrow.data.buyer} size="sm" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm text-muted-foreground">Seller:</span>
                                      <AddressDisplay address={escrow.data.seller} size="sm" />
                                    </div>
                                  </div>
                                </div>
                                
                                {escrow.data.state === 3 && escrow.data.disputeReason && (
                                <div>
                                    <h3 className="font-medium text-sm mb-2">Dispute Reason</h3>
                                    <p className="text-sm p-2 bg-red-50 border border-red-100 rounded-md">
                                      {escrow.data.disputeReason}
                                    </p>
                                </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="flex justify-end border-t pt-3">
                              <Button
                                variant="default"
                                className="gap-2"
                                onClick={() => router.push(`/escrow/${escrow.id}`)}
                              >
                                {escrow.data.state === 3 ? "Review Dispute" : "View Details"}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed border-2">
                        <CardHeader className="text-center">
                          <CardTitle>No Active Escrows</CardTitle>
                          <CardDescription>
                            You don&apos;t have any active escrows where you are assigned as the arbiter.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                          <div className="rounded-full bg-muted p-3 mb-4">
                            <Search className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground text-center max-w-md">
                            When you are assigned as an arbiter for an escrow, it will appear here.
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </TabsContent>
                
                <TabsContent value="resolved" className="mt-0">
                  {isLoadingEscrows ? (
                    <div className="flex items-center justify-center min-h-[20vh]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-sm">Loading escrows...</p>
                      </div>
                    </div>
                  ) : (
                    filteredEscrows.length > 0 ? (
                      <div className="space-y-4">
                        {filteredEscrows.map((escrow) => (
                          <Card key={escrow.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <CardTitle className="mr-2">Escrow #{escrow.id}</CardTitle>
                                  {getStatusBadge(escrow.data.state)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Created: {new Date(Number(escrow.data.createdAt) * 1000).toLocaleString()}
                                </p>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                <div>
                                  <h3 className="font-medium text-sm mb-2">Transaction Details</h3>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">Amount:</span>
                                      <span className="font-medium">
                                        {formatAmount(escrow.data.amount)} {escrow.data.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'Tokens'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm text-muted-foreground">Buyer:</span>
                                      <AddressDisplay address={escrow.data.buyer} size="sm" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm text-muted-foreground">Seller:</span>
                                      <AddressDisplay address={escrow.data.seller} size="sm" />
                                    </div>
                                  </div>
                                </div>
                                
                                {escrow.data.state === 3 && escrow.data.disputeReason && (
                                <div>
                                    <h3 className="font-medium text-sm mb-2">Dispute Reason</h3>
                                    <p className="text-sm p-2 bg-red-50 border border-red-100 rounded-md">
                                      {escrow.data.disputeReason}
                                    </p>
                                </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="flex justify-end border-t pt-3">
                              <Button
                                variant="default"
                                className="gap-2"
                                onClick={() => router.push(`/escrow/${escrow.id}`)}
                              >
                                {escrow.data.state === 3 ? "Review Dispute" : "View Details"}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed border-2">
                        <CardHeader className="text-center">
                          <CardTitle>No Resolved Cases</CardTitle>
                          <CardDescription>
                            You haven&apos;t resolved any disputes yet.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                          <div className="rounded-full bg-muted p-3 mb-4">
                            <Search className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground text-center max-w-md">
                            After you resolve a dispute, it will be listed here for your reference.
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 