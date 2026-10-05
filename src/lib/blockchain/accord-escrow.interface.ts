export interface EscrowDepositReceipt {
  escrowLedgerId: string;
  txHash: string;
  amountUsdc: number;
  depositorAddress: string;
  blockTimestamp: number;
  ledgerType: "mock" | "testnet" | "mainnet";
  isOnChain?: boolean;
}

export interface EscrowReleaseReceipt {
  escrowLedgerId: string;
  txHash: string;
  recipientAddress: string;
  netPayoutUsdc: number;
  protocolFeeUsdc: number;
  blockTimestamp: number;
  blockNumber: number;
  ledgerType: "mock" | "testnet" | "mainnet";
  isOnChain?: boolean;
}

export interface EscrowRefundReceipt {
  escrowLedgerId: string;
  txHash: string;
  refundRecipientAddress: string;
  amountUsdc: number;
  blockTimestamp: number;
  ledgerType: "mock" | "testnet" | "mainnet";
  isOnChain?: boolean;
}

export interface EscrowStateDetails {
  escrowLedgerId: string;
  bountyId: string;
  amountUsdc: number;
  status: "HELD_IN_ESCROW" | "RELEASED" | "REFUNDED";
  depositTxHash: string;
  releaseTxHash?: string;
  recipientAddress?: string;
  settledAt?: Date;
}

export interface IAccordEscrowLedger {
  createEscrow(params: {
    bountyId: string;
    amountUsdc: number;
    depositorAddress: string;
  }): Promise<EscrowDepositReceipt>;

  releaseEscrow(params: {
    bountyId: string;
    escrowLedgerId: string;
    winnerAddress: string;
    amountUsdc: number;
    protocolFeeUsdc: number;
    verificationProofHash: string;
  }): Promise<EscrowReleaseReceipt>;

  refundEscrow(params: {
    bountyId: string;
    escrowLedgerId: string;
    refundToAddress: string;
    amountUsdc: number;
  }): Promise<EscrowRefundReceipt>;

  getEscrowState(bountyId: string): Promise<EscrowStateDetails | null>;

  verifyTransaction(txHash: string): Promise<boolean>;
}
