import assert from "node:assert/strict";
import { AuthService } from "../src/lib/services/auth.service";
import { AgentService } from "../src/lib/services/agent.service";
import { BountyService } from "../src/lib/services/bounty.service";
import { CompetitionService } from "../src/lib/services/competition.service";
import { SubmissionService } from "../src/lib/services/submission.service";
import { VerificationService } from "../src/lib/services/verification.service";
import { SettlementService } from "../src/lib/services/settlement.service";
import { ReputationService } from "../src/lib/services/reputation.service";
import { getAccordEscrowLedger } from "../src/lib/blockchain/accord-escrow-ledger";
import {
  BountyStateMachine,
  InvalidStateTransitionError,
  AlreadySettledError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@accord/protocol";
import { AccordClient } from "@accord/sdk";
import { db } from "../src/lib/db";
import crypto from "crypto";

async function runComprehensiveProtocolTests() {
  console.log("================================================================================");
  console.log("ACCORD PROTOCOL COMPREHENSIVE PRODUCTION TEST SUITE");
  console.log("================================================================================\n");

  const runId = Date.now().toString().slice(-6);

  // ---------------------------------------------------------------------------
  // 1. STATE MACHINE TRANSITIONS
  // ---------------------------------------------------------------------------
  console.log("🧪 1. Testing Strict Bounty State Machine Transitions...");
  assert.equal(BountyStateMachine.canTransition("DRAFT", "FUNDED"), true);
  assert.equal(BountyStateMachine.canTransition("FUNDED", "OPEN"), true);
  assert.equal(BountyStateMachine.canTransition("OPEN", "EVALUATING"), true);
  assert.equal(BountyStateMachine.canTransition("EVALUATING", "SETTLED"), true);
  assert.equal(BountyStateMachine.canTransition("OPEN", "EXPIRED"), true);
  assert.equal(BountyStateMachine.canTransition("DRAFT", "CANCELLED"), true);

  // Invalid Transitions
  assert.equal(BountyStateMachine.canTransition("DRAFT", "SETTLED"), false);
  assert.equal(BountyStateMachine.canTransition("SETTLED", "OPEN"), false);
  assert.equal(BountyStateMachine.canTransition("EXPIRED", "OPEN"), false);
  assert.equal(BountyStateMachine.canTransition("CANCELLED", "SETTLED"), false);

  assert.throws(
    () => BountyStateMachine.assertTransition("bounty_test", "DRAFT", "SETTLED"),
    /Invalid state transition/
  );
  console.log("   ✅ Strict state transitions and terminal state locks verified.");

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATION & AUTHORIZATION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 2. Testing Authentication, API Keys, & Challenge Nonces...");
  const userWallet = `0x${crypto.randomBytes(20).toString("hex")}`;
  const registeredUser = await AgentService.registerParticipant({
    name: "ProtocolPrincipal",
    type: "HUMAN_PRINCIPAL",
    walletAddress: userWallet,
  });

  assert.ok(registeredUser.apiKey?.startsWith("accord_live_"));
  const expectedHash = AuthService.hashApiKey(registeredUser.apiKey!);
  assert.equal(registeredUser.participant.apiKeyHash, expectedHash);

  // Challenge nonce
  const nonce = await AuthService.generateNonce(userWallet);
  assert.equal(nonce.length, 32);

  // Tamper-proof session token
  const token = AuthService.createSessionToken(registeredUser.participant);
  const session = AuthService.verifySessionToken(token);
  assert.equal(session?.participantId, registeredUser.participant.id);
  assert.equal(session?.walletAddress, userWallet);

  // Invalid token signature rejection
  const tamperedToken = token + "xyz";
  assert.equal(AuthService.verifySessionToken(tamperedToken), null);
  console.log("   ✅ API key hashing, challenge nonce, and session token security verified.");

  // ---------------------------------------------------------------------------
  // 3. AGENT REGISTRATION & CAPABILITIES
  // ---------------------------------------------------------------------------
  console.log("\n🧪 3. Testing Agent Registration & Initial Reputation...");
  const agentWalletA = `0x${crypto.randomBytes(20).toString("hex")}`;
  const agentRegA = await AgentService.registerParticipant({
    name: "Agent-Alpha",
    type: "AI_AGENT",
    walletAddress: agentWalletA,
    bio: "Test agent Alpha",
  });
  const agentA = agentRegA.participant;
  assert.equal(agentA.reputationScore, 100.0);

  const agentWalletB = `0x${crypto.randomBytes(20).toString("hex")}`;
  const agentRegB = await AgentService.registerParticipant({
    name: "Agent-Beta",
    type: "AI_AGENT",
    walletAddress: agentWalletB,
  });
  const agentB = agentRegB.participant;
  assert.equal(agentB.reputationScore, 100.0);
  console.log("   ✅ Agents registered with initial reputation 100.0 and isolated identities.");

  // ---------------------------------------------------------------------------
  // 4. BOUNTY CREATION & ESCROW ACCOUNTING
  // ---------------------------------------------------------------------------
  console.log("\n🧪 4. Testing Bounty Creation & Escrow Accounting...");
  const bountyReward = 400.0;
  const createdBountyResult = await BountyService.createBounty({
    id: `bounty_escrow_test_${runId}`,
    title: "High-Frequency Automated Market Maker Math Model",
    description:
      "Formulate constant product invariant curves with dynamic fee adjustments based on volatility indexes.",
    acceptanceCriteria: [
      "Calculates constant product invariant curves x * y = k",
      "Dynamic fee adjustment algorithm based on EWMA volatility index",
      "Comprehensive test vectors covering extreme slippage conditions",
    ],
    rewardUsdc: bountyReward,
    creatorId: registeredUser.participant.id,
    competitionMode: "RACE_TO_FIRST_VALID",
    deadlineHours: 48,
  });
  const bounty = createdBountyResult.bounty;

  assert.equal(bounty.status, "OPEN");
  assert.equal(bounty.escrowStatus, "HELD_IN_ESCROW");
  assert.equal(bounty.rewardUsdc, bountyReward);

  // Escrow ledger state
  const escrowLedger = getAccordEscrowLedger();
  const escrowDetails = await escrowLedger.getEscrowState(bounty.id);
  assert.equal(escrowDetails?.amountUsdc, bountyReward);
  assert.equal(escrowDetails?.status, "HELD_IN_ESCROW");
  console.log(`   ✅ Bounty escrow funded on Accord Escrow Ledger: $${bountyReward} USDC locked.`);

  // ---------------------------------------------------------------------------
  // 5. AGENT PARTICIPATION & HEARTBEATS
  // ---------------------------------------------------------------------------
  console.log("\n🧪 5. Testing Agent Participation & Heartbeats...");
  const entryA = await CompetitionService.joinCompetition(bounty.id, {
    agentId: agentA.id,
    stakeUsdc: 10,
  });
  assert.equal(entryA.status, "REGISTERED");

  // Idempotent join test
  const entryAIdempotent = await CompetitionService.joinCompetition(bounty.id, {
    agentId: agentA.id,
    stakeUsdc: 10,
  });
  assert.equal(entryAIdempotent.id, entryA.id, "Joining twice must return existing entry");

  // Heartbeat test
  const heartbeat = await CompetitionService.recordHeartbeat(bounty.id, agentA.id);
  assert.equal(heartbeat.status, "WORKING");

  await CompetitionService.joinCompetition(bounty.id, {
    agentId: agentB.id,
    stakeUsdc: 10,
  });
  console.log("   ✅ Idempotent participation and live heartbeat telemetry verified.");

  // ---------------------------------------------------------------------------
  // 6. SOLUTION SUBMISSIONS & MODULAR AI VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 6. Testing Solution Submissions & AI Scoring...");

  // Agent B submits incomplete solution
  const subB = await SubmissionService.submitSolution({
    bountyId: bounty.id,
    input: {
      agentId: agentB.id,
      deliverableType: "RESEARCH_REPORT",
      deliverableUrl: "https://research.accord.io/report-b",
      contentHash: crypto.createHash("sha256").update("Incomplete draft").digest("hex"),
      summary: "Preliminary draft. Missing volatility index and dynamic fee formula.",
      autoVerify: true,
    },
  });
  assert.equal(subB.verification?.verdict, "FAIL");
  assert.ok((subB.verification?.score || 0) < 75);

  // Agent A submits verified passing solution
  const solTextA = `
    Automated Market Maker Math Model:
    - Calculates constant product invariant curves x * y = k with exact numerical precision.
    - Dynamic fee adjustment algorithm based on EWMA volatility index with real-time feedback loops.
    - Comprehensive test vectors covering extreme slippage conditions (50,000 simulations passing).
  `;
  const subA = await SubmissionService.submitSolution({
    bountyId: bounty.id,
    input: {
      agentId: agentA.id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/agent-alpha/amm-math-model/pull/3",
      contentHash: crypto.createHash("sha256").update(solTextA).digest("hex"),
      summary: solTextA,
      executionTrace: "Tests: PASS (25/25 test cases). Slippage simulation: VALID. Invariant: PRESERVED.",
      autoVerify: true,
    },
  });
  assert.equal(subA.verification?.verdict, "PASS");
  assert.ok((subA.verification?.score || 0) >= 75);
  console.log(`   ✅ Modular AI Evaluator scored solutions: Agent B (FAIL), Agent A (PASS: ${subA.verification?.score}/100).`);

  // ---------------------------------------------------------------------------
  // 7. SETTLEMENT & DUPLICATE SETTLEMENT PREVENTION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 7. Testing Settlement & Duplicate Settlement Prevention...");
  const settlement = await SettlementService.settleBounty({
    bountyId: bounty.id,
    submissionId: subA.submission.id,
    customFeePercentage: 2.5,
  });

  assert.equal(settlement.settlement.status, "CONFIRMED");
  assert.equal(settlement.feeUsdc, 10.0); // 2.5% of 400
  assert.equal(settlement.netPayoutUsdc, 390.0);

  // Verify second settlement attempt is strictly rejected!
  await assert.rejects(
    async () => {
      await SettlementService.settleBounty({
        bountyId: bounty.id,
        submissionId: subA.submission.id,
      });
    },
    (err: any) => err instanceof AlreadySettledError || err.code === "ALREADY_SETTLED"
  );
  console.log("   ✅ Escrow settled ($390.00 net payout, $10.00 fee). Duplicate settlement strictly blocked.");

  // ---------------------------------------------------------------------------
  // 8. ESCROW REFUND TEST (ON EXPIRED/CANCELLED BOUNTY)
  // ---------------------------------------------------------------------------
  console.log("\n🧪 8. Testing Escrow Refund & Authorization Checks...");
  const expiredBountyResult = await BountyService.createBounty({
    id: `bounty_expired_${runId}`,
    title: "Expired Task for Refund Testing",
    description: "Task designed to test refunding of escrow back to creator.",
    acceptanceCriteria: ["Criterion 1"],
    rewardUsdc: 150.0,
    creatorId: registeredUser.participant.id,
    deadlineHours: 0.0001, // Expires immediately
  });

  // Set deadline in the past to trigger expired condition
  await db.bounty.update({
    where: { id: expiredBountyResult.bounty.id },
    data: { deadline: new Date(Date.now() - 10000) },
  });

  // Unauthorized refund request from Agent A should be rejected
  await assert.rejects(
    async () => {
      await SettlementService.refundBounty({
        bountyId: expiredBountyResult.bounty.id,
        requesterId: agentA.id, // Not the creator!
      });
    },
    /Only the bounty creator can request an escrow refund/
  );

  // Authorized refund request by creator succeeds
  const refundReceipt = await SettlementService.refundBounty({
    bountyId: expiredBountyResult.bounty.id,
    requesterId: registeredUser.participant.id,
  });
  assert.ok(refundReceipt.txHash);
  assert.equal(refundReceipt.amountUsdc, 150.0);

  const finalRefundedBounty = await BountyService.getBountyById(expiredBountyResult.bounty.id);
  assert.equal(finalRefundedBounty?.escrowStatus, "REFUNDED");
  console.log("   ✅ Escrow refund authorization and execution verified.");

  // ---------------------------------------------------------------------------
  // 9. REPUTATION LEDGER & TIER BADGES
  // ---------------------------------------------------------------------------
  console.log("\n🧪 9. Testing Reputation Ledger & Tiered Badge Attestations...");
  const profileA = await AgentService.getParticipant(agentA.id);
  assert.ok((profileA?.reputationScore || 0) > 150);
  assert.equal(profileA?.badge.tier, "SILVER");
  assert.equal(profileA?.badge.name, "Verified Solver");
  assert.equal(profileA?.bountiesWonCount, 1);
  assert.equal(profileA?.settledVolumeUsdc, 390.0);

  const profileB = await AgentService.getParticipant(agentB.id);
  assert.equal(profileB?.reputationScore, 90.0); // Penalized
  assert.equal(profileB?.badge.tier, "BRONZE");
  console.log("   ✅ Reputation ledger mathematics and badge attestations verified.");

  // ---------------------------------------------------------------------------
  // 10. SDK CLIENT METHODS
  // ---------------------------------------------------------------------------
  console.log("\n🧪 10. Testing @accord/sdk Client Library...");
  const sdkClient = new AccordClient({ baseUrl: "http://localhost:3000" });
  assert.ok(typeof sdkClient.registerAgent === "function");
  assert.ok(typeof sdkClient.discoverBounties === "function");
  assert.ok(typeof sdkClient.getBounty === "function");
  assert.ok(typeof sdkClient.participate === "function");
  assert.ok(typeof sdkClient.submitSolution === "function");
  assert.ok(typeof sdkClient.settleBounty === "function");
  assert.ok(typeof sdkClient.getReputation === "function");
  console.log("   ✅ @accord/sdk client methods and interface exports verified.");

  console.log("\n================================================================================");
  console.log("ALL 10 COMPREHENSIVE PROTOCOL TEST SUITES PASSED! (100% Green)");
  console.log("================================================================================\n");
}

runComprehensiveProtocolTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
