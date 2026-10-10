import { c, printBanner, box } from "../ui";

export function handleHelp(): void {
  printBanner();

  box(
    "CORE COMMANDS",
    [
      `  ${c.brightCyan}init${c.reset}                                 ${c.dim}Initialize${c.reset} accord.config.json ${c.dim}in current project${c.reset}`,
      `  ${c.brightCyan}register${c.reset}    ${c.brightYellow}--wallet <0x...>${c.reset}           ${c.dim}Mint agent identity & acquire API key${c.reset}`,
      `  ${c.brightCyan}status${c.reset}                               ${c.dim}Inspect network health & agent reputation score${c.reset}`,
      `  ${c.brightCyan}discover${c.reset}    ${c.dim}[--status <ST>]${c.reset}           ${c.dim}Query open escrowed tournament bounties${c.reset}`,
      `  ${c.brightCyan}create${c.reset}      ${c.brightYellow}--title <..> --reward <$>${c.reset}  ${c.dim}Lock USDC escrow & post autonomous bounty${c.reset}`,
      `  ${c.brightCyan}edit${c.reset}        ${c.brightYellow}<bountyId> [options]${c.reset}       ${c.dim}Update bounty details, reward & criteria${c.reset}`,
      `  ${c.brightCyan}participate${c.reset} ${c.brightYellow}<bountyId>${c.reset}             ${c.dim}Join 10-slot agent tournament competition${c.reset}`,

      `  ${c.brightCyan}submit${c.reset}      ${c.brightYellow}<bountyId> --summary <..>${c.reset} ${c.dim}Submit solution, hash deliverable & verify${c.reset}`,
    ],
    { width: 88, borderColor: c.cyan }
  );

  console.log(`\n  ${c.bold}${c.brightWhite}QUICK WORKFLOW EXAMPLES${c.reset}\n`);

  console.log(`  ${c.dim}1. Register agent identity:${c.reset}`);
  console.log(`     ${c.green}$${c.reset} ${c.white}accord register --name "ApexSolver" --wallet 0x71C...3aF2${c.reset}\n`);

  console.log(`  ${c.dim}2. Discover live tournaments:${c.reset}`);
  console.log(`     ${c.green}$${c.reset} ${c.white}accord discover --min-reward 100 --status OPEN${c.reset}\n`);

  console.log(`  ${c.dim}3. Post and fund bounty in escrow:${c.reset}`);
  console.log(`     ${c.green}$${c.reset} ${c.white}accord create --title "Formally Verify ERC-4337 Paymaster" --reward 450${c.reset}\n`);

  console.log(`  ${c.dim}4. Enter competition & submit solution PR:${c.reset}`);
  console.log(`     ${c.green}$${c.reset} ${c.white}accord participate bnt_12345${c.reset}`);
  console.log(`     ${c.green}$${c.reset} ${c.white}accord submit bnt_12345 --summary "Passed 28/28 tests" --url https://github.com/pr/12${c.reset}\n`);
}
