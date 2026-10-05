import { db } from "../db";
import { RegisterParticipantInput } from "../types/accord";
import { ReputationService } from "./reputation.service";
import { AuthService } from "./auth.service";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class AgentService {
  /**
   * Registers a new participant (AI Agent, Human Principal, or DAO) in the Accord Agora
   * Generates a unique Accord API Key for machine-to-machine agent operations
   */
  static async registerParticipant(input: RegisterParticipantInput) {
    const id =
      input.id ||
      `${input.type === "AI_AGENT" ? "agent" : "principal"}_${crypto.randomUUID().slice(0, 10)}`;

    const existing = await db.participant.findFirst({
      where: {
        OR: [{ id }, { walletAddress: input.walletAddress }],
      },
    });

    if (existing) {
      return {
        participant: existing,
        apiKey: null, // Existing participant retains their existing key
        alreadyRegistered: true,
      };
    }

    // Generate Accord API Key and SHA-256 hash for secure storage
    const { apiKey, apiKeyHash } = AuthService.generateApiKey();

    const participant = await db.participant.create({
      data: {
        id,
        type: input.type,
        name: input.name,
        walletAddress: input.walletAddress,
        apiKeyHash,
        endpointUrl: input.endpointUrl || null,
        bio: input.bio || null,
        reputationScore: 100.0, // Initial baseline score
        settledVolumeUsdc: 0.0,
      },
    });

    // Record initial reputation log
    await db.reputationLog.create({
      data: {
        id: `rep_${crypto.randomUUID()}`,
        agentId: participant.id,
        delta: 100.0,
        previousScore: 0.0,
        newScore: 100.0,
        reason: "INITIAL_REGISTRATION",
      },
    });

    await eventBus.emit("agent.registered", "Participant", participant.id, {
      id: participant.id,
      name: participant.name,
      type: participant.type,
      walletAddress: participant.walletAddress,
      reputationScore: participant.reputationScore,
    });

    return {
      participant,
      apiKey, // Returned only once at registration
      alreadyRegistered: false,
    };
  }

  /**
   * Retrieves participant profile with dynamic badge and rank
   */
  static async getParticipant(id: string) {
    return await ReputationService.getReputationProfile(id);
  }

  /**
   * Leaderboard of autonomous agents ranked by reputation, won bounties, and settled USDC volume
   */
  static async getLeaderboard(limit = 50) {
    const agents = await db.participant.findMany({
      where: { type: "AI_AGENT" },
      orderBy: [{ reputationScore: "desc" }, { settledVolumeUsdc: "desc" }],
      take: limit,
      include: {
        _count: {
          select: {
            submissions: true,
            wonBounties: true,
            competitionEntries: true,
          },
        },
      },
    });

    return agents.map((agent, index) => ({
      rank: index + 1,
      id: agent.id,
      name: agent.name,
      walletAddress: agent.walletAddress,
      reputationScore: agent.reputationScore,
      badge: ReputationService.getAgentBadge(agent.reputationScore),
      settledVolumeUsdc: agent.settledVolumeUsdc,
      bountiesWon: agent.bountiesWonCount,
      totalEntries: agent._count.competitionEntries,
      totalSubmissions: agent._count.submissions,
      joinedAt: agent.createdAt,
    }));
  }
}
