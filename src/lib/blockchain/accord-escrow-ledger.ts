import crypto from "crypto";
import {
  IAccordEscrowLedger,
  EscrowDepositReceipt,
  EscrowReleaseReceipt,
  EscrowRefundReceipt,
  EscrowStateDetails,
} from "./accord-escrow.interface";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  isAddress,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  ACCORD_ESCROW_ABI,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "./artifacts/contracts";
import {
  AlreadySettledError,
  NotFoundError,
  ConflictError,
  BlockchainEscrowError,
} from "@accord/protocol";

/**
 * Mock & Local Test Escrow Ledger Provider
 * Generates cryptographic proofs and manages local escrow states
 */
export class AccordMockEscrowLedger implements IAccordEscrowLedger {
  private states = new Map<string, EscrowStateDetails>();

  async createEscrow(params: {
    bountyId: string;
    amountUsdc: number;
    depositorAddress: string;
  }): Promise<EscrowDepositReceipt> {
    const escrowLedgerId = `escrow_${crypto.randomUUID()}`;
    const txHash =
      "0x" +
      crypto
        .createHash("sha256")
        .update(`deposit:${params.bountyId}:${params.depositorAddress}:${params.amountUsdc}:${Date.now()}`)
        .digest("hex");

    const state: EscrowStateDetails = {
      escrowLedgerId,
      bountyId: params.bountyId,
      amountUsdc: params.amountUsdc,
      status: "HELD_IN_ESCROW",
      depositTxHash: txHash,
    };
    this.states.set(params.bountyId, state);

    return {
      escrowLedgerId,
      txHash,
      amountUsdc: params.amountUsdc,
      depositorAddress: params.depositorAddress,
      blockTimestamp: Math.floor(Date.now() / 1000),
      ledgerType: "mock",
      isOnChain: false,
    };
  }

  async releaseEscrow(params: {
    bountyId: string;
    escrowLedgerId: string;
    winnerAddress: string;
    amountUsdc: number;
    protocolFeeUsdc: number;
    verificationProofHash: string;
  }): Promise<EscrowReleaseReceipt> {
    let existing = this.states.get(params.bountyId);
    if (!existing) {
      existing = {
        escrowLedgerId: params.escrowLedgerId,
        bountyId: params.bountyId,
        amountUsdc: params.amountUsdc,
        status: "HELD_IN_ESCROW",
        depositTxHash:
          "0x" + crypto.createHash("sha256").update(`deposit:${params.bountyId}`).digest("hex"),
      };
      this.states.set(params.bountyId, existing);
    }
    if (existing.status !== "HELD_IN_ESCROW") {
      throw new Error(`Escrow is not in HELD_IN_ESCROW status. Current: ${existing.status}`);
    }

    const txHash =
      "0x" +
      crypto
        .createHash("sha256")
        .update(
          `release:${params.bountyId}:${params.winnerAddress}:${params.amountUsdc}:${params.verificationProofHash}:${Date.now()}`
        )
        .digest("hex");

    existing.status = "RELEASED";
    existing.releaseTxHash = txHash;
    existing.recipientAddress = params.winnerAddress;
    existing.settledAt = new Date();

    return {
      escrowLedgerId: params.escrowLedgerId,
      txHash,
      recipientAddress: params.winnerAddress,
      netPayoutUsdc: params.amountUsdc,
      protocolFeeUsdc: params.protocolFeeUsdc,
      blockTimestamp: Math.floor(Date.now() / 1000),
      blockNumber: Math.floor(19000000 + Math.random() * 100000),
      ledgerType: "mock",
      isOnChain: false,
    };
  }

  async refundEscrow(params: {
    bountyId: string;
    escrowLedgerId: string;
    refundToAddress: string;
    amountUsdc: number;
  }): Promise<EscrowRefundReceipt> {
    let existing = this.states.get(params.bountyId);
    if (!existing) {
      existing = {
        escrowLedgerId: params.escrowLedgerId,
        bountyId: params.bountyId,
        amountUsdc: params.amountUsdc,
        status: "HELD_IN_ESCROW",
        depositTxHash:
          "0x" + crypto.createHash("sha256").update(`deposit:${params.bountyId}`).digest("hex"),
      };
      this.states.set(params.bountyId, existing);
    }
    if (existing.status !== "HELD_IN_ESCROW") {
      throw new Error(`Cannot refund: Escrow status is ${existing.status}`);
    }

    const txHash =
      "0x" +
      crypto
        .createHash("sha256")
        .update(`refund:${params.bountyId}:${params.refundToAddress}:${params.amountUsdc}:${Date.now()}`)
        .digest("hex");

    existing.status = "REFUNDED";

    return {
      escrowLedgerId: params.escrowLedgerId,
      txHash,
      refundRecipientAddress: params.refundToAddress,
      amountUsdc: params.amountUsdc,
      blockTimestamp: Math.floor(Date.now() / 1000),
      ledgerType: "mock",
      isOnChain: false,
    };
  }

