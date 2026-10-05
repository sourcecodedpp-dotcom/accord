import { db } from "../db";
import { JoinCompetitionInput } from "../types/accord";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class CompetitionService {
  /**
   * Enters an autonomous AI agent into a live bounty competition
   */
  static async joinCompetition(bountyId: string, input: JoinCompetitionInput) {
    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
      include: {
        competitionEntries: true,
      },
    });

    if (!bounty) {
      throw new Error(`Bounty not found: ${bountyId}`);
    }

    if (bounty.status !== "OPEN" && bounty.status !== "IN_COMPETITION") {
      throw new Error(`Bounty is not open for competition. Current status: ${bounty.status}`);
    }

    if (new Date() > bounty.deadline) {
      throw new Error(`Bounty competition deadline has passed: ${bounty.deadline.toISOString()}`);
    }

    const agent = await db.participant.findUnique({
      where: { id: input.agentId },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${input.agentId}`);
    }

    if (agent.type !== "AI_AGENT") {
      throw new Error(`Only autonomous AI agents can compete. Participant type is ${agent.type}`);
    }

    if (agent.reputationScore < bounty.minReputationRequired) {
      throw new Error(
        `Agent reputation (${agent.reputationScore}) is below bounty requirement (${bounty.minReputationRequired})`
      );
    }

    if (bounty.maxCompetitors && bounty.competitionEntries.length >= bounty.maxCompetitors) {
      throw new Error(`Bounty competitor limit reached: ${bounty.maxCompetitors}`);
    }

    // Check if already registered
    const existing = await db.competitionEntry.findUnique({
      where: {
        bountyId_agentId: {
          bountyId,
          agentId: input.agentId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const entryId = `entry_${crypto.randomUUID()}`;

    const entry = await db.$transaction(async (tx) => {
      const createdEntry = await tx.competitionEntry.create({
        data: {
          id: entryId,
          bountyId,
          agentId: input.agentId,
          status: "REGISTERED",
          stakeUsdc: input.stakeUsdc || 0.0,
          heartbeatAt: new Date(),
        },
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
      });

      // Update bounty status to IN_COMPETITION
      if (bounty.status === "OPEN") {
        await tx.bounty.update({
          where: { id: bounty.id },
          data: { status: "IN_COMPETITION" },
        });
      }

      return createdEntry;
    });

    // Broadcast live event
    await eventBus.emit("agent.joined_competition", "Bounty", bountyId, {
      bountyId,
      bountyTitle: bounty.title,
      agentId: agent.id,
      agentName: agent.name,
      agentReputation: agent.reputationScore,
      stakeUsdc: input.stakeUsdc,
      joinedAt: entry.joinedAt,
    });

    return entry;
  }

  /**
   * Updates an agent's heartbeat timestamp while working on a bounty
   */
  static async recordHeartbeat(bountyId: string, agentId: string) {
    const entry = await db.competitionEntry.findUnique({
      where: {
        bountyId_agentId: {
          bountyId,
          agentId,
        },
      },
    });

    if (!entry) {
      throw new Error(`Competition entry not found for agent ${agentId} on bounty ${bountyId}`);
    }

    const updated = await db.competitionEntry.update({
      where: { id: entry.id },
      data: {
        heartbeatAt: new Date(),
        status: entry.status === "REGISTERED" ? "WORKING" : entry.status,
      },
    });

    await eventBus.emit("agent.heartbeat", "CompetitionEntry", entry.id, {
      bountyId,
      agentId,
      heartbeatAt: updated.heartbeatAt,
      status: updated.status,
    });

    return updated;
  }

  /**
   * Lists all competing agents on a bounty
   */
  static async getCompetitors(bountyId: string) {
    return await db.competitionEntry.findMany({
      where: { bountyId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
            reputationScore: true,
            settledVolumeUsdc: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }
}
