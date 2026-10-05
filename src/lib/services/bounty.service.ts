import { db } from "../db";
import { CreateBountyInput, BountyQueryInput } from "../types/accord";
import { getAccordEscrowLedger } from "../blockchain/accord-escrow-ledger";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class BountyService {
  /**
   * Creates a live bounty posted by a user (human principal) or an autonomous AI agent
   * Connects to the Accord Escrow Ledger to secure the USDC reward in escrow
   */
  static async createBounty(input: CreateBountyInput) {
    const creator = await db.participant.findUnique({
      where: { id: input.creatorId },
    });

    if (!creator) {
      throw new Error(`Creator participant not found: ${input.creatorId}`);
    }

    const bountyId = input.id || `bounty_${crypto.randomUUID().slice(0, 12)}`;
    const deadline = new Date(Date.now() + (input.deadlineHours || 24) * 3600 * 1000);

    // 1. Lock funds in the Accord Escrow Ledger
    const ledger = getAccordEscrowLedger();
    const escrowReceipt = await ledger.createEscrow({
      bountyId,
      amountUsdc: input.rewardUsdc,
      depositorAddress: creator.walletAddress,
    });

    // 2. Persist Bounty state in database
    const bounty = await db.$transaction(async (tx) => {
      const created = await tx.bounty.create({
        data: {
          id: bountyId,
          title: input.title,
          description: input.description,
          acceptanceCriteria: JSON.stringify(input.acceptanceCriteria),
          rewardUsdc: input.rewardUsdc,
          creatorId: creator.id,
          creatorType: creator.type,
          status: "OPEN",
          competitionMode: input.competitionMode || "RACE_TO_FIRST_VALID",
          deadline,
          maxCompetitors: input.maxCompetitors || null,
          minReputationRequired: input.minReputationRequired || 0.0,
          escrowLedgerId: escrowReceipt.escrowLedgerId,
          escrowStatus: "HELD_IN_ESCROW",
          escrowTxHash: escrowReceipt.txHash,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              type: true,
              walletAddress: true,
              reputationScore: true,
            },
          },
        },
      });

      // Update creator's created count
      await tx.participant.update({
        where: { id: creator.id },
        data: {
          bountiesCreatedCount: { increment: 1 },
        },
      });

      return created;
    });

    // 3. Broadcast live event
    await eventBus.emit("bounty.created", "Bounty", bounty.id, {
      bountyId: bounty.id,
      title: bounty.title,
      rewardUsdc: bounty.rewardUsdc,
      creatorId: creator.id,
      creatorName: creator.name,
      creatorType: creator.type,
      competitionMode: bounty.competitionMode,
      deadline: bounty.deadline,
      minReputationRequired: bounty.minReputationRequired,
      escrowLedgerId: escrowReceipt.escrowLedgerId,
      escrowTxHash: escrowReceipt.txHash,
    });

    return {
      bounty: {
        ...bounty,
        acceptanceCriteria: JSON.parse(bounty.acceptanceCriteria),
        metadata: bounty.metadata ? JSON.parse(bounty.metadata) : null,
      },
      escrowReceipt,
    };
  }

  /**
   * Bounty Discovery: Retrieves active live bounties with text search, status, and reward filtering
   */
  static async listBounties(filters?: Partial<BountyQueryInput>) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.minReward !== undefined) {
      where.rewardUsdc = { gte: filters.minReward };
    }
    if (filters?.creatorId) {
      where.creatorId = filters.creatorId;
    }
    if (filters?.query) {
      where.OR = [
        { title: { contains: filters.query } },
        { description: { contains: filters.query } },
      ];
    }

    const [total, bounties] = await Promise.all([
      db.bounty.count({ where }),
      db.bounty.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              type: true,
              walletAddress: true,
              reputationScore: true,
            },
          },
          _count: {
            select: {
              competitionEntries: true,
              submissions: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      limit: filters?.limit || 20,
      offset: filters?.offset || 0,
      bounties: bounties.map((b) => ({
        ...b,
        acceptanceCriteria: JSON.parse(b.acceptanceCriteria),
        metadata: b.metadata ? JSON.parse(b.metadata) : null,
        competitorCount: b._count.competitionEntries,
        submissionCount: b._count.submissions,
      })),
    };
  }

  /**
   * Retrieves detailed bounty view including competitors, submissions, verification runs, and settlement
   */
  static async getBountyById(id: string) {
    const bounty = await db.bounty.findUnique({
      where: { id },
      include: {
        creator: true,
        winnerAgent: true,
        competitionEntries: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                walletAddress: true,
                reputationScore: true,
              },
            },
          },
        },
        submissions: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                walletAddress: true,
                reputationScore: true,
              },
            },
            verificationRuns: true,
          },
        },
        settlements: true,
      },
    });

    if (!bounty) {
      return null;
    }

    // Inspect live escrow ledger state
    const ledger = getAccordEscrowLedger();
    const escrowLedgerState = await ledger.getEscrowState(bounty.id);

    return {
      ...bounty,
      acceptanceCriteria: JSON.parse(bounty.acceptanceCriteria),
      metadata: bounty.metadata ? JSON.parse(bounty.metadata) : null,
      escrowLedgerState,
    };
  }
}
