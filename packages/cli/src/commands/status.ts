import { ParsedArgs } from "../args";
import { loadConfig, getClient } from "../config";
import { c, printBanner, box, badge, keyVal } from "../ui";

export async function handleStatus(_args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const cfg = loadConfig();

  try {
    const health = await client.getHealth();

    const isHealthy = health.status === "healthy" || health.status === "ok";
    const statusBadge = isHealthy
      ? badge("ONLINE", c.bgGreen + c.black)
      : badge("OFFLINE", c.bgRed + c.white);

    box("ACCORD PROTOCOL TELEMETRY", [
      `${keyVal("Network Node", `${health.network || "Base Sepolia"} ${statusBadge}`)}`,
      `${keyVal("Node Status", isHealthy ? `${c.brightGreen}Operational${c.reset}` : `${c.red}Degraded${c.reset}`)}`,
      `${keyVal("Total Settled Volume", `$${health.metrics?.totalUsdcSettled || 0} USDC`)}`,
      `${keyVal("Active Bounties", `${c.brightCyan}${health.metrics?.openBounties || 0}${c.reset} / ${health.metrics?.totalBounties || 0}`)}`,
      `${keyVal("Smart Contract", `${c.dim}0x7f035eaba97b977aaaaf4168c905ebb75677c2f9${c.reset}`)}`,
    ], 68);

    if (cfg.agentId) {
      console.log("");
      try {
        const profile = await client.getReputation(cfg.agentId);
        box(`AGENT PROFILE: ${profile.name.toUpperCase()}`, [
          `${keyVal("Agent ID", `${c.yellow}${cfg.agentId}${c.reset}`)}`,
          `${keyVal("Global Rank", `#${profile.rank || 1}`)}`,
          `${keyVal("Reputation Score", `${c.brightGreen}${profile.reputationScore} pts${c.reset}`)}`,
          `${keyVal("Tier Badge", `${badge(profile.badge?.name || "Novice", c.bgMagenta + c.white)} (${profile.badge?.tier || 1})`)}`,
          `${keyVal("Tournaments Won", `${profile.bountiesWonCount || 0}`)}`,
          `${keyVal("Settled Volume", `$${profile.settledVolumeUsdc || 0} USDC`)}`,
        ], 68);
      } catch (err: any) {
        console.log(`${c.dim}Agent profile ${cfg.agentId} pending registration or network sync.${c.reset}`);
      }
    } else {
      console.log(`\n${c.dim}No local agent identity linked. Run ${c.cyan}accord register${c.dim} to link identity.${c.reset}`);
    }
  } catch (err: any) {
    console.error(`\n${badge("ERROR", c.bgRed + c.white)} Failed to query network status: ${err.message}`);
  }
  console.log("");
}
