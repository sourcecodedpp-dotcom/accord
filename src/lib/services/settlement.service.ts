import { db } from "../db";
import { BlockchainEscrowService } from "../blockchain/escrow";
import { ReputationService } from "./reputation.service";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class SettlementService {
  /**
   * Settles an escrowed bounty by releasing USDC to the winning agent, recording
   * on-chain transaction hashes, updating participant volumes, and growing reputation.
   */
  static async settleBounty(params: {
    bountyId: string;
    submissionId: string;
    customFeePercentage?: number;
  }) {
    const bounty = await db.bounty.findUnique({
      where: { id: params.bountyId },
      include: {
        creator: true,
      },
    });

    if (!bounty) {
      throw new Error(`Bounty not found: ${params.bountyId}`);
    }

    if (bounty.status === "SETTLED") {
      throw new Error(`Bounty is already settled.`);
    }

    const submission = await db.submission.findUnique({
      where: { id: params.submissionId },
      include: {
        agent: true,
      },
    });

    if (!submission) {
      throw new Error(`Submission not found: ${params.submissionId}`);
    }

    if (submission.bountyId !== bounty.id) {
      throw new Error(`Submission does not belong to bounty ${bounty.id}`);
    }

    if (submission.status !== "ACCEPTED") {
      throw new Error(
        `Cannot settle bounty: Submission status is '${submission.status}'. AI verification must PASS before settlement.`
      );
    }

    const feePercentage = params.customFeePercentage ?? 2.5; // 2.5% Polis protocol fee
    const feeUsdc = Math.round((bounty.rewardUsdc * (feePercentage / 100)) * 100) / 100;
    const netPayoutUsdc = Math.round((bounty.rewardUsdc - feeUsdc) * 100) / 100;

    // Generate settlement cryptographic transaction receipt
    const receipt = BlockchainEscrowService.generateSettlementReceipt({
      bountyId: bounty.id,
      winnerAddress: submission.agent.walletAddress,
      amountUsdc: netPayoutUsdc,
      feeUsdc,
    });

    const settlementId = `settle_${crypto.randomUUID()}`;

    // Atomic transaction for database settlement
    const settlement = await db.$transaction(async (tx) => {
      // 1. Create Settlement record
      const record = await tx.settlement.create({
        data: {
          id: settlementId,
          bountyId: bounty.id,
          submissionId: submission.id,
          agentId: submission.agentId,
          amountUsdc: netPayoutUsdc,
          feeUsdc,
          escrowContract: receipt.escrowContract,
          txHash: receipt.txHash,
          status: "CONFIRMED",
        },
      });

      // 2. Update Bounty to SETTLED
      await tx.bounty.update({
        where: { id: bounty.id },
        data: {
          status: "SETTLED",
          escrowStatus: "RELEASED",
          settlementTxHash: receipt.txHash,
          winnerAgentId: submission.agentId,
        },
      });

      // 3. Update winning agent's statistics
      await tx.participant.update({
        where: { id: submission.agentId },
        data: {
          bountiesWonCount: { increment: 1 },
          settledVolumeUsdc: { increment: netPayoutUsdc },
        },
      });

      // 4. Update creator's volume
      await tx.participant.update({
        where: { id: bounty.creatorId },
        data: {
          settledVolumeUsdc: { increment: bounty.rewardUsdc },
        },
      });

      return record;
    });

    // 5. Grow agent reputation
    // Formula: baseline win bonus + reward scaled reward bonus
    const winBonus = Math.min(50, Math.round(15 + Math.sqrt(bounty.rewardUsdc) * 1.5));
    await ReputationService.adjustReputation({
      agentId: submission.agentId,
      bountyId: bounty.id,
      delta: winBonus,
      reason: "BOUNTY_WON",
      metadata: {
        rewardUsdc: bounty.rewardUsdc,
        netPayoutUsdc,
        settlementTxHash: receipt.txHash,
      },
    });

    await ReputationService.adjustReputation({
      agentId: submission.agentId,
      bountyId: bounty.id,
      delta: 5.0,
      reason: "SETTLEMENT_CONFIRMED",
      metadata: {
        settlementId: settlement.id,
      },
    });

    // 6. Broadcast live bounty.settled event
    await eventBus.emit("bounty.settled", "Bounty", bounty.id, {
      settlementId: settlement.id,
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      winnerAgentId: submission.agentId,
      winnerName: submission.agent.name,
      winnerWallet: submission.agent.walletAddress,
      rewardUsdc: bounty.rewardUsdc,
      netPayoutUsdc,
      feeUsdc,
      txHash: receipt.txHash,
      settledAt: settlement.settledAt,
    });

    return {
      settlement,
      receipt,
      netPayoutUsdc,
      feeUsdc,
    };
  }
}
