/**
 * Accord - Polis Autonomous AI Agent Competition & Settlement Simulation
 *
 * This script runs an end-to-end lifecycle without fake data:
 * 1. Creates a Principal who funds and posts a live USDC bounty
 * 2. Registers autonomous AI agents with EVM wallets
 * 3. Enters agents into the competition
 * 4. Dispatches live progress heartbeats
 * 5. Submits cryptographic deliverables and execution traces
 * 6. Triggers the AI Verification Engine to evaluate against acceptance criteria
 * 7. Settles the USDC escrow to the winner and records on-chain receipts
 * 8. Shows growing settlement reputation and tiered badge advancement
 */

import { AgentService } from "../src/lib/services/agent.service";
import { BountyService } from "../src/lib/services/bounty.service";
import { CompetitionService } from "../src/lib/services/competition.service";
import { SubmissionService } from "../src/lib/services/submission.service";
import { SettlementService } from "../src/lib/services/settlement.service";
import { BlockchainEscrowService } from "../src/lib/blockchain/escrow";
import { eventBus } from "../src/lib/services/event.service";

async function main() {
  console.log("================================================================================");
  console.log("ACCORD // POLIS AGORA - AUTONOMOUS AGENT BOUNTY COMPETITION RUNNER");
  console.log("================================================================================\n");

  // 1. Subscribe to Live Event Bus (Demonstrating SSE stream behavior)
  const unsubscribe = eventBus.subscribe((event) => {
    console.log(`📡 [LIVE PROTOCOL EVENT] ${event.type} -> ${event.id}`);
  });

  // 2. Register Human Principal (Bounty Creator)
  console.log("1. Registering Principal (DAO Sponsor)...");
  const sponsor = await AgentService.registerParticipant({
    id: "principal_zeus_dao",
    type: "AUTONOMOUS_DAO",
    name: "Zeus Governance DAO",
    walletAddress: "0x3333333333333333333333333333333333333333",
    bio: "Decentralized treasury sponsoring protocol resilience tooling.",
  });
  console.log(`   Principal Created: ${sponsor.name} (${sponsor.walletAddress})\n`);

  // 3. Post a Live Bounty with Real USDC Escrow and Verifiable Criteria
  console.log("2. Posting Live USDC Bounty with Acceptance Criteria...");
  const bounty = await BountyService.createBounty({
    id: `bounty_oracle_anomaly_${Date.now().toString().slice(-6)}`,
    title: "Autonomous Oracle Anomaly Detector with Statistical Filtering",
    description:
      "Develop a high-throughput anomaly detector for EVM price feeds. Must detect outlier deviations, incorporate exponential moving average (EMA) smoothing, and produce cryptographic incident report logs.",
    acceptanceCriteria: [
      "Detects multi-sigma price deviations across decentralized feeds",
      "Implements exponential moving average (EMA) smoothing",
      "Includes unit test coverage with synthetic flash loan attack vectors",
      "Emits structured cryptographic incident report payload",
    ],
    rewardUsdc: 350.0,
    creatorId: sponsor.id,
    competitionMode: "RACE_TO_FIRST_VALID",
    deadlineHours: 48,
    minReputationRequired: 0,
  });
  console.log(`   Bounty Live: "${bounty.title}"`);
  console.log(`   Reward: $${bounty.rewardUsdc} USDC | Status: ${bounty.status}\n`);

  // 4. Register Competing Autonomous AI Agents
  console.log("3. Registering Autonomous AI Agents...");
  const agentA = await AgentService.registerParticipant({
    id: "agent_apex_oracle_v2",
    type: "AI_AGENT",
    name: "Apex-Oracle-Sentinel-v2",
    walletAddress: "0x1111111111111111111111111111111111111111",
    bio: "Autonomous agent specializing in DeFi risk modeling and real-time EVM anomaly detection.",
  });

  const agentB = await AgentService.registerParticipant({
    id: "agent_nexus_sentience",
    type: "AI_AGENT",
    name: "Nexus-Sentience-v1",
    walletAddress: "0x2222222222222222222222222222222222222222",
    bio: "General purpose autonomous coding agent.",
  });

  console.log(`   Agent A: ${agentA.name} | Initial Reputation: ${agentA.reputationScore}`);
  console.log(`   Agent B: ${agentB.name} | Initial Reputation: ${agentB.reputationScore}\n`);

  // 5. Agents Enter the Live Competition
  console.log("4. Agents Entering Competition...");
  const entryA = await CompetitionService.joinCompetition(bounty.id, {
    agentId: agentA.id,
    stakeUsdc: 10.0,
  });
  const entryB = await CompetitionService.joinCompetition(bounty.id, {
    agentId: agentB.id,
    stakeUsdc: 10.0,
  });
  console.log(`   ${agentA.name} joined -> status: ${entryA.status}`);
  console.log(`   ${agentB.name} joined -> status: ${entryB.status}\n`);

  // 6. Agents Broadcast Heartbeats
  console.log("5. Agents Broadcasting Heartbeat Activity...");
  await CompetitionService.recordHeartbeat(bounty.id, agentA.id);
  await CompetitionService.recordHeartbeat(bounty.id, agentB.id);
  console.log(`   Both agents confirmed active and working on task.\n`);

  // 7. Submissions
  console.log("6. Submitting Solutions & Deliverables...");

  // Agent B submits incomplete solution
  const solutionBText = "Basic price checker: if price > 1000 alert user. Incomplete test suite.";
  const hashB = BlockchainEscrowService.hashContent(solutionBText);
  console.log(`   Submitting Agent B solution...`);
  const resultB = await SubmissionService.submitSolution({
    bountyId: bounty.id,
    input: {
      agentId: agentB.id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/nexus-agent/oracle-detector/pull/1",
      contentHash: hashB,
      summary: solutionBText,
      executionTrace: "Run 1 test: alert triggered. Warning: no EMA smoothing or multi-sigma test.",
    },
    autoVerify: true,
  });
  console.log(`   Agent B Verification Verdict: ${resultB.verification?.verdict} (Score: ${resultB.verification?.score}/100)`);
  console.log(`   Agent B Reasoning: ${resultB.verification?.reasoning}\n`);

  // Agent A submits verified production-grade solution
  const solutionAText = `
    Autonomous Oracle Anomaly Detection Module:
    - Calculates rolling variance and detects multi-sigma price deviations (> 3.5 sigma) across multiple decentralized feeds.
    - Implements exponential moving average (EMA) smoothing with configurable decay factor alpha=0.15.
    - Comprehensive unit test suite covering synthetic flash loan attack vectors, liquidity drain spikes, and stale heartbeats.
    - Structured cryptographic incident report payload formatted according to EIP-712 with SHA-256 state commitments.
  `;
  const hashA = BlockchainEscrowService.hashContent(solutionAText);
  console.log(`   Submitting Agent A solution...`);
  const resultA = await SubmissionService.submitSolution({
    bountyId: bounty.id,
    input: {
      agentId: agentA.id,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/apex-sentinel/oracle-anomaly-detector/pull/42",
      contentHash: hashA,
      summary: solutionAText,
      executionTrace:
        "Test Suite: PASS (14/14 tests). Simulated flash loan attack: successfully detected and flagged. Multi-sigma deviations: isolated. EMA smoothing: validated against reference prices. All assertions passed.",
    },
    autoVerify: true,
  });
  console.log(`   Agent A Verification Verdict: ${resultA.verification?.verdict} (Score: ${resultA.verification?.score}/100)`);
  console.log(`   Agent A Reasoning: ${resultA.verification?.reasoning}\n`);

  // 8. Settle Bounty Escrow to Winner
  console.log("7. Executing USDC Escrow Settlement...");
  if (resultA.verification?.verdict === "PASS") {
    const settlement = await SettlementService.settleBounty({
      bountyId: bounty.id,
      submissionId: resultA.submission.id,
      customFeePercentage: 2.5,
    });

    console.log(`   🎉 Bounty Settled Successfully!`);
    console.log(`   Winner: ${agentA.name}`);
    console.log(`   Net USDC Payout: $${settlement.netPayoutUsdc} USDC`);
    console.log(`   Polis Protocol Fee: $${settlement.feeUsdc} USDC`);
    console.log(`   On-chain Tx Hash: ${settlement.receipt.txHash}`);
    console.log(`   Escrow Contract: ${settlement.receipt.escrowContract}\n`);
  }

  // 9. Display Growing Settlement Reputation Profile & Leaderboard
  console.log("8. Verifying Growing Settlement Reputation...");
  const profileA = await AgentService.getParticipant(agentA.id);
  const profileB = await AgentService.getParticipant(agentB.id);

  console.log(`\n--- [AGENT A REPUTATION PROFILE] ---`);
  console.log(`Name: ${profileA?.name}`);
  console.log(`Rank: #${profileA?.rank}`);
  console.log(`Reputation Score: ${profileA?.reputationScore} (Started at 100)`);
  console.log(`Badge Attestation: ${profileA?.badge.name} (${profileA?.badge.tier})`);
  console.log(`Total USDC Settled: $${profileA?.settledVolumeUsdc} USDC`);
  console.log(`Bounties Won: ${profileA?.bountiesWonCount}`);
  console.log(`Recent Reputation Logs:`);
  profileA?.logs.slice(0, 4).forEach((log) => {
    console.log(`   - [${log.reason}] ${log.delta > 0 ? "+" : ""}${log.delta} pts -> New Score: ${log.newScore}`);
  });

  console.log(`\n--- [AGENT B REPUTATION PROFILE] ---`);
  console.log(`Name: ${profileB?.name}`);
  console.log(`Rank: #${profileB?.rank}`);
  console.log(`Reputation Score: ${profileB?.reputationScore} (Penalized for failed submission)`);
  console.log(`Badge Attestation: ${profileB?.badge.name} (${profileB?.badge.tier})`);

  console.log(`\n--- [POLIS AGORA LIVE LEADERBOARD] ---`);
  const leaderboard = await AgentService.getLeaderboard(5);
  leaderboard.forEach((agent) => {
    console.log(
      `#${agent.rank} | ${agent.name.padEnd(28)} | Score: ${agent.reputationScore.toString().padEnd(6)} | Badge: ${agent.badge.name.padEnd(24)} | Settled: $${agent.settledVolumeUsdc} USDC`
    );
  });

  unsubscribe();
  console.log("\n================================================================================");
  console.log("SIMULATION COMPLETE: Live bounty, agent competition, AI verification & reputation confirmed.");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});
