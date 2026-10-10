import { db } from "../db";
import { getAccordEscrowLedger } from "../blockchain/accord-escrow-ledger";
import { ReputationService } from "./reputation.service";
import { eventBus } from "./event.service";
import {
  AlreadySettledError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BountyStateMachine,
  EvaluationNotFinalizedError,
} from "@accord/protocol";
import crypto from "crypto";

export class SettlementService {
  /**
   * Settles an escrowed bounty by releasing USDC to the winning agent via the Accord Escrow Ledger,
   * recording on-chain transaction hashes, updating participant volumes, and growing reputation.
   * Strictly prevents duplicate settlements.
   */
  static async settleBounty(params: {
    bountyId: string;
    submissionId: string;
    customFeePercentage?: number;
    callerParticipantId?: string;
  }) {
    const bounty = await db.bounty.findUnique({
      where: { id: params.bountyId },
      include: {
        creator: true,
      },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", params.bountyId);
    }

    // Authorization check: Only bounty creator (or unconstrained system) can settle
    if (params.callerParticipantId && params.callerParticipantId !== bounty.creatorId) {
      throw new ForbiddenError(
        `Forbidden: Only the bounty creator '${bounty.creatorId}' is authorized to trigger settlement.`
      );
    }

    // 1. Strict duplicate settlement check
    const existingSettlement = await db.settlement.findFirst({
      where: {
        OR: [{ bountyId: params.bountyId }, { submissionId: params.submissionId }],
      },
    });

    if (existingSettlement || bounty.status === "SETTLED") {
      throw new AlreadySettledError(params.bountyId);
    }

    // Assert valid state machine transition
    BountyStateMachine.assertTransition(
      bounty.id,
      bounty.status as any,
      "SETTLED"
    );

    const submission = await db.submission.findUnique({
      where: { id: params.submissionId },
      include: {
        agent: true,
      },
    });

    if (!submission) {
      throw new NotFoundError("Submission", params.submissionId);
    }

    if (submission.bountyId !== bounty.id) {
      throw new ConflictError(`Submission does not belong to bounty ${bounty.id}`);
    }

    if (submission.status !== "ACCEPTED") {
      throw new ConflictError(
        `Cannot settle bounty: Submission status is '${submission.status}'. AI verification must PASS before settlement.`
      );
    }

    // In TOURNAMENT mode, evaluation must be finalized and bounty must be RANKED
    if (bounty.competitionMode === "TOURNAMENT" && bounty.status !== "RANKED") {
      throw new EvaluationNotFinalizedError(bounty.id, bounty.status);
    }

    // Protection: creator cannot override or change the winner!
    if (bounty.winnerAgentId && submission.agentId !== bounty.winnerAgentId) {
      throw new ForbiddenError(
        `Cannot settle to agent '${submission.agentId}'. Protocol evaluation finalized '${bounty.winnerAgentId}' as the tournament winner.`
      );
    }

    const feePercentage = params.customFeePercentage ?? 2.5; // 2.5% Accord protocol fee
    const feeUsdc = Math.round((bounty.rewardUsdc * (feePercentage / 100)) * 100) / 100;
    const netPayoutUsdc = Math.round((bounty.rewardUsdc - feeUsdc) * 100) / 100;

    // 2. Release funds via the Accord Escrow Ledger interface
    const ledger = getAccordEscrowLedger();
    const releaseReceipt = await ledger.releaseEscrow({
      bountyId: bounty.id,
      escrowLedgerId: bounty.escrowLedgerId || `escrow_${bounty.id}`,
      winnerAddress: submission.agent.walletAddress,
      amountUsdc: netPayoutUsdc,
      protocolFeeUsdc: feeUsdc,
      verificationProofHash: submission.contentHash,
    });

    const settlementId = `settle_${crypto.randomUUID()}`;

    // 3. Atomic database state update
    const settlement = await db.$transaction(async (tx) => {
      // Create Settlement record
      const record = await tx.settlement.create({
        data: {
          id: settlementId,
          bountyId: bounty.id,
          submissionId: submission.id,
          agentId: submission.agentId,
          amountUsdc: netPayoutUsdc,
          feeUsdc,
          escrowContract:
            process.env.ACCORD_ESCROW_CONTRACT_ADDRESS ||
            (releaseReceipt.isOnChain ? "0x8888888888888888888888888888888888888888" : null),
          txHash: releaseReceipt.txHash,
          status: "CONFIRMED",
          blockNumber: releaseReceipt.blockNumber,
          chainId: releaseReceipt.chainId || (releaseReceipt.isOnChain ? 84532 : null),
          isOnChain: Boolean(releaseReceipt.isOnChain),
          ledgerType: releaseReceipt.ledgerType,
        },
      });

      // Update Bounty to SETTLED
      await tx.bounty.update({
        where: { id: bounty.id },
        data: {
          status: "SETTLED",
          escrowStatus: "RELEASED",
          settlementTxHash: releaseReceipt.txHash,
          winnerAgentId: submission.agentId,
        },
      });

      // Update winning agent's statistics
      await tx.participant.update({
        where: { id: submission.agentId },
        data: {
          bountiesWonCount: { increment: 1 },
          settledVolumeUsdc: { increment: netPayoutUsdc },
        },
      });

      // Update creator's volume
      await tx.participant.update({
        where: { id: bounty.creatorId },
        data: {
          settledVolumeUsdc: { increment: bounty.rewardUsdc },
        },
      });

      return record;
    });

    // 4. Grow agent settlement reputation
    const winBonus = Math.min(50, Math.round(15 + Math.sqrt(bounty.rewardUsdc) * 1.5));
    await ReputationService.adjustReputation({
      agentId: submission.agentId,
      bountyId: bounty.id,
      delta: winBonus,
      reason: "BOUNTY_WON",
      metadata: {
        rewardUsdc: bounty.rewardUsdc,
        netPayoutUsdc,
        settlementTxHash: releaseReceipt.txHash,
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

    // 5. Broadcast live bounty.settled event
    await eventBus.emit("bounty.settled" as any, "Bounty", bounty.id, {
      settlementId: settlement.id,
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      winnerAgentId: submission.agentId,
      winnerName: submission.agent.name,
      winnerWallet: submission.agent.walletAddress,
      rewardUsdc: bounty.rewardUsdc,
      netPayoutUsdc,
      feeUsdc,
      txHash: releaseReceipt.txHash,
      blockNumber: releaseReceipt.blockNumber,
      chainId: releaseReceipt.chainId || (releaseReceipt.isOnChain ? 84532 : null),
      isOnChain: Boolean(releaseReceipt.isOnChain),
      ledgerType: releaseReceipt.ledgerType,
      settledAt: settlement.settledAt,
    });

    return {
      settlement,
      releaseReceipt,
      netPayoutUsdc,
      feeUsdc,
    };
  }

  /**
   * Refunds an expired or cancelled bounty back to the creator
   */
  static async refundBounty(params: {
    bountyId: string;
    requesterId: string;
  }) {
    const bounty = await db.bounty.findUnique({
      where: { id: params.bountyId },
      include: { creator: true },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", params.bountyId);
    }

    if (bounty.creatorId !== params.requesterId) {
      throw new ForbiddenError("Only the bounty creator can request an escrow refund");
    }

    if (bounty.status === "SETTLED") {
      throw new ConflictError("Cannot refund an already settled bounty");
    }

    if (bounty.escrowStatus === "REFUNDED") {
      throw new ConflictError("Bounty escrow has already been refunded");
    }

    const isPastDeadline = new Date() > bounty.deadline;
    if (!isPastDeadline && bounty.status !== "CANCELLED") {
      throw new ConflictError("Bounty deadline has not elapsed and bounty is not cancelled");
    }

    const ledger = getAccordEscrowLedger();
    const refundReceipt = await ledger.refundEscrow({
      bountyId: bounty.id,
      escrowLedgerId: bounty.escrowLedgerId || `escrow_${bounty.id}`,
      refundToAddress: bounty.creator.walletAddress,
      amountUsdc: bounty.rewardUsdc,
    });

    await db.bounty.update({
      where: { id: bounty.id },
      data: {
        status: "EXPIRED",
        escrowStatus: "REFUNDED",
      },
    });

    await eventBus.emit("bounty.expired" as any, "Bounty", bounty.id, {
      bountyId: bounty.id,
      refundTo: bounty.creator.walletAddress,
      amountUsdc: bounty.rewardUsdc,
      txHash: refundReceipt.txHash,
    });

    return refundReceipt;
  }
}
