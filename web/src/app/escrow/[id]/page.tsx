'use client'

import { NavBar } from "@/components/nav-bar";
import { useState, useEffect, useMemo } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useDeal, useConfirmShipment, useConfirmReceipt, useRaiseDispute, useResolveDispute, useDepositETH, useDepositToken, useCancelDeal, ETH_ADDRESS } from "@/lib/hooks";
import { getEscrowStateName } from "@/lib/utils";
import { AddressDisplay } from "@/components/address-display";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2, ShieldQuestion, ShieldAlert, Info, ShoppingBag, Truck, PackageCheck, Wallet, Ban, ExternalLink, Plus, Copy, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { knownTokens } from "@/lib/contracts";
import { formatEther, formatUnits } from "viem";
import { useParams } from "next/navigation";
import { usePublicClient, useConfig, useWriteContract } from "wagmi";
import { escrowContract } from "@/lib/contracts";
import Link from "next/link";
import { SuccessConfetti } from "@/components/success-confetti";
import { getExplorerUrl } from '@/lib/utils';
import { useAtom } from 'jotai';
import { escrowTxHashesAtom } from '@/lib/hooks';

// Define the ERC20 ABI manually for the functions we need
const tokenAbi = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Add an interface for the deal data to help with type checking
interface EscrowData {
  buyer: `0x${string}`;      // Position 0
  seller: `0x${string}`;     // Position 1
  arbiter: `0x${string}`;    // Position 2
  token: `0x${string}`;      // Position 3
  amount: bigint;            // Position 4
  state: number;             // Position 5
  disputeReason: string;     // Position 6
  createdAt: bigint;         // Position 7
  buyerRequestingRefund?: boolean; // Flag for refund request
  resolutionReason?: string; // Resolution reason field
  refundedBuyer?: boolean;   // Flag for buyer refund status
}

// Function to copy text to clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(
    () => {
      toast.success("Copied to clipboard");
    },
    (err) => {
      console.error("Could not copy text: ", err);
      toast.error("Failed to copy");
    }
  );
};

