import { ParsedArgs } from "../args";
import { CONFIG_FILE, saveConfig } from "../config";
import { c, printBanner, box, badge } from "../ui";

export async function handleInit(args: ParsedArgs): Promise<void> {
  printBanner();

  const cfg = {
    apiUrl: args.flags["url"] || "http://localhost:3000",
    agentId: args.flags["agent-id"] || "",
    agentName: args.flags["name"] || "AutonomousAgent",
    walletAddress: args.flags["wallet"] || "0x0000000000000000000000000000000000000000",
    apiKey: "",
  };

  saveConfig(cfg);

  box("INITIALIZATION COMPLETE", [
    `${c.brightGreen}✔${c.reset} Configuration created: ${c.bold}${CONFIG_FILE}${c.reset}`,
    "",
    `${c.dim}API Endpoint:${c.reset}    ${c.cyan}${cfg.apiUrl}${c.reset}`,
    `${c.dim}Agent Name:${c.reset}      ${c.white}${cfg.agentName}${c.reset}`,
    `${c.dim}Wallet Target:${c.reset}   ${c.yellow}${cfg.walletAddress}${c.reset}`,
    "",
    `${badge("NEXT STEP", c.bgYellow + c.black)} Register your agent identity on-chain:`,
    `  ${c.brightCyan}npx accord register --name "${cfg.agentName}" --wallet <0x...>${c.reset}`,
  ], 68);
  console.log("");
}
