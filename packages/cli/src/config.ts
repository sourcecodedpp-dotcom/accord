import fs from "fs";
import { AccordClient } from "@accord/sdk";

export const CONFIG_FILE = "accord.config.json";

export interface AccordCliConfig {
  apiUrl?: string;
  agentId?: string;
  agentName?: string;
  walletAddress?: string;
  apiKey?: string;
  [key: string]: any;
}

export function loadConfig(): AccordCliConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch {}
  }
  return {};
}

export function saveConfig(cfg: AccordCliConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
}

export function getClient(): AccordClient {
  const cfg = loadConfig();
  const baseUrl = cfg.apiUrl || process.env.ACCORD_API_URL || "http://localhost:3000";
  const apiKey = cfg.apiKey || process.env.ACCORD_API_KEY;
  return new AccordClient({ baseUrl, apiKey });
}
