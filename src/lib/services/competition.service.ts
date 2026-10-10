import { db } from "../db";
import { JoinCompetitionInput } from "../types/accord";
import { eventBus } from "./event.service";
import {
  NotFoundError,
  ForbiddenError,
  RegistrationClosedError,
  ParticipantLimitReachedError,
  DuplicateParticipationError,
} from "@accord/protocol";
import crypto from "crypto";

export class CompetitionService {
  /**
   * Enters an autonomous AI agent into a live bounty competition
   */
  static async joinCompetition(
    bountyId: string,
    input: JoinCompetitionInput & { strict?: boolean },
    callerParticipantId?: string,
    options?: { strict?: boolean }
  ) {
    if (callerParticipantId && callerParticipantId !== input.agentId) {
      throw new ForbiddenError(
        `Caller '${callerParticipantId}' is not authorized to register agent '${input.agentId}' for competition`
      );
    }

    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
      include: {
        competitionEntries: true,
      },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", bountyId);
    }

    if (
      bounty.status !== "OPEN" &&
      bounty.status !== "IN_COMPETITION" &&
      bounty.status !== "COMPETING"
    ) {
      throw new Error(`Bounty is not open for competition. Current status: ${bounty.status}`);
    }

    const regDeadline = bounty.registrationDeadline || bounty.deadline;
    if (new Date() > new Date(regDeadline) || new Date() > new Date(bounty.deadline)) {
      const effectiveDeadline = new Date() > new Date(bounty.deadline) ? bounty.deadline : regDeadline;
      throw new RegistrationClosedError(bountyId, effectiveDeadline);
    }

    const agent = await db.participant.findUnique({
      where: { id: input.agentId },
    });

    if (!agent) {
      throw new NotFoundError("Agent", input.agentId);
    }

    if (agent.type !== "AI_AGENT") {
      throw new Error(`Only autonomous AI agents can compete. Participant type is ${agent.type}`);
    }

    if (agent.reputationScore < bounty.minReputationRequired) {
      throw new Error(
        `Agent reputation (${agent.reputationScore}) is below bounty requirement (${bounty.minReputationRequired})`
      );
    }

    // Check if already registered (protection against duplicate participation)
    const existing = await db.competitionEntry.findUnique({
      where: {
        bountyId_agentId: {
          bountyId,
          agentId: input.agentId,
        },
      },
    });

    if (existing) {
      const isStrict = input.strict ?? options?.strict ?? (bounty.competitionMode === "TOURNAMENT");
      if (isStrict) {
        throw new DuplicateParticipationError(bountyId, input.agentId);
      }
      return existing;
    }

    const maxLimit = bounty.maxParticipants || bounty.maxCompetitors || 10;
    if (bounty.competitionEntries.length >= maxLimit) {
      throw new ParticipantLimitReachedError(bountyId, maxLimit);
    }

    const entryId = `entry_${crypto.randomUUID()}`;

    const entry = await db.$transaction(async (tx) => {
      // Update bounty status to COMPETING if it was OPEN
      if (bounty.status === "OPEN") {
        await tx.bounty.update({
          where: { id: bounty.id },
          data: { status: "COMPETING" },
        });
      }

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
  static async recordHeartbeat(
    bountyId: string,
    agentId: string,
    callerParticipantId?: string
  ) {
    if (callerParticipantId && callerParticipantId !== agentId) {
      throw new ForbiddenError(
        `Caller '${callerParticipantId}' is not authorized to send heartbeats for agent '${agentId}'`
      );
    }

    const entry = await db.competitionEntry.findUnique({
      where: {
        bountyId_agentId: {
          bountyId,
          agentId,
        },
      },
    });

    if (!entry) {
      throw new NotFoundError("CompetitionEntry for agent on bounty", `${agentId}:${bountyId}`);
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
