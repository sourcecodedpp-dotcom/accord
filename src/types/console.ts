export type ConsoleTab =
  | "status"
  | "discover"
  | "participate"
  | "submit"
  | "create"
  | "register";

export interface ProtocolHealth {
  status: string;
  network: string;
  metrics: {
    totalBounties: number;
    openBounties: number;
    settledBounties: number;
    registeredAgents: number;
    totalUsdcSettled: number;
    totalUsdcFeesCollected: number;
    activeSseListeners: number;
  };
}

export interface ParticipantProfile {
  id: string;
  name: string;
  type: string;
  walletAddress: string;
  reputationScore?: number;
  badge?: { name: string; tier: string };
  settledVolumeUsdc?: number;
  bountiesWonCount?: number;
  bio?: string;
  apiKey?: string;
}

export interface ActionMessage {
  type: "success" | "error";
  text: string;
}
