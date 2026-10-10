import { ParsedArgs } from "../args";
import { getClient } from "../config";
import { c, printBanner, box, badge, progressBar } from "../ui";

export async function handleDiscover(args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const query = args.flags["query"] || args.flags["q"];
  const minReward = args.flags["min-reward"] ? Number(args.flags["min-reward"]) : undefined;
  const status = (args.flags["status"] as any) || "OPEN";

  console.log(`${badge("MARKETPLACE SEARCH", c.bgBlue + c.brightWhite)} status=${c.cyan}${status}${c.reset} minReward=${c.yellow}$${minReward || 0} USDC${c.reset}`);
  console.log(`${c.dim}Connecting to Accord orderbook on Base Sepolia...${c.reset}\n`);

  try {
    const { bounties, total } = await client.discoverBounties({ query, minReward, status });

    if (bounties.length === 0) {
      box("QUERY RESULTS", [
        `${c.yellow}No active bounties matched your search criteria.${c.reset}`,
        "",
        `Try broadening your search or post one with:`,
        `  ${c.cyan}accord create --title <title> --reward <usdc>${c.reset}`,
      ], 68);
    } else {
      console.log(`${c.bold}Found ${c.brightGreen}${total}${c.reset}${c.bold} active tournaments:${c.reset}\n`);

      for (const b of bounties) {
        const statusBadge =
          b.status === "SETTLED"
            ? badge("SETTLED", c.bgGreen + c.black)
            : b.status === "COMPETING"
            ? badge("COMPETING", c.bgMagenta + c.white)
            : badge("OPEN", c.bgYellow + c.black);

        const slots = progressBar(b.competitorCount || 0, b.maxParticipants || 10, 10);

        box(`BOUNTY: ${b.id}`, [
          `${c.bold}${c.brightWhite}${b.title}${c.reset}`,
          "",
          `${c.dim}Reward Pool:${c.reset}   ${c.brightGreen}$${Number(b.rewardUsdc).toFixed(2)} USDC${c.reset} ${c.dim}(Escrow Locked)${c.reset}`,
          `${c.dim}Lifecycle:${c.reset}     ${statusBadge}  ${c.dim}Mode:${c.reset} ${c.cyan}${b.competitionMode}${c.reset}`,
          `${c.dim}Agent Slots:${c.reset}   ${slots} ${c.dim}(${b.competitorCount || 0}/${b.maxParticipants || 10} filled)${c.reset}`,
          `${c.dim}Submissions:${c.reset}   ${c.white}${b.submissionCount || 0} solutions submitted${c.reset}`,
          "",
          `${c.dim}Join command:${c.reset}  ${c.cyan}accord participate ${b.id}${c.reset}`,
        ], 68);
        console.log("");
      }
    }
  } catch (err: any) {
    console.error(`\n${badge("ERROR", c.bgRed + c.white)} Discovery failed: ${err.message}\n`);
  }
}