export default function EscrowDetailsPage({ params }: { params: { id: string } }) {
  // Use Next.js hook for params
  const routeParams = useParams();
  const id = typeof routeParams.id === 'string' ? routeParams.id : params.id;
  
  // Parse the deal ID
  const dealId = parseInt(id);
  
  const { address, isConnected } = useAppKitAccount();
  const config = useConfig();
  const currentChainId = config.state.chainId;
  const publicClient = usePublicClient({ chainId: escrowContract.chainId });
  
  // Fetch the deal data
  const { data: dealArray, isLoading, error, refetch } = useDeal(dealId);
  
  // Add state for token decimals
  const [tokenDecimals, setTokenDecimals] = useState<number | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  
  // Create a more structured object to work with, if dealArray is available
  const deal = useMemo(() => {
    if (!dealArray) return null;
    
    return {
      buyer: dealArray[0] as `0x${string}`,
      seller: dealArray[1] as `0x${string}`,
      arbiter: dealArray[2] as `0x${string}`,
      token: dealArray[3] as `0x${string}`,
      amount: dealArray[4] as bigint,
      state: Number(dealArray[5]),
      disputeReason: dealArray[6] as string,
      createdAt: dealArray[7] as bigint,
      buyerRequestingRefund: Boolean(Number(dealArray[5]) === 1),
      resolutionReason: dealArray[6] as string, // This might be in a different position
      refundedBuyer: Boolean(Number(dealArray[5]) === 2)
    } as EscrowData;
  }, [dealArray]);
  
  // Fetch token decimals when deal data changes
  useEffect(() => {
    if (!deal || !deal.token) return;
    
    // Skip for ETH
    if (deal.token.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
      setTokenDecimals(18);
      setTokenSymbol("ETH");
      return;
    }
    
    // Check if it's in known tokens first
    const knownToken = knownTokens.find(t => 
      t.address.toLowerCase() === deal.token.toLowerCase()
    );
    
    if (knownToken) {
      setTokenDecimals(knownToken.decimals);
      setTokenSymbol(knownToken.symbol);
      return;
    }
    
    // Otherwise fetch from blockchain using direct contract calls
    const fetchData = async () => {
      try {
        if (!publicClient) {
          console.error("Public client not available");
          setTokenDecimals(18);
          setTokenSymbol(deal.token.slice(0, 6));
          return;
        }
        
        console.log(`Fetching token data for ${deal.token}`);
        
        // Get token decimals
        const decimals = await publicClient.readContract({
          address: deal.token,
          abi: tokenAbi,
          functionName: 'decimals',
        });
        
        setTokenDecimals(decimals as number);
        console.log(`Token decimals: ${decimals}`);
        
        // Get token symbol
        try {
          const symbol = await publicClient.readContract({
            address: deal.token,
            abi: tokenAbi,
            functionName: 'symbol',
          });
          
          setTokenSymbol(symbol as string);
          console.log(`Token symbol: ${symbol}`);
        } catch (symbolError) {
          console.error("Error fetching token symbol:", symbolError);
          setTokenSymbol(deal.token.slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching token data:", error);
        // Default fallbacks
        setTokenDecimals(18);
        setTokenSymbol(deal.token.slice(0, 6));
      }
    };
    
    fetchData();
  }, [deal]);
  
  // Dialog state
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  // Instead of using state for requestRefund, use a constant since it's always true
  const requestRefund = true; // Always true, no need for state
  
  // Resolution dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [refundBuyer, setRefundBuyer] = useState(true);
  const [resolutionReason, setResolutionReason] = useState("");
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Action hooks
  const { confirmShipment, isPending: isConfirmingShipment } = useConfirmShipment();
  const { confirmReceipt, isPending: isConfirmingReceipt } = useConfirmReceipt();
  const { raiseDispute, isPending: isRaisingDispute } = useRaiseDispute();
  const { resolveDispute, isPending: isResolvingDispute } = useResolveDispute();
  
  // Add hooks for deposit and cancel
  const { depositETH, isPending: isDepositingETH } = useDepositETH();
  const { depositToken, isPending: isDepositingToken } = useDepositToken();
  const { cancelDeal, isPending: isCancellingDeal } = useCancelDeal();
  
  // Check roles
  const isArbiter = deal && address ? deal.arbiter.toLowerCase() === address.toLowerCase() : false; // arbiter is at index 2
  const isBuyer = deal && address ? deal.buyer.toLowerCase() === address.toLowerCase() : false; // buyer is at index 0
  const isSeller = deal && address ? deal.seller.toLowerCase() === address.toLowerCase() : false; // seller is at index 1
  
  // Find the token metadata
  const tokenAddress = deal ? deal.token : null; // token address is at index 3
  const token = tokenAddress ? knownTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase()) : null;
  
  // Helper to format amount with proper decimals
  const formatAmount = (amount: bigint) => {
    if (!tokenAddress) {
      return formatEther(amount);
    }
    
    // Use our fetched token decimals if available
    if (tokenDecimals !== null) {
      return formatUnits(amount, tokenDecimals);
    }
    
    // Check if it's a known token
    if (token) {
      return formatUnits(amount, token.decimals);
    }
    
    // Default to 18 decimals if we don't have the info yet
    return formatUnits(amount, 18);
  };
  
  // Helper to get token symbol
  const getTokenSymbol = () => {
    if (!tokenAddress) return 'ETH';
    
    // Use our fetched token symbol if available
    if (tokenSymbol) {
      return tokenSymbol;
    }
    
    // Check if it's a known token
    if (token) {
      return token.symbol;
    }
    
    // Default to address format if we don't have the info yet
    return `${tokenAddress.slice(0, 6)}...`;
  };
  
  // Add writeContract hook for token approvals
  const { writeContractAsync: writeContract } = useWriteContract();
  
  // Store previous state for change detection
  const [previousState, setPreviousState] = useState<number | null>(null);
  
  // Add confetti state to track if we've shown it already
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [escrowTxHashes] = useAtom(escrowTxHashesAtom);
  
  // Set up polling for updates
  useEffect(() => {
    // Initial load
    refetch();
    
    // Set up auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      refetch();
    }, 10000);
    
    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [refetch]);
  
  // Show notifications when state changes
  useEffect(() => {
    // Only track changes if we have a deal
    if (deal) {
      const currentState = Number(deal.state);
      
      // If we have a previous state and it's different, show notification
      if (previousState !== null && previousState !== currentState) {
        const oldStateName = getEscrowStateName(previousState);
        const newStateName = getEscrowStateName(currentState);
        
        toast.info(`Escrow status changed from ${oldStateName} to ${newStateName}`);
      }
      
      // Update previous state
      setPreviousState(currentState);
    }
  }, [deal, previousState]);
  
  // Add effect to show confetti when escrow is completed
  useEffect(() => {
    // Only show confetti for COMPLETED state (status 4)
    if (deal && Number(deal.state) === 4 && !showConfetti) {
      setShowConfetti(true);
      
      // Hide confetti after 5 seconds
      const timeout = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [deal, showConfetti]);
  
  // Handle confirm shipment
  const handleConfirmShipment = async () => {
    if (!deal) return;
    
    try {
      await confirmShipment(dealId);
      toast.success("Shipment confirmed");
      refetch();
    } catch (error) {
      console.error("Error confirming shipment:", error);
      toast.error("Failed to confirm shipment");
    }
  };
  
  // Handle confirm receipt
  const handleConfirmReceipt = async () => {
    if (!deal) return;
    
    try {
      await confirmReceipt(dealId);
      toast.success("Receipt confirmed, funds released to seller");
      refetch();
    } catch (error) {
      console.error("Error confirming receipt:", error);
      toast.error("Failed to confirm receipt");
    }
  };
  
  // Handle raise dispute
  const handleRaiseDispute = async () => {
    if (!deal) return;
    
    try {
      // Enforce that seller disputes in SHIPPED state are cancellation requests
      // as per the flow diagram requirements
      const isCancellationRequest = 
        (isSeller && deal.state === 2) ? true : 
        (isSeller && deal.state === 1) ? requestRefund : 
        requestRefund;
      
      await raiseDispute({ 
        dealId, 
        reason: disputeReason, 
        isCancellationRequest: isCancellationRequest
      });
      
      const disputeType = isCancellationRequest ? "cancellation request" : "dispute";
      toast.success(`${disputeType} raised successfully`);
      setDisputeDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error raising dispute:", error);
      toast.error("Failed to raise dispute");
    }
  };
  
  // Handle resolve dispute
  const handleResolveDispute = async () => {
    if (!deal) return;
    
    try {
      await resolveDispute({ 
        dealId, 
        refundToBuyer: refundBuyer,
        reason: resolutionReason
      });
      toast.success(refundBuyer ? "Dispute resolved with refund to buyer" : "Dispute resolved with payment to seller");
      setResolveDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error("Failed to resolve dispute");
    }
  };
  
  // Handle ETH deposit
  const handleDepositETH = async () => {
    if (!deal) return;
    
    try {
      await depositETH({
        dealId,
        amount: formatAmount(deal.amount)
      });
      toast.success("ETH deposited successfully");
      refetch();
    } catch (error) {
      console.error("Error depositing ETH:", error);
      toast.error("Failed to deposit ETH");
    }
  };
  
  // Handle token deposit with allowance check
  const handleDepositToken = async () => {
    if (!deal || !address || !publicClient) return;
    
    try {
      // Step 1: Check allowance first
      const tokenContract = {
        address: deal.token as `0x${string}`,
        abi: tokenAbi
      };
      
      console.log(`Starting token deposit process for token ${deal.token}`);
      console.log(`Required amount: ${deal.amount.toString()}`);
      
      try {
        const allowance = await publicClient.readContract({
          ...tokenContract,
          functionName: 'allowance',
          args: [address as `0x${string}`, escrowContract.address as `0x${string}`]
        });
        
        console.log(`Current allowance: ${allowance.toString()}, Required: ${deal.amount.toString()}`);
        
        // Step 2: If allowance is insufficient, request approval
        if (BigInt(allowance) < deal.amount) {
          toast.loading("Approving token transfer...");
          console.log("Allowance insufficient, requesting approval");
          
          try {
            // Only approve exactly the amount needed (more secure than unlimited)
            const approveTx = await writeContract({
              ...tokenContract,
              functionName: 'approve',
              args: [escrowContract.address as `0x${string}`, deal.amount]
            });
            
            toast.dismiss();
            toast.loading("Waiting for approval confirmation...");
            console.log(`Approval transaction submitted: ${approveTx}`);
            
            // Wait for approval to be confirmed
            const receipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
            console.log("Approval confirmed:", receipt);
            toast.dismiss();
            toast.success("Token approval confirmed!");
          } catch (approvalError) {
            console.error("Error in token approval:", approvalError);
            toast.dismiss();
            toast.error(`Approval failed: ${(approvalError as Error).message}`);
            return; // Exit early if approval fails
          }
        } else {
          console.log("Allowance sufficient, proceeding with deposit");
        }
        
        // Step 3: Now deposit the tokens
        toast.loading("Depositing tokens to escrow...");
        const depositResult = await depositToken({
          dealId
        });
        console.log("Deposit result:", depositResult);
        
        toast.dismiss();
        toast.success("Tokens deposited successfully");
        refetch();
      } catch (allowanceError) {
        console.error("Error checking allowance:", allowanceError);
        toast.dismiss();
        toast.error(`Failed to check token allowance: ${(allowanceError as Error).message}`);
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error depositing tokens:", error);
      toast.error("Failed to deposit tokens: " + (error as Error).message);
    }
  };
  
  // Handle cancel deal
  const handleCancelDeal = async () => {
    if (!deal) return;
    
    try {
      await cancelDeal(dealId);
      toast.success("Escrow cancelled successfully");
      refetch();
    } catch (error) {
      console.error("Error cancelling deal:", error);
      toast.error("Failed to cancel escrow");
    }
  };
  
  // Get the transaction status badge
  const getStatusBadge = () => {
    if (!deal) return null;
    
    const state = Number(deal.state);
    
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
  
  // Get the icon for the current status
  const getStatusIcon = () => {
    if (!deal) return <Info className="w-5 h-5" />;
    
    const state = Number(deal.state);
    
    switch (state) {
      case 0: // AWAITING_PAYMENT
        return <ShoppingBag className="w-5 h-5 text-yellow-600" />;
      case 1: // AWAITING_DELIVERY
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 2: // SHIPPED
        return <PackageCheck className="w-5 h-5 text-green-600" />;
      case 3: // DISPUTED
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      case 4: // COMPLETED
        return <CheckCircle2 className="w-5 h-5 text-green-700" />;
      case 5: // REFUNDED
        return <ShieldQuestion className="w-5 h-5 text-purple-600" />;
      case 6: // CANCELLED
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };
  
  // Get the action section based on the current state and user role
  const getActionSection = () => {
    if (!deal || !isConnected) return null;
    
    const state = Number(deal.state);
    const isEth = deal.token.toLowerCase() === ETH_ADDRESS.toLowerCase();
    
    // AWAITING_PAYMENT: Allow buyer to deposit or either party to cancel
    if (state === 0) {
      return (
        <div className="mt-6 space-y-4">
          {isBuyer && (
            <>
              <Button 
                className="w-full" 
                onClick={isEth ? handleDepositETH : handleDepositToken}
                disabled={isDepositingETH || isDepositingToken}
              >
                {isDepositingETH || isDepositingToken ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEth ? "Depositing ETH..." : `Depositing ${token?.symbol || 'Tokens'}...`}
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    {isEth ? "Deposit ETH" : `Deposit ${token?.symbol || 'Tokens'}`}
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                By depositing funds, you are activating this escrow. The funds will be held until you confirm receipt of the item/service.
              </p>
            </>
          )}
          
          {(isBuyer || isSeller) && (
            <div className="pt-4">
              <Button 
                variant="outline" 
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setCancelDialogOpen(true)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel Escrow
              </Button>
              
              {cancelDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                  <div className="bg-background rounded-lg border p-6 shadow-lg w-full max-w-lg">
                    <div className="flex flex-col gap-2 text-center sm:text-left">
                      <h2 className="text-lg leading-none font-semibold">Cancel Escrow</h2>
                      <p className="text-muted-foreground text-sm">
                        Are you sure you want to cancel this escrow? This action cannot be undone.
                      </p>
                    </div>
                    
                    <div className="mt-6 flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setCancelDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          handleCancelDeal();
                          setCancelDialogOpen(false);
                        }}
                        disabled={isCancellingDeal}
                      >
                        {isCancellingDeal ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Confirm Cancellation"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-2">
                Either the buyer or seller can cancel the escrow before payment is deposited.
              </p>
            </div>
          )}
        </div>
      );
    }
    
    // AWAITING_DELIVERY: Seller can confirm shipment, Buyer can raise dispute
    if (state === 1) {
      // For seller actions
      if (isSeller) {
        return (
          <div className="mt-6 space-y-4">
            <Button 
              className="w-full" 
              onClick={handleConfirmShipment}
              disabled={isConfirmingShipment}
            >
              {isConfirmingShipment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Confirm Shipment
                </>
              )}
            </Button>
            
            <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-2">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Raise Dispute
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Raise a Dispute</DialogTitle>
                  <DialogDescription>
                    If there are issues with the payment or other concerns, you can raise a dispute.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="disputeReason">Reason for Dispute</Label>
                    <Textarea 
                      id="disputeReason" 
                      placeholder="Describe any payment issues or other concerns with the transaction..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="requestRefund"
                      checked={true}
                      disabled={true}
                    />
                    <Label htmlFor="requestRefund">Request a refund instead of continuing the transaction</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRaiseDispute}
                    disabled={!disputeReason || isRaisingDispute}
                  >
                    {isRaisingDispute ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Dispute"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <p className="text-sm text-muted-foreground">
              If you need to request a cancellation after shipment, the arbiter will review your case.
            </p>
          </div>
        );
      }
      
      // For buyer actions - Add dispute option for buyer during AWAITING_DELIVERY
      if (isBuyer) {
        return (
          <div className="mt-6 space-y-4">
            <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Raise Dispute
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Raise a Dispute</DialogTitle>
                  <DialogDescription>
                    If the seller is taking too long to ship or there are other issues, you can raise a dispute.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="disputeReason">Reason for Dispute</Label>
                    <Textarea 
                      id="disputeReason" 
                      placeholder="Describe why you're raising this dispute (delays, communication issues, etc.)..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="requestRefund"
                      checked={true}
                      disabled={true}
                    />
                    <Label htmlFor="requestRefund">Request a refund instead of continuing the transaction</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRaiseDispute}
                    disabled={!disputeReason || isRaisingDispute}
                  >
                    {isRaisingDispute ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Dispute"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <p className="text-sm text-muted-foreground">
              If the seller is taking too long to ship or there are other issues with the transaction, you can raise a dispute to have the arbiter review the case.
            </p>
          </div>
        );
      }
    }
    
    // Shipped (Buyer can confirm receipt or raise dispute, Seller can also raise a dispute)
    if (state === 2) {
      // For buyer actions
      if (isBuyer) {
        return (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1" 
                onClick={handleConfirmReceipt}
                disabled={isConfirmingReceipt}
              >
                {isConfirmingReceipt ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Receipt
                  </>
                )}
              </Button>
              
              <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Raise Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Raise a Dispute</DialogTitle>
                    <DialogDescription>
                      Explain the issue with this transaction. The arbiter will review your case.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="disputeReason">Reason for Dispute</Label>
                      <Textarea 
                        id="disputeReason" 
                        placeholder="Describe the issue in detail..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        className="min-h-24"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="requestRefund"
                        checked={true}
                        disabled={true}
                      />
                      <Label htmlFor="requestRefund">Request a refund</Label>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleRaiseDispute}
                      disabled={!disputeReason || isRaisingDispute}
                    >
                      {isRaisingDispute ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Dispute"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Confirm receipt if you received the item/service as expected. Raise a dispute if there is an issue.
            </p>
          </div>
        );
      }
      
      // For seller actions (new!)
      if (isSeller) {
        return (
          <div className="mt-6 space-y-4">
            <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Request Cancellation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Cancellation</DialogTitle>
                  <DialogDescription>
                    As a seller in the Shipped state, you can only request a cancellation which will be reviewed by the arbiter.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="disputeReason">Reason for Cancellation Request</Label>
                    <Textarea 
                      id="disputeReason" 
                      placeholder="Explain why you need to cancel this transaction..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="requestRefund"
                      checked={true}
                      disabled={true}
                    />
                    <Label htmlFor="requestRefund" className="text-muted-foreground">
                      Cancellation requests in the Shipped state will be reviewed by the arbiter
                    </Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleRaiseDispute()}
                    disabled={!disputeReason || isRaisingDispute}
                  >
                    {isRaisingDispute ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <p className="text-sm text-muted-foreground">
              If you need to request a cancellation after shipment, the arbiter will review your case.
            </p>
          </div>
        );
      }
    }
    
    // Disputed (Arbiter can resolve)
    if (state === 3 && isArbiter) {
      return (
        <div className="mt-6 space-y-4">
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-red-700 dark:text-red-400">
                <ShieldAlert className="mr-2 h-5 w-5" /> 
                Dispute Resolution Required
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                As the designated arbiter, you need to review this dispute and make a fair decision.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium dark:text-foreground">Dispute Reason:</h3>
                  <div className="p-3 bg-white dark:bg-background rounded-md border border-red-200 dark:border-red-900 text-sm">
                    {deal.disputeReason || "No reason provided"}
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Transaction Details:</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{formatAmount(deal.amount)} {getTokenSymbol()}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Buyer:</span>
                        <div className="flex items-center space-x-2">
                          <AddressDisplay address={deal.buyer} size="sm" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Seller:</span>
                        <div className="flex items-center space-x-2">
                          <AddressDisplay address={deal.seller} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Guidelines for Arbitration:</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      <li>Review all information carefully</li>
                      <li>Consider both buyer and seller perspectives</li>
                      <li>Make a fair decision based on available evidence</li>
                      <li>Your decision is final and cannot be reversed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-red-200">
              <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <ShieldQuestion className="mr-2 h-4 w-4" />
                    Resolve Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resolve Dispute</DialogTitle>
                    <DialogDescription>
                      As the arbiter, you will decide whether to refund the buyer or release funds to the seller.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="flex flex-col space-y-4">
                      <div className="p-3 rounded-md bg-muted">
                        <p className="text-sm font-medium mb-1">Dispute Reason:</p>
                        <p className="text-sm">{deal.disputeReason || "No reason provided"}</p>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <Label className="text-base">Select Resolution:</Label>
                        <div className="grid gap-2">
                          <div className="flex items-start space-x-3">
                            <Checkbox 
                              id="refundBuyer" 
                              checked={refundBuyer}
                              onCheckedChange={(checked) => {
                                setRefundBuyer(checked as boolean);
                                if (checked) setResolutionReason("After reviewing the dispute, I've decided to refund the buyer due to...");
                              }}
                            />
                            <div>
                              <Label htmlFor="refundBuyer" className="text-base font-medium">
                                Refund the buyer
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                The buyer will receive a full refund of {formatAmount(deal.amount)} {getTokenSymbol()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-3">
                            <Checkbox 
                              id="releaseToSeller" 
                              checked={!refundBuyer}
                              onCheckedChange={(checked) => {
                                setRefundBuyer(!(checked as boolean));
                                if (checked) setResolutionReason("After reviewing the dispute, I've decided to release funds to the seller because...");
                              }}
                            />
                            <div>
                              <Label htmlFor="releaseToSeller" className="text-base font-medium">
                                Release funds to seller
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                The seller will receive the full payment of {formatAmount(deal.amount)} {getTokenSymbol()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="resolutionReason">Reason for Decision</Label>
                      <Textarea 
                        id="resolutionReason" 
                        placeholder="Explain your decision in detail..."
                        value={resolutionReason}
                        onChange={(e) => setResolutionReason(e.target.value)}
                        className="min-h-24"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleResolveDispute}
                      disabled={!resolutionReason || isResolvingDispute}
                    >
                      {isResolvingDispute ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        "Submit Resolution"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
          
          <p className="text-sm text-muted-foreground">
            Your decision as an arbiter is final and will be recorded on the blockchain. Please review all information carefully before resolving this dispute.
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Get the transaction hash for this deal (if available)
  const getTransactionHash = () => {
    // Check various operation types
    const keys = [
      `deposit-${dealId}`,
      `ship-${dealId}`,
      `receipt-${dealId}`,
      `dispute-${dealId}`,
      `resolve-${dealId}`,
      `cancel-${dealId}`
    ];
    
    // Return the first transaction hash found for this deal
    for (const key of keys) {
      if (escrowTxHashes[key]) {
        return escrowTxHashes[key];
      }
    }
    
    return null;
  };
  
  // Get an explorer URL for the transaction or contract
  const getExplorerLink = (type: 'tx' | 'address', value: string) => {
    return getExplorerUrl(escrowContract.chainId, type, value);
  };
  
  // Helper function to format state indicators
  const getStateIndicator = () => {
    if (!deal) return (
      <div className="flex items-center gap-1 text-gray-500">
        <Info className="h-4 w-4" />
        <span>Unknown State</span>
      </div>
    );
    
    switch (Number(deal.state)) {
      case 0: // AWAITING_PAYMENT
        return (
          <div className="flex items-center gap-1 text-yellow-600">
            <Wallet className="h-4 w-4" />
            <span>Awaiting Payment</span>
          </div>
        );
      case 1: // AWAITING_DELIVERY
        return (
          <div className="flex items-center gap-1 text-blue-600">
            <ShoppingBag className="h-4 w-4" />
            <span>Awaiting Delivery</span>
          </div>
        );
      case 2: // SHIPPED
        return (
          <div className="flex items-center gap-1 text-green-600">
            <Truck className="h-4 w-4" />
            <span>Shipped</span>
          </div>
        );
      case 3: // DISPUTED
        return (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Disputed</span>
          </div>
        );
      case 4: // COMPLETED
        return (
          <div className="flex items-center gap-1 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Completed</span>
          </div>
        );
      case 5: // REFUNDED
        return (
          <div className="flex items-center gap-1 text-purple-600">
            <ShieldCheck className="h-4 w-4" />
            <span>Refunded to Buyer</span>
          </div>
        );
      case 6: // CANCELLED
        return (
          <div className="flex items-center gap-1 text-gray-600">
            <Ban className="h-4 w-4" />
            <span>Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-gray-500">
            <Info className="h-4 w-4" />
            <span>Unknown State</span>
          </div>
        );
    }
  };

  // Show dispute information if there was a dispute
  const showDisputeResolution = deal && deal.disputeReason && (Number(deal.state) === 4 || Number(deal.state) === 5);
  
  // If loading, show a loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        
        <main className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading escrow details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // If there's an error, show an error state
  if (error || !deal) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        
        <main className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" /> Error
                </CardTitle>
                <CardDescription>
                  Could not load escrow details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {error?.message || "The escrow with the specified ID could not be found."}
                </p>
                
                <div className="p-3 border rounded bg-muted/10 space-y-2">
                  <p className="text-sm font-medium">Debugging information:</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>Escrow ID: {dealId}</li>
                    <li>Wallet connected: {isConnected ? 'Yes' : 'No'}</li>
                    {address && <li>Your address: {address}</li>}
                    <li>Error type: {error ? (error as unknown as { code?: string }).code || 'Unknown' : 'No data returned'}</li>
                    <li>Current network: {currentChainId === 1 ? 'Ethereum Mainnet' : 
                      currentChainId === 11155111 ? 'Sepolia Testnet' : 
                      `Chain ID ${currentChainId}`}</li>
                    <li>Contract network: {escrowContract.chainId === 1 ? 'Ethereum Mainnet' : 
                      escrowContract.chainId === 11155111 ? 'Sepolia Testnet' : 
                      `Chain ID ${escrowContract.chainId}`}</li>
                    <li>Contract address: {escrowContract.address}</li>
                    <li>Public client ready: {publicClient ? 'Yes' : 'No'}</li>
                  </ul>
                  <p className="text-xs mt-2">
                    Make sure you&apos;re connected to the correct network and have the correct permissions to view this escrow.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Go Back
                </Button>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
                {dealId !== 0 && (
                  <Button variant="outline" asChild>
                    <Link href="/escrow/0">Check Escrow #0</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
          
          {isConnected && publicClient && (
            <Card className="max-w-md w-full mt-4">
              <CardHeader>
                <CardTitle className="text-md">Debug Contract Data</CardTitle>
                <CardDescription>
                  Try manually reading the escrow data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const result = await publicClient.readContract({
                        address: escrowContract.address as `0x${string}`,
                        abi: escrowContract.abi,
                        functionName: 'getDeal',
                        args: [BigInt(dealId)],
                      });
                      console.log('Manual contract read result:', result);
                      toast.success("Contract data logged to console");
                    } catch (err) {
                      console.error('Manual contract read error:', err);
                      toast.error("Failed to read contract data. See console.");
                    }
                  }}
                >
                  Read Contract Data
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SuccessConfetti active={showConfetti} />
      
      <NavBar />
      
      <main className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Escrow #{dealId}</h1>
              <p className="text-muted-foreground">
                View and manage escrow transaction details
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusBadge()}
            </div>
          </div>
          
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Escrow Details</CardTitle>
                <CardDescription>
                  Information about this escrow transaction
                </CardDescription>
              </div>
              
              {deal && (
                <Button variant="outline" size="sm" asChild className="ml-auto">
                  <a 
                    href={getExplorerLink('address', escrowContract.address)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Explorer 🌐
                  </a>
                </Button>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Amount and Payment Info */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <div className="flex items-center gap-2 mt-1">
                      {token?.icon ? (
                        <div className="relative w-6 h-6">
                          <Image 
                            src={token.icon} 
                            alt={token.symbol} 
                            fill 
                            className="rounded-full"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold">
                          {token?.symbol?.substring(0, 1) || getTokenSymbol().substring(0, 1)}
                        </div>
                      )}
                      <p className="text-xl font-bold">
                        {formatAmount(deal.amount)} {getTokenSymbol()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 mb-1">
                      {getEscrowStateName(Number(deal.state))}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(Number(deal.createdAt) * 1000).toLocaleString()}
                    </p>
                    
                    {/* Transaction Hash Link */}
                    {getTransactionHash() && (
                      <a 
                        href={getExplorerLink('tx', getTransactionHash()!)}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Tx Explorer 🌐
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Participants */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Participants</h3>
                
                <div className="space-y-4">
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                    <AddressDisplay 
                      address={deal.buyer} 
                      withCopy
                      label={isBuyer ? "You" : undefined}
                    />
                  </div>
                  
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Seller</p>
                    <AddressDisplay 
                      address={deal.seller} 
                      withCopy
                      label={isSeller ? "You" : undefined}
                    />
                  </div>
                  
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Arbiter</p>
                    <AddressDisplay 
                      address={deal.arbiter} 
                      withCopy
                      label={isArbiter ? "You" : undefined}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Transaction Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Transaction Details</h3>
                
                <div className="space-y-4">
                  <div className="p-3 border rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Amount</p>
                        <p className="font-medium">{formatAmount(deal.amount)} {getTokenSymbol()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        {getStateIndicator()}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Created</p>
                        <p className="text-sm">{new Date(Number(deal.createdAt) * 1000).toLocaleString()}</p>
                      </div>
                      {getTransactionHash() && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                          <a 
                            href={getExplorerLink('tx', getTransactionHash()!)}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Explorer
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dispute Resolution Information */}
                  {showDisputeResolution && (
                    <div className="p-4 border rounded-lg bg-muted/20">
                      <h3 className="text-sm font-medium mb-2">Dispute Resolution Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Original Dispute</p>
                          <p className="text-sm p-2 bg-red-50 border border-red-100 rounded-md">
                            {deal.disputeReason}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Resolution Outcome</p>
                          <p className="text-sm">
                            {Number(deal.state) === 4 ? "Funds released to seller" : "Funds refunded to buyer"}
                          </p>
                        </div>
                        {deal.resolutionReason && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Arbiter&apos;s Notes</p>
                            <p className="text-sm p-2 bg-blue-50 border border-blue-100 rounded-md">
                              {deal.resolutionReason}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Resolved By</p>
                          <AddressDisplay 
                            address={deal.arbiter} 
                            withCopy
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Status Explanation */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="text-sm font-medium mb-2">Current Status: {getEscrowStateName(Number(deal.state))}</h3>
                {Number(deal.state) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    The escrow has been created but payment has not been deposited yet. The buyer needs to deposit the payment to activate the escrow. Either party can cancel the escrow at this stage.
                  </p>
                )}
                {Number(deal.state) === 1 && (
                  <p className="text-sm text-muted-foreground">
                    Payment has been deposited. The seller should ship the item and then confirm shipment on the platform. Both the buyer and seller can raise disputes if there are issues.
                  </p>
                )}
                {Number(deal.state) === 2 && (
                  <p className="text-sm text-muted-foreground">
                    The seller has confirmed shipment. The buyer should confirm receipt once the item arrives. Either party can raise a dispute if there are issues.
                  </p>
                )}
                {Number(deal.state) === 3 && (
                  <p className="text-sm text-muted-foreground">
                    A dispute has been raised. The arbiter will review the case and make a decision to either release funds to the seller or return them to the buyer.
                  </p>
                )}
                {Number(deal.state) === 4 && (
                  <p className="text-sm text-muted-foreground">
                    The transaction has been completed successfully. The seller has received the payment.
                  </p>
                )}
                {Number(deal.state) === 5 && (
                  <p className="text-sm text-muted-foreground">
                    The buyer has been refunded following a dispute resolution.
                  </p>
                )}
                {Number(deal.state) === 6 && (
                  <p className="text-sm text-muted-foreground">
                    This escrow has been cancelled before payment was deposited.
                  </p>
                )}
              </div>
              
              {/* Action Section */}
              {getActionSection()}
            </CardContent>
          </Card>
          
          {deal && (
            <div className="mt-6 flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/10">
              <h3 className="text-xl font-medium mb-3">Create Another Escrow</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Want to create another escrow? Use the contract address below or click the button to get started.
              </p>
              
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md w-full max-w-lg mb-4">
                <p className="text-sm font-mono flex-1 truncate">{escrowContract.address}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(escrowContract.address)}
                  title="Copy contract address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <Button asChild className="gap-2">
                <Link href="/create">
                  <Plus className="h-4 w-4" />
                  Create New Escrow
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 