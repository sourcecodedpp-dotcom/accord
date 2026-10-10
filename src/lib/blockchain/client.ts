import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatUnits,
  parseUnits,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  ACCORD_ESCROW_ABI,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "./artifacts/contracts";

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export const publicBlockchainClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * Fetch real on-chain USDC balance from Base Sepolia
 */
export async function getOnChainUsdcBalance(walletAddress: string): Promise<string> {
  if (!walletAddress || !walletAddress.startsWith("0x")) return "0.00";
  try {
    const rawBalance = (await publicBlockchainClient.readContract({
      address: BASE_SEPOLIA_USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress as Address],
    })) as bigint;

    return Number(formatUnits(rawBalance, 6)).toFixed(2);
  } catch (err) {
    // If testnet RPC unreachable or zero balance
    return "0.00";
  }
}

/**
 * Fetch real on-chain ETH balance from Base Sepolia
 */
export async function getOnChainEthBalance(walletAddress: string): Promise<string> {
  if (!walletAddress || !walletAddress.startsWith("0x")) return "0.0000";
  try {
    const rawBalance = await publicBlockchainClient.getBalance({
      address: walletAddress as Address,
    });
    return Number(formatUnits(rawBalance, 18)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

/**
 * Fund bounty on Base Sepolia using browser wallet
 */
export async function fundBountyOnChain(params: {
  escrowContractAddress: string;
  bountyId: string;
  amountUsdc: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return { success: false, error: "No browser Ethereum wallet detected" };
  }

  try {
    const ethereum = (window as any).ethereum;
    const [account] = await ethereum.request({ method: "eth_requestAccounts" });
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: custom(ethereum),
    });

    const parsedAmount = parseUnits(params.amountUsdc.toString(), 6);

    // 1. Approve USDC to Escrow contract
    const approveTx = await walletClient.writeContract({
      account: account as Address,
      address: BASE_SEPOLIA_USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [params.escrowContractAddress as Address, parsedAmount],
    });

    // Wait for approval receipt
    await publicBlockchainClient.waitForTransactionReceipt({ hash: approveTx });

    // 2. Deposit into AccordEscrow contract
    const depositTx = await walletClient.writeContract({
      account: account as Address,
      address: params.escrowContractAddress as Address,
      abi: ACCORD_ESCROW_ABI,
      functionName: "depositEscrow",
      args: [params.bountyId, parsedAmount],
    });

    const receipt = await publicBlockchainClient.waitForTransactionReceipt({ hash: depositTx });

    return {
      success: receipt.status === "success",
      txHash: depositTx,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to execute escrow deposit on-chain",
    };
  }
}

export function getBaseScanTxUrl(txHash?: string | null): string {
  if (!txHash) return "#";
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

export function getBaseScanAddressUrl(address?: string | null): string {
  if (!address) return "#";
  return `https://sepolia.basescan.org/address/${address}`;
}