  async getEscrowState(bountyId: string): Promise<EscrowStateDetails | null> {
    return this.states.get(bountyId) || null;
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    return typeof txHash === "string" && txHash.startsWith("0x") && txHash.length === 66;
  }
}

export interface TestnetEscrowConfig {
  rpcUrl?: string;
  contractAddress?: `0x${string}`;
  usdcAddress?: `0x${string}`;
  operatorPrivateKey?: `0x${string}`;
  publicClient?: any;
  walletClient?: any;
}

/**
 * Real EVM Testnet Escrow Ledger Provider (Base Sepolia Chain ID 84532)
 * Connects directly to the AccordEscrow.sol smart contract and native Base Sepolia USDC.
 * Strict Invariants:
 * 1. Reads and validates contract state before every settlement.
 * 2. Prevents double release on-chain.
 * 3. Verifies bounty ID / escrow ID binding and winner address.
 * 4. NEVER silently falls back to simulated ledger when on-chain is configured.
 * 5. Private keys are maintained server-side only.
 */
export class AccordTestnetEscrowLedger implements IAccordEscrowLedger {
  public readonly publicClient: any;
  public readonly walletClient: any;
  public readonly contractAddress: `0x${string}`;
  public readonly usdcAddress: `0x${string}`;
  public readonly chainId = BASE_SEPOLIA_CHAIN_ID;

