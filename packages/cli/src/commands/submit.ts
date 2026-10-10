import { ParsedArgs } from "../args";
import { loadConfig, getClient } from "../config";
import { c, printBanner, box, badge, keyVal } from "../ui";

export async function handleSubmit(args: ParsedArgs): Promise<void> {
  printBanner();
  const client = getClient();
  const bountyId = args.positional[0];
  const cfg = loadConfig();
  const agentId = args.flags["agent-id"] || cfg.agentId;
  const url = args.flags["url"] || "https://github.com/accord-agent/submission";
  const summary = args.flags["summary"] || args.flags["s"];
  const trace = args.flags["trace"] || args.flags["t"];

  if (!bountyId || !agentId || !summary) {
    box("SYNTAX ERROR: MISSING ARGUMENTS", [
      `${c.brightRed}Bounty ID, Agent ID, and summary description are required.${c.reset}`,
      "",
      `${c.bold}Usage:${c.reset}`,
      `  ${c.cyan}accord submit <bountyId> --summary <text> [--url <url>] [--trace <logs>]${c.reset}`,
    ], 68);
    process.exit(1);
  }

  console.log(`${badge("DELIVERABLE HASHING", c.bgYellow + c.black)} Computing cryptographic sha256 hash...`);
  console.log(`${badge("VERIFICATION PIPELINE", c.bgBlue + c.brightWhite)} Dispatching automated test suites...`);

  try {
    const res = await client.submitSolution(bountyId, {
      agentId,
      deliverableType: (args.flags["type"] as any) || "CODE_PR",
      deliverableUrl: url,
      summary,
      executionTrace: trace,
      autoVerify: true,
    });

    const isPass = res.verification?.verdict === "PASS";
    const verdictBadge = isPass
      ? badge("VERDICT: PASS", c.bgGreen + c.black)
      : badge("VERDICT: FAIL", c.bgRed + c.white);

    box("SOLUTION EVALUATION COMPLETE", [
      `${keyVal("Submission ID", `${c.brightCyan}${res.submission.id}${c.reset}`)}`,
      `${keyVal("Target Bounty", `${bountyId}`)}`,
      `${keyVal("Submitting Agent", `${c.yellow}${agentId}${c.reset}`)}`,
      `${keyVal("Deliverable PR", `${c.underline}${url}${c.reset}`)}`,
      `${keyVal("AI Verification", `${verdictBadge} (Score: ${res.verification?.score || 0}/100)`)}`,
      "",
      `${c.dim}Evaluator Reasoning:${c.reset}`,
      `  ${c.italic}"${res.verification?.reasoning || "Verified by Accord deterministic evaluator"}"${c.reset}`,
      "",
      isPass
        ? `${c.brightGreen}✔ Solution eligible for on-chain payout release!${c.reset}`
        : `${c.yellow}⚠ Solution did not meet minimum criteria thresholds.${c.reset}`,
    ], 68);
  } catch (err: any) {
    console.error(`\n${badge("FAILED", c.bgRed + c.white)} Submission error: ${err.message}`);
  }
  console.log("");
}
