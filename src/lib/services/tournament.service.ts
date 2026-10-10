import { db } from "../db";
import { VerificationService } from "./verification.service";
import { eventBus } from "./event.service";
import {
  BountyStateMachine,
  NotFoundError,
  ConflictError,
  ScoreImmutableError,
  TournamentRankingEntry,
  EvaluationWeights,
  VerifierType,
} from "@accord/protocol";
import crypto from "crypto";

export class TournamentService {
  /**
   * Locks submissions for a tournament bounty.
   * Transitions bounty from OPEN / COMPETING to SUBMISSIONS_LOCKED.
   */
  static async lockSubmissions(bountyId: string) {
    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", bountyId);
    }

    if (bounty.status === "SUBMISSIONS_LOCKED" || bounty.status === "EVALUATING" || bounty.status === "RANKED" || bounty.status === "SETTLED") {
      return bounty;
    }

    BountyStateMachine.assertTransition(bounty.id, bounty.status as any, "SUBMISSIONS_LOCKED");

    const updated = await db.bounty.update({
      where: { id: bountyId },
      data: { status: "SUBMISSIONS_LOCKED" },
    });

    await eventBus.emit("bounty.submissions_locked" as any, "Bounty", bountyId, {
      bountyId,
      status: "SUBMISSIONS_LOCKED",
      lockedAt: new Date(),
    });

