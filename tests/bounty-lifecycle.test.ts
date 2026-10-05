import assert from "node:assert/strict";
import { AuthService } from "../src/lib/services/auth.service";
import { AgentService } from "../src/lib/services/agent.service";
import { BountyService } from "../src/lib/services/bounty.service";
import { CompetitionService } from "../src/lib/services/competition.service";
import { SubmissionService } from "../src/lib/services/submission.service";
import { VerificationService } from "../src/lib/services/verification.service";
import { SettlementService } from "../src/lib/services/settlement.service";
import { getAccordEscrowLedger } from "../src/lib/blockchain/accord-escrow-ledger";
import { db } from "../src/lib/db";
import crypto from "crypto";

async function runBountyLifecycleTest() {
  console.log("================================================================================");
  console.log("RUNNING ACCORD COMPLETE BOUNTY LIFECYCLE TEST SUITE");
  console.log("================================================================================\n");

  const runId = Date.now().toString().slice(-6);

  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION & PARTICIPANT REGISTRATION
  // ---------------------------------------------------------------------------
  console.log("🧪 Test 1: Participant Registration & Accord Authentication");

  const sponsorWallet = `0x${crypto.randomBytes(20).toString("hex")}`;
  const sponsor = await AgentService.registerParticipant({
    id: `principal_sponsor_${runId}`,
    type: "HUMAN_PRINCIPAL",
    name: "Athena Research Fund",
    walletAddress: sponsorWallet,
    bio: "Decentralized autonomous research foundation.",
  });

  assert.ok(sponsor.participant.id, "Sponsor participant ID must exist");
  assert.equal(sponsor.participant.type, "HUMAN_PRINCIPAL");
  assert.ok(sponsor.apiKey?.startsWith("accord_live_"), "Accord API key must be generated");

  // Nonce generation for wallet signature challenge
  const nonce = await AuthService.generateNonce(sponsorWallet);
  assert.ok(nonce && nonce.length === 32, "Wallet nonce must be 32-hex character string");

  // Session token creation and validation
  const sessionToken = AuthService.createSessionToken(sponsor.participant);
  const decodedSession = AuthService.verifySessionToken(sessionToken);
  assert.ok(decodedSession, "Session token must decode successfully");
  assert.equal(decodedSession?.participantId, sponsor.participant.id);
  console.log("   ✅ Authentication, Nonce Challenge, and Session Tokens verified.");

  // Register Autonomous AI Agents
  const agentAWallet = `0x${crypto.randomBytes(20).toString("hex")}`;
  const agentA = await AgentService.registerParticipant({
    id: `agent_apollo_${runId}`,
    type: "AI_AGENT",
    name: "Apollo-Autonomous-Reasoner",
    walletAddress: agentAWallet,
  });

  const agentBWallet = `0x${crypto.randomBytes(20).toString("hex")}`;
  const agentB = await AgentService.registerParticipant({
    id: `agent_vulcan_${runId}`,
    type: "AI_AGENT",
    name: "Vulcan-Heuristic-Coder",
    walletAddress: agentBWallet,
  });

  assert.equal(agentA.participant.reputationScore, 100.0, "Initial agent reputation must be 100");
  assert.equal(agentB.participant.reputationScore, 100.0, "Initial agent reputation must be 100");
  console.log("   ✅ Autonomous AI Agents registered with initial reputation of 100.0.");

  // ---------------------------------------------------------------------------
  // 2. BOUNTY CREATION WITH ESCROW LEDGER
  // ---------------------------------------------------------------------------
  console.log("\n🧪 Test 2: Bounty Creation & Escrow Ledger Locking");

  const bountyReward = 500.0;
  const createdBounty = await BountyService.createBounty({
    id: `bounty_zk_verifier_${runId}`,
    title: "Implement Groth16 Snark Proof Verifier in Pure TypeScript",
    description:
      "Construct a zero-dependency Groth16 cryptographic proof verifier for BN254 pairings in TypeScript. Must validate proof points (A, B, C), evaluate bilinear pairing equations, and provide comprehensive test coverage with Circom fixtures.",
    acceptanceCriteria: [
      "Implements BN254 elliptic curve group arithmetic in pure TypeScript",
      "Validates G1 and G2 proof points A, B, and C against public inputs",
      "Executes optimal Ate pairing check e(A, B) == e(alpha, beta) * e(x, gamma) * e(C, delta)",
      "Comprehensive unit test suite passing with Circom generated proof fixtures",
    ],
    rewardUsdc: bountyReward,
    creatorId: sponsor.participant.id,
    competitionMode: "RACE_TO_FIRST_VALID",
    deadlineHours: 72,
    minReputationRequired: 0,
  });

  assert.equal(createdBounty.bounty.status, "OPEN");
  assert.equal(createdBounty.bounty.escrowStatus, "HELD_IN_ESCROW");
  assert.ok(createdBounty.bounty.escrowLedgerId, "Escrow Ledger ID must be generated");
  assert.ok(createdBounty.bounty.escrowTxHash, "Escrow transaction hash must be recorded");

  // Verify state directly on the Accord Escrow Ledger
  const escrowLedger = getAccordEscrowLedger();
  const onChainEscrowState = await escrowLedger.getEscrowState(createdBounty.bounty.id);
  assert.ok(onChainEscrowState, "Escrow state must exist in ledger");
  assert.equal(onChainEscrowState?.status, "HELD_IN_ESCROW");
  assert.equal(onChainEscrowState?.amountUsdc, bountyReward);
  console.log(`   ✅ Bounty created ($${bountyReward} USDC). Escrow locked on Accord Ledger: ${createdBounty.bounty.escrowTxHash.slice(0, 18)}...`);

  // ---------------------------------------------------------------------------
  // 3. BOUNTY DISCOVERY
  // ---------------------------------------------------------------------------
  console.log("\n🧪 Test 3: Bounty Discovery & Query Filtering");

  const discovery = await BountyService.listBounties({
    query: "Groth16",
    status: "OPEN",
    minReward: 200,
  });

  assert.ok(discovery.total >= 1, "Discovery query must locate created bounty");
  const found = discovery.bounties.find((b) => b.id === createdBounty.bounty.id);
  assert.ok(found, "Matching bounty must be in discovery results");
  console.log(`   ✅ Bounty discovery verified: Found ${discovery.total} bounties matching query.`);

  // ---------------------------------------------------------------------------
  // 4. AGENT PARTICIPATION & HEARTBEATS
  // ---------------------------------------------------------------------------
  console.log("\n🧪 Test 4: Agent Participation & Heartbeat Tracking");

  const entryA = await CompetitionService.joinCompetition(createdBounty.bounty.id, {
    agentId: agentA.participant.id,
    stakeUsdc: 25.0,
  });
  const entryB = await CompetitionService.joinCompetition(createdBounty.bounty.id, {
    agentId: agentB.participant.id,
    stakeUsdc: 25.0,
  });

  assert.equal(entryA.status, "REGISTERED");
  assert.equal(entryB.status, "REGISTERED");

  // Record heartbeats
  const updatedEntryA = await CompetitionService.recordHeartbeat(createdBounty.bounty.id, agentA.participant.id);
  assert.equal(updatedEntryA.status, "WORKING");

  const competitors = await CompetitionService.getCompetitors(createdBounty.bounty.id);
  assert.equal(competitors.length, 2, "Must have exactly 2 competing agents");
  console.log("   ✅ Both agents successfully entered competition and broadcast heartbeats.");

  // ---------------------------------------------------------------------------
  // 5. SOLUTION SUBMISSIONS & AI VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n🧪 Test 5: Solution Submissions & AI Verification");

  // Agent Vulcan submits incomplete solution
  const solutionVulcan = "Basic proof point deserializer without BN254 pairing engine or Circom fixtures.";
  const hashVulcan = crypto.createHash("sha256").update(solutionVulcan).digest("hex");
  const subVulcan = await SubmissionService.submitSolution({
    bountyId: createdBounty.bounty.id,
    input: {
      agentId: agentB.participant.id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/vulcan/snark-verifier/pull/1",
      contentHash: hashVulcan,
      summary: solutionVulcan,
      executionTrace: "Parsed point A. Error: Pairing engine not implemented.",
      autoVerify: true,
    },
  });

  assert.equal(subVulcan.verification?.verdict, "FAIL");
  assert.ok((subVulcan.verification?.score || 0) < 75, "Flawed submission must score below 75");

  // Check Agent Vulcan reputation penalized
  const repVulcan = await AgentService.getParticipant(agentB.participant.id);
  assert.equal(repVulcan?.reputationScore, 90.0, "Failed submission must reduce reputation by 10 points");
  console.log(`   ✅ Agent Vulcan submission failed AI verification (Score: ${subVulcan.verification?.score}/100, Rep: 90.0).`);

  // Agent Apollo submits complete valid solution
  const solutionApollo = `
    BN254 Groth16 Snark Proof Verifier Implementation:
    - Implements BN254 elliptic curve group arithmetic in pure TypeScript with Fp, Fp2, and Fp12 towers.
    - Validates G1 and G2 proof points A, B, and C against public inputs.
    - Executes optimal Ate pairing check e(A, B) == e(alpha, beta) * e(x, gamma) * e(C, delta).
    - Comprehensive unit test suite passing with Circom generated proof fixtures (16 test vectors verified).
  `;
  const hashApollo = crypto.createHash("sha256").update(solutionApollo).digest("hex");
  const subApollo = await SubmissionService.submitSolution({
    bountyId: createdBounty.bounty.id,
    input: {
      agentId: agentA.participant.id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/apollo/bn254-groth16-verifier/pull/7",
      contentHash: hashApollo,
      summary: solutionApollo,
      executionTrace:
        "Execution Results: PASS (16/16 tests passed). BN254 Pairing check: EQUALITY VERIFIED. Circom proof verification: VALID.",
      autoVerify: true,
    },
  });

  assert.equal(subApollo.verification?.verdict, "PASS");
  assert.ok((subApollo.verification?.score || 0) >= 75, "Passing submission must score >= 75");
  assert.equal(subApollo.submission.status, "ACCEPTED");
  console.log(`   ✅ Agent Apollo submission passed AI verification (Score: ${subApollo.verification?.score}/100).`);

  // ---------------------------------------------------------------------------
  // 6. ESCROW SETTLEMENT & REPUTATION GROWTH
  // ---------------------------------------------------------------------------
  console.log("\n🧪 Test 6: Settlement & Growing Reputation Ledger");

  const settlement = await SettlementService.settleBounty({
    bountyId: createdBounty.bounty.id,
    submissionId: subApollo.submission.id,
    customFeePercentage: 2.5,
  });

  assert.equal(settlement.settlement.status, "CONFIRMED");
  assert.equal(settlement.feeUsdc, 12.5); // 2.5% of 500
  assert.equal(settlement.netPayoutUsdc, 487.5);
  assert.ok(settlement.releaseReceipt.txHash, "Settlement txHash must exist");

  // Verify bounty status updated in DB
  const settledBounty = await BountyService.getBountyById(createdBounty.bounty.id);
  assert.equal(settledBounty?.status, "SETTLED");
  assert.equal(settledBounty?.escrowStatus, "RELEASED");
  assert.equal(settledBounty?.winnerAgentId, agentA.participant.id);

  // Verify on-chain escrow state updated to RELEASED
  const finalEscrowState = await escrowLedger.getEscrowState(createdBounty.bounty.id);
  assert.equal(finalEscrowState?.status, "RELEASED");
  assert.equal(finalEscrowState?.recipientAddress, agentA.participant.walletAddress);

  // Verify Apollo reputation growth
  const finalProfileA = await AgentService.getParticipant(agentA.participant.id);
  assert.ok((finalProfileA?.reputationScore || 0) > 150, "Winning agent reputation must grow above 150");
  assert.equal(finalProfileA?.badge.tier, "SILVER", "Agent must advance to SILVER badge tier");
  assert.equal(finalProfileA?.badge.name, "Verified Solver");
  assert.equal(finalProfileA?.bountiesWonCount, 1);
  assert.equal(finalProfileA?.settledVolumeUsdc, 487.5);

  console.log(`   ✅ Bounty settled! Net Payout: $${settlement.netPayoutUsdc} USDC | Protocol Fee: $${settlement.feeUsdc} USDC`);
  console.log(`   ✅ Apollo Reputation: ${finalProfileA?.reputationScore} pts -> Tier: ${finalProfileA?.badge.name} (${finalProfileA?.badge.tier})`);

  // ---------------------------------------------------------------------------
  // 7. PROTOCOL AUDIT EVENT TRACKING
  // ---------------------------------------------------------------------------
  console.log("\n🧪 Test 7: Audit Event Tracking Log");
  const auditLogs = await db.protocolAuditLog.findMany({
    where: {
      entityId: createdBounty.bounty.id,
    },
  });
  assert.ok(auditLogs.length >= 3, "Audit logs must record bounty lifecycle events");
  const eventTypes = auditLogs.map((l) => l.eventType);
  assert.ok(eventTypes.includes("bounty.created"), "bounty.created must be logged");
  assert.ok(eventTypes.includes("bounty.settled"), "bounty.settled must be logged");
  console.log(`   ✅ Protocol Audit Logs verified (${auditLogs.length} events logged for bounty).`);

  console.log("\n================================================================================");
  console.log("ALL LIFECYCLE TESTS PASSED SUCCESSFULLY! (100% Green)");
  console.log("================================================================================\n");
}

runBountyLifecycleTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
