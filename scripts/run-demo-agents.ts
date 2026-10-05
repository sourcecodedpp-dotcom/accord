import { AccordClient } from "@accord/sdk";
import { SecurityAuditorAgent } from "./demo-agents/security-agent";
import { AlgorithmOptimizationAgent } from "./demo-agents/algorithm-agent";
import { FailingSpamAgent } from "./demo-agents/failing-agent";

async function main() {
  console.log("================================================================================");
  console.log("ACCORD // RUNNING AUTONOMOUS DEMO AGENTS VIA @ACCORD/SDK");
  console.log("================================================================================\n");

  const client = new AccordClient({ baseUrl: "http://localhost:3000" });

  // 1. Post a live bounty for the agents to discover
  console.log("1. Posting a live bounty via SDK...");
  const sponsor = await client.registerPrincipal({
    type: "AUTONOMOUS_DAO",
    name: "Decentralized Science DAO",
    walletAddress: `0x${Date.now().toString(16).padStart(40, "4")}`,
  });

  const bountyResult = await client.createBounty({
    title: "Implement High-Performance Graph BFS in Pure TypeScript",
    description:
      "Construct a zero-dependency Breadth-First Search (BFS) graph algorithm with memory-efficient bitsets, cycle detection, and benchmark suites.",
    acceptanceCriteria: [
      "Implements zero-dependency Breadth-First Search (BFS) graph traversal",
      "Memory-efficient bitset visited tracking",
      "Cycle detection and shortest path verification",
      "Benchmark test suite passing with 100k nodes",
    ],
    rewardUsdc: 300.0,
    creatorId: sponsor.participant.id,
    competitionMode: "RACE_TO_FIRST_VALID",
    deadlineHours: 48,
  });

  const bounty = bountyResult.bounty;
  console.log(`   Bounty Created: "${bounty.title}" ($${bounty.rewardUsdc} USDC) | ID: ${bounty.id}\n`);

  // 2. Initialize Autonomous Agents
  console.log("2. Initializing Autonomous Demo Agents...");
  const agent1 = new SecurityAuditorAgent(client, `0x${Date.now().toString(16).padStart(40, "1")}`);
  const agent2 = new AlgorithmOptimizationAgent(client, `0x${Date.now().toString(16).padStart(40, "2")}`);
  const agent3 = new FailingSpamAgent(client, `0x${Date.now().toString(16).padStart(40, "3")}`);

  await agent1.initialize();
  await agent2.initialize();
  await agent3.initialize();
  console.log(`   Agent 1: ${agent1.name} (${agent1.agentId})`);
  console.log(`   Agent 2: ${agent2.name} (${agent2.agentId})`);
  console.log(`   Agent 3: ${agent3.name} (${agent3.agentId})\n`);

  // 3. Agents Compete
  console.log("3. Agents Entering Competition & Submitting Deliverables...");

  // Agent 3 submits failing solution
  console.log(`   [${agent3.name}] Submitting shallow solution...`);
  const res3 = await agent3.runOnBounty(bounty.id);
  console.log(`   [${agent3.name}] Verdict: ${res3.verification?.verdict} (Score: ${res3.verification?.score}/100)`);

  // Agent 2 submits winning solution
  console.log(`   [${agent2.name}] Submitting algorithm solution...`);
  const res2 = await agent2.runOnBounty(bounty.id);
  console.log(`   [${agent2.name}] Verdict: ${res2.verification?.verdict} (Score: ${res2.verification?.score}/100)`);

  // 4. Settle Escrow
  console.log("\n4. Settling Escrow to Winning Agent...");
  if (res2.verification?.verdict === "PASS") {
    const settlement = await client.settleBounty(bounty.id, res2.submission.id, 2.5);
    console.log(`   🎉 Bounty Settled!`);
    console.log(`   Winner: ${agent2.name}`);
    console.log(`   Net USDC Payout: $${settlement.netPayoutUsdc} USDC`);
    console.log(`   Protocol Fee: $${settlement.feeUsdc} USDC`);
    console.log(`   Transaction Hash: ${settlement.releaseReceipt?.txHash}`);
  }

  // 5. Leaderboard Check
  console.log("\n5. Checking Updated Leaderboard Standing...");
  const leaderboard = await client.getLeaderboard(5);
  leaderboard.forEach((ag) => {
    console.log(`   #${ag.rank} | ${ag.name.padEnd(28)} | Score: ${ag.reputationScore} | Settled: $${ag.settledVolumeUsdc} USDC`);
  });

  console.log("\n✔ Demo Agents Run Complete!");
}

main().catch((err) => {
  console.error("Demo agents error:", err);
  process.exit(1);
});
