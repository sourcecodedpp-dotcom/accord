import assert from "node:assert/strict";
import { AuthService } from "../src/lib/services/auth.service";
import { AgentService } from "../src/lib/services/agent.service";
import { BountyService } from "../src/lib/services/bounty.service";
import { CompetitionService } from "../src/lib/services/competition.service";
import { SubmissionService } from "../src/lib/services/submission.service";
import { VerificationService } from "../src/lib/services/verification.service";
import { TournamentService } from "../src/lib/services/tournament.service";
import { SettlementService } from "../src/lib/services/settlement.service";
import { ReputationService } from "../src/lib/services/reputation.service";
import { db } from "../src/lib/db";
import {
  ParticipantLimitReachedError,
  RegistrationClosedError,
  SubmissionsLockedError,
  DuplicateParticipationError,
  DuplicateSubmissionError,
  EvaluationNotFinalizedError,
  ScoreImmutableError,
  AlreadySettledError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "@accord/protocol";
import crypto from "crypto";

async function runTournamentProtocolTests() {
  console.log("================================================================================");
  console.log("ACCORD // COMPETITIVE BOUNTY TOURNAMENT PROTOCOL TEST SUITE");
  console.log("================================================================================\n");

  const runId = Date.now().toString(16).slice(-6);

  // ---------------------------------------------------------------------------
  // 1. SETUP: REGISTER SPONSOR & 11 AGENTS
  // ---------------------------------------------------------------------------
  console.log("🧪 1. Setting up Sponsor and 11 Independent Agents...");
  const sponsor = await AgentService.registerParticipant({
    name: "Tournament Foundation",
    type: "AUTONOMOUS_DAO",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    bio: "Sponsor of benchmark AI tournaments",
  });

  const agents: any[] = [];
  for (let i = 1; i <= 11; i++) {
    const agent = await AgentService.registerParticipant({
      name: `Agent-Runner-${i}`,
      type: "AI_AGENT",
      walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
      bio: `Autonomous competitor ${i}`,
    });
    agents.push(agent.participant);
  }
  console.log(`   ✅ Registered sponsor and 11 agents.`);

  // ---------------------------------------------------------------------------
  // 2. CREATE TOURNAMENT BOUNTY WITH CONFIGURABLE PARAMETERS
  // ---------------------------------------------------------------------------
  console.log("\n🧪 2. Creating Tournament Bounty (maxParticipants=10, minPassingScore=70)...");
  const tournamentBountyResult = await BountyService.createBounty({
    title: `Distributed Consensus Engine [Test #${runId}]`,
    description: "Build an asynchronous Byzantine fault tolerant consensus module in TypeScript.",
    acceptanceCriteria: [
      "BFT consensus module implemented",
      "Handles 3f+1 node network",
      "Correctness verified with adversarial network faults",
    ],
    rewardUsdc: 500.0,
    creatorId: sponsor.participant.id,
    competitionMode: "TOURNAMENT",
    maxParticipants: 10,
    minPassingScore: 70.0,
    evaluationWeights: {
      correctness: 0.5,
      completeness: 0.2,
      securityAndRobustness: 0.15,
      performanceAndEfficiency: 0.15,
    },
    deadlineHours: 72,
  });

  const bounty = tournamentBountyResult.bounty;
  assert.equal(bounty.status, "OPEN");
  assert.equal(bounty.competitionMode, "TOURNAMENT");
  assert.equal(bounty.maxParticipants, 10);
  assert.equal(bounty.minPassingScore, 70.0);
  console.log(`   ✅ Bounty created with ID: ${bounty.id}, status: ${bounty.status}`);

  // ---------------------------------------------------------------------------
  // 3. 10-AGENT PARTICIPATION & STATUS TRANSITION (OPEN -> COMPETING)
  // ---------------------------------------------------------------------------
  console.log("\n🧪 3. 10 Agents Joining Tournament Competition...");
  for (let i = 0; i < 10; i++) {
    const entry = await CompetitionService.joinCompetition(
      bounty.id,
      { agentId: agents[i].id },
      agents[i].id
    );
    assert.equal(entry.bountyId, bounty.id);
    assert.equal(entry.agentId, agents[i].id);
  }

  const updatedBounty = await db.bounty.findUnique({ where: { id: bounty.id } });
  assert.equal(updatedBounty?.status, "COMPETING", "Bounty must transition to COMPETING after participation starts");
  console.log(`   ✅ All 10 agents entered. Bounty transitioned to: ${updatedBounty?.status}`);

  // ---------------------------------------------------------------------------
  // 4. 11TH-AGENT REJECTION (ParticipantLimitReachedError)
  // ---------------------------------------------------------------------------
  console.log("\n🧪 4. Testing 11th-Agent Rejection (Participant Limit Protection)...");
  let limitRejected = false;
  try {
    await CompetitionService.joinCompetition(
      bounty.id,
      { agentId: agents[10].id },
      agents[10].id
    );
  } catch (err: any) {
    limitRejected = true;
    assert.ok(
      err instanceof ParticipantLimitReachedError || err.code === "PARTICIPANT_LIMIT_REACHED",
      `Expected ParticipantLimitReachedError, got ${err.name}`
    );
    console.log(`   ✅ 11th agent rejected as expected: ${err.message}`);
  }
  assert.ok(limitRejected, "11th agent must be rejected when limit is 10");

  // ---------------------------------------------------------------------------
  // 5. DUPLICATE PARTICIPATION REJECTION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 5. Testing Duplicate Participation Rejection...");
  let dupParticipationRejected = false;
  try {
    await CompetitionService.joinCompetition(
      bounty.id,
      { agentId: agents[0].id },
      agents[0].id
    );
  } catch (err: any) {
    dupParticipationRejected = true;
    assert.ok(
      err instanceof DuplicateParticipationError || err.code === "DUPLICATE_PARTICIPATION",
      `Expected DuplicateParticipationError, got ${err.name}`
    );
    console.log(`   ✅ Duplicate participation blocked: ${err.message}`);
  }
  assert.ok(dupParticipationRejected, "Agent already registered cannot register twice");

  // ---------------------------------------------------------------------------
  // 6. LATE PARTICIPATION REJECTION (PAST REGISTRATION DEADLINE)
  // ---------------------------------------------------------------------------
  console.log("\n🧪 6. Testing Late Participation Rejection (Past Registration Deadline)...");
  const pastBounty = await BountyService.createBounty({
    title: "Past Registration Bounty",
    description: "Bounty where registration closed in the past.",
    acceptanceCriteria: ["Basic test"],
    rewardUsdc: 100,
    creatorId: sponsor.participant.id,
    competitionMode: "TOURNAMENT",
    maxParticipants: 5,
  });

  // Artificially backdate registrationDeadline to 2 hours ago
  await db.bounty.update({
    where: { id: pastBounty.bounty.id },
    data: { registrationDeadline: new Date(Date.now() - 7200 * 1000) },
  });

  let lateRegRejected = false;
  try {
    await CompetitionService.joinCompetition(
      pastBounty.bounty.id,
      { agentId: agents[0].id },
      agents[0].id
    );
  } catch (err: any) {
    lateRegRejected = true;
    assert.ok(
      err instanceof RegistrationClosedError || err.code === "REGISTRATION_CLOSED",
      `Expected RegistrationClosedError, got ${err.name}`
    );
    console.log(`   ✅ Late participation blocked: ${err.message}`);
  }
  assert.ok(lateRegRejected, "Registration after registrationDeadline must be rejected");

  // ---------------------------------------------------------------------------
  // 7. BLIND / ISOLATED SUBMISSION MASKING
  // ---------------------------------------------------------------------------
  console.log("\n🧪 7. Testing Blind Submission Masking During Competition...");
  // Agent 0 submits solution
  const sub0 = await SubmissionService.submitSolution({
    bountyId: bounty.id,
    input: {
      agentId: agents[0].id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/agent-runner-0/bft-consensus",
      summary: "High-performance BFT consensus engine with bitset optimization",
      executionTrace: "All 100 tests passed in 4.2s",
      autoVerify: false,
    },
    callerParticipantId: agents[0].id,
  });

  // Query submissions without authentication or as competitor Agent 1
  const maskedList = await SubmissionService.getSubmissions(bounty.id, agents[1].id);
  const foundMasked = maskedList.find((s) => s.id === sub0.submission.id);
  assert.ok(foundMasked, "Submission must exist in list");
  assert.equal(
    foundMasked.deliverableUrl,
    "[BLIND_SUBMISSION_ACTIVE_UNTIL_EVALUATION]",
    "Deliverable URL must be masked to competitors"
  );
  assert.equal(
    foundMasked.summary,
    "[BLIND_SUBMISSION_ACTIVE_UNTIL_EVALUATION]",
    "Summary must be masked to competitors"
  );

  // Submitting agent themselves CAN see their unmasked submission
  const ownList = await SubmissionService.getSubmissions(bounty.id, agents[0].id);
  const foundOwn = ownList.find((s) => s.id === sub0.submission.id);
  assert.equal(
    foundOwn?.deliverableUrl,
    "https://github.com/agent-runner-0/bft-consensus",
    "Author agent can view their own deliverable URL"
  );
  console.log("   ✅ Blind submission masking confirmed: competitor details isolated.");

  // ---------------------------------------------------------------------------
  // 8. DUPLICATE SUBMISSION REJECTION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 8. Testing Duplicate Submission Rejection...");
  let dupSubRejected = false;
  try {
    await SubmissionService.submitSolution({
      bountyId: bounty.id,
      input: {
        agentId: agents[0].id,
        deliverableType: "CODE_PR",
        deliverableUrl: "https://github.com/agent-runner-0/bft-consensus-v2",
        summary: "Second submission attempt",
        autoVerify: false,
      },
      callerParticipantId: agents[0].id,
    });
  } catch (err: any) {
    dupSubRejected = true;
    assert.ok(
      err instanceof DuplicateSubmissionError || err.code === "DUPLICATE_SUBMISSION",
      `Expected DuplicateSubmissionError, got ${err.name}`
    );
    console.log(`   ✅ Duplicate submission blocked: ${err.message}`);
  }
  assert.ok(dupSubRejected, "Agent cannot submit twice to the same bounty");

  // ---------------------------------------------------------------------------
  // 9. SUBMIT REMAINING 9 AGENT SOLUTIONS (INCLUDING TIED & BELOW MINIMUM)
  // ---------------------------------------------------------------------------
  console.log("\n🧪 9. Submitting Diverse Solutions for Remaining 9 Agents...");
  const submissions: any[] = [sub0.submission];

  for (let i = 1; i < 10; i++) {
    const sub = await SubmissionService.submitSolution({
      bountyId: bounty.id,
      input: {
        agentId: agents[i].id,
        deliverableType: "CODE_PR",
        deliverableUrl: `https://github.com/agent-runner-${i}/bft-consensus`,
        summary: `Solution from Agent ${i}`,
        executionTrace: `Test run for agent ${i}`,
        autoVerify: false,
      },
      callerParticipantId: agents[i].id,
    });
    submissions.push(sub.submission);
  }
  assert.equal(submissions.length, 10, "All 10 submissions must be registered");
  console.log(`   ✅ All 10 submissions received.`);

  // ---------------------------------------------------------------------------
  // 10. LOCK SUBMISSIONS (COMPETING -> SUBMISSIONS_LOCKED)
  // ---------------------------------------------------------------------------
  console.log("\n🧪 10. Locking Tournament Submissions...");
  const lockedBounty = await TournamentService.lockSubmissions(bounty.id);
  assert.equal(lockedBounty.status, "SUBMISSIONS_LOCKED");

  // Verify late submission is rejected after lock
  let postLockSubRejected = false;
  try {
    // Register agent 10 (did not participate or submit yet)
    await db.competitionEntry.create({
      data: {
        id: `entry_extra_${runId}`,
        bountyId: bounty.id,
        agentId: agents[10].id,
        status: "ACTIVE",
      },
    });
    await SubmissionService.submitSolution({
      bountyId: bounty.id,
      input: {
        agentId: agents[10].id,
        deliverableType: "CODE_PR",
        deliverableUrl: "https://github.com/overflow/late",
        summary: "Late submission after lock",
        autoVerify: false,
      },
      callerParticipantId: agents[10].id,
    });
  } catch (err: any) {
    postLockSubRejected = true;
    assert.ok(
      err instanceof SubmissionsLockedError || err.code === "SUBMISSIONS_LOCKED",
      `Expected SubmissionsLockedError, got ${err.name}`
    );
    console.log(`   ✅ Submission rejected after lock: ${err.message}`);
  }
  assert.ok(postLockSubRejected, "Submissions must be blocked once SUBMISSIONS_LOCKED");

  // ---------------------------------------------------------------------------
  // 11. SEED CONTROLLED VERIFICATION DATA TO TEST DETERMINISTIC TIE-BREAKING & MINIMUM SCORE
  // ---------------------------------------------------------------------------
  console.log("\n🧪 11. Seeding Controlled Verification Scores for Deterministic Tie-Breaking...");
  // We seed the VerificationRun table directly to test specific deterministic ranking rules:
  // - Agent 0: Score 96.0 (High winner)
  // - Agent 1: Score 88.0, Correctness 95 (Tied score with Agent 2, but higher correctness)
  // - Agent 2: Score 88.0, Correctness 80 (Tied score with Agent 1, lower correctness)
  // - Agent 3: Score 82.0, Correctness 85, Time T1 (Tied score & correctness with Agent 4, but submitted earlier)
  // - Agent 4: Score 82.0, Correctness 85, Time T2 (Submitted later)
  // - Agent 5: Score 75.0 (Pass)
  // - Agent 6: Score 72.0 (Pass)
  // - Agent 7: Score 70.0 (Exact minimum pass)
  // - Agent 8: Score 64.0 (BELOW MINIMUM PASSING SCORE 70.0 -> Disqualified)
  // - Agent 9: Score 40.0, Verdict FAIL (Failed Acceptance Criteria -> Disqualified)

  const now = Date.now();
  const testScores = [
    { idx: 0, score: 96.0, verdict: "PASS", corr: 98, comp: 95, sec: 95, perf: 95, timeOffset: 0 },
    { idx: 1, score: 88.0, verdict: "PASS", corr: 95, comp: 85, sec: 80, perf: 85, timeOffset: 100 },
    { idx: 2, score: 88.0, verdict: "PASS", corr: 80, comp: 95, sec: 90, perf: 90, timeOffset: 200 },
    { idx: 3, score: 82.0, verdict: "PASS", corr: 85, comp: 80, sec: 80, perf: 80, timeOffset: 300 },
    { idx: 4, score: 82.0, verdict: "PASS", corr: 85, comp: 80, sec: 80, perf: 80, timeOffset: 400 },
    { idx: 5, score: 75.0, verdict: "PASS", corr: 75, comp: 75, sec: 75, perf: 75, timeOffset: 500 },
    { idx: 6, score: 72.0, verdict: "PASS", corr: 72, comp: 72, sec: 72, perf: 72, timeOffset: 600 },
    { idx: 7, score: 70.0, verdict: "PASS", corr: 70, comp: 70, sec: 70, perf: 70, timeOffset: 700 },
    { idx: 8, score: 64.0, verdict: "PASS", corr: 64, comp: 64, sec: 64, perf: 64, timeOffset: 800 },
    { idx: 9, score: 75.0, verdict: "FAIL", corr: 75, comp: 75, sec: 75, perf: 75, timeOffset: 900 },
  ];

  for (const s of testScores) {
    const sub = submissions[s.idx];
    const subTime = new Date(now + s.timeOffset);
    await db.submission.update({
      where: { id: sub.id },
      data: { submittedAt: subTime },
    });
    await db.verificationRun.create({
      data: {
        id: `vrun_${sub.id}`,
        submissionId: sub.id,
        bountyId: bounty.id,
        verifierAgentId: null,
        verifierType: "MULTI_AGENT_CONSENSUS",
        score: s.score,
        verdict: s.verdict,
        reasoning: `Score: ${s.score}, Verdict: ${s.verdict}`,
        rubricBreakdown: JSON.stringify({
          correctness: s.corr,
          completeness: s.comp,
          securityAndRobustness: s.sec,
          performanceAndEfficiency: s.perf,
        }),
      },
    });
  }
  console.log("   ✅ Seeded controlled verification runs for multi-factor tie-breaking.");

  // ---------------------------------------------------------------------------
  // 12. EVALUATE & DETERMINISTICALLY RANK TOURNAMENT
  // ---------------------------------------------------------------------------
  console.log("\n🧪 12. Evaluating & Ranking Tournament...");
  const rankingResult = await TournamentService.evaluateAndRankTournament({
    bountyId: bounty.id,
  });

  assert.equal(rankingResult.totalSubmissions, 10);
  assert.equal(rankingResult.validSubmissionsCount, 8, "8 passing submissions expected");
  assert.equal(rankingResult.disqualifiedCount, 2, "2 disqualified submissions expected (score 64 and fail verdict)");

  // Check Rank #1: Agent 0 (Score: 96.05)
  assert.equal(rankingResult.rankings[0].agentId, agents[0].id);
  assert.equal(rankingResult.rankings[0].rank, 1);
  assert.equal(rankingResult.winner?.agentId, agents[0].id);

  // Check Tie-Breaker 1: Agent 1 vs Agent 2 (both final score 88 or calculated)
  const entryAgent1 = rankingResult.rankings.find((r) => r.agentId === agents[1].id);
  const entryAgent2 = rankingResult.rankings.find((r) => r.agentId === agents[2].id);
  assert.ok(
    entryAgent1!.rank < entryAgent2!.rank,
    `Agent 1 with higher correctness (95 vs 80) must rank higher than Agent 2`
  );

  // Check Tie-Breaker 2: Agent 3 vs Agent 4 (identical scores, but Agent 3 submitted earlier)
  const entryAgent3 = rankingResult.rankings.find((r) => r.agentId === agents[3].id);
  const entryAgent4 = rankingResult.rankings.find((r) => r.agentId === agents[4].id);
  assert.ok(
    entryAgent3!.rank < entryAgent4!.rank,
    `Agent 3 (earlier submission time) must rank higher than Agent 4`
  );
  assert.equal(entryAgent3!.tieBreakerApplied, "FASTER_SUBMISSION_TIME");

  // Check Disqualified Entries
  const entryAgent8 = rankingResult.rankings.find((r) => r.agentId === agents[8].id);
  assert.equal(entryAgent8?.disqualified, true);
  assert.ok(entryAgent8?.disqualificationReason?.includes("minimum passing threshold"));

  const entryAgent9 = rankingResult.rankings.find((r) => r.agentId === agents[9].id);
  assert.equal(entryAgent9?.disqualified, true);
  assert.ok(entryAgent9?.disqualificationReason?.includes("acceptance criteria"));

  console.log(`   ✅ Deterministic ranking verified:`);
  console.log(`      Winner: ${rankingResult.winner?.agentName} (Rank #1, Score: ${rankingResult.winner?.score})`);
  console.log(`      Tie-breaker 1 (Correctness): Agent 1 (Rank #${entryAgent1?.rank}) > Agent 2 (Rank #${entryAgent2?.rank})`);
  console.log(`      Tie-breaker 2 (Speed): Agent 3 (Rank #${entryAgent3?.rank}) > Agent 4 (Rank #${entryAgent4?.rank})`);
  console.log(`      Disqualified: Agent 8 (Below min 70), Agent 9 (Failed criteria)`);

  // ---------------------------------------------------------------------------
  // 13. IMMUTABILITY OF SCORES & WINNER SELECTION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 13. Testing Immutability of Finalized Scores and Winner Selection...");
  let reEvalBlocked = false;
  try {
    await TournamentService.evaluateAndRankTournament({ bountyId: bounty.id });
  } catch (err: any) {
    reEvalBlocked = true;
    assert.ok(
      err instanceof ScoreImmutableError || err.code === "SCORE_IMMUTABLE",
      `Expected ScoreImmutableError, got ${err.name}`
    );
    console.log(`   ✅ Re-evaluation blocked after ranking: ${err.message}`);
  }
  assert.ok(reEvalBlocked, "Cannot re-evaluate or modify scores once bounty is RANKED");

  let reVerifyBlocked = false;
  try {
    await VerificationService.verifySubmission({ submissionId: submissions[0].id });
  } catch (err: any) {
    reVerifyBlocked = true;
    assert.ok(
      err instanceof ScoreImmutableError || err.code === "SCORE_IMMUTABLE",
      `Expected ScoreImmutableError, got ${err.name}`
    );
    console.log(`   ✅ Re-verification blocked on ranked submission: ${err.message}`);
  }
  assert.ok(reVerifyBlocked, "Cannot re-verify submissions once bounty is RANKED");

  // ---------------------------------------------------------------------------
  // 14. SETTLEMENT PROTECTION & CREATOR TAMPER PREVENTION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 14. Testing Settlement Authorization & Creator Anti-Tamper...");
  // Attempt 1: Unauthorized agent attempts settlement
  let unauthorizedBlocked = false;
  try {
    await SettlementService.settleBounty({
      bountyId: bounty.id,
      submissionId: submissions[0].id,
      callerParticipantId: agents[1].id,
    });
  } catch (err: any) {
    unauthorizedBlocked = true;
    assert.ok(err instanceof ForbiddenError, `Expected ForbiddenError, got ${err.name}`);
    console.log(`   ✅ Non-creator settlement blocked: ${err.message}`);
  }
  assert.ok(unauthorizedBlocked, "Non-creator cannot settle bounty");

  // Attempt 2: Creator attempts to settle to runner-up (Agent 1) instead of official winner (Agent 0)
  let tamperWinnerBlocked = false;
  try {
    await SettlementService.settleBounty({
      bountyId: bounty.id,
      submissionId: submissions[1].id, // Runner-up submission
      callerParticipantId: sponsor.participant.id,
    });
  } catch (err: any) {
    tamperWinnerBlocked = true;
    assert.ok(err instanceof ForbiddenError, `Expected ForbiddenError, got ${err.name}`);
    console.log(`   ✅ Creator cannot tamper or pick different winner: ${err.message}`);
  }
  assert.ok(tamperWinnerBlocked, "Creator cannot settle to anyone other than the protocol-ranked winner");

  // Attempt 3: Creator settles to legitimate winner (Agent 0)
  console.log("\n🧪 15. Executing Settlement to Legitimate Winner...");
  const settlementResult = await SettlementService.settleBounty({
    bountyId: bounty.id,
    submissionId: submissions[0].id,
    callerParticipantId: sponsor.participant.id,
    customFeePercentage: 2.5,
  });

  assert.equal(settlementResult.settlement.bountyId, bounty.id);
  assert.equal(settlementResult.settlement.agentId, agents[0].id);
  assert.equal(settlementResult.feeUsdc, 12.5); // 2.5% of 500 = 12.50
  assert.equal(settlementResult.netPayoutUsdc, 487.5);
  assert.equal(settlementResult.releaseReceipt.isOnChain, false, "Receipt marks mock/testnet ledger isOnChain=false");
  console.log(`   ✅ Settled $487.50 USDC to winner ${agents[0].id} (Tx: ${settlementResult.releaseReceipt.txHash})`);

  // ---------------------------------------------------------------------------
  // 16. REPEATED SETTLEMENT REJECTION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 16. Testing Repeated Settlement Rejection (Double-Spend Protection)...");
  let doubleSettleBlocked = false;
  try {
    await SettlementService.settleBounty({
      bountyId: bounty.id,
      submissionId: submissions[0].id,
      callerParticipantId: sponsor.participant.id,
    });
  } catch (err: any) {
    doubleSettleBlocked = true;
    assert.ok(err instanceof AlreadySettledError, `Expected AlreadySettledError, got ${err.name}`);
    console.log(`   ✅ Double settlement blocked: ${err.message}`);
  }
  assert.ok(doubleSettleBlocked, "AlreadySettledError must prevent duplicate release");

  // ---------------------------------------------------------------------------
  // 17. REPUTATION IDEMPOTENCY
  // ---------------------------------------------------------------------------
  console.log("\n🧪 17. Verifying Reputation Idempotency...");
  const winnerRep = await ReputationService.getReputation(agents[0].id);
  assert.ok(winnerRep, "Winner reputation profile must exist");
  assert.equal(winnerRep.bountiesWonCount, 1, "Winner bountiesWonCount must be exactly 1");
  assert.equal(winnerRep.settledVolumeUsdc, settlementResult.netPayoutUsdc, "Settled volume must equal net payout");
  assert.ok(winnerRep.reputationScore > 0, "Reputation score must have grown");

  // Runner-up reputation check
  const runnerUpRep = await ReputationService.getReputation(agents[1].id);
  assert.ok(runnerUpRep, "Runner-up reputation profile must exist");
  assert.equal(runnerUpRep.bountiesWonCount, 0, "Runner-up must not have bountiesWon incremented");

  console.log(`   ✅ Reputation verified: Winner score=${winnerRep.reputationScore}, wins=${winnerRep.bountiesWonCount}`);
  console.log(`   ✅ Runner-up score=${runnerUpRep.reputationScore}, wins=${runnerUpRep.bountiesWonCount}`);

  console.log("\n================================================================================");
  console.log("ALL 17 TOURNAMENT PROTOCOL EDGE-CASE TESTS PASSED (100% SUCCESS)");
  console.log("================================================================================\n");
}

runTournamentProtocolTests().catch((err) => {
  console.error("❌ Tournament Protocol Test Failure:", err);
  process.exit(1);
});
