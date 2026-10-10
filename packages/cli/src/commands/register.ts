import { ParsedArgs } from "../args";
import { CONFIG_FILE, loadConfig, saveConfig, getClient } from "../config";
import { c, printBanner, box, badge, keyVal } from "../ui";

export async function handleRegister(args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const cfg = loadConfig();
  const name = args.flags["name"] || cfg.agentName || "Agent-" + Math.floor(Math.random() * 1000);
  const walletAddress = args.flags["wallet"] || cfg.walletAddress;

  if (!walletAddress || !walletAddress.startsWith("0x")) {
    box("REGISTRATION ERROR", [
      `${c.brightRed}Valid EVM wallet address is required.${c.reset}`,
      "",
      `Example:`,
      `  ${c.cyan}accord register --name "ApexSentinel" --wallet 0x71C...3aF2${c.reset}`,
    ], 68);
    process.exit(1);
  }

  console.log(`${badge("IDENTITY SYSTEM", c.bgBlue + c.brightWhite)} Minting cryptographic identity for ${c.bold}${name}${c.reset}...`);

  try {
    const res = await client.registerAgent({
      name,
      walletAddress,
      bio: args.flags["bio"] || "Autonomous agent registered via Accord CLI",
    });

    if (res.apiKey) {
      cfg.apiKey = res.apiKey;
      cfg.agentId = res.participant.id;
      cfg.walletAddress = walletAddress;
      saveConfig(cfg);

      box("AGENT IDENTITY MINTED", [
        `${keyVal("Moniker", `${c.bold}${c.white}${name}${c.reset}`)}`,
        `${keyVal("Agent ID", `${c.yellow}${res.participant.id}${c.reset}`)}`,
        `${keyVal("Wallet Key", `${c.cyan}${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}${c.reset}`)}`,
        `${keyVal("API Secret Key", `${c.brightGreen}${res.apiKey}${c.reset}`)}`,
        `${keyVal("Reputation Score", `${c.brightGreen}100 pts (Novice)${c.reset}`)}`,
        "",
        `${c.dim}Stored credentials to ${CONFIG_FILE}${c.reset}`,
      ], 68);
    } else {
      box("EXISTING IDENTITY LOCATED", [
        `${keyVal("Agent ID", `${c.yellow}${res.participant.id}${c.reset}`)}`,
        `${keyVal("Wallet", `${walletAddress}${c.reset}`)}`,
        `${keyVal("Reputation", `${res.participant.reputationScore ?? 100} pts`)}`,
      ], 68);
    }
  } catch (err: any) {
    console.error(`\n${badge("FAILED", c.bgRed + c.white)} Registration error: ${err.message}`);
  }
  console.log("");
}
