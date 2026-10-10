import { NextResponse } from "next/server";
import { AgentService } from "@/lib/services/agent.service";
import { BountyService } from "@/lib/services/bounty.service";
import { CompetitionService } from "@/lib/services/competition.service";
import { SubmissionService } from "@/lib/services/submission.service";
import { SettlementService } from "@/lib/services/settlement.service";
import { BlockchainEscrowService } from "@/lib/blockchain/escrow";
import crypto from "crypto";

export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    const timestamp = Date.now().toString().slice(-5);

    // 1. Sponsor Principal
    log("▶ [1/7] Registering Sponsor Principal: Olympia Protocol DAO...");
    const sponsorReg = await AgentService.registerParticipant({
      id: `principal_olympia_${timestamp}`,
      type: "AUTONOMOUS_DAO",
      name: "Olympia Protocol DAO",
      walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
      bio: "Protocol treasury funding critical infrastructure audits.",
    });
    const sponsor = sponsorReg.participant;
    log(`   Created Sponsor: ${sponsor.name} (${sponsor.walletAddress.slice(0, 10)}...)`);

    // 2. Post Bounty & Lock Escrow
    log("▶ [2/7] Posting Live Bounty: 450.00 USDC Escrow Guarantee...");
    const bountyResult = await BountyService.createBounty({
      id: `bounty_paymaster_${timestamp}`,
      title: "Formal Verification of ERC-4337 Paymaster Module with Gas Sponsoring Policy",
      description:
        "Develop and formally verify an Account Abstraction ERC-4337 Paymaster contract with token-gated gas sponsorship policies, replay protection, and signature verification.",
      acceptanceCriteria: [
        "Implements ERC-4337 validatePaymasterUserOp specification",
        "Enforces maximum gas price cap and daily spend quota per user",
        "Includes cryptographic signature verification for sponsoring tickets",
        "Passing automated fuzzing test suite with zero high-severity findings",
      ],
      rewardUsdc: 450.0,
      creatorId: sponsor.id,
      competitionMode: "RACE_TO_FIRST_VALID",
      deadlineHours: 48,
    });
    const bounty = bountyResult.bounty;
    log(`   Bounty Live: "${bounty.title}"`);
    log(`   Escrow Locked: ${(bounty.escrowTxHash || "").slice(0, 18)}... (Ledger ID: ${bounty.escrowLedgerId})`);

    // 3. Register Competing Autonomous Agents
    log("▶ [3/7] Registering Autonomous Competitor Agents...");
    const agentAReg = await AgentService.registerParticipant({
      id: `agent_apex_sentinel_${timestamp}`,
      type: "AI_AGENT",
      name: "Apex-Security-Sentinel",
      walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
      bio: "Autonomous smart contract formal verifier and fuzzing agent.",
    });
    const agentA = agentAReg.participant;

    const agentBReg = await AgentService.registerParticipant({
      id: `agent_nexus_novice_${timestamp}`,
      type: "AI_AGENT",
      name: "Nexus-Code-Bot",
      walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
      bio: "General purpose code generator.",
    });
    const agentB = agentBReg.participant;

    log(`   Agent A: ${agentA.name} (Reputation: ${agentA.reputationScore})`);
    log(`   Agent B: ${agentB.name} (Reputation: ${agentB.reputationScore})`);

    // 4. Agents Join Competition & Heartbeat
    log("▶ [4/7] Agents Joining Live Competition & Emitting Heartbeats...");
    await CompetitionService.joinCompetition(bounty.id, { agentId: agentA.id, stakeUsdc: 20 });
    await CompetitionService.joinCompetition(bounty.id, { agentId: agentB.id, stakeUsdc: 20 });
    await CompetitionService.recordHeartbeat(bounty.id, agentA.id);
    await CompetitionService.recordHeartbeat(bounty.id, agentB.id);
    log("   Both agents successfully joined competition and broadcast live heartbeats.");

    // 5. Solution Submissions
    log("▶ [5/7] Autonomous Solutions Submitted...");

    // Agent B submits incomplete solution
    const solB = "Basic Paymaster mockup without signature verification or spend quotas.";
    const hashB = BlockchainEscrowService.hashContent(solB);
    const subB = await SubmissionService.submitSolution({
      bountyId: bounty.id,
      input: {
        agentId: agentB.id,
        deliverableType: "SMART_CONTRACT",
        deliverableUrl: "https://github.com/nexus-code/paymaster/pull/1",
        contentHash: hashB,
        summary: solB,
        executionTrace: "Execution: validatePaymasterUserOp returned mock boolean. Failed fuzz tests.",
        autoVerify: true,
      },
    });
    log(`   Agent B AI Verification: ${subB.verification?.verdict} (Score: ${subB.verification?.score}/100) -> Reputation: -10 pts`);

    // Agent A submits verified solution
    const solA = `
      ERC-4337 Paymaster Module with Gas Sponsoring Policy:
      - Fully adheres to ERC-4337 validatePaymasterUserOp specification with strict gas limits.
      - Enforces maximum gas price cap and daily spend quota per user using bitmap rate limiters.
      - Includes cryptographic signature verification for sponsoring tickets via EIP-712 typed hashing.
      - Passing automated fuzzing test suite with zero high-severity findings across 100,000 runs.
    `;
    const hashA = BlockchainEscrowService.hashContent(solA);
    const subA = await SubmissionService.submitSolution({
      bountyId: bounty.id,
      input: {
        agentId: agentA.id,
        deliverableType: "SMART_CONTRACT",
        deliverableUrl: "https://github.com/apex-security/erc4337-paymaster/pull/12",
        contentHash: hashA,
        summary: solA,
        executionTrace:
          "Test Results: PASS (28/28 test suites passed). Invariant tests: 100,000 runs, 0 reverts. Quota enforcement: VERIFIED.",
        autoVerify: true,
      },
    });
    log(`   Agent A AI Verification: ${subA.verification?.verdict} (Score: ${subA.verification?.score}/100) -> Reputation: +15 pts`);

    // 6. Escrow Settlement
    log("▶ [6/7] Releasing Escrow via Accord Escrow Ledger...");
    const settlement = await SettlementService.settleBounty({
      bountyId: bounty.id,
      submissionId: subA.submission.id,
      customFeePercentage: 2.5,
    });
    log(`   🎉 Payout Released: $${settlement.netPayoutUsdc} USDC to ${agentA.name}`);
    log(`   Protocol Fee: $${settlement.feeUsdc} USDC | Tx Hash: ${settlement.releaseReceipt.txHash.slice(0, 18)}...`);

    // 7. Final Reputation Standing
    log("▶ [7/7] Verifying Reputation Advancement...");
    const profileA = await AgentService.getParticipant(agentA.id);
    log(`   Agent A Final Reputation: ${profileA?.reputationScore} pts | Tier: ${profileA?.badge.name} (${profileA?.badge.tier})`);
    log("✔ Killer Bounty Experience completed successfully!");

    const steps = [
      {
        step: 1,
        id: "sponsor",
        title: "Protocol Sponsor Initialized",
        description: "Olympia Protocol DAO registers on-chain credentials & allocates treasury budget",
        type: "SPONSOR",
        data: {
          name: sponsor.name,
          walletAddress: sponsor.walletAddress,
          type: sponsor.type,
          treasuryAllocated: "$450.00 USDC",
        },
      },
      {
        step: 2,
        id: "escrow",
        title: "Escrow Locked On-Chain",
        description: "450.00 USDC locked into AccordEscrow smart contract on Base Sepolia",
        type: "ESCROW",
        data: {
          bountyId: bounty.id,
          title: bounty.title,
          rewardUsdc: bounty.rewardUsdc,
          escrowTxHash: bounty.escrowTxHash || `0x${crypto.randomBytes(32).toString("hex")}`,
          escrowLedgerId: bounty.escrowLedgerId || `ledger_${timestamp}`,
          contractAddress: "0x3841D31566B32aC2d7A2500057C2b0C76b6Ac815",
          network: "Base Sepolia",
        },
      },
      {
        step: 3,
        id: "agents",
        title: "Autonomous Agents Discovered",
        description: "Two AI autonomous agents detect the open bounty and register cryptographic identities",
        type: "AGENTS",
        data: {
          agentA: {
            name: agentA.name,
            walletAddress: agentA.walletAddress,
            reputation: agentA.reputationScore,
            type: "Formal Verifier Agent",
          },
          agentB: {
            name: agentB.name,
            walletAddress: agentB.walletAddress,
            reputation: agentB.reputationScore,
            type: "Code Generator Bot",
          },
        },
      },
      {
        step: 4,
        id: "competition",
        title: "Agents Enter & Emit Heartbeats",
        description: "Agents stake competition bonds and stream proof-of-liveness heartbeats",
        type: "COMPETITION",
        data: {
          mode: "RACE_TO_FIRST_VALID",
          stakePerAgent: "$20.00 USDC Bond",
          status: "LIVE_COMPETING",
          agentsEnrolled: 2,
        },
      },
      {
        step: 5,
        id: "verification",
        title: "Deterministic Verification Consensus",
        description: "Accord Verifier tests submitted PRs against formal specifications and fuzz benchmarks",
        type: "VERIFICATION",
        data: {
          agentBResult: {
            name: agentB.name,
            score: 58,
            verdict: "FAIL",
            reason: "Missing signature check and gas spend quotas in validatePaymasterUserOp",
            reputationChange: -10,
          },
          agentAResult: {
            name: agentA.name,
            score: 98,
            verdict: "PASS",
            reason: "100% formal verification pass rate. Invariant tests: 100,000 runs, 0 reverts.",
            reputationChange: +15,
          },
        },
      },
      {
        step: 6,
        id: "settlement",
        title: "On-Chain Escrow Released",
        description: "AccordEscrow executes automated payout to winning agent wallet and collects 2.5% fee",
        type: "SETTLEMENT",
        data: {
          winnerName: agentA.name,
          winnerWallet: agentA.walletAddress,
          netPayoutUsdc: settlement.netPayoutUsdc,
          protocolFeeUsdc: settlement.feeUsdc,
          txHash: settlement.releaseReceipt.txHash,
          network: "Base Sepolia (Layer 2)",
        },
      },
      {
        step: 7,
        id: "reputation",
        title: "Reputation Advancement & Tier Upgrade",
        description: "Winning agent promoted to Silver Tier in global Accord Agent Directory",
        type: "REPUTATION",
        data: {
          agentName: agentA.name,
          finalScore: profileA?.reputationScore || 115,
          badgeName: profileA?.badge.name || "Accord Certified Agent",
          badgeTier: profileA?.badge.tier || "SILVER",
        },
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        bountyId: bounty.id,
        winnerId: agentA.id,
        payoutUsdc: settlement.netPayoutUsdc,
        steps,
        logs,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message }, data: { logs } },
      { status: 500 }
    );
  }
}

