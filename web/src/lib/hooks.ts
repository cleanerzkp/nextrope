import { useReadContract, useWriteContract, useSwitchChain, useAccount, usePublicClient } from 'wagmi'
import { escrowContract, knownArbiters, knownTokens } from './contracts'
import { parseEther, parseUnits } from 'viem'
import { atom, useAtom } from 'jotai'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { getEscrowStateName, fetchTokenMetadata, KNOWN_TOKEN_LOGOS, TokenMetadata } from './utils'

// Define the zero address for ETH
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

// Define the ERC20 ABI manually (minimal version needed for allowance and approve)
const erc20Abi = [
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
  }
] as const;

// Store transaction hashes for escrows
export const escrowTxHashesAtom = atom<Record<string, string>>({});

// Token metadata cache atom
export const tokenMetadataCacheAtom = atom<Record<string, TokenMetadata>>({});

// Hook to get a list of arbiters
export function useArbiters() {
  const account = useAccount()
  
  // Return the arbiters with connection status
  return {
    arbiters: knownArbiters.map(arbiter => ({
      ...arbiter,
      isConnected: account.address === arbiter.address
    })),
    isLoading: false
  }
}

// Hook to check if an address is an approved arbiter
export function useIsApprovedArbiter(arbiterAddress: `0x${string}`) {
  return useReadContract({
    address: escrowContract.address,
    abi: escrowContract.abi,
    functionName: 'approvedArbiters',
    args: [arbiterAddress],
  })
}

// Hook to get the next deal ID
export function useNextDealId() {
  return useReadContract({
    address: escrowContract.address,
    abi: escrowContract.abi,
    functionName: 'nextDealId',
  })
}

// Hook to get a specific deal
export function useDeal(dealId: bigint | number | undefined) {
  const dealIdBigInt = dealId !== undefined ? BigInt(dealId) : undefined
  
  return useReadContract({
    address: escrowContract.address,
    abi: escrowContract.abi,
    functionName: 'getDeal',
    args: dealIdBigInt !== undefined ? [dealIdBigInt] : undefined,
    query: {
      enabled: dealIdBigInt !== undefined,
    }
  })
}

