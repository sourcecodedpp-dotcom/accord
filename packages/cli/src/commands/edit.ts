import { ParsedArgs } from "../args";
import { getClient } from "../config";
import { c, printBanner, box, badge, keyVal } from "../ui";

export async function handleEdit(args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const bountyId = args.positional[0] || args.flags["id"] || args.flags["bounty-id"];

  if (!bountyId) {
    box("SYNTAX ERROR: MISSING BOUNTY ID", [
      `${c.brightRed}Missing target bounty ID to edit.${c.reset}`,
      "",
      `${c.bold}Usage:${c.reset}`,
      `  ${c.cyan}accord edit <bountyId> [options]${c.reset}`,
      "",
      `${c.dim}Options:${c.reset}`,
      `  --title <title>           Update bounty title`,
      `  --desc <description>      Update specification description`,
      `  --reward <number>         Update reward amount (USDC)`,
      `  --criteria <c1,c2>        Comma-separated acceptance criteria`,
      `  --min-score <number>      Update minimum passing score`,
    ], 68);
    process.exit(1);
  }

  const updates: Record<string, any> = {};
  if (args.flags["title"]) updates.title = args.flags["title"];
  if (args.flags["desc"] || args.flags["description"]) {
    updates.description = args.flags["desc"] || args.flags["description"];
  }
  if (args.flags["reward"] || args.flags["amount"]) {
    updates.rewardUsdc = Number(args.flags["reward"] || args.flags["amount"]);
  }
  if (args.flags["min-score"]) {
    updates.minPassingScore = Number(args.flags["min-score"]);
  }
  const criteriaArg = args.flags["criteria"] || args.flags["acceptance"];
  if (criteriaArg) {
    updates.acceptanceCriteria = criteriaArg.split(",").map((c: string) => c.trim()).filter(Boolean);
  }

  if (Object.keys(updates).length === 0) {
    console.log(`${badge("NO CHANGES", c.bgYellow + c.black)} No update flags provided. Specify --title, --desc, --reward, or --criteria.`);
    return;
  }

  console.log(`${badge("UPDATING BOUNTY", c.bgCyan + c.black)} Applying updates to ${c.bold}${bountyId}${c.reset}...`);

  try {
    const updated = await client.updateBounty(bountyId, updates);

    box("BOUNTY UPDATED SUCCESSFULLY", [
      `${keyVal("Bounty ID", `${c.brightCyan}${updated.id}${c.reset}`)}`,
      `${keyVal("Title", `${c.bold}${updated.title}${c.reset}`)}`,
      `${keyVal("Escrow Reward", `${c.brightGreen}$${updated.rewardUsdc}.00 USDC${c.reset}`)}`,
      `${keyVal("Status", `${c.magenta}${updated.status}${c.reset}`)}`,
      `${keyVal("Min Score", `${updated.minPassingScore || 70} pts`)}`,
      `${keyVal("Criteria Count", `${(updated.acceptanceCriteria || []).length} conditions`)}`,
      "",
      `${c.dim}Shareable link:${c.reset} ${c.underline}http://localhost:3000/bounties/${updated.id}${c.reset}`,
    ], 68);
  } catch (err: any) {
    console.error(`\n${badge("FAILED", c.bgRed + c.white)} Failed to edit bounty: ${err.message}`);
  }
  console.log("");
}
