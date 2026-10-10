import { db } from "../db";
import { VerificationResult, VerifierType, ScoreImmutableError, NotFoundError } from "@accord/protocol";
import { VerifierRegistry } from "../verification/registry";
import { ReputationService } from "./reputation.service";
import { eventBus } from "./event.service";
import crypto from "crypto";

export class VerificationService {
  /**
   * Evaluates a submission against bounty acceptance criteria using the modular verifier registry
   */
  static async verifySubmission(params: {
    submissionId: string;
    verifierAgentId?: string;
    verifierType?: VerifierType;
  }): Promise<VerificationResult> {
    const submission = await db.submission.findUnique({
      where: { id: params.submissionId },
      include: {
        bounty: true,
        agent: true,
      },
    });

    if (!submission) {
      throw new NotFoundError("Submission", params.submissionId);
    }

    const bounty = submission.bounty;

    // Protection: Once a tournament bounty is RANKED or SETTLED, scores cannot be modified
    if (bounty.status === "RANKED" || bounty.status === "SETTLED") {
      throw new ScoreImmutableError(bounty.id);
    }
    let criteria: string[] = [];
    try {
      criteria = JSON.parse(bounty.acceptanceCriteria);
    } catch {
      criteria = [bounty.acceptanceCriteria];
    }

    // 1. Emit verification.started
    await eventBus.emit("verification.started", "Submission", submission.id, {
      submissionId: submission.id,
      bountyId: bounty.id,
      agentId: submission.agentId,
      verifierType: params.verifierType || "LLM_RUBRIC_EVALUATOR",
    });

    // 2. Select modular verifier from registry
    const verifier = VerifierRegistry.get(params.verifierType);

    const verificationResult = await verifier.evaluate({
      bounty: {
        id: bounty.id,
        title: bounty.title,
        description: bounty.description,
        acceptanceCriteria: criteria,
        rewardUsdc: bounty.rewardUsdc,
      },
      submission: {
        id: submission.id,
        deliverableType: submission.deliverableType,
        deliverableUrl: submission.deliverableUrl,
        contentHash: submission.contentHash,
        summary: submission.summary,
        executionTrace: submission.executionTrace,
      },
    });

    const verificationRunId = `verif_${crypto.randomUUID()}`;

    // 3. Persist verification run in database
    await db.$transaction(async (tx) => {
      await tx.verificationRun.create({
        data: {
          id: verificationRunId,
          submissionId: submission.id,
          bountyId: bounty.id,
          verifierAgentId: params.verifierAgentId || null,
          verifierType: verificationResult.verifierType,
          score: verificationResult.score,
          verdict: verificationResult.verdict,
          rubricBreakdown: JSON.stringify(verificationResult.rubricBreakdown),
          reasoning: verificationResult.reasoning,
          verifiedAt: verificationResult.verifiedAt,
        },
      });

      // Update submission status and score
      await tx.submission.update({
        where: { id: submission.id },
        data: {
          status: verificationResult.verdict === "PASS" ? "ACCEPTED" : "REJECTED",
          score: verificationResult.score,
        },
      });

      // If passed, designate winner and transition state for settlement
      if (verificationResult.verdict === "PASS" && bounty.status !== "SETTLED") {
        const nextStatus = bounty.competitionMode === "TOURNAMENT" ? "RANKED" : "EVALUATING";
        await tx.bounty.update({
          where: { id: bounty.id },
          data: {
            status: nextStatus,
            winnerAgentId: submission.agentId,
          },
        });
      }
    });

    // 4. Update agent reputation based on verification outcome
    if (verificationResult.verdict === "PASS") {
      await ReputationService.adjustReputation({
        agentId: submission.agentId,
        bountyId: bounty.id,
        delta: 15.0,
        reason: "SUBMISSION_VERIFIED_PASS",
        metadata: {
          score: verificationResult.score,
          submissionId: submission.id,
        },
      });
    } else {
      await ReputationService.adjustReputation({
        agentId: submission.agentId,
        bountyId: bounty.id,
        delta: -10.0,
        reason: "SUBMISSION_VERIFIED_FAIL",
        metadata: {
          score: verificationResult.score,
          submissionId: submission.id,
          reasoning: verificationResult.reasoning,
        },
      });
    }

    // 5. Broadcast verification.completed live event
    await eventBus.emit("verification.completed", "Submission", submission.id, {
      verificationRunId,
      submissionId: submission.id,
      bountyId: bounty.id,
      agentId: submission.agentId,
      score: verificationResult.score,
      verdict: verificationResult.verdict,
      reasoning: verificationResult.reasoning,
      breakdown: verificationResult.rubricBreakdown,
      providerMetadata: verificationResult.providerMetadata,
    });

    return verificationResult;
  }
}
