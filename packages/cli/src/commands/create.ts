import { ParsedArgs } from "../args";
import { loadConfig, getClient } from "../config";
import { c, printBanner, box, badge, keyVal } from "../ui";

export async function handleCreate(args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const cfg = loadConfig();
  const creatorId = args.flags["creator-id"] || args.flags["agent-id"] || cfg.agentId;
  const title = args.flags["title"] || args.positional[0];
  const reward = Number(args.flags["reward"] || args.flags["amount"] || 100);
  const desc =
    args.flags["desc"] ||
    args.flags["description"] ||
    `Automated bounty posted via Accord CLI: ${title}`;
  const mode = (args.flags["mode"] as any) || "TOURNAMENT";
  const maxParticipants = Number(args.flags["max-participants"] || 10);
  const minScore = Number(args.flags["min-score"] || 70);
  const criteriaArg = args.flags["criteria"] || args.flags["acceptance"];
  const acceptanceCriteria = criteriaArg
    ? criteriaArg.split(",").map((c: string) => c.trim()).filter(Boolean)
    : ["Deliver solution meeting all specified benchmark and correctness requirements"];

  if (!creatorId || !title) {
    box("SYNTAX ERROR: MISSING PARAMETERS", [
      `${c.brightRed}Missing required title or registered creator identity.${c.reset}`,
      "",
      `${c.bold}Usage:${c.reset}`,
      `  ${c.cyan}accord create --title <title> --reward <usdc> [options]${c.reset}`,
      "",
      `${c.dim}Options:${c.reset}`,
      `  --reward <number>         USDC escrow amount (default: 100)`,
      `  --mode <mode>             TOURNAMENT | RACE_TO_FIRST_VALID`,
      `  --criteria <c1,c2>        Comma-separated acceptance tests`,
      `  --desc <description>      Specification details`,
    ], 68);
    process.exit(1);
  }

  console.log(`${badge("TRANSACTION SUBMITTED", c.bgYellow + c.black)} Locking ${c.bold}$${reward} USDC${c.reset} in AccordEscrow.sol...`);

  try {
    const res = await client.createBounty({
      title,
      description: desc.length < 20 ? `${desc} - specifications provided via Accord CLI.` : desc,
      acceptanceCriteria,
      rewardUsdc: reward,
      creatorId,
      competitionMode: mode,
      maxParticipants,
      minPassingScore: minScore,
    });

    box("BOUNTY ESCROW CONFIRMED ON-CHAIN", [
      `${keyVal("Bounty ID", `${c.brightCyan}${res.bounty.id}${c.reset}`)}`,
      `${keyVal("Title", `${c.bold}${res.bounty.title}${c.reset}`)}`,
      `${keyVal("Escrow Lock", `${c.brightGreen}$${res.bounty.rewardUsdc}.00 USDC${c.reset}`)}`,
      `${keyVal("Competition Mode", `${c.magenta}${res.bounty.competitionMode}${c.reset}`)}`,
      `${keyVal("Max Competitors", `${res.bounty.maxParticipants || 10} agents`)}`,
      `${keyVal("Escrow State", `${badge("HELD_IN_ESCROW", c.bgGreen + c.black)}`)}`,
      `${keyVal("Chain Verification", `${c.dim}Base Sepolia (84532)${c.reset}`)}`,
      "",
      `${c.dim}Shareable link:${c.reset} ${c.underline}http://localhost:3000/bounties/${res.bounty.id}${c.reset}`,
    ], 68);
  } catch (err: any) {
    console.error(`\n${badge("FAILED", c.bgRed + c.white)} Failed to post bounty: ${err.message}`);
  }
  console.log("");
}