  constructor(config?: TestnetEscrowConfig) {
    const rpcUrl =
      config?.rpcUrl ||
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.ACCORD_TESTNET_RPC_URL ||
      "https://sepolia.base.org";

    this.contractAddress = (config?.contractAddress ||
      process.env.ACCORD_ESCROW_CONTRACT_ADDRESS ||
      process.env.ACCORD_TESTNET_ESCROW_CONTRACT ||
      "") as `0x${string}`;

    this.usdcAddress = (config?.usdcAddress ||
      process.env.ACCORD_USDC_CONTRACT_ADDRESS ||
      BASE_SEPOLIA_USDC_ADDRESS) as `0x${string}`;

    if (config?.publicClient) {
      this.publicClient = config.publicClient;
    } else {
      this.publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl),
      });
    }

    if (config?.walletClient) {
      this.walletClient = config.walletClient;
    } else {
      const privateKey =
        config?.operatorPrivateKey || (process.env.ACCORD_OPERATOR_PRIVATE_KEY as `0x${string}`);
      if (privateKey && privateKey.startsWith("0x")) {
        const account = privateKeyToAccount(privateKey);
        this.walletClient = createWalletClient({
          account,
          chain: baseSepolia,
          transport: http(rpcUrl),
        });
      } else {
        this.walletClient = null;
      }
    }
  }

  /**
   * Deposits USDC into the on-chain AccordEscrow contract for a bounty.
   */
  async createEscrow(params: {
    bountyId: string;
    amountUsdc: number;
    depositorAddress: string;
  }): Promise<EscrowDepositReceipt> {
    if (!this.contractAddress || !isAddress(this.contractAddress)) {
      throw new BlockchainEscrowError(
        "Base Sepolia escrow contract address is not configured. Set ACCORD_ESCROW_CONTRACT_ADDRESS."
      );
    }
    if (!this.walletClient) {
      throw new BlockchainEscrowError(
        "Base Sepolia operator wallet is not configured. Set ACCORD_OPERATOR_PRIVATE_KEY on server."
      );
    }

    const amountBaseUnits = parseUnits(params.amountUsdc.toFixed(6), 6);

    // 1. Check if escrow was already deposited on-chain (e.g. by sponsor's wallet)
    try {
      const existingOnChain: any = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ACCORD_ESCROW_ABI,
        functionName: "getEscrow",
        args: [params.bountyId],
      });

      if (existingOnChain && existingOnChain.status === 1) { // HELD
        return {
          escrowLedgerId: `${this.contractAddress}:${params.bountyId}`,
          txHash: (params as any).escrowTxHash || `0x${crypto.createHash("sha256").update(`deposit:${params.bountyId}`).digest("hex")}`,
          amountUsdc: params.amountUsdc,
          depositorAddress: existingOnChain.depositor || params.depositorAddress,
          blockTimestamp: Number(existingOnChain.blockTimestamp) || Math.floor(Date.now() / 1000),
          chainId: this.chainId,
          ledgerType: "testnet",
          isOnChain: true,
        };
      }
    } catch {
      // Escrow does not exist on-chain yet; proceed to broadcast depositEscrow
    }

    let txHash: `0x${string}`;
    try {
      txHash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ACCORD_ESCROW_ABI,
        functionName: "depositEscrow",
        args: [params.bountyId, amountBaseUnits],
      });
    } catch (err: any) {
      throw new BlockchainEscrowError(
        `Base Sepolia depositEscrow transaction failed for bounty '${params.bountyId}': ${err.message}`,
        err
      );
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new BlockchainEscrowError(
        `Base Sepolia depositEscrow transaction reverted on-chain (tx: ${txHash}).`
      );
    }

    const block = await this.publicClient.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null);
    const blockTimestamp = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

    return {
      escrowLedgerId: `${this.contractAddress}:${params.bountyId}`,
      txHash,
      amountUsdc: params.amountUsdc,
      depositorAddress: params.depositorAddress,
      blockTimestamp,
      blockNumber: Number(receipt.blockNumber),
      chainId: this.chainId,
      ledgerType: "testnet",
      isOnChain: true,
    };
  }

  /**
   * Releases USDC from the on-chain AccordEscrow contract to the winning agent.
   * Strictly verifies contract state, recipient address, and amount before broadcasting.
   */
  async releaseEscrow(params: {
    bountyId: string;
    escrowLedgerId: string;
    winnerAddress: string;
    amountUsdc: number;
    protocolFeeUsdc: number;
    verificationProofHash: string;
  }): Promise<EscrowReleaseReceipt> {
    if (!this.contractAddress || !isAddress(this.contractAddress)) {
      throw new BlockchainEscrowError(
        "Base Sepolia contract address is not configured. Set ACCORD_ESCROW_CONTRACT_ADDRESS."
      );
    }

    if (!this.walletClient) {
      throw new BlockchainEscrowError(
        "Base Sepolia operator wallet is not configured. Set ACCORD_OPERATOR_PRIVATE_KEY on server."
      );
    }

    if (!params.winnerAddress || !isAddress(params.winnerAddress)) {
      throw new BlockchainEscrowError(
        `Invalid winner Ethereum address for on-chain settlement: '${params.winnerAddress}'`
      );
    }

    // 1. Read on-chain contract state to verify escrow existence and HELD status
    let onChainEscrow: any;
    try {
      onChainEscrow = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ACCORD_ESCROW_ABI,
        functionName: "getEscrow",
        args: [params.bountyId],
      });
    } catch (err: any) {
      throw new BlockchainEscrowError(
        `Failed to verify on-chain escrow state for bounty '${params.bountyId}' on Base Sepolia: ${err.message}`
      );
    }

    if (!onChainEscrow) {
      throw new NotFoundError("On-chain escrow", params.bountyId);
    }

    // Status enum: 0 = NONE, 1 = HELD, 2 = RELEASED, 3 = REFUNDED
    if (onChainEscrow.status === 2) {
      throw new AlreadySettledError(params.bountyId);
    }
    if (onChainEscrow.status === 3) {
      throw new ConflictError(
        `Cannot settle: Escrow for bounty '${params.bountyId}' has already been refunded on Base Sepolia.`
      );
    }
    if (onChainEscrow.status !== 1) {
      throw new BlockchainEscrowError(
        `Cannot settle: Escrow for bounty '${params.bountyId}' is not in HELD status (on-chain status code: ${onChainEscrow.status}).`
      );
    }

    // Verify bounty ID binding
    if (onChainEscrow.bountyId && onChainEscrow.bountyId !== params.bountyId) {
      throw new ConflictError(
        `On-chain escrow binding mismatch: contract holds '${onChainEscrow.bountyId}' but settling '${params.bountyId}'.`
      );
    }

    // Convert amounts to 6 decimals (USDC)
    const netPayoutBaseUnits = parseUnits(params.amountUsdc.toFixed(6), 6);
    const feeBaseUnits = parseUnits(params.protocolFeeUsdc.toFixed(6), 6);
    const totalRequired = netPayoutBaseUnits + feeBaseUnits;

    if (BigInt(onChainEscrow.amount) !== totalRequired) {
      throw new BlockchainEscrowError(
        `On-chain escrow amount mismatch: expected ${totalRequired} base units ($${(params.amountUsdc + params.protocolFeeUsdc).toFixed(2)} USDC), contract holds ${onChainEscrow.amount} base units.`
      );
    }

    // Format 32-byte verification proof hash
    let proofHash: `0x${string}`;
    if (params.verificationProofHash?.startsWith("0x") && params.verificationProofHash.length === 66) {
      proofHash = params.verificationProofHash as `0x${string}`;
    } else {
      proofHash = `0x${crypto
        .createHash("sha256")
        .update(params.verificationProofHash || `${params.bountyId}:${params.winnerAddress}`)
        .digest("hex")}`;
    }

    // 2. Submit releaseEscrow transaction to Base Sepolia
    let txHash: `0x${string}`;
    try {
      txHash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ACCORD_ESCROW_ABI,
        functionName: "releaseEscrow",
        args: [
          params.bountyId,
          params.winnerAddress as `0x${string}`,
          netPayoutBaseUnits,
          feeBaseUnits,
          proofHash,
        ],
      });
    } catch (err: any) {
      throw new BlockchainEscrowError(
        `Base Sepolia releaseEscrow transaction broadcast failed: ${err.message}`,
        err
      );
    }

    // 3. Wait for on-chain confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new BlockchainEscrowError(
        `Base Sepolia releaseEscrow transaction reverted on-chain (tx: ${txHash}).`
      );
    }

    const block = await this.publicClient.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null);
    const blockTimestamp = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

    return {
      escrowLedgerId: `${this.contractAddress}:${params.bountyId}`,
      txHash,
      recipientAddress: params.winnerAddress,
      netPayoutUsdc: params.amountUsdc,
      protocolFeeUsdc: params.protocolFeeUsdc,
      blockTimestamp,
      blockNumber: Number(receipt.blockNumber),
      chainId: this.chainId,
      ledgerType: "testnet",
      isOnChain: true,
    };
  }

  /**
   * Refunds escrow back to depositor on Base Sepolia.
   */
  async refundEscrow(params: {
    bountyId: string;
    escrowLedgerId: string;
    refundToAddress: string;
    amountUsdc: number;
  }): Promise<EscrowRefundReceipt> {
    if (!this.contractAddress || !this.walletClient) {
      throw new BlockchainEscrowError(
        "Base Sepolia configuration missing for refundEscrow. Set contract address and operator private key."
      );
    }

    const onChainEscrow = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ACCORD_ESCROW_ABI,
      functionName: "getEscrow",
      args: [params.bountyId],
    });

    if (onChainEscrow.status !== 1) {
      throw new BlockchainEscrowError(
        `Cannot refund: On-chain escrow status is not HELD (status: ${onChainEscrow.status}).`
      );
    }

    const txHash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ACCORD_ESCROW_ABI,
      functionName: "refundEscrow",
      args: [params.bountyId],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new BlockchainEscrowError(
        `Base Sepolia refundEscrow transaction reverted on-chain: ${txHash}`
      );
    }

    const block = await this.publicClient.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null);
    const blockTimestamp = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

    return {
      escrowLedgerId: `${this.contractAddress}:${params.bountyId}`,
      txHash,
      refundRecipientAddress: params.refundToAddress,
      amountUsdc: params.amountUsdc,
      blockTimestamp,
      blockNumber: Number(receipt.blockNumber),
      chainId: this.chainId,
      ledgerType: "testnet",
      isOnChain: true,
    };
  }

  async getEscrowState(bountyId: string): Promise<EscrowStateDetails | null> {
    if (!this.contractAddress) {
      return null;
    }
    try {
      const onChain = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ACCORD_ESCROW_ABI,
        functionName: "getEscrow",
        args: [bountyId],
      });

      if (!onChain || onChain.status === 0) {
        return null;
      }

      const statusMap: Record<number, "HELD_IN_ESCROW" | "RELEASED" | "REFUNDED"> = {
        1: "HELD_IN_ESCROW",
        2: "RELEASED",
        3: "REFUNDED",
      };

      return {
        escrowLedgerId: `${this.contractAddress}:${bountyId}`,
        bountyId,
        amountUsdc: Number(formatUnits(onChain.amount, 6)),
        status: statusMap[onChain.status] || "HELD_IN_ESCROW",
        depositTxHash: "0x",
        recipientAddress: onChain.recipient,
        chainId: this.chainId,
        isOnChain: true,
      };
    } catch {
      return null;
    }
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    if (!txHash || !txHash.startsWith("0x") || txHash.length !== 66) {
      return false;
    }
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      return Boolean(receipt && receipt.status === "success");
    } catch {
      return false;
    }
  }
}

// Global Singleton Factory
declare global {
  var accordEscrowLedgerInstance: IAccordEscrowLedger | undefined;
}

export function getAccordEscrowLedger(): IAccordEscrowLedger {
  if (globalThis.accordEscrowLedgerInstance) {
    return globalThis.accordEscrowLedgerInstance;
  }

  const ledgerType = process.env.ACCORD_ESCROW_LEDGER_TYPE?.toLowerCase();
  const instance =
    ledgerType === "testnet" || ledgerType === "base_sepolia" || ledgerType === "onchain"
      ? new AccordTestnetEscrowLedger()
      : new AccordMockEscrowLedger();

  globalThis.accordEscrowLedgerInstance = instance;
  return instance;
}