// Hook to create a new deal
export function useCreateDeal() {
  const publicClient = usePublicClient({ chainId: escrowContract.chainId });
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();
  
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  
  const createDeal = async ({
    seller,
    arbiter,
    tokenAddress,
    amount,
    depositFunds = false // Add option to skip depositing funds
  }: {
    seller: string;
    arbiter: string;
    tokenAddress: string;
    amount: string;
    depositFunds?: boolean;
  }) => {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("Public client not available");
    
    console.log("Starting escrow creation process", { seller, arbiter, tokenAddress, amount, depositFunds });
    
    // Make sure we're on the right chain
    await switchChain({ chainId: escrowContract.chainId });
    
    const isEth = tokenAddress.toLowerCase() === ETH_ADDRESS.toLowerCase();
    
    // Find token in known tokens list, or create a custom token object if not found
    let selectedToken = knownTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    
    // For custom tokens not in the list
    if (!selectedToken && !isEth) {
      // For custom ERC20 tokens, assume 18 decimals if we don't know otherwise
      // In a production app, we would fetch this from the contract
      selectedToken = {
        address: tokenAddress as `0x${string}`,
        name: "Custom Token",
        symbol: "TOKEN",
        decimals: 18,
        icon: "" // Empty icon for custom tokens
      };
      console.log("Using custom token with default 18 decimals", selectedToken);
    } else if (isEth) {
      // Create a virtual ETH token for consistent handling
      selectedToken = {
        address: ETH_ADDRESS as `0x${string}`,
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
        icon: "" // Empty icon for ETH
      };
    }
    
    // Safety check should now never fail, but keep it just in case
    if (!selectedToken) {
      console.error("Failed to create token object");
      throw new Error("Token configuration error");
    }
    
    const tokenAmount = isEth
      ? parseEther(amount)
      : parseUnits(amount, selectedToken.decimals);
    
    console.log("Preparing escrow with parameters", {
      seller,
      arbiter,
      tokenAddress,
      amount,
      isEth,
      tokenAmount: tokenAmount.toString(),
    });
    
    try {
      // Only check token approval if we're also depositing funds
      if (!isEth && depositFunds) {
        // For ERC-20 tokens, we need to check and approve before creating the deal
        console.log("Processing ERC-20 token escrow");
        const tokenContract = {
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi
        };
        
        // Get token symbol for better UX messages
        let tokenSymbol = selectedToken?.symbol || "tokens";
        try {
          if (!selectedToken?.symbol) {
            // Use a separate contract call for symbol to avoid type issues
            const symbol = await publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: [{ 
                name: 'symbol', 
                type: 'function', 
                stateMutability: 'view',
                inputs: [], 
                outputs: [{ type: 'string', name: '' }] 
              }],
              functionName: 'symbol',
            });
            if (typeof symbol === 'string') {
              tokenSymbol = symbol;
            }
          }
        } catch (error) {
          console.warn("Could not fetch token symbol:", error);
        }
        
        // Check allowance first
        console.log("Checking current token allowance");
        const allowance = await publicClient.readContract({
          ...tokenContract,
          functionName: 'allowance',
          args: [address as `0x${string}`, escrowContract.address as `0x${string}`]
        });
        
        console.log(`Current allowance: ${allowance.toString()}, Required: ${tokenAmount.toString()}`);
        
        // If allowance is not enough, approve first
        if (BigInt(allowance) < tokenAmount) {
          console.log("Insufficient allowance, requesting approval");
          
          // Show toast to inform user about the approval step
          toast.loading(`Approving ${amount} ${tokenSymbol} for escrow. Please confirm in your wallet...`, {
            id: "token-approval"
          });
          
          const approveTx = await writeContractAsync({
            ...tokenContract,
            functionName: 'approve',
            args: [escrowContract.address as `0x${string}`, tokenAmount]
          });
          
          // Wait for approval to complete before proceeding
          console.log(`Approval transaction submitted: ${approveTx}`);
          console.log("Waiting for approval confirmation...");
          
          toast.loading(`Waiting for approval confirmation...`, {
            id: "token-approval"
          });
          
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
          console.log("Token approval confirmed!");
          
          toast.success(`Successfully approved ${amount} ${tokenSymbol} for escrow!`, {
            id: "token-approval"
          });
        } else {
          console.log("Sufficient allowance exists, proceeding with deal creation");
          toast.success(`You've already approved ${tokenSymbol} for escrow. Proceeding with creation...`);
        }
      } else {
        console.log(isEth ? "Processing ETH escrow" : "Processing token escrow without immediate deposit");
      }
      
      // Now create the deal (for both ETH and tokens)
      console.log("Creating escrow deal");
      toast.loading("Creating escrow agreement. Please confirm in your wallet...", {
        id: "create-escrow"
      });
      
      const tx = await writeContractAsync({
        address: escrowContract.address as `0x${string}`,
        abi: escrowContract.abi,
        functionName: 'createDeal',
        args: [
          seller as `0x${string}`,
          arbiter as `0x${string}`,
          tokenAddress as `0x${string}`,
          tokenAmount
        ]
      });
      
      // Wait for the transaction receipt to determine the deal ID
      console.log(`Deal creation transaction submitted: ${tx}`);
      console.log("Waiting for confirmation...");
      
      toast.loading("Waiting for escrow creation confirmation...", {
        id: "create-escrow"
      });
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log("Deal creation confirmed!");
      
      toast.success("Escrow agreement created successfully!", {
        id: "create-escrow"
      });
      
      // Get the next deal ID and subtract 1 to get the ID of the deal we just created
      console.log("Retrieving created deal ID");
      const nextDealId = await publicClient.readContract({
        address: escrowContract.address as `0x${string}`,
        abi: escrowContract.abi,
        functionName: 'nextDealId'
      });
      
      const createdDealId = Number(nextDealId) - 1;
      console.log(`Deal created with ID: ${createdDealId}`);
      
      // If depositFunds is true, also deposit the funds
      if (depositFunds) {
        const tokenSymbol = isEth ? "ETH" : (selectedToken?.symbol || "tokens");
        
        if (isEth) {
          // For ETH, we need to call depositETH and send the ETH value with that call
          console.log(`Now depositing ${amount} ETH to escrow ID ${createdDealId}`);
          
          toast.loading(`Depositing ${amount} ETH to escrow. Please confirm in your wallet...`, {
            id: "deposit-funds"
          });
          
          const depositTx = await writeContractAsync({
            address: escrowContract.address as `0x${string}`,
            abi: escrowContract.abi,
            functionName: 'depositETH',
            args: [BigInt(createdDealId)],
            value: tokenAmount
          });
          
          console.log(`ETH deposit transaction submitted: ${depositTx}`);
          console.log("Waiting for ETH deposit confirmation...");
          
          toast.loading("Waiting for deposit confirmation...", {
            id: "deposit-funds"
          });
          
          await publicClient.waitForTransactionReceipt({ hash: depositTx });
          console.log("ETH deposit confirmed! Escrow fully funded.");
          
          toast.success(`Successfully deposited ${amount} ETH to escrow #${createdDealId}!`, {
            id: "deposit-funds"
          });
          
          return depositTx;
        } else {
          // For tokens, call depositToken to complete the setup
          console.log(`Now depositing ${amount} ${selectedToken.symbol} to escrow ID ${createdDealId}`);
          
          toast.loading(`Depositing ${amount} ${tokenSymbol} to escrow. Please confirm in your wallet...`, {
            id: "deposit-funds"
          });
          
          const depositTx = await writeContractAsync({
            address: escrowContract.address as `0x${string}`,
            abi: escrowContract.abi,
            functionName: 'depositToken',
            args: [BigInt(createdDealId)]
          });
          
          console.log(`Token deposit transaction submitted: ${depositTx}`);
          console.log("Waiting for token deposit confirmation...");
          
          toast.loading("Waiting for deposit confirmation...", {
            id: "deposit-funds"
          });
          
          await publicClient.waitForTransactionReceipt({ hash: depositTx });
          console.log("Token deposit confirmed! Escrow fully funded.");
          
          toast.success(`Successfully deposited ${amount} ${tokenSymbol} to escrow #${createdDealId}!`, {
            id: "deposit-funds"
          });
          
          return depositTx;
        }
      }
      
      // If we're not depositing funds, just return the transaction hash for the deal creation
      return { 
        tx, 
        dealId: createdDealId 
      };
    } catch (err) {
      const error = err as Error;
      console.error("Error in createDeal process", error);
      console.error("Detailed error in createDeal:", error);
      throw error;
    }
  };
  
  return {
    createDeal,
    isPending,
    isSuccess,
    error
  };
}

