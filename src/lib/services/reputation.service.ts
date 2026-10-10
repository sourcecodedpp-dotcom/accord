import { db } from "../db";
import { eventBus } from "./event.service";
import crypto from "crypto";

export type ReputationChangeReason =
  | "BOUNTY_WON"
  | "SUBMISSION_VERIFIED_PASS"
  | "SPEED_ACCURACY_BONUS"
  | "SUBMISSION_VERIFIED_FAIL"
  | "SETTLEMENT_CONFIRMED"
  | "VERIFIER_CONSENSUS_MATCH"
  | "DISQUALIFICATION_PENALTY";

export interface ReputationBadge {
  name: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
  description: string;
}

export class ReputationService {
  /**
   * Calculates the tiered badge based on an agent's cumulative reputation score
   */
  static getAgentBadge(score: number): ReputationBadge {
    if (score >= 1000) {
      return {
        name: "Polis Grandmaster",
        tier: "DIAMOND",
        description: "Exceptional autonomous reliability across high-value USDC settlements.",
      };
    }
    if (score >= 600) {
      return {
        name: "Elite Autonomous Operator",
        tier: "PLATINUM",
        description: "Proven track record with consistent verification pass rates and high execution speed.",
      };
    }
    if (score >= 300) {
      return {
        name: "Polis Specialist",
        tier: "GOLD",
        description: "Specialized problem solver with multiple verified bounty settlements.",
      };
    }
    if (score >= 150) {
      return {
        name: "Verified Solver",
        tier: "SILVER",
        description: "Validated agent identity with successful submission history.",
      };
    }
    return {
      name: "Novice Agent",
      tier: "BRONZE",
      description: "Newly initialized autonomous agent in the Polis Agora.",
    };
  }

  /**
   * Applies an audited reputation delta to an agent, recording an immutable log
   */
  static async adjustReputation(params: {
    agentId: string;
    bountyId?: string;
    delta: number;
    reason: ReputationChangeReason;
    metadata?: Record<string, any>;
  }): Promise<{ previousScore: number; newScore: number; delta: number }> {
    const agent = await db.participant.findUnique({
      where: { id: params.agentId },
    });

    if (!agent) {
      throw new Error(`Participant not found: ${params.agentId}`);
    }

    // Idempotency: prevent double-applying reputation for the same submission or settlement
    if (params.metadata?.submissionId || params.metadata?.settlementId) {
      const idKey = params.metadata.submissionId || params.metadata.settlementId;
      const existing = await db.reputationLog.findFirst({
        where: {
          agentId: params.agentId,
          bountyId: params.bountyId,
          reason: params.reason,
          metadata: {
            contains: idKey,
          },
        },
      });
      if (existing) {
        return {
          previousScore: agent.reputationScore,
          newScore: agent.reputationScore,
          delta: 0,
        };
      }
    }

    const previousScore = agent.reputationScore;
    // Reputation cannot drop below 0
    const newScore = Math.max(0, Math.round((previousScore + params.delta) * 100) / 100);

    await db.$transaction(async (tx) => {
      // 1. Update participant score
      await tx.participant.update({
        where: { id: params.agentId },
        data: {
          reputationScore: newScore,
        },
      });

      // 2. Create audited log entry
      await tx.reputationLog.create({
        data: {
          id: `rep_${crypto.randomUUID()}`,
          agentId: params.agentId,
          bountyId: params.bountyId,
          delta: params.delta,
          previousScore,
          newScore,
          reason: params.reason,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      });
    });

    // Broadcast live event to subscribers
    await eventBus.emit("reputation.updated", "Participant", params.agentId, {
      agentId: params.agentId,
      agentName: agent.name,
      previousScore,
      newScore,
      delta: params.delta,
      reason: params.reason,
      badge: this.getAgentBadge(newScore),
    });

    return { previousScore, newScore, delta: params.delta };
  }

  /**
   * Retrieves full reputation profile, rank, badge, and recent audit log history
   */
  static async getReputation(agentId: string) {
    return this.getReputationProfile(agentId);
  }

  static async getReputationProfile(agentId: string) {
    const agent = await db.participant.findUnique({
      where: { id: agentId },
      include: {
        reputationLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            bounty: {
              select: {
                id: true,
                title: true,
                rewardUsdc: true,
              },
            },
          },
        },
      },
    });

    if (!agent) {
      return null;
    }

    // Determine ranking across all agents
    const higherRankedCount = await db.participant.count({
      where: {
        type: "AI_AGENT",
        reputationScore: { gt: agent.reputationScore },
      },
    });

    const rank = higherRankedCount + 1;
    const badge = this.getAgentBadge(agent.reputationScore);

    return {
      agentId: agent.id,
      name: agent.name,
      walletAddress: agent.walletAddress,
      reputationScore: agent.reputationScore,
      rank,
      badge,
      settledVolumeUsdc: agent.settledVolumeUsdc,
      bountiesWonCount: agent.bountiesWonCount,
      logs: agent.reputationLogs.map((log) => ({
        id: log.id,
        bountyId: log.bountyId,
        bountyTitle: log.bounty?.title,
        delta: log.delta,
        previousScore: log.previousScore,
        newScore: log.newScore,
        reason: log.reason,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        createdAt: log.createdAt,
      })),
    };
  }
}
