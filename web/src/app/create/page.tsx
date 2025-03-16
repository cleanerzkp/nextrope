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
import { knownTokens, sampleCounterparties, knownArbiters, escrowContract, itemTemplates } from '@/lib/contracts';
import { useCreateDeal, ETH_ADDRESS } from '@/lib/hooks';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Search, LightbulbIcon, Percent } from "lucide-react";
import { fetchTokenMetadata } from "@/lib/utils";
import { AddressDisplay } from "@/components/address-display";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import styles from './create.module.css'; // Import the CSS module
import { isAddress, formatUnits } from 'viem';
import { useBalance } from 'wagmi';

// Extended token interface to include custom tokens
interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
}

// Function to format number with commas
const formatNumber = (value: string | number) => {
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });
};

export default function CreateEscrow() {
  const router = useRouter();
  const { isConnected, address: userAddress } = useAppKitAccount();
  
  // Form state
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [customCounterparty, setCustomCounterparty] = useState("");
  const [arbiterAddress, setArbiterAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sliderValue, setSliderValue] = useState(0);
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [customToken, setCustomToken] = useState<Token | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add validation error states
  const [fieldErrors, setFieldErrors] = useState<{
    counterparty: boolean;
    arbiter: boolean;
    token: boolean;
    amount: boolean;
  }>({
    counterparty: false,
    arbiter: false,
    token: false,
    amount: false,
  });
  
  // Hook to create a deal
  const { createDeal, isPending } = useCreateDeal();
  
  // Get selected token, counterparty, and arbiter
  const selectedToken = tokenAddress === "custom" 
    ? customToken 
    : knownTokens.find(token => token.address === tokenAddress);
    
  // Get selected counterparty and arbiter
  const selectedCounterparty = counterpartyAddress === "custom"
    ? { address: customCounterparty, name: "Custom Address" }
    : sampleCounterparties.find(cp => cp.address === counterpartyAddress);
    
  const selectedArbiter = knownArbiters.find(arbiter => arbiter.address === arbiterAddress);
  
  // Fix useBalance hook to avoid conditional calls
  const selectedTokenAddress = selectedToken?.address !== ETH_ADDRESS && selectedToken?.address 
    ? selectedToken.address as `0x${string}` 
    : undefined;
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address: userAddress as `0x${string}` | undefined,
    token: selectedTokenAddress
  });
  
  // Format balance with correct decimals
  const formattedBalance = balanceData ? 
    formatUnits(balanceData.value, balanceData.decimals) : 
    "0";
  
  // Calculate amount based on slider value (percentage of balance)
  useEffect(() => {
    if (balanceData && sliderValue > 0) {
      // Skip update if the change is coming from the amount input already
      // This prevents circular dependencies
      const calculatedAmount = (Number(formattedBalance) * sliderValue / 100).toString();
      
      // Only update if the new amount is different (with some rounding tolerance)
      if (Math.abs(Number(calculatedAmount) - Number(amount)) > 0.000001) {
        setAmount(calculatedAmount);
        // Clear the amount field error if a value was set
        setFieldErrors({...fieldErrors, amount: false});
      }
    }
  }, [sliderValue, balanceData, formattedBalance, amount, fieldErrors]);
  
  // Handle percentage button clicks
  const handlePercentClick = (percent: number) => {
    setSliderValue(percent);
  };
  
  // Handle direct amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setAmount(newAmount);
    
    if (newAmount && balanceData && Number(formattedBalance) > 0) {
      // Calculate the slider value based on the entered amount
      const percentage = Math.min(100, (Number(newAmount) / Number(formattedBalance)) * 100);
      // Only update slider if the percentage is different to avoid loops
      if (Math.abs(percentage - sliderValue) > 0.1) {
        setSliderValue(percentage);
      }
    }
    
    // Clear the error if a value was entered
    if (e.target.value) {
      setFieldErrors({...fieldErrors, amount: false});
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error("Please connect your wallet to create an escrow.");
      return;
    }
    
    // Check if all required fields are filled
    const hasNoCounterparty = !selectedCounterparty;
    const hasNoArbiter = !selectedArbiter;
    const hasNoToken = !selectedToken;
    const hasNoAmount = !amount;
    
    // Set field errors
    setFieldErrors({
      counterparty: hasNoCounterparty,
      arbiter: hasNoArbiter,
      token: hasNoToken,
      amount: hasNoAmount
    });
    
    // If any required field is missing, show error and stop
    if (hasNoCounterparty || hasNoArbiter || hasNoToken || hasNoAmount) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    // At this point, we know all required values exist
    // Get seller address
    const sellerAddr = selectedCounterparty!.address;
    
    // Validate if the counterparty address is valid
    if (!isAddress(sellerAddr)) {
      toast.error("Please enter a valid seller address.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Inform the user about the escrow process steps
      toast("Creating Escrow", {
        description: "This creates an escrow record on the blockchain (requires gas fee). After creation, you'll need to deposit funds in a separate step.",
        duration: 6000,
      });
      
      try {
        // Just create the deal record without depositing funds yet
        const result = await createDeal({
          seller: sellerAddr,
          arbiter: selectedArbiter!.address,
          tokenAddress: selectedToken!.address,
          amount,
          depositFunds: false // Don't deposit funds at creation time
        });
        
        toast.success(
          "Escrow created successfully!",
          {
            description: "Now view your escrow to deposit the funds and activate it.",
            duration: 4000,
          }
        );
        
        if (result) {
          // Get the escrow ID from the result and redirect to its details page
          // This would typically be extracted from the transaction receipt/logs
          setTimeout(() => {
            router.push("/escrows");
          }, 3000);
        }
      } catch (error: unknown) {
        console.error("Error creating escrow:", error);
        
        // Handle specific error cases
        const errorMessage = error instanceof Error ? error.message : 
                            typeof error === 'string' ? error : 
                            "Unknown error occurred";
                            
        if (errorMessage.includes("insufficient funds")) {
          toast.error("Insufficient funds for this transaction", {
            description: "Please make sure you have enough funds to cover the gas fees.",
            duration: 6000,
          });
        } else if (errorMessage.includes("user rejected")) {
          toast.error("Transaction rejected", {
            description: "You rejected the transaction request in your wallet.",
            duration: 4000,
          });
        } else {
          toast.error("Failed to create escrow", {
            description: errorMessage || "Please check your wallet and try again.",
            duration: 6000,
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Apply a template to the form
  const applyTemplate = (template: typeof itemTemplates[0]) => {
    setItemTitle(`${template.emoji} ${template.title}`);
    setItemDescription(template.description);
    toast.success(`Applied template: ${template.title}`);
  };
  
  // Lookup custom token metadata
  const lookupCustomToken = async () => {
    setTokenError("");
    
    if (!customTokenAddress || !customTokenAddress.startsWith("0x")) {
      setTokenError("Please enter a valid token address");
      return;
    }
    
    setIsLoadingToken(true);
    
    try {
      const metadata = await fetchTokenMetadata(customTokenAddress, escrowContract.chainId);
      
      if (!metadata) {
        setTokenError("Could not find token metadata");
        setCustomToken(null);
        setIsLoadingToken(false);
        return;
      }
      
      const token: Token = {
        address: customTokenAddress,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        icon: metadata.logo
      };
      
      setCustomToken(token);
      setTokenAddress("custom");
      setIsLoadingToken(false);
      toast.success(`Found token: ${metadata.name} (${metadata.symbol})`);
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      setTokenError("Error fetching token metadata");
      setCustomToken(null);
      setIsLoadingToken(false);
    }
  };
  
  // Display the success message and redirect after successful creation
  useEffect(() => {
    if (isPending) {
      toast.success("Escrow created successfully!");
      setTimeout(() => {
        router.push('/escrows');
      }, 2000);
    }
  }, [isPending, router]);
  
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
          <div className={styles.formContainer}>
            <Card className={styles.formCard}>
              <CardHeader>
                <CardTitle>Escrow Details</CardTitle>
                <CardDescription>
                  Create a new escrow agreement for your transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center justify-between border p-4 rounded-md bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">You are the Buyer</p>
                      <p className="text-xs text-muted-foreground mt-1">You&apos;ll pay for the item or service</p>
                    </div>
                    
                    {userAddress && <AddressDisplay address={userAddress} size="sm" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="title">Title (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1">
                            <LightbulbIcon className="h-3.5 w-3.5" />
                            <span className="text-xs">Item Templates</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0">
                          <div className="p-4 space-y-2">
                            <h4 className="font-medium text-sm">Choose a template</h4>
                            <p className="text-xs text-muted-foreground">
                              Select a predefined item to populate the title and description
                            </p>
                          </div>
                          <div className="border-t">
                            <div className="max-h-60 overflow-y-auto">
                              {itemTemplates.map((template, index) => (
                                <div
                                  key={index}
                                  className="flex items-center px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => applyTemplate(template)}
                                >
                                  <div className="text-xl mr-3 flex-shrink-0">{template.emoji}</div>
                                  <div className="overflow-hidden">
                                    <p className="text-sm font-medium truncate">{template.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {template.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input 
                      id="title" 
                      placeholder="e.g. MacBook Pro (2023)" 
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe the item or service" 
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className={`${styles.formTextarea} h-20`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Note: Title and description are not stored on-chain.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="counterparty" className={fieldErrors.counterparty ? "text-red-500" : ""}>
                      Seller (Counterparty) {fieldErrors.counterparty && <span className="text-red-500">*</span>}
                    </Label>
                    <Select 
                      value={counterpartyAddress} 
                      onValueChange={(value) => {
                        setCounterpartyAddress(value);
                        setFieldErrors({...fieldErrors, counterparty: false});
                      }}
                    >
                      <SelectTrigger className={`${styles.formSelect} ${fieldErrors.counterparty ? "border-red-500 ring-red-500" : ""}`}>
                        <SelectValue placeholder="Select seller address" />
                      </SelectTrigger>
                      <SelectContent>
                        {sampleCounterparties.map((counterparty) => (
                          <SelectItem key={counterparty.address} value={counterparty.address}>
                            <div className="flex items-center gap-2">
                              <AddressDisplay address={counterparty.address} name={counterparty.name} size="sm" />
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Enter custom address</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {fieldErrors.counterparty && (
                      <p className="text-xs text-red-500 mt-1">Seller address is required</p>
                    )}
                    
                    {counterpartyAddress === "custom" && (
                      <div className="pt-3">
                        <Label htmlFor="customCounterparty">Custom Seller Address</Label>
                        <Input 
                          id="customCounterparty" 
                          placeholder="0x..." 
                          value={customCounterparty}
                          onChange={(e) => setCustomCounterparty(e.target.value)}
                        />
                        
                        {customCounterparty && customCounterparty.startsWith("0x") && customCounterparty.length === 42 && (
                          <div className="mt-2">
                            <AddressDisplay address={customCounterparty} size="sm" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {selectedCounterparty && counterpartyAddress !== "custom" && (
                    <div className="border p-4 rounded-md bg-muted/40">
                      <p className="text-sm font-medium mb-2">Selected Seller</p>
                      <AddressDisplay 
                        address={selectedCounterparty.address} 
                        name={selectedCounterparty.name} 
                        withCopy 
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="arbiter" className={fieldErrors.arbiter ? "text-red-500" : ""}>
                      Arbiter {fieldErrors.arbiter && <span className="text-red-500">*</span>}
                    </Label>
                    <Select 
                      value={arbiterAddress} 
                      onValueChange={(value) => {
                        setArbiterAddress(value);
                        setFieldErrors({...fieldErrors, arbiter: false});
                      }}
                    >
                      <SelectTrigger className={`${styles.formSelect} ${fieldErrors.arbiter ? "border-red-500 ring-red-500" : ""}`}>
                        <SelectValue placeholder="Select arbiter" />
                      </SelectTrigger>
                      <SelectContent>
                        {knownArbiters.map((arbiter) => (
                          <SelectItem key={arbiter.address} value={arbiter.address}>
                            <div className="flex items-center gap-2">
                              <AddressDisplay address={arbiter.address} name={arbiter.name} size="sm" />
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {fieldErrors.arbiter && (
                      <p className="text-xs text-red-500 mt-1">Arbiter is required</p>
                    )}
                  </div>
                  
                  {selectedArbiter && (
                    <div className="border p-4 rounded-md bg-muted/40">
                      <p className="text-sm font-medium mb-2">Selected Arbiter</p>
                      <AddressDisplay 
                        address={selectedArbiter.address} 
                        name={selectedArbiter.name} 
                        withCopy 
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        The arbiter will resolve any disputes that may arise.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="token" className={fieldErrors.token ? "text-red-500" : ""}>
                      Payment Token {fieldErrors.token && <span className="text-red-500">*</span>}
                    </Label>
                    <Select 
                      value={tokenAddress} 
                      onValueChange={(value) => {
                        setTokenAddress(value);
                        setFieldErrors({...fieldErrors, token: false});
                      }}
                    >
                      <SelectTrigger className={`${styles.formSelect} ${fieldErrors.token ? "border-red-500 ring-red-500" : ""}`}>
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        {knownTokens.map((token) => (
                          <SelectItem key={token.address} value={token.address}>
                            <div className="flex items-center gap-2">
                              {token.icon ? (
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
                                  {token.symbol.substring(0, 1)}
                                </div>
                              )}
                              {token.name} ({token.symbol})
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom ERC-20 Token</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {fieldErrors.token && (
                      <p className="text-xs text-red-500 mt-1">Payment token is required</p>
                    )}
                    
                    {tokenAddress === "custom" && (
                      <div className="pt-3 space-y-2">
                        <Label htmlFor="customTokenAddress">Custom Token Address</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="customTokenAddress" 
                            placeholder="0x..." 
                            value={customTokenAddress}
                            onChange={(e) => setCustomTokenAddress(e.target.value)}
                          />
                          <Button 
                            type="button" 
                            onClick={lookupCustomToken} 
                            disabled={isLoadingToken || !customTokenAddress}
                            variant="outline"
                          >
                            {isLoadingToken ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {tokenError && (
                          <p className="text-sm text-red-500">{tokenError}</p>
                        )}
                        
                        {customToken && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                            {customToken.icon ? (
                              <div className="relative w-5 h-5">
                                <Image 
                                  src={customToken.icon} 
                                  alt={customToken.symbol} 
                                  fill 
                                  className="rounded-full"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {customToken.symbol.substring(0, 1)}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium">{customToken.name}</p>
                              <p className="text-xs text-muted-foreground">{customToken.symbol} • {customToken.address.slice(0, 6)}...{customToken.address.slice(-4)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amount" className={fieldErrors.amount ? "text-red-500" : ""}>
                        Amount {fieldErrors.amount && <span className="text-red-500">*</span>}
                      </Label>
                      
                      {selectedToken && !isBalanceLoading && balanceData && (
                        <div className="text-sm text-muted-foreground">
                          Balance: {formatNumber(formattedBalance)} {selectedToken.symbol}
                        </div>
                      )}
                      
                      {selectedToken && isBalanceLoading && (
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Loading balance...
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input 
                        id="amount" 
                        type="number"
                        min="0" 
                        step="any"
                        placeholder="0.00" 
                        value={amount}
                        onChange={handleAmountChange}
                        className={fieldErrors.amount ? "border-red-500 ring-red-500" : ""}
                        required
                      />
                      {selectedToken && (
                        <div className="ml-2 flex items-center gap-2 rounded-md border border-input px-3 py-2 bg-muted-foreground/10">
                          {selectedToken.icon ? (
                            <div className="relative w-5 h-5">
                              <Image 
                                src={selectedToken.icon} 
                                alt={selectedToken.symbol} 
                                fill 
                                className="rounded-full"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {selectedToken.symbol.substring(0, 1)}
                            </div>
                          )}
                          <span>{selectedToken.symbol}</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedToken && balanceData && (
                      <>
                        <div className="pt-1">
                          <Slider
                            value={[sliderValue]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(values) => setSliderValue(values[0])}
                          />
                        </div>
                        
                        <div className="flex justify-between gap-2 pt-1">
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePercentClick(25)}
                          >
                            25%
                          </Button>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePercentClick(50)}
                          >
                            50%
                          </Button>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePercentClick(75)}
                          >
                            75%
                          </Button>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePercentClick(100)}
                          >
                            MAX
                          </Button>
                        </div>
                        
                        {(sliderValue > 0 && amount) && (
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Percent className="h-3 w-3 mr-1" />
                            {sliderValue.toFixed(0)}% of your balance
                          </div>
                        )}
                      </>
                    )}
                    
                    {fieldErrors.amount && (
                      <p className="text-xs text-red-500 mt-1">Amount is required</p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-muted/40 rounded-md">
                    <h3 className="font-semibold mb-2">Escrow Process</h3>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      <li>You create the escrow by depositing funds</li>
                      <li>The seller ships the item/provides the service</li>
                      <li>You verify the delivery and release the funds</li>
                      <li>If there&apos;s a dispute, the arbiter will decide</li>
                    </ol>
                  </div>
                  
                  <div>
                    <Button 
                      type="submit" 
                      className={styles.formButton} 
                      disabled={isPending || isSubmitting}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Escrow...
                        </>
                      ) : (
                        "Create Escrow"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
} 