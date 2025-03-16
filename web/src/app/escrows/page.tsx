'use client'

import { NavBar } from "@/components/nav-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, ShoppingBag, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useNextDealId, getEscrowStateName } from "@/lib/hooks";
import Link from "next/link";
import { AddressDisplay } from "@/components/address-display";
import { knownTokens, escrowContract } from "@/lib/contracts";
import { formatEther, formatUnits } from "viem";
import Image from "next/image";
import { usePublicClient } from "wagmi";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getExplorerUrl } from "@/lib/utils";

// Define a type for escrow data
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

export default function EscrowsPage() {
  const { isConnected, address } = useAppKitAccount();
  const { data: nextDealId, isLoading: isLoadingNextDealId } = useNextDealId();
  const publicClient = usePublicClient({ chainId: escrowContract.chainId });
  
  // State for loaded escrows
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoadingEscrows, setIsLoadingEscrows] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Helper to format amount with proper decimals
  const formatAmount = (amount: bigint, tokenAddress?: `0x${string}`) => {
    if (!tokenAddress) {
      return formatEther(amount);
    }
    
    const token = knownTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (!token) {
      // Check for common token addresses even if not in knownTokens
      // This prevents the default ETH fallback for known tokens
      console.log(`Token not found in knownTokens: ${tokenAddress}`);
      return formatUnits(amount, 18); // Default to 18 decimals if token not found
    }
    
    return formatUnits(amount, token.decimals);
  };
  
  // Helper to get token symbol by address
  const getTokenSymbol = (tokenAddress?: `0x${string}`) => {
    if (!tokenAddress) return 'ETH';
    
    const token = knownTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (token) return token.symbol;
    
    // Handle common tokens not in knownTokens list
    // You can add more token addresses as needed
    const commonTokens: Record<string, string> = {
      '0xaD6D458402F60fD3Bd25163575031ACDce07538D': 'DAI', // Ropsten DAI
      '0xc778417E063141139Fce010982780140Aa0cD5Ab': 'WETH', // Ropsten WETH
      '0x07865c6E87B9F70255377e024ace6630C1Eaa37F': 'USDC', // Goerli USDC
      '0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02': 'USDT', // Sepolia USDT
    };
    
    const lowerCaseAddress = tokenAddress.toLowerCase();
    for (const [addr, symbol] of Object.entries(commonTokens)) {
      if (addr.toLowerCase() === lowerCaseAddress) {
        return symbol;
      }
    }
    
    // If still not found, return token address format
    return `${tokenAddress.slice(0, 6)}...`;
  };
  
  // Helper to get explorer URL
  const getExplorerLink = () => {
    return getExplorerUrl(escrowContract.chainId, 'address', escrowContract.address);
  };
  
  // Load all escrows
  useEffect(() => {
    const loadEscrows = async () => {
      if (!nextDealId || !isConnected || !publicClient) {
        return;
      }
      
      setIsLoadingEscrows(true);
      
      try {
        const maxId = Number(nextDealId);
        const loadedEscrows: Escrow[] = [];
        
        // Load the latest 10 escrows (or all if less than 10), starting from ID 0
        const startId = Math.max(0, maxId - 10);
        
        for (let i = startId; i < maxId; i++) {
          try {
            const dealData = await publicClient.readContract({
              address: escrowContract.address as `0x${string}`,
              abi: escrowContract.abi,
              functionName: 'getDeal',
              args: [BigInt(i)],
            });
            
            if (dealData) {
              loadedEscrows.push({
                id: i,
                data: {
                  buyer: dealData[0] as `0x${string}`,
                  seller: dealData[1] as `0x${string}`,
                  arbiter: dealData[2] as `0x${string}`,
                  token: dealData[3] as `0x${string}`,
                  amount: dealData[4] as bigint,
                  state: Number(dealData[5]),
                  disputeReason: dealData[6] as string,
                  createdAt: dealData[7] as bigint
                }
              });
            }
          } catch (error) {
            console.error(`Error loading escrow ${i}:`, error);
          }
        }
        
        setEscrows(loadedEscrows);
      } catch (error) {
        console.error("Error loading escrows:", error);
      } finally {
        setIsLoadingEscrows(false);
      }
    };
    
    loadEscrows();
  }, [nextDealId, isConnected, publicClient]);
  
  // Filter escrows based on active tab
  const filteredEscrows = escrows.filter(escrow => {
    if (!address) return true;
    const lowerAddress = address.toLowerCase();
    
    switch (activeTab) {
      case "buyer":
        return escrow.data.buyer.toLowerCase() === lowerAddress;
      case "seller":
        return escrow.data.seller.toLowerCase() === lowerAddress;
      case "arbiter":
        return escrow.data.arbiter.toLowerCase() === lowerAddress;
      default:
        return true;
    }
  });
  
  // Get status badge for an escrow
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
  
  // Loading state
  if (isLoadingNextDealId || isLoadingEscrows) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        
        <main className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading escrows...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Escrows</h1>
            <p className="text-muted-foreground">
              View and manage all escrow transactions
            </p>
          </div>
          
          <Link href="/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Escrow
            </Button>
          </Link>
        </div>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to view escrow transactions
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <Tabs 
                defaultValue="all" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 mb-6 w-full sm:w-auto">
                  <TabsTrigger value="all" className="px-4">
                    All Escrows
                  </TabsTrigger>
                  <TabsTrigger value="buyer" className="px-4">
                    As Buyer
                  </TabsTrigger>
                  <TabsTrigger value="seller" className="px-4">
                    As Seller
                  </TabsTrigger>
                  <TabsTrigger value="arbiter" className="px-4">
                    As Arbiter
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  {/* Content is rendered below */}
                </TabsContent>
                <TabsContent value="buyer" className="mt-0">
                  {/* Content is rendered below */}
                </TabsContent>
                <TabsContent value="seller" className="mt-0">
                  {/* Content is rendered below */}
                </TabsContent>
                <TabsContent value="arbiter" className="mt-0">
                  {/* Content is rendered below */}
                </TabsContent>
              </Tabs>
            </div>
            
            {filteredEscrows.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardHeader className="text-center">
                  <CardTitle>No Escrows Found</CardTitle>
                  <CardDescription>
                    {activeTab === "all" ? (
                      "You haven't created any escrows yet"
                    ) : activeTab === "buyer" ? (
                      "You aren't a buyer in any escrows yet"
                    ) : activeTab === "seller" ? (
                      "You aren't a seller in any escrows yet"
                    ) : (
                      "You aren't an arbiter in any escrows yet"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    {activeTab === "all" ? (
                      "Create your first escrow transaction to securely buy or sell items with trust"
                    ) : (
                      "Switch to a different tab to see other escrows"
                    )}
                  </p>
                  {activeTab === "all" && (
                    <Link href="/create">
                      <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Escrow
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEscrows.map((escrow) => {
                  const { id, data } = escrow;
                  const token = data.token 
                    ? knownTokens.find(t => t.address.toLowerCase() === data.token.toLowerCase()) 
                    : null;
                  
                  // Determine user's role in this escrow for highlighting
                  let roleLabel = null;
                  if (address) {
                    const lowerAddress = address.toLowerCase();
                    if (data.buyer.toLowerCase() === lowerAddress) {
                      roleLabel = <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">You: Buyer</Badge>;
                    } else if (data.seller.toLowerCase() === lowerAddress) {
                      roleLabel = <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">You: Seller</Badge>;
                    } else if (data.arbiter.toLowerCase() === lowerAddress) {
                      roleLabel = <Badge className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-100">You: Arbiter</Badge>;
                    }
                  }
                  
                  return (
                    <Link href={`/escrow/${id}`} key={id} className="transition-transform hover:scale-[1.02]">
                      <Card className="h-full hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div className="flex items-center">
                            <CardTitle className="text-lg">Escrow #{id}</CardTitle>
                            {roleLabel}
                          </div>
                          {getStatusBadge(data.state)}
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Amount</p>
                              <div className="flex items-center gap-2">
                                {token?.icon ? (
                                  <div className="relative w-5 h-5">
                                    <Image 
                                      src={token.icon} 
                                      alt={token.symbol} 
                                      fill 
                                      className="rounded-full"
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                    {getTokenSymbol(data.token).substring(0, 1)}
                                  </div>
                                )}
                                <p className="font-semibold">
                                  {formatAmount(data.amount, data.token)} {getTokenSymbol(data.token)}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Buyer</p>
                              <AddressDisplay address={data.buyer} size="sm" />
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Seller</p>
                              <AddressDisplay address={data.seller} size="sm" />
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Created</p>
                              <p className="text-sm">
                                {new Date(Number(data.createdAt) * 1000).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <span className="text-xs text-muted-foreground">
                            Status: {getEscrowStateName(data.state)}
                          </span>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                              className="text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a 
                                href={getExplorerLink()} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Explorer 🌐
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs">
                              View Details
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
} 