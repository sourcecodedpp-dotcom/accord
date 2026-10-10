export class AccordError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code: string, status = 400, details?: any) {
    super(message);
    this.name = "AccordError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AccordError {
  constructor(message = "Unauthorized: invalid or missing authentication token") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AccordError {
  constructor(message = "Forbidden: you do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AccordError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID '${id}' was not found`, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AccordError {
  constructor(message: string, code = "CONFLICT", details?: any) {
    super(message, code, 409, details);
  }
}

export class ValidationError extends AccordError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_FAILED", 422, details);
  }
}

export class InvalidStateTransitionError extends AccordError {
  constructor(bountyId: string, from: string, to: string) {
    super(
      `Cannot transition bounty '${bountyId}' from state '${from}' to '${to}'`,
      "INVALID_STATE_TRANSITION",
      409
    );
  }
}

export class BountyExpiredError extends AccordError {
  constructor(bountyId: string, deadline: Date) {
    super(
      `Bounty '${bountyId}' has expired on ${deadline.toISOString()}`,
      "BOUNTY_EXPIRED",
      400
    );
  }
}

export class DuplicateSubmissionError extends AccordError {
  constructor(bountyId: string, agentId: string) {
    super(
      `Agent '${agentId}' has already submitted an active solution for bounty '${bountyId}'`,
      "DUPLICATE_SUBMISSION",
      409
    );
  }
}

export class AlreadySettledError extends AccordError {
  constructor(bountyId: string) {
    super(
      `Bounty '${bountyId}' has already been settled and funds released`,
      "ALREADY_SETTLED",
      409
    );
  }
}

export class ParticipantLimitReachedError extends AccordError {
  constructor(bountyId: string, limit: number) {
    super(
      `Bounty '${bountyId}' has reached its maximum competitor limit of ${limit} agents`,
      "PARTICIPANT_LIMIT_REACHED",
      409
    );
  }
}

export class RegistrationClosedError extends AccordError {
  constructor(bountyId: string, deadline?: Date) {
    super(
      `Registration for bounty '${bountyId}' is closed (deadline has passed${deadline ? `: ${deadline.toISOString()}` : ""})`,
      "REGISTRATION_CLOSED",
      400
    );
  }
}

export class SubmissionsLockedError extends AccordError {
  constructor(bountyId: string) {
    super(
      `Submissions for bounty '${bountyId}' are locked. The tournament competition window has ended.`,
      "SUBMISSIONS_LOCKED",
      409
    );
  }
}

export class DuplicateParticipationError extends AccordError {
  constructor(bountyId: string, agentId: string) {
    super(
      `Agent '${agentId}' has already joined the competition for bounty '${bountyId}'`,
      "DUPLICATE_PARTICIPATION",
      409
    );
  }
}

export class EvaluationNotFinalizedError extends AccordError {
  constructor(bountyId: string, status: string) {
    super(
      `Cannot settle bounty '${bountyId}'. Status is '${status}'; evaluation must be RANKED before settlement.`,
      "EVALUATION_NOT_FINALIZED",
      409
    );
  }
}

export class ScoreImmutableError extends AccordError {
  constructor(bountyId: string) {
    super(
      `Evaluation and rankings for bounty '${bountyId}' are immutable and finalized. Scores cannot be modified.`,
      "SCORE_IMMUTABLE",
      409
    );
  }
}

export class BlockchainEscrowError extends AccordError {
  constructor(message: string, details?: any) {
    super(message, "BLOCKCHAIN_ESCROW_ERROR", 502, details);
  }
}
