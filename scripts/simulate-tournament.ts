import { AccordClient } from "@accord/sdk";
import { TOURNAMENT_AGENTS_CONFIG, TournamentAgent } from "./demo-agents/tournament-agents";
import assert from "node:assert/strict";

export async function runTournamentSimulation(
  baseUrl = process.env.ACCORD_API_URL || process.argv[2] || "http://localhost:3005"
) {
  console.log("================================================================================");
  console.log("ACCORD // 10-AGENT COMPETITIVE BOUNTY TOURNAMENT SIMULATION");
  console.log("================================================================================\n");

  const sponsorClient = new AccordClient({ baseUrl });
  const runId = Date.now().toString(16).slice(-6);

  // 1. Post a Tournament Bounty
  console.log("1. Posting a Tournament Bounty ($500 USDC, maxParticipants=10, mode=TOURNAMENT)...");
  const sponsor = await sponsorClient.registerPrincipal({
    type: "AUTONOMOUS_DAO",
    name: "Polis Algorithmic Foundation",
    walletAddress: `0x${Date.now().toString(16).padStart(40, "7")}`,
    bio: "Decentralized consortium sponsoring competitive benchmark tournaments.",
  });

  const bountyResult = await sponsorClient.createBounty({
    title: `Implement High-Performance Graph BFS in Pure TypeScript [Tournament #${runId}]`,
    description:
      "Construct a zero-dependency Breadth-First Search (BFS) graph algorithm with memory-efficient bitset visited tracking, cycle detection, and high-node benchmark test suite.",
    acceptanceCriteria: [
      "Implements zero-dependency Breadth-First Search (BFS) graph traversal",
      "Memory-efficient bitset visited tracking",
      "Cycle detection and shortest path verification",
      "Benchmark test suite passing with 100k nodes",
    ],
    rewardUsdc: 500.0,
    creatorId: sponsor.participant.id,
    competitionMode: "TOURNAMENT",
    maxParticipants: 10,
    minPassingScore: 70.0,
    evaluationWeights: {
      correctness: 0.4,
      completeness: 0.3,
      securityAndRobustness: 0.15,
      performanceAndEfficiency: 0.15,
    },
    deadlineHours: 48,
  });

  const bounty = bountyResult.bounty;
  console.log(`   ✅ Bounty Created: "${bounty.title}"`);
  console.log(`      ID: ${bounty.id} | Mode: ${bounty.competitionMode} | Status: ${bounty.status}`);
  console.log(`      Reward: $${bounty.rewardUsdc} USDC | Max Participants: ${bounty.maxParticipants}`);
  console.log(`      Min Passing Score: ${bounty.minPassingScore} pts\n`);

  // 2. Initialize 10 Independent Demo Agents
  console.log("2. Initializing 10 Independent Demo Agents with Dedicated @accord/sdk Clients...");
  const agents: TournamentAgent[] = [];
  for (let i = 0; i < TOURNAMENT_AGENTS_CONFIG.length; i++) {
    const config = TOURNAMENT_AGENTS_CONFIG[i];
    const client = new AccordClient({ baseUrl });
    const walletAddress = `0x${(BigInt(Date.now()) * 1000n + BigInt(i + 1)).toString(16).padStart(40, "0")}`;
    const agent = new TournamentAgent(client, config, walletAddress);
    await agent.initialize();
    agents.push(agent);
    console.log(`   [Agent ${i + 1}/10] ${agent.config.name.padEnd(24)} | Framework: ${agent.config.framework.padEnd(18)} | ID: ${agent.agentId}`);
  }

  // 3. 10 Agents Enter Competition
  console.log("\n3. Entering Competition (OPEN -> COMPETING)...");
  for (const agent of agents) {
    await agent.enterBounty(bounty.id);
    await agent.sendHeartbeat(bounty.id);
  }
  console.log(`   ✅ All 10 agents successfully registered in tournament.`);

  // 4. Verify 11th Agent Rejection
  console.log("\n4. Testing 11th Agent Rejection (Participant Limit Protection)...");
  const agent11Client = new AccordClient({ baseUrl });
  const agent11 = new TournamentAgent(
    agent11Client,
    {
      idSuffix: "11_overflow",
      name: "Overflow-Agent-11",
      framework: "custom",
      domain: "overflow",
      skills: ["none"],
      bio: "Attempting entry into a full tournament.",
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/overflow/11",
      summary: "Late entrant",
      executionTrace: "N/A",
    },
    `0x${(BigInt(Date.now()) * 1000n + 999n).toString(16).padStart(40, "0")}`
  );
  await agent11.initialize();

  let rejected = false;
  try {
    await agent11.enterBounty(bounty.id);
  } catch (err: any) {
    rejected = true;
    console.log(`   ✅ 11th Agent Entry Blocked: "${err.message}" (Code: ${err.code || err.status})`);
  }
  assert.ok(rejected, "11th agent must be rejected when limit is 10");

  // 5. Test Blind / Isolated Submissions
  console.log("\n5. Testing Blind / Isolated Submissions (Anti-Plagiarism)...");
  // Agent 1 submits first
  await agents[0].submitSolution(bounty.id);
  console.log(`   [${agents[0].config.name}] Submitted solution deliverable.`);

  // Agent 2 inspects submissions via public API
  const competitorSubmissions = await agents[1].client.getSubmissions(bounty.id);
  const maskedSubmission = competitorSubmissions.find((s: any) => s.agentId === agents[0].agentId);
  assert.ok(maskedSubmission, "Submission must appear in list");
  assert.equal(
    maskedSubmission.deliverableUrl,
    "[BLIND_SUBMISSION_ACTIVE_UNTIL_EVALUATION]",
    "Competitor deliverable URL must be blind-masked before evaluation"
  );
  assert.equal(
    maskedSubmission.summary,
    "[BLIND_SUBMISSION_ACTIVE_UNTIL_EVALUATION]",
    "Competitor summary must be blind-masked before evaluation"
  );
  console.log("   ✅ Blind submissions verified: Competing agents cannot inspect others' solutions.");

  // 6. Remaining 9 Agents Submit Solutions
  console.log("\n6. Remaining 9 Agents Submitting Solutions Independently...");
  for (let i = 1; i < agents.length; i++) {
    await agents[i].submitSolution(bounty.id);
    console.log(`   [Agent ${i + 1}/10] [${agents[i].config.name}] Solution submitted.`);
  }

  // 7. Lock Submissions (COMPETING -> SUBMISSIONS_LOCKED)
  console.log("\n7. Locking Tournament Submissions (COMPETING -> SUBMISSIONS_LOCKED)...");
  const lockedBounty = await sponsorClient.lockTournamentSubmissions(bounty.id);
  console.log(`   ✅ Submissions locked! Bounty status: ${lockedBounty.bounty.status}`);

  // Verify late submission is rejected
  let lateRejected = false;
  try {
    await agents[0].submitSolution(bounty.id);
  } catch (err: any) {
    lateRejected = true;
    console.log(`   ✅ Late submission blocked after lock: "${err.message}"`);
  }
  assert.ok(lateRejected, "Submissions must be rejected after SUBMISSIONS_LOCKED");

  // 8. Multi-Verifier Evaluation & Deterministic Ranking (SUBMISSIONS_LOCKED -> EVALUATING -> RANKED)
  console.log("\n8. Multi-Verifier Evaluation & Deterministic Ranking (EVALUATING -> RANKED)...");
  const evalResult = await sponsorClient.evaluateTournament(bounty.id);
  console.log(`   Evaluated ${evalResult.totalSubmissions} submissions:`);
  console.log(`   - Valid Passing Solutions: ${evalResult.validSubmissionsCount}`);
  console.log(`   - Disqualified / Below Minimum: ${evalResult.disqualifiedCount}`);
  console.log(`\n🏆 OFFICIAL TOURNAMENT LEADERBOARD:`);
  console.log("--------------------------------------------------------------------------------");
  console.log("RANK | AGENT NAME               | SCORE  | VERDICT | STATUS / REASON");
  console.log("--------------------------------------------------------------------------------");

  for (const entry of evalResult.rankings) {
    const rankStr = `#${entry.rank}`.padEnd(5);
    const nameStr = entry.agentName.padEnd(25);
    const scoreStr = `${entry.score} pts`.padEnd(8);
    const verdictStr = entry.verdict.padEnd(9);
    const reasonStr = entry.disqualified
      ? `DISQUALIFIED: ${entry.disqualificationReason || "Below threshold"}`
      : entry.tieBreakerApplied
      ? `PASS (${entry.tieBreakerApplied})`
      : "PASS (Valid Solution)";
    console.log(`${rankStr}| ${nameStr}| ${scoreStr}| ${verdictStr}| ${reasonStr}`);
  }
  console.log("--------------------------------------------------------------------------------");

  const winner = evalResult.winner;
  assert.ok(winner, "Tournament must have a valid winner");
  console.log(`\n🎉 TOURNAMENT WINNER DETERMINED:`);
  console.log(`   Agent: ${winner.agentName} (${winner.agentId})`);
  console.log(`   Winning Score: ${winner.score}/100 pts`);
  console.log(`   Wallet: ${winner.walletAddress}`);
  console.log(`   Winning Submission ID: ${winner.submissionId}`);

  // 9. Verify Immutability (Creator cannot tamper with winner or scores)
  console.log("\n9. Testing Evaluation Immutability (Anti-Tampering)...");
  let scoreTamperBlocked = false;
  try {
    await sponsorClient.evaluateTournament(bounty.id);
  } catch (err: any) {
    scoreTamperBlocked = true;
    console.log(`   ✅ Re-evaluation blocked: "${err.message}"`);
  }
  assert.ok(scoreTamperBlocked, "Scores and rankings must be immutable once finalized");

  // 10. Settle Escrow to Winner (RANKED -> SETTLED)
  console.log("\n10. Settling Escrow to Winner (RANKED -> SETTLED)...");
  const settlement = await sponsorClient.settleBounty(bounty.id, winner.submissionId, 2.5);
  console.log(`   ✅ Bounty Settled!`);
  console.log(`      Winner Address: ${settlement.settlement.agentId}`);
  console.log(`      Net Payout: $${settlement.netPayoutUsdc} USDC`);
  console.log(`      Protocol Fee: $${settlement.feeUsdc} USDC`);
  console.log(`      Transaction Hash: ${settlement.releaseReceipt.txHash}`);
  console.log(`      Ledger Type: ${settlement.releaseReceipt.ledgerType} (isOnChain: ${settlement.releaseReceipt.isOnChain})`);

  // Verify duplicate settlement rejection
  let doubleSettleBlocked = false;
  try {
    await sponsorClient.settleBounty(bounty.id, winner.submissionId);
  } catch (err: any) {
    doubleSettleBlocked = true;
    console.log(`   ✅ Duplicate settlement blocked: "${err.message}"`);
  }
  assert.ok(doubleSettleBlocked, "Duplicate settlement must be strictly rejected");

  // 11. Check Winner Reputation Update
  console.log("\n11. Verifying Winner Reputation Growth...");
  const winnerRep = await sponsorClient.getReputation(winner.agentId);
  console.log(`   Winner Name: ${winnerRep.name}`);
  console.log(`   Reputation Score: ${winnerRep.reputationScore} pts (Badge: ${winnerRep.badge.name})`);
  console.log(`   Bounties Won: ${winnerRep.bountiesWonCount}`);
  console.log(`   Total Settled Volume: $${winnerRep.settledVolumeUsdc} USDC`);

  console.log("\n================================================================================");
  console.log("TOURNAMENT SIMULATION COMPLETE: ALL PROTOCOL CHECKS PASSED (100% Green)");
  console.log("================================================================================\n");

  return {
    bountyId: bounty.id,
    winner,
    rankings: evalResult.rankings,
    settlement,
  };
}

if (require.main === module || process.argv[1]?.endsWith("simulate-tournament.ts")) {
  runTournamentSimulation().catch((err) => {
    console.error("❌ Tournament simulation error:", err);
    process.exit(1);
  });
}
