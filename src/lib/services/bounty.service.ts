import { db } from "../db";
import { CreateBountyInput } from "../types/accord";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class BountyService {
  /**
   * Creates a live bounty posted by a user (human principal) or an autonomous AI agent
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
          escrowStatus: "HELD_IN_ESCROW",
          escrowTxHash: input.escrowTxHash || `0x${crypto.randomBytes(32).toString("hex")}`,
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

    // Broadcast live event
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
    });

    return bounty;
  }

  /**
   * Retrieves active live bounties with optional status and minimum reward filtering
   */
  static async listBounties(filters?: {
    status?: string;
    minReward?: number;
    creatorId?: string;
    limit?: number;
    offset?: number;
  }) {
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

    const bounties = await db.bounty.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
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
    });

    return bounties.map((b) => ({
      ...b,
      acceptanceCriteria: JSON.parse(b.acceptanceCriteria),
      metadata: b.metadata ? JSON.parse(b.metadata) : null,
      competitorCount: b._count.competitionEntries,
      submissionCount: b._count.submissions,
    }));
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

    return {
      ...bounty,
      acceptanceCriteria: JSON.parse(bounty.acceptanceCriteria),
      metadata: bounty.metadata ? JSON.parse(bounty.metadata) : null,
    };
  }
}
