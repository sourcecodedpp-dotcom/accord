import { z } from "zod";

// Participant Types
export const ParticipantTypeEnum = z.enum(["AI_AGENT", "HUMAN_PRINCIPAL", "AUTONOMOUS_DAO"]);
export type ParticipantType = z.infer<typeof ParticipantTypeEnum>;

export const RegisterParticipantSchema = z.object({
  id: z.string().min(3).max(64).optional(),
  type: ParticipantTypeEnum,
  name: z.string().min(2).max(100),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address (must be 0x followed by 40 hex chars)"),
  endpointUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});
export type RegisterParticipantInput = z.infer<typeof RegisterParticipantSchema>;

// Auth Request Schemas
export const RequestNonceSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
});
export type RequestNonceInput = z.infer<typeof RequestNonceSchema>;

export const LoginWithSignatureSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  signature: z.string().min(10, "Invalid signature format"),
});
export type LoginWithSignatureInput = z.infer<typeof LoginWithSignatureSchema>;

// Bounty Types
export const BountyStatusEnum = z.enum([
  "OPEN",
  "IN_COMPETITION",
  "COMPETING",
  "SUBMISSIONS_LOCKED",
  "EVALUATING",
  "RANKED",
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
  "TOURNAMENT",
]);
export type CompetitionMode = z.infer<typeof CompetitionModeEnum>;

export const EvaluationWeightsSchema = z.object({
  correctness: z.number().min(0).max(1).default(0.4),
  completeness: z.number().min(0).max(1).default(0.3),
  securityAndRobustness: z.number().min(0).max(1).default(0.15),
  performanceAndEfficiency: z.number().min(0).max(1).default(0.15),
});
export type EvaluationWeights = z.infer<typeof EvaluationWeightsSchema>;

export interface TournamentRankingEntry {
  rank: number;
  agentId: string;
  agentName: string;
  walletAddress: string;
  submissionId: string;
  score: number;
  verdict: "PASS" | "FAIL";
  disqualified: boolean;
  disqualificationReason?: string;
  submittedAt: string | Date;
  breakdown?: any;
  tieBreakerApplied?: string;
}

export const EscrowStatusEnum = z.enum([
  "PENDING_DEPOSIT",
  "HELD_IN_ESCROW",
  "RELEASED",
  "REFUNDED",
]);
export type EscrowStatus = z.infer<typeof EscrowStatusEnum>;

export const CreateBountySchema = z.object({
  id: z.string().min(3).max(64).optional(),
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(10000),
  acceptanceCriteria: z
    .array(z.string().min(5).max(500))
    .min(1, "At least one verifiable acceptance criterion is required"),
  rewardUsdc: z.number().positive("Reward must be greater than 0 USDC"),
  creatorId: z.string().min(3),
  competitionMode: CompetitionModeEnum.optional().default("RACE_TO_FIRST_VALID"),
  deadlineHours: z.number().positive().max(720).optional().default(24),
  maxCompetitors: z.number().int().positive().optional(),
  maxParticipants: z.number().int().positive().optional().default(10),
  competitionStartsAt: z.coerce.date().optional(),
  registrationDeadline: z.coerce.date().optional(),
  submissionDeadline: z.coerce.date().optional(),
  minPassingScore: z.number().min(0).max(100).optional().default(70.0),
  evaluationWeights: EvaluationWeightsSchema.optional(),
  minReputationRequired: z.number().min(0).optional().default(0),
  metadata: z.record(z.string(), z.any()).optional(),
  escrowTxHash: z.string().optional(),
});
export type CreateBountyInput = z.input<typeof CreateBountySchema>;

export const BountyQuerySchema = z.object({
  status: BountyStatusEnum.optional(),
  minReward: z.coerce.number().positive().optional(),
  creatorId: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type BountyQueryInput = z.infer<typeof BountyQuerySchema>;

// Competition Entry
export const JoinCompetitionSchema = z.object({
  agentId: z.string().min(3),
  stakeUsdc: z.number().min(0).default(0),
});
export type JoinCompetitionInput = z.input<typeof JoinCompetitionSchema>;

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
  agentId: z.string().min(3),
  deliverableType: DeliverableTypeEnum,
  deliverableUrl: z.string().url("Must be a valid deliverable URL"),
  contentHash: z.string().regex(/^[a-fA-F0-9]{64}$/, "Must be a 64-character SHA-256 hash").optional(),
  accordSignature: z.string().optional(),
  summary: z.string().min(10).max(5000),
  executionTrace: z.string().max(50000).optional(),
  autoVerify: z.boolean().optional().default(true),
});
export type CreateSubmissionInput = z.input<typeof CreateSubmissionSchema>;

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

export const TriggerVerificationSchema = z.object({
  submissionId: z.string().min(3),
  verifierAgentId: z.string().optional(),
  verifierType: VerifierTypeEnum.optional(),
});
export type TriggerVerificationInput = z.infer<typeof TriggerVerificationSchema>;

// Settlement Types
export const SettleBountySchema = z.object({
  submissionId: z.string().min(3),
  customFeePercentage: z.number().min(0).max(10).optional().default(2.5),
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
