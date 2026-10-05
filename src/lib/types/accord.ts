import { z } from "zod";

// Participant Types
export const ParticipantTypeEnum = z.enum(["AI_AGENT", "HUMAN_PRINCIPAL", "AUTONOMOUS_DAO"]);
export type ParticipantType = z.infer<typeof ParticipantTypeEnum>;

export const RegisterParticipantSchema = z.object({
  id: z.string().min(3).optional(),
  type: ParticipantTypeEnum,
  name: z.string().min(2),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  publicKey: z.string().optional(),
  endpointUrl: z.string().url().optional(),
  bio: z.string().optional(),
});
export type RegisterParticipantInput = z.infer<typeof RegisterParticipantSchema>;

// Bounty Types
export const BountyStatusEnum = z.enum([
  "OPEN",
  "IN_COMPETITION",
  "EVALUATING",
  "SETTLING",
  "SETTLED",
  "EXPIRED",
  "CANCELLED",
]);
export type BountyStatus = z.infer<typeof BountyStatusEnum>;

export const CompetitionModeEnum = z.enum([
  "RACE_TO_FIRST_VALID",
  "BEST_SCORE_DEADLINE",
  "CONSENSUS_MULTI_AGENT",
]);
export type CompetitionMode = z.infer<typeof CompetitionModeEnum>;

export const EscrowStatusEnum = z.enum([
  "PENDING_DEPOSIT",
  "HELD_IN_ESCROW",
  "RELEASED",
  "REFUNDED",
]);
export type EscrowStatus = z.infer<typeof EscrowStatusEnum>;

export const CreateBountySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5),
  description: z.string().min(20),
  acceptanceCriteria: z.array(z.string().min(5)),
  rewardUsdc: z.number().positive(),
  creatorId: z.string(),
  competitionMode: CompetitionModeEnum.default("RACE_TO_FIRST_VALID"),
  deadlineHours: z.number().positive().default(24),
  maxCompetitors: z.number().int().positive().optional(),
  minReputationRequired: z.number().min(0).default(0),
  metadata: z.record(z.string(), z.any()).optional(),
  escrowTxHash: z.string().optional(),
});
export type CreateBountyInput = z.infer<typeof CreateBountySchema>;

// Competition Entry
export const JoinCompetitionSchema = z.object({
  agentId: z.string(),
  stakeUsdc: z.number().min(0).default(0),
});
export type JoinCompetitionInput = z.infer<typeof JoinCompetitionSchema>;

// Submission Types
export const DeliverableTypeEnum = z.enum([
  "CODE_PR",
  "DATA_ARTIFACT",
  "RESEARCH_REPORT",
  "API_ENDPOINT",
  "SMART_CONTRACT",
]);
export type DeliverableType = z.infer<typeof DeliverableTypeEnum>;

export const CreateSubmissionSchema = z.object({
  agentId: z.string(),
  deliverableType: DeliverableTypeEnum,
  deliverableUrl: z.string().url(),
  contentHash: z.string().regex(/^[a-fA-F0-9]{64}$/, "Must be 64-character SHA-256 hash"),
  agentSignature: z.string().optional(),
  summary: z.string().min(10),
  executionTrace: z.string().optional(),
  codeContent: z.string().optional(), // Raw payload or solution artifact if supplied directly
});
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

// Verification Types
export const VerifierTypeEnum = z.enum([
  "LLM_RUBRIC_EVALUATOR",
  "DETERMINISTIC_SANDBOX",
  "MULTI_AGENT_CONSENSUS",
]);
export type VerifierType = z.infer<typeof VerifierTypeEnum>;

export const VerificationVerdictEnum = z.enum([
  "PASS",
  "FAIL",
  "REQUIRES_HUMAN_INTERVENTION",
]);
export type VerificationVerdict = z.infer<typeof VerificationVerdictEnum>;

export interface RubricEvaluationBreakdown {
  correctness: number; // 0-100
  completeness: number; // 0-100
  securityAndRobustness: number; // 0-100
  performanceAndEfficiency: number; // 0-100
  criteriaValidation: Array<{
    criterion: string;
    satisfied: boolean;
    evidence: string;
  }>;
}

export interface VerificationResult {
  score: number; // 0.0 - 100.0
  verdict: VerificationVerdict;
  rubricBreakdown: RubricEvaluationBreakdown;
  reasoning: string;
  verifierType: VerifierType;
  verifiedAt: Date;
}

// Settlement Types
export const SettleBountySchema = z.object({
  submissionId: z.string(),
  customFeePercentage: z.number().min(0).max(10).optional().default(2.5), // Polis protocol fee (2.5%)
});
export type SettleBountyInput = z.infer<typeof SettleBountySchema>;

// Protocol Event Types (Live SSE)
export type ProtocolEventType =
  | "bounty.created"
  | "bounty.status_changed"
  | "agent.registered"
  | "agent.joined_competition"
  | "agent.heartbeat"
  | "submission.received"
  | "verification.started"
  | "verification.completed"
  | "bounty.settled"
  | "reputation.updated";

export interface ProtocolEvent<T = any> {
  id: string;
  type: ProtocolEventType;
  timestamp: string;
  payload: T;
}
