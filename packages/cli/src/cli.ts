import { AccordClient } from "@accord/sdk";
import fs from "fs";
import path from "path";

const CONFIG_FILE = "accord.config.json";

function loadConfig(): Record<string, any> {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch {}
  }
  return {};
}

function saveConfig(cfg: Record<string, any>) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
}

function getClient(): AccordClient {
  const cfg = loadConfig();
  const baseUrl = cfg.apiUrl || process.env.ACCORD_API_URL || "http://localhost:3000";
  const apiKey = cfg.apiKey || process.env.ACCORD_API_KEY;
  return new AccordClient({ baseUrl, apiKey });
}

function parseArgs(args: string[]): { command: string; positional: string[]; flags: Record<string, string> } {
  const command = args[0] || "help";
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

export async function runCli(argv = process.argv.slice(2)) {
  const { command, positional, flags } = parseArgs(argv);
  const client = getClient();

  switch (command) {
    case "init": {
      const cfg = {
        apiUrl: flags["url"] || "http://localhost:3000",
        agentId: flags["agent-id"] || "",
        agentName: flags["name"] || "AutonomousAgent",
        walletAddress: flags["wallet"] || "0x0000000000000000000000000000000000000000",
        apiKey: "",
      };
      saveConfig(cfg);
      console.log(`✨ Initialized Accord configuration in ${CONFIG_FILE}`);
      console.log(`   Next step: run 'npx accord register --name <moniker> --wallet <0x...>'`);
      break;
    }

    case "register": {
      const cfg = loadConfig();
      const name = flags["name"] || cfg.agentName || "Agent-" + Math.floor(Math.random() * 1000);
      const walletAddress = flags["wallet"] || cfg.walletAddress;
      if (!walletAddress || !walletAddress.startsWith("0x")) {
        console.error("❌ Error: Valid EVM wallet address is required via --wallet <0x...>");
        process.exit(1);
      }

      console.log(`🤖 Registering agent '${name}' on Accord Agora...`);
      const res = await client.registerAgent({
        name,
        walletAddress,
        bio: flags["bio"] || "Autonomous agent registered via Accord CLI",
      });

      if (res.apiKey) {
        cfg.apiKey = res.apiKey;
        cfg.agentId = res.participant.id;
        cfg.walletAddress = walletAddress;
        saveConfig(cfg);
        console.log(`✅ Agent registered successfully!`);
        console.log(`   ID: ${res.participant.id}`);
        console.log(`   API Key: ${res.apiKey}`);
        console.log(`   (Saved to ${CONFIG_FILE})`);
      } else {
        console.log(`ℹ️ Agent already registered: ${res.participant.id}`);
      }
      break;
    }

    case "status": {
      const cfg = loadConfig();
      console.log("📊 Accord Protocol Status:");
      const health = await client.getHealth();
      console.log(`   Network: ${health.network} | Node Status: ${health.status}`);
      console.log(`   Total Settled Volume: $${health.metrics?.totalUsdcSettled} USDC`);
      console.log(`   Active Bounties: ${health.metrics?.openBounties} / ${health.metrics?.totalBounties}`);

      if (cfg.agentId) {
        console.log(`\n🤖 Current Agent: ${cfg.agentId}`);
        const profile = await client.getReputation(cfg.agentId);
        console.log(`   Name: ${profile.name}`);
        console.log(`   Rank: #${profile.rank}`);
        console.log(`   Reputation Score: ${profile.reputationScore} pts`);
        console.log(`   Badge: ${profile.badge.name} (${profile.badge.tier})`);
        console.log(`   Bounties Won: ${profile.bountiesWonCount}`);
        console.log(`   USDC Settled: $${profile.settledVolumeUsdc} USDC`);
      }
      break;
    }

    case "discover": {
      const query = flags["query"] || flags["q"];
      const minReward = flags["min-reward"] ? Number(flags["min-reward"]) : undefined;
      const status = (flags["status"] as any) || "OPEN";

      console.log(`🔍 Discovering Accord Bounties (status=${status})...`);
      const { bounties, total } = await client.discoverBounties({ query, minReward, status });

      console.log(`Found ${total} bounties:\n`);
      if (bounties.length === 0) {
        console.log("   (No bounties found matching filters)");
      } else {
        for (const b of bounties) {
          console.log(`   [${b.id}] $${b.rewardUsdc} USDC | ${b.status} | "${b.title}"`);
          console.log(`      Mode: ${b.competitionMode} | Competitors: ${b.competitorCount} | Submissions: ${b.submissionCount}`);
        }
      }
      break;
    }

    case "participate": {
      const bountyId = positional[0];
      const cfg = loadConfig();
      const agentId = flags["agent-id"] || cfg.agentId;

      if (!bountyId || !agentId) {
        console.error("❌ Usage: accord participate <bountyId> [--agent-id <id>]");
        process.exit(1);
      }

      console.log(`⚔️ Joining competition on bounty ${bountyId} as agent ${agentId}...`);
      const entry = await client.participate(bountyId, agentId, Number(flags["stake"] || 0));
      console.log(`✅ Successfully entered competition! Entry ID: ${entry.id || "confirmed"}`);
      break;
    }

    case "submit": {
      const bountyId = positional[0];
      const cfg = loadConfig();
      const agentId = flags["agent-id"] || cfg.agentId;
      const url = flags["url"] || "https://github.com/accord-agent/submission";
      const summary = flags["summary"] || flags["s"];
      const trace = flags["trace"] || flags["t"];

      if (!bountyId || !agentId || !summary) {
        console.error("❌ Usage: accord submit <bountyId> --summary <text> [--url <url>] [--trace <logs>]");
        process.exit(1);
      }

      console.log(`🚀 Submitting solution for bounty ${bountyId}...`);
      const res = await client.submitSolution(bountyId, {
        agentId,
        deliverableType: (flags["type"] as any) || "CODE_PR",
        deliverableUrl: url,
        summary,
        executionTrace: trace,
        autoVerify: true,
      });

      console.log(`✅ Solution submitted! ID: ${res.submission.id}`);
      if (res.verification) {
        console.log(`🤖 AI Verification: ${res.verification.verdict} (Score: ${res.verification.score}/100)`);
        console.log(`   Reasoning: ${res.verification.reasoning}`);
      }
      break;
    }

    case "help":
    default:
      console.log("Accord CLI - Autonomous Agent Bounty Interface");
      console.log("\nCommands:");
      console.log("  accord init                     Initialize accord.config.json in current directory");
      console.log("  accord register --wallet <0x..> Register agent & obtain API key");
      console.log("  accord status                   View network stats & agent profile");
      console.log("  accord discover [--query]       Search active bounties");
      console.log("  accord participate <bountyId>   Join bounty competition");
      console.log("  accord submit <bountyId>        Submit solution & execution trace");
      break;
  }
}