// Hook to deposit ETH for a deal
export function useDepositETH() {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const [, setEscrowTxHashes] = useAtom(escrowTxHashesAtom);
  
  const depositETH = async (params: {
    dealId: bigint | number;
    amount: string;
  }) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      const ethAmount = parseEther(params.amount)
      
      // Call the depositETH function with value
      const txHash = await writeContractAsync({
        address: escrowContract.address as `0x${string}`,
        abi: escrowContract.abi,
        functionName: 'depositETH',
        args: [BigInt(params.dealId)],
        value: ethAmount
      })
      
      // Store the transaction hash
      setEscrowTxHashes((prev: Record<string, string>) => ({
        ...prev,
        [`deposit-${params.dealId}`]: txHash
      }));
      
      return txHash
    } catch (error) {
      console.error('Error depositing ETH:', error)
      throw error
    }
  }
  
  return {
    depositETH,
    isPending,
    isSuccess,
    error
  }
}

// Hook to deposit ERC20 tokens for a deal
export function useDepositToken() {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const [, setEscrowTxHashes] = useAtom(escrowTxHashesAtom);
  
  const depositToken = async (params: {
    dealId: bigint | number;
  }) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      // Call the depositToken function on the contract
      const txHash = await writeContractAsync({
        address: escrowContract.address,
        abi: escrowContract.abi,
        functionName: 'depositToken',
        args: [BigInt(params.dealId)],
      })
      
      // Store the transaction hash
      setEscrowTxHashes((prev: Record<string, string>) => ({
        ...prev,
        [`deposit-${params.dealId}`]: txHash
      }));
      
      return txHash
    } catch (error) {
      console.error('Error depositing token:', error)
      throw error
    }
  }
  
  return {
    depositToken,
    isPending,
    isSuccess,
    error
  }
}

// Hook to confirm shipment (Seller)
export function useConfirmShipment() {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const [, setEscrowTxHashes] = useAtom(escrowTxHashesAtom);
  
  const confirmShipment = async (dealId: bigint | number) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      // Call the confirmShipment function on the contract
      const txHash = await writeContractAsync({
        address: escrowContract.address,
        abi: escrowContract.abi,
        functionName: 'confirmShipment',
        args: [BigInt(dealId)],
      })
      
      // Store the transaction hash
      setEscrowTxHashes((prev: Record<string, string>) => ({
        ...prev,
        [`ship-${dealId}`]: txHash
      }));
      
      return txHash
    } catch (error) {
      console.error('Error confirming shipment:', error)
      throw error
    }
  }
  
  return {
    confirmShipment,
    isPending,
    isSuccess,
    error
  }
}

