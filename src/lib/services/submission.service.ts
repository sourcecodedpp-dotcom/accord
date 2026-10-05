import { db } from "../db";
import { CreateSubmissionInput } from "../types/accord";
import { VerificationService } from "./verification.service";
import { eventBus } from "./event.service";
import {
  NotFoundError,
  ForbiddenError,
  BountyExpiredError,
  DuplicateSubmissionError,
} from "@accord/protocol";
import crypto from "crypto";

export class SubmissionService {
  /**
   * Submits an autonomous agent's solution for a bounty, with cryptographic hashing and verification
   */
  static async submitSolution(params: {
    bountyId: string;
    input: CreateSubmissionInput;
    callerParticipantId?: string;
  }) {
    const { bountyId, input, callerParticipantId } = params;

    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", bountyId);
    }

    if (bounty.status === "SETTLED" || bounty.status === "CANCELLED" || bounty.status === "EXPIRED") {
      throw new Error(`Cannot submit: Bounty status is ${bounty.status}`);
    }

    // Check if bounty deadline has passed
    if (new Date() > new Date(bounty.deadline)) {
      await db.bounty.update({
        where: { id: bountyId },
        data: { status: "EXPIRED" },
      });
      throw new BountyExpiredError(bountyId, bounty.deadline);
    }

    // Authorization check: caller must match input.agentId if specified
    if (callerParticipantId && callerParticipantId !== input.agentId) {
      throw new ForbiddenError(
        `Caller '${callerParticipantId}' is not authorized to submit solutions on behalf of agent '${input.agentId}'`
      );
    }

    const agent = await db.participant.findUnique({
      where: { id: input.agentId },
    });

    if (!agent) {
      throw new NotFoundError("Agent", input.agentId);
    }

    // Verify agent is a registered competitor
    const entry = await db.competitionEntry.findUnique({
      where: {
        bountyId_agentId: {
          bountyId,
          agentId: input.agentId,
        },
      },
    });

    if (!entry) {
      throw new ForbiddenError(`Agent ${input.agentId} has not joined the competition for bounty ${bountyId}`);
    }

    // Check duplicate active or accepted submission
    const existingSubmission = await db.submission.findFirst({
      where: {
        bountyId,
        agentId: input.agentId,
        status: { in: ["PENDING_VERIFICATION", "ACCEPTED"] },
      },
    });

    if (existingSubmission) {
      throw new DuplicateSubmissionError(bountyId, input.agentId);
    }

    const submissionId = `sub_${crypto.randomUUID()}`;

    const submission = await db.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          id: submissionId,
          bountyId,
          agentId: input.agentId,
          deliverableType: input.deliverableType,
          deliverableUrl: input.deliverableUrl,
          contentHash: input.contentHash,
          accordSignature: input.accordSignature || null,
          summary: input.summary,
          executionTrace: input.executionTrace || null,
          status: "PENDING_VERIFICATION",
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

      // Update competition entry status
      await tx.competitionEntry.update({
        where: { id: entry.id },
        data: { status: "SUBMITTED" },
      });

      return sub;
    });

    // Broadcast live event
    await eventBus.emit("submission.received", "Bounty", bountyId, {
      submissionId: submission.id,
      bountyId,
      agentId: input.agentId,
      agentName: agent.name,
      deliverableType: input.deliverableType,
      deliverableUrl: input.deliverableUrl,
      contentHash: input.contentHash,
      submittedAt: submission.submittedAt,
    });

    // If autoVerify is requested (default: true), run AI verification pipeline
    if (input.autoVerify) {
      try {
        const verification = await VerificationService.verifySubmission({
          submissionId: submission.id,
        });
        const refreshedSubmission = await db.submission.findUnique({
          where: { id: submission.id },
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
        return {
          submission: refreshedSubmission || submission,
          verification,
        };
      } catch (err) {
        console.error("Auto verification failed:", err);
      }
    }

    return { submission };
  }

  /**
   * Retrieves all submissions for a specific bounty
   */
  static async getSubmissions(bountyId: string) {
    return await db.submission.findMany({
      where: { bountyId },
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
      orderBy: { submittedAt: "desc" },
    });
  }

  /**
   * Retrieves a single submission by ID
   */
  static async getSubmissionById(submissionId: string) {
    return await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
            reputationScore: true,
          },
        },
        bounty: true,
        verificationRuns: true,
        settlement: true,
      },
    });
  }
}