    return updated;
  }

  /**
   * Evaluates all submissions in a tournament bounty using the modular multi-verifier system,
   * calculates deterministic final scores, handles invalid/below-minimum submissions,
   * resolves ties using transparent tie-breaking rules, assigns ranks, and selects the winner.
   *
   * Protection: Scores and rankings are frozen immutably once ranked.
   */
  static async evaluateAndRankTournament(params: {
    bountyId: string;
    verifierType?: VerifierType;
  }) {
    const bounty = await db.bounty.findUnique({
      where: { id: params.bountyId },
      include: {
        competitionEntries: {
          include: { agent: true },
        },
        submissions: {
          include: {
            agent: true,
            verificationRuns: true,
          },
        },
      },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", params.bountyId);
    }

    // Protection: scores and rankings cannot be modified once RANKED or SETTLED
    if (bounty.status === "RANKED" || bounty.status === "SETTLED") {
      throw new ScoreImmutableError(bounty.id);
    }

    // Transition to EVALUATING if not already there
    if (bounty.status !== "EVALUATING") {
      BountyStateMachine.assertTransition(bounty.id, bounty.status as any, "EVALUATING");
      await db.bounty.update({
        where: { id: bounty.id },
        data: { status: "EVALUATING" },
      });
    }

    let weights: EvaluationWeights = {
      correctness: 0.4,
      completeness: 0.3,
      securityAndRobustness: 0.15,
      performanceAndEfficiency: 0.15,
    };

    if (bounty.evaluationWeights) {
      try {
        weights = { ...weights, ...JSON.parse(bounty.evaluationWeights) };
      } catch {}
    }

    const minScore = bounty.minPassingScore ?? 70.0;
    const evaluatedEntries: TournamentRankingEntry[] = [];

    // 1. Evaluate each submission with the multi-verifier pipeline
    for (const sub of bounty.submissions) {
      let run = sub.verificationRuns[sub.verificationRuns.length - 1];
      let breakdown: any = null;

      if (!run) {
        // Run verification now
        const verif = await VerificationService.verifySubmission({
          submissionId: sub.id,
          verifierType: params.verifierType || "MULTI_AGENT_CONSENSUS",
        });
        breakdown = verif.rubricBreakdown;
        run = {
          score: verif.score,
          verdict: verif.verdict,
          rubricBreakdown: JSON.stringify(breakdown),
        } as any;
      } else {
        try {
          breakdown = JSON.parse(run.rubricBreakdown);
        } catch {
          breakdown = null;
        }
      }

      // Compute weighted score from rubric breakdown if present
      let finalScore = run.score;
      if (breakdown && typeof breakdown.correctness === "number") {
        const weighted =
          breakdown.correctness * weights.correctness +
          breakdown.completeness * weights.completeness +
          breakdown.securityAndRobustness * weights.securityAndRobustness +
          breakdown.performanceAndEfficiency * weights.performanceAndEfficiency;
        finalScore = Math.round(weighted * 100) / 100;
      }

      const isBelowMin = finalScore < minScore;
      const isFailedVerdict = run.verdict !== "PASS";
      const disqualified = isBelowMin || isFailedVerdict;
      let disqualificationReason: string | undefined;

      if (isBelowMin) {
        disqualificationReason = `Final score (${finalScore}) is below minimum passing threshold (${minScore})`;
      } else if (isFailedVerdict) {
        disqualificationReason = "Failed acceptance criteria verification";
      }

      evaluatedEntries.push({
        rank: 0, // Assigned after sorting
        agentId: sub.agentId,
        agentName: sub.agent.name,
        walletAddress: sub.agent.walletAddress,
        submissionId: sub.id,
        score: finalScore,
        verdict: disqualified ? "FAIL" : "PASS",
        disqualified,
        disqualificationReason,
        submittedAt: sub.submittedAt,
        breakdown,
      });
    }

    // 2. Separate valid and disqualified submissions
    const valid = evaluatedEntries.filter((e) => !e.disqualified);
    const disqualified = evaluatedEntries.filter((e) => e.disqualified);

    // 3. Deterministic Sorting & Tie-Breaking for valid submissions:
    // Rule 1: Highest final score
    // Rule 2: Highest correctness sub-score (tie-breaker 1)
    // Rule 3: Earliest submission timestamp (tie-breaker 2)
    // Rule 4: Cryptographic hash comparison sha256(contentHash + agentId) (tie-breaker 3)
    valid.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Tie-Breaker 1: Correctness
      const corrA = a.breakdown?.correctness ?? 0;
      const corrB = b.breakdown?.correctness ?? 0;
      if (corrB !== corrA) {
        a.tieBreakerApplied = "HIGHER_CORRECTNESS";
        b.tieBreakerApplied = "HIGHER_CORRECTNESS";
        return corrB - corrA;
      }

      // Tie-Breaker 2: Speed (earlier submittedAt wins)
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      if (timeA !== timeB) {
        a.tieBreakerApplied = "FASTER_SUBMISSION_TIME";
        b.tieBreakerApplied = "FASTER_SUBMISSION_TIME";
        return timeA - timeB;
      }

      // Tie-Breaker 3: Deterministic hash
      const hashA = crypto.createHash("sha256").update(`${a.submissionId}:${a.agentId}`).digest("hex");
      const hashB = crypto.createHash("sha256").update(`${b.submissionId}:${b.agentId}`).digest("hex");
      a.tieBreakerApplied = "DETERMINISTIC_HASH";
      b.tieBreakerApplied = "DETERMINISTIC_HASH";
      return hashA.localeCompare(hashB);
    });

    // Sort disqualified submissions by score descending
    disqualified.sort((a, b) => b.score - a.score);

    // 4. Assign ranks (1..N for valid, followed by disqualified)
    let currentRank = 1;
    for (const item of valid) {
      item.rank = currentRank++;
    }
    for (const item of disqualified) {
      item.rank = currentRank++;
    }

    const fullRankings = [...valid, ...disqualified];
    const winner = valid.length > 0 ? valid[0] : null;

    // 5. Persist rankings, ranks on submissions, and winner on bounty
    await db.$transaction(async (tx) => {
      // Update each submission's rank and disqualification status
      for (const entry of fullRankings) {
        await tx.submission.update({
          where: { id: entry.submissionId },
          data: {
            rank: entry.rank,
            score: entry.score,
            status: entry.disqualified ? "REJECTED" : "ACCEPTED",
            disqualified: entry.disqualified,
            disqualificationReason: entry.disqualificationReason || null,
          },
        });
      }

      // Transition bounty to RANKED and assign winnerAgentId
      await tx.bounty.update({
        where: { id: bounty.id },
        data: {
          status: "RANKED",
          winnerAgentId: winner ? winner.agentId : null,
          rankings: JSON.stringify(fullRankings),
        },
      });
    });

    // 6. Broadcast immutable protocol audit events
    await eventBus.emit("bounty.ranked" as any, "Bounty", bounty.id, {
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      totalCompetitors: bounty.competitionEntries.length,
      totalSubmissions: fullRankings.length,
      validSubmissionsCount: valid.length,
      disqualifiedCount: disqualified.length,
      rankings: fullRankings.map((r) => ({
        rank: r.rank,
        agentId: r.agentId,
        agentName: r.agentName,
        score: r.score,
        verdict: r.verdict,
        disqualified: r.disqualified,
        tieBreakerApplied: r.tieBreakerApplied,
      })),
      winner: winner
        ? {
            rank: 1,
            agentId: winner.agentId,
            agentName: winner.agentName,
            walletAddress: winner.walletAddress,
            score: winner.score,
            submissionId: winner.submissionId,
          }
        : null,
      rankedAt: new Date(),
    });

    if (winner) {
      await eventBus.emit("bounty.winner_selected" as any, "Bounty", bounty.id, {
        bountyId: bounty.id,
        bountyTitle: bounty.title,
        winnerAgentId: winner.agentId,
        winnerName: winner.agentName,
        winnerWallet: winner.walletAddress,
        winningSubmissionId: winner.submissionId,
        score: winner.score,
        rewardUsdc: bounty.rewardUsdc,
        tieBreakerApplied: winner.tieBreakerApplied || null,
        selectedAt: new Date(),
      });
    }

    return {
      bountyId: bounty.id,
      winner,
      rankings: fullRankings,
      totalSubmissions: fullRankings.length,
      validSubmissionsCount: valid.length,
      disqualifiedCount: disqualified.length,
    };
  }

  /**
   * Retrieves tournament status, competitor count, stage, and full leaderboard rankings.
   */
  static async getTournamentStatus(bountyId: string) {
    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
      include: {
        creator: {
          select: { id: true, name: true, walletAddress: true },
        },
        winnerAgent: {
          select: { id: true, name: true, walletAddress: true, reputationScore: true },
        },
        competitionEntries: {
          include: {
            agent: {
              select: { id: true, name: true, walletAddress: true, reputationScore: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        submissions: {
          include: {
            agent: {
              select: { id: true, name: true, walletAddress: true },
            },
          },
          orderBy: { rank: "asc" },
        },
      },
    });

    if (!bounty) {
      throw new NotFoundError("Bounty", bountyId);
    }

    let parsedRankings: TournamentRankingEntry[] = [];
    if (bounty.rankings) {
      try {
        parsedRankings = JSON.parse(bounty.rankings);
      } catch {}
    }

    return {
      bountyId: bounty.id,
      title: bounty.title,
      rewardUsdc: bounty.rewardUsdc,
      status: bounty.status,
      competitionMode: bounty.competitionMode,
      maxParticipants: bounty.maxParticipants,
      currentCompetitorCount: bounty.competitionEntries.length,
      minPassingScore: bounty.minPassingScore,
      competitionStartsAt: bounty.competitionStartsAt,
      registrationDeadline: bounty.registrationDeadline,
      submissionDeadline: bounty.submissionDeadline,
      winner: bounty.winnerAgent,
      rankings: parsedRankings,
      competitors: bounty.competitionEntries.map((e) => ({
        agentId: e.agent.id,
        agentName: e.agent.name,
        walletAddress: e.agent.walletAddress,
        status: e.status,
        joinedAt: e.joinedAt,
        heartbeatAt: e.heartbeatAt,
      })),
    };
  }
}
