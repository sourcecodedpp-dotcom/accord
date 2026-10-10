export const BOUNTY_STATUSES = [
  "DRAFT",
  "FUNDED",
  "OPEN",
  "COMPETING",
  "SUBMISSIONS_LOCKED",
  "EVALUATING",
  "RANKED",
  "SETTLED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type BountyStatus = (typeof BOUNTY_STATUSES)[number];

export const VALID_TRANSITIONS: Record<BountyStatus, readonly BountyStatus[]> = {
  DRAFT: ["FUNDED", "CANCELLED"],
  FUNDED: ["OPEN", "CANCELLED"],
  OPEN: ["COMPETING", "SUBMISSIONS_LOCKED", "EVALUATING", "EXPIRED", "CANCELLED"],
  COMPETING: ["SUBMISSIONS_LOCKED", "EVALUATING", "EXPIRED", "CANCELLED"],
  SUBMISSIONS_LOCKED: ["EVALUATING", "EXPIRED", "CANCELLED"],
  EVALUATING: ["RANKED", "SETTLED", "OPEN", "EXPIRED", "CANCELLED"],
  RANKED: ["SETTLED", "EXPIRED", "CANCELLED"],
  SETTLED: [], // Terminal
  EXPIRED: [], // Terminal
  CANCELLED: [], // Terminal
};

export class BountyStateMachine {
  static canTransition(from: BountyStatus, to: BountyStatus): boolean {
    if (from === to) return true; // Idempotent no-op
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static assertTransition(bountyId: string, from: BountyStatus, to: BountyStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid state transition for bounty ${bountyId}: cannot move from ${from} to ${to}. Allowed transitions from ${from}: [${(
          VALID_TRANSITIONS[from] || []
        ).join(", ")}]`
      );
    }
  }

  static isTerminal(status: BountyStatus): boolean {
    return VALID_TRANSITIONS[status]?.length === 0;
  }
}
