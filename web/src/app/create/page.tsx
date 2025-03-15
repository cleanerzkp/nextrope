'use client'

import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppKitAccount } from "@reown/appkit/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEscrow() {
  const router = useRouter();
  const { isConnected } = useAppKitAccount();
  const [paymentType, setPaymentType] = useState("eth");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, we would submit the escrow details to the blockchain
    // For this demo, we'll just navigate to the escrows page
    router.push("/escrows");
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Create New Escrow</h1>
        
        {!isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to create an escrow agreement
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Escrow Details</CardTitle>
              <CardDescription>
                Create a new escrow agreement for your transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="e.g., MacBook Pro (2023) Purchase" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of the item or service"
                    rows={4}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="counterparty">Counterparty Address</Label>
                    <Input
                      id="counterparty"
                      placeholder="0x..."
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="arbitrator">Arbitrator Address</Label>
                    <Input
                      id="arbitrator"
                      placeholder="0x..."
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-type">Payment Type</Label>
                    <Select
                      defaultValue={paymentType}
                      onValueChange={setPaymentType}
                    >
                      <SelectTrigger id="payment-type">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eth">ETH</SelectItem>
                        <SelectItem value="erc20">ERC-20 Token</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {paymentType === "erc20" && (
                    <div className="space-y-2">
                      <Label htmlFor="token-address">Token Address</Label>
                      <Input
                        id="token-address"
                        placeholder="0x..."
                        required={paymentType === "erc20"}
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      min="0"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiration">Expiration (days)</Label>
                    <Input
                      id="expiration"
                      type="number"
                      min="1"
                      defaultValue="14"
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Create Escrow
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
} 