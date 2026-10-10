import { z } from "zod";
import { BOUNTY_STATUSES, BountyStatus } from "./state-machine";

export { BOUNTY_STATUSES };
export type { BountyStatus };

export const ParticipantTypeEnum = z.enum(["AI_AGENT", "HUMAN_PRINCIPAL", "AUTONOMOUS_DAO"]);
export type ParticipantType = z.infer<typeof ParticipantTypeEnum>;

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
  breakdown?: RubricEvaluationBreakdown;
  tieBreakerApplied?: string;
}

export const DeliverableTypeEnum = z.enum([
  "CODE_PR",
  "DATA_ARTIFACT",
  "RESEARCH_REPORT",
  "API_ENDPOINT",
  "SMART_CONTRACT",
]);
export type DeliverableType = z.infer<typeof DeliverableTypeEnum>;

export const VerifierTypeEnum = z.enum([
  "DETERMINISTIC_SANDBOX",
  "LLM_RUBRIC_EVALUATOR",
  "MULTI_AGENT_CONSENSUS",
]);
export type VerifierType = z.infer<typeof VerifierTypeEnum>;

export const VerificationVerdictEnum = z.enum([
  "PASS",
  "FAIL",
  "REQUIRES_HUMAN_INTERVENTION",
]);
export type VerificationVerdict = z.infer<typeof VerificationVerdictEnum>;

// Framework-Neutral Agent Capabilities
export const AgentCapabilitySchema = z.object({
  domain: z.string(),
  skills: z.array(z.string()),
  framework: z.string().optional().default("custom"),
  version: z.string().optional().default("1.0.0"),
  maxConcurrentBounties: z.number().int().positive().optional().default(3),
});
export type AgentCapability = z.input<typeof AgentCapabilitySchema>;

// Agent Registration
export const RegisterAgentSchema = z.object({
  id: z.string().min(3).max(64).optional(),
  name: z.string().min(2).max(100),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  endpointUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  capabilities: z.array(AgentCapabilitySchema).optional(),
});
export type RegisterAgentInput = z.input<typeof RegisterAgentSchema>;

// Participant Registration
export const RegisterParticipantSchema = z.object({
  id: z.string().min(3).max(64).optional(),
  type: ParticipantTypeEnum,
  name: z.string().min(2).max(100),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  endpointUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});
export type RegisterParticipantInput = z.input<typeof RegisterParticipantSchema>;

// Bounty Creation & Querying
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
  status: z.string().optional(),
  minReward: z.coerce.number().positive().optional(),
  creatorId: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type BountyQueryInput = z.input<typeof BountyQuerySchema>;

// Submission Types
export const CreateSubmissionSchema = z.object({
  agentId: z.string().min(3),
  deliverableType: DeliverableTypeEnum,
  deliverableUrl: z.string().url("Must be a valid deliverable URL"),
  contentHash: z.string().regex(/^[a-fA-F0-9]{64}$/, "Must be a 64-character SHA-256 hash"),
  accordSignature: z.string().optional(),
  summary: z.string().min(10).max(5000),
  executionTrace: z.string().max(50000).optional(),
  autoVerify: z.boolean().optional().default(true),
});
export type CreateSubmissionInput = z.input<typeof CreateSubmissionSchema>;

// Rubric and Criterion Types
export interface CriterionEvaluation {
  criterion: string;
  satisfied: boolean;
  score: number;
  evidence: string;
}

export interface RubricEvaluationBreakdown {
  correctness: number;
  completeness: number;
  securityAndRobustness: number;
  performanceAndEfficiency: number;
  criteriaValidation: CriterionEvaluation[];
}

export interface VerificationResult {
  score: number;
  verdict: VerificationVerdict;
  rubricBreakdown: RubricEvaluationBreakdown;
  reasoning: string;
  verifierType: VerifierType;
  providerMetadata?: {
    model?: string;
    provider?: string;
    temperature?: number;
    latencyMs?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  verifiedAt: Date;
}

export interface IAccordVerifier {
  name: string;
  version: string;
  evaluate(context: {
    bounty: {
      id: string;
      title: string;
      description: string;
      acceptanceCriteria: string[];
      rewardUsdc: number;
    };
    submission: {
      id: string;
      deliverableType: string;
      deliverableUrl: string;
      contentHash: string;
      summary: string;
      executionTrace?: string | null;
    };
  }): Promise<VerificationResult>;
}

export type ProtocolEventType =
  | "bounty.draft_created"
  | "bounty.funded"
  | "bounty.opened"
  | "bounty.evaluating"
  | "bounty.settled"
  | "bounty.expired"
  | "bounty.cancelled"
  | "agent.registered"
  | "agent.joined_competition"
  | "agent.heartbeat"
  | "submission.received"
  | "verification.started"
  | "verification.completed"
  | "reputation.updated";

export interface ProtocolEvent<T = any> {
  id: string;
  type: ProtocolEventType;
  timestamp: string;
  payload: T;
}
