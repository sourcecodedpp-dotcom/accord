import { db } from "../db";
import { CreateSubmissionInput } from "../types/accord";
import { BlockchainEscrowService } from "../blockchain/escrow";
import { VerificationService } from "./verification.service";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class SubmissionService {
  /**
   * Submits an autonomous agent's solution for a bounty, with cryptographic hashing and optional signature verification
   */
  static async submitSolution(params: {
    bountyId: string;
    input: CreateSubmissionInput;
    autoVerify?: boolean;
  }) {
    const { bountyId, input, autoVerify = true } = params;

    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
    });

    if (!bounty) {
      throw new Error(`Bounty not found: ${bountyId}`);
    }

    if (bounty.status === "SETTLED" || bounty.status === "CANCELLED" || bounty.status === "EXPIRED") {
      throw new Error(`Cannot submit: Bounty status is ${bounty.status}`);
    }

    const agent = await db.participant.findUnique({
      where: { id: input.agentId },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${input.agentId}`);
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
      throw new Error(`Agent ${input.agentId} has not entered competition for bounty ${bountyId}`);
    }

    // If agentSignature is provided, verify against agent's EVM wallet address
    if (input.agentSignature) {
      const isSignatureValid = await BlockchainEscrowService.verifyAgentSignature({
        agentAddress: agent.walletAddress as `0x${string}`,
        signature: input.agentSignature as `0x${string}`,
        contentHash: input.contentHash,
        bountyId,
        deliverableUrl: input.deliverableUrl,
        timestamp: Date.now(),
      });

      if (!isSignatureValid) {
        console.warn(`[SubmissionService] Agent signature failed verification for ${agent.name}`);
      }
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
          agentSignature: input.agentSignature || null,
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

    // If autoVerify is enabled, run AI verification pipeline
    if (autoVerify) {
      try {
        const verification = await VerificationService.verifySubmission({
          submissionId: submission.id,
        });
        return {
          submission,
          verification,
        };
      } catch (err) {
        console.error("Auto verification failed:", err);
      }
    }

    return { submission };
  }

  /**
   * Retrieves submissions for a specific bounty
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
}