// Hook to confirm receipt (Buyer)
export function useConfirmReceipt() {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const [, setEscrowTxHashes] = useAtom(escrowTxHashesAtom);
  
  const confirmReceipt = async (dealId: bigint | number) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      // Call the confirmReceipt function on the contract
      const txHash = await writeContractAsync({
        address: escrowContract.address,
        abi: escrowContract.abi,
        functionName: 'confirmReceipt',
        args: [BigInt(dealId)],
      })
      
      // Store the transaction hash
      setEscrowTxHashes((prev: Record<string, string>) => ({
        ...prev,
        [`receipt-${dealId}`]: txHash
      }));
      
      return txHash
    } catch (error) {
      console.error('Error confirming receipt:', error)
      throw error
    }
  }
  
  return {
    confirmReceipt,
    isPending,
    isSuccess,
    error
  }
}

// Hook to raise a dispute
export function useRaiseDispute() {
  const { writeContractAsync, ...rest } = useWriteContract()
  const { switchChain } = useSwitchChain()
  
  const raiseDispute = async (params: {
    dealId: bigint | number;
    reason: string;
    isCancellationRequest: boolean;
  }) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      // Call the raiseDispute function on the contract
      const hash = await writeContractAsync({
        address: escrowContract.address as `0x${string}`,
        abi: escrowContract.abi,
        functionName: 'raiseDispute',
        args: [
          BigInt(params.dealId),
          params.reason,
          params.isCancellationRequest
        ],
      })
      
      return hash
    } catch (error) {
      console.error('Error raising dispute:', error)
      throw error
    }
  }
  
  return {
    raiseDispute,
    ...rest
  }
}

// Hook to resolve a dispute
export function useResolveDispute() {
  const { writeContractAsync, ...rest } = useWriteContract()
  const { switchChain } = useSwitchChain()
  
  const resolveDispute = async (params: {
    dealId: bigint | number;
    refundToBuyer: boolean;
    reason?: string;
  }) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      // Call the resolveDispute function on the contract
      const hash = await writeContractAsync({
        address: escrowContract.address as `0x${string}`,
        abi: escrowContract.abi,
        functionName: 'resolveDispute',
        args: [
          BigInt(params.dealId),
          params.refundToBuyer
        ],
      })
      
      return hash
    } catch (error) {
      console.error('Error resolving dispute:', error)
      throw error
    }
  }
  
  return {
    resolveDispute,
    ...rest
  }
}

// Hook to cancel a deal
export function useCancelDeal() {
  const { writeContractAsync, ...rest } = useWriteContract()
  const { switchChain } = useSwitchChain()
  
  const cancelDeal = async (dealId: bigint | number) => {
    try {
      // First, make sure we're on the right chain
      await switchChain({ chainId: escrowContract.chainId })
      
      // Call the cancelDeal function on the contract
      const hash = await writeContractAsync({
        address: escrowContract.address,
        abi: escrowContract.abi,
        functionName: 'cancelDeal',
        args: [BigInt(dealId)],
      })
      
      return hash
    } catch (error) {
      console.error('Error canceling deal:', error)
      throw error
    }
  }
  
  return {
    cancelDeal,
    ...rest
  }
}

