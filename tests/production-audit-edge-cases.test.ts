import assert from "node:assert/strict";
import { AgentService } from "../src/lib/services/agent.service";
import { BountyService } from "../src/lib/services/bounty.service";
import { CompetitionService } from "../src/lib/services/competition.service";
import { SubmissionService } from "../src/lib/services/submission.service";
import { SettlementService } from "../src/lib/services/settlement.service";
import { ReputationService } from "../src/lib/services/reputation.service";
import { getAccordEscrowLedger } from "../src/lib/blockchain/accord-escrow-ledger";
import { db } from "../src/lib/db";
import {
  BountyExpiredError,
  DuplicateSubmissionError,
  AlreadySettledError,
  ForbiddenError,
} from "@accord/protocol";
import crypto from "crypto";

async function runProductionAuditEdgeCasesTest() {
  console.log("================================================================================");
  console.log("RUNNING ACCORD PRODUCTION AUDIT & SECURITY EDGE-CASES TEST SUITE");
  console.log("================================================================================\n");

  const runId = `audit_${Date.now().toString().slice(-6)}`;

  // 1. Setup Sponsor and Agents
  const sponsor = await AgentService.registerParticipant({
    name: "Audit Sponsor",
    type: "HUMAN_PRINCIPAL",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
  });

  const agentA = await AgentService.registerParticipant({
    name: "Agent-Alice",
    type: "AI_AGENT",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
  });

  const agentB = await AgentService.registerParticipant({
    name: "Agent-Bob",
    type: "AI_AGENT",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
  });

  // 2. Test Expired Bounty Submission Rejection
  console.log("🧪 1. Testing Expired Bounty Submission Rejection...");
  const expiredBounty = await BountyService.createBounty({
    title: "Expired Task for Audit",
    description: "This bounty will have its deadline set in the past to verify expiration locks.",
    acceptanceCriteria: ["Must fail submission if expired"],
    rewardUsdc: 100,
    creatorId: sponsor.participant.id,
  });

  // Artificially move deadline to the past
  await db.bounty.update({
    where: { id: expiredBounty.bounty.id },
    data: { deadline: new Date(Date.now() - 3600 * 1000) }, // 1 hour ago
  });

  // Agent attempts to join expired bounty
  await assert.rejects(
    async () => {
      await CompetitionService.joinCompetition(expiredBounty.bounty.id, {
        agentId: agentA.participant.id,
        stakeUsdc: 0,
      });
    },
    /deadline has passed/i,
    "Should reject joining an expired bounty"
  );

  // Directly set entry to test submission deadline check
  await db.competitionEntry.create({
    data: {
      id: `entry_exp_${runId}`,
      bountyId: expiredBounty.bounty.id,
      agentId: agentA.participant.id,
      status: "REGISTERED",
    },
  });

  await assert.rejects(
    async () => {
      await SubmissionService.submitSolution({
        bountyId: expiredBounty.bounty.id,
        input: {
          agentId: agentA.participant.id,
          deliverableType: "CODE_PR",
          deliverableUrl: "https://github.com/test/pr/1",
          contentHash: "0x" + "a".repeat(64),
          summary: "Late submission",
        },
      });
    },
    (err: any) => err instanceof BountyExpiredError || /expired/i.test(err.message),
    "Should throw BountyExpiredError when submitting past deadline"
  );
  console.log("   ✅ Expired deadline submission strictly blocked with BountyExpiredError.");

  // 3. Test Duplicate Active Submission Prevention
  console.log("\n🧪 2. Testing Duplicate Active Submission Prevention...");
  const activeBounty = await BountyService.createBounty({
    title: "Active Competition Task",
    description: "Bounty to verify duplicate active submission prevention.",
    acceptanceCriteria: ["Valid submission"],
    rewardUsdc: 250,
    creatorId: sponsor.participant.id,
    competitionMode: "RACE_TO_FIRST_VALID",
  });

  await CompetitionService.joinCompetition(activeBounty.bounty.id, {
    agentId: agentA.participant.id,
    stakeUsdc: 0,
  });

  // First submission (without autoVerify so status stays PENDING_VERIFICATION)
  const sub1 = await SubmissionService.submitSolution({
    bountyId: activeBounty.bounty.id,
    input: {
      agentId: agentA.participant.id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/test/pr/1",
      contentHash: "0x" + "1".repeat(64),
      summary: "First solution draft",
      autoVerify: false,
    },
  });
  assert.equal(sub1.submission.status, "PENDING_VERIFICATION");

  // Attempt duplicate submission by Agent A while sub1 is still active
  await assert.rejects(
    async () => {
      await SubmissionService.submitSolution({
        bountyId: activeBounty.bounty.id,
        input: {
          agentId: agentA.participant.id,
          deliverableType: "CODE_PR",
          deliverableUrl: "https://github.com/test/pr/2",
          contentHash: "0x" + "2".repeat(64),
          summary: "Second duplicate submission",
          autoVerify: false,
        },
      });
    },
    (err: any) => err instanceof DuplicateSubmissionError || /already/i.test(err.message),
    "Should throw DuplicateSubmissionError when agent attempts second concurrent submission"
  );
  console.log("   ✅ Duplicate active submission strictly blocked with DuplicateSubmissionError.");

  // 4. Test Caller Authorization Mismatch Rejection
  console.log("\n🧪 3. Testing Caller Authorization Mismatch Rejection...");
  // Caller Alice tries to submit on behalf of Bob
  await assert.rejects(
    async () => {
      await SubmissionService.submitSolution({
        bountyId: activeBounty.bounty.id,
        input: {
          agentId: agentB.participant.id,
          deliverableType: "CODE_PR",
          deliverableUrl: "https://github.com/test/pr/bob",
          contentHash: "0x" + "3".repeat(64),
          summary: "Spoofed solution",
        },
        callerParticipantId: agentA.participant.id, // Alice caller
      });
    },
    (err: any) => err instanceof ForbiddenError || /Forbidden/i.test(err.message),
    "Should reject submission when caller ID does not match agentId"
  );

  // Bob caller tries to settle Alice's bounty
  await assert.rejects(
    async () => {
      await SettlementService.settleBounty({
        bountyId: activeBounty.bounty.id,
        submissionId: sub1.submission.id,
        callerParticipantId: agentB.participant.id, // Bob is not the creator!
      });
    },
    (err: any) => err instanceof ForbiddenError || /Forbidden/i.test(err.message),
    "Should reject settlement when caller is not the bounty creator"
  );
  console.log("   ✅ Unauthorized state manipulation strictly blocked with ForbiddenError.");

  // 5. Test Exact-Once Reputation Adjustment Idempotency
  console.log("\n🧪 4. Testing Exact-Once Reputation Adjustment Idempotency...");
  const initRep = agentA.participant.reputationScore;
  const adj1 = await ReputationService.adjustReputation({
    agentId: agentA.participant.id,
    bountyId: activeBounty.bounty.id,
    delta: 15.0,
    reason: "SUBMISSION_VERIFIED_PASS",
    metadata: {
      submissionId: sub1.submission.id,
    },
  });
  assert.equal(adj1.delta, 15.0);
  assert.equal(adj1.newScore, initRep + 15.0);

  // Second duplicate call for the same submissionId
  const adj2 = await ReputationService.adjustReputation({
    agentId: agentA.participant.id,
    bountyId: activeBounty.bounty.id,
    delta: 15.0,
    reason: "SUBMISSION_VERIFIED_PASS",
    metadata: {
      submissionId: sub1.submission.id,
    },
  });
  assert.equal(adj2.delta, 0, "Duplicate adjustment must return 0 delta");
  assert.equal(adj2.newScore, initRep + 15.0, "Score must remain unchanged");
  console.log("   ✅ Reputation idempotency verified: duplicate adjustment resulted in 0 delta.");

  // 6. Test Blockchain / Escrow Transparency (isOnChain is false for simulation)
  console.log("\n🧪 5. Testing Escrow Transparency & isOnChain flag...");
  const ledger = getAccordEscrowLedger();
  const depositReceipt = await ledger.createEscrow({
    bountyId: `bounty_escrow_${runId}`,
    amountUsdc: 200,
    depositorAddress: sponsor.participant.walletAddress,
  });
  assert.equal(depositReceipt.isOnChain, false, "Mock/simulated receipts must have isOnChain=false");
  assert.equal(depositReceipt.ledgerType, "mock");
  console.log("   ✅ Escrow accurately reports isOnChain=false for simulated ledger transactions.");

  console.log("\n================================================================================");
  console.log("ALL PRODUCTION AUDIT & SECURITY TESTS PASSED! (100% Green)");
  console.log("================================================================================\n");
}

runProductionAuditEdgeCasesTest().catch((err) => {
  console.error("❌ Production audit test failure:", err);
  process.exit(1);
});
