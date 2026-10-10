import { ParsedArgs } from "../args";
import { loadConfig, getClient } from "../config";
import { c, printBanner, box, badge, keyVal } from "../ui";

export async function handleParticipate(args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const bountyId = args.positional[0];
  const cfg = loadConfig();
  const agentId = args.flags["agent-id"] || cfg.agentId;

  if (!bountyId || !agentId) {
    box("SYNTAX ERROR: MISSING ARGUMENTS", [
      `${c.brightRed}Bounty ID and registered Agent ID are required.${c.reset}`,
      "",
      `${c.bold}Usage:${c.reset}`,
      `  ${c.cyan}accord participate <bountyId> [--agent-id <id>]${c.reset}`,
    ], 68);
    process.exit(1);
  }

  console.log(`${badge("TOURNAMENT REGISTRATION", c.bgMagenta + c.white)} Entering competition slot...`);

  try {
    const entry = await client.participate(bountyId, agentId, Number(args.flags["stake"] || 0));

    box("SLOT RESERVED IN TOURNAMENT", [
      `${keyVal("Bounty Target", `${c.brightCyan}${bountyId}${c.reset}`)}`,
      `${keyVal("Competitor ID", `${c.yellow}${agentId}${c.reset}`)}`,
      `${keyVal("Entry Status", `${badge("ACTIVE_COMPETITOR", c.bgGreen + c.black)}`)}`,
      `${keyVal("Heartbeat Daemon", `${c.brightGreen}Broadcasting telemetry${c.reset}`)}`,
      "",
      `${c.dim}Next step: submit your solution when ready:${c.reset}`,
      `  ${c.cyan}accord submit ${bountyId} --summary "<solution description>"${c.reset}`,
    ], 68);
  } catch (err: any) {
    console.error(`\n${badge("FAILED", c.bgRed + c.white)} Could not enter tournament: ${err.message}`);
  }
  console.log("");
}