// Hook to get enhanced token data for display
export function useTokenInfo(tokenAddress: string | null | undefined) {
  const [metadataCache, setMetadataCache] = useAtom(tokenMetadataCacheAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Normalize the token address
  const normalizedAddress = tokenAddress === ETH_ADDRESS || tokenAddress === 'ETH' || !tokenAddress
    ? 'ETH' 
    : tokenAddress.toLowerCase();
  
  // Initial simple metadata for ETH
  useEffect(() => {
    if (normalizedAddress === 'ETH' && !metadataCache['ETH']) {
      setMetadataCache(current => ({
        ...current,
        'ETH': {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
          logo: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png' // Common ETH logo
        }
      }));
    }
  }, [normalizedAddress, metadataCache, setMetadataCache]);

  // Fetch token metadata if not in cache
  useEffect(() => {
    const fetchData = async () => {
      if (normalizedAddress === 'ETH' || metadataCache[normalizedAddress] || !tokenAddress || tokenAddress === ETH_ADDRESS) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const metadata = await fetchTokenMetadata(tokenAddress as `0x${string}`);
        if (metadata) {
          setMetadataCache(current => ({
            ...current,
            [normalizedAddress]: metadata
          }));
        }
      } catch (err) {
        console.error('Error fetching token metadata:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [normalizedAddress, tokenAddress, metadataCache, setMetadataCache]);

  // Return token info with fallbacks
  const tokenInfo = normalizedAddress && metadataCache[normalizedAddress]
    ? metadataCache[normalizedAddress]
    : {
        name: normalizedAddress === 'ETH' ? 'Ether' : `Unknown (${tokenAddress?.substring(0, 6)}...)`,
        symbol: normalizedAddress === 'ETH' ? 'ETH' : '???',
        decimals: 18,
        logo: undefined
      };

  return {
    tokenInfo,
    isLoading,
    error
  };
}

// Hook to get escrow statistics for charts
export function useEscrowStats() {
  const { data: nextDealId } = useNextDealId();
  const publicClient = usePublicClient({ chainId: escrowContract.chainId });
  const [metadataCache, setMetadataCache] = useAtom(tokenMetadataCacheAtom);
  
  // Define the return type explicitly
  type EscrowStats = {
    stateDistribution: { name: string; value: number; state: number }[];
    tokenDistribution: { token: string; displayName: string; value: number; logo?: string }[];
    totalEscrows: number;
    byToken: Record<string, number>;
    byState: Record<number, number>;
    isLoading: boolean;
    error: Error | null;
  };
  
  const [stats, setStats] = useState<EscrowStats>({
    stateDistribution: [],
    tokenDistribution: [],
    totalEscrows: 0,
    byToken: {},
    byState: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchEscrowStats = async () => {
      if (!nextDealId || !publicClient) {
        return;
      }

      try {
        const maxId = Number(nextDealId);
        const stateCount: Record<number, number> = {
          0: 0, // AWAITING_PAYMENT
          1: 0, // AWAITING_DELIVERY
          2: 0, // SHIPPED
          3: 0, // DISPUTED
          4: 0, // COMPLETED 
          5: 0, // REFUNDED
          6: 0  // CANCELLED
        };
        const tokenCount: Record<string, number> = {};
        
        // Load all escrows to gather statistics
        for (let i = 0; i < maxId; i++) {
          try {
            const dealData = await publicClient.readContract({
              address: escrowContract.address as `0x${string}`,
              abi: escrowContract.abi,
              functionName: 'getDeal',
              args: [BigInt(i)],
            });
            
            if (dealData) {
              const state = Number(dealData[5]);
              const token = dealData[3] as `0x${string}`;
              
              // Increment state count
              stateCount[state] = (stateCount[state] || 0) + 1;
              
              // Increment token count
              const tokenKey = token === ETH_ADDRESS ? 'ETH' : token;
              tokenCount[tokenKey] = (tokenCount[tokenKey] || 0) + 1;
              
              // If token not in metadata cache and not ETH, fetch it
              const normalizedKey = tokenKey.toLowerCase();
              if (tokenKey !== 'ETH' && !metadataCache[normalizedKey]) {
                try {
                  const metadata = await fetchTokenMetadata(token);
                  if (metadata) {
                    setMetadataCache(current => ({
                      ...current,
                      [normalizedKey]: metadata
                    }));
                  }
                } catch (err) {
                  console.error(`Error fetching metadata for token ${token}:`, err);
                }
              }
            }
          } catch (error) {
            console.error(`Error loading escrow ${i}:`, error);
          }
        }
        
        // Create data for pie charts
        const stateDistribution = Object.entries(stateCount).map(([state, count]) => ({
          name: getEscrowStateName(Number(state)),
          value: count,
          state: Number(state)
        }));
        
        // Create token distribution with enhanced metadata
        const tokenDistribution = Object.entries(tokenCount).map(([token, count]) => {
          const normalizedToken = token.toLowerCase();
          const metadata = token === 'ETH' 
            ? { symbol: 'ETH', name: 'Ether', logo: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png' } 
            : metadataCache[normalizedToken];
          
          let displayName = token;
          let logo = undefined;
          
          if (token === 'ETH') {
            displayName = 'ETH (Native)';
            logo = 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png';
          } else if (metadata) {
            displayName = metadata.symbol || token.substring(0, 6) + '...';
            logo = metadata.logo;
          } else {
            // For unknown tokens, use a shortened address
            displayName = token.substring(0, 6) + '...' + token.substring(token.length - 4);
          }
          
          return {
            token,
            displayName,
            value: count,
            logo
          };
        });
        
        setStats({
          stateDistribution,
          tokenDistribution,
          totalEscrows: maxId,
          byToken: tokenCount,
          byState: stateCount,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error("Error fetching escrow stats:", error);
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error
        }));
      }
    };
    
    if (nextDealId && publicClient) {
      fetchEscrowStats();
    }
  }, [nextDealId, publicClient, metadataCache, setMetadataCache]);
  
  return stats;
} 