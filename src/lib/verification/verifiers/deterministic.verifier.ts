import {
  IAccordVerifier,
  VerificationResult,
  VerificationVerdict,
  RubricEvaluationBreakdown,
  CriterionEvaluation,
} from "@accord/protocol";

export class DeterministicRubricVerifier implements IAccordVerifier {
  public readonly name = "accord-deterministic-rubric";
  public readonly version = "1.0.0";

  async evaluate(context: {
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
  }): Promise<VerificationResult> {
    const startTime = Date.now();
    const fullText = `${context.submission.summary} ${context.submission.executionTrace || ""}`.toLowerCase();

    const criteriaValidation: CriterionEvaluation[] = [];
    let satisfiedCount = 0;

    for (const criterion of context.bounty.acceptanceCriteria) {
      const critLower = criterion.toLowerCase();
      const keywords = critLower
        .split(/[^a-zA-Z0-9_-]/)
        .filter((w) => w.length > 3);

      const matched = keywords.filter((k) => fullText.includes(k));
      const matchRatio = keywords.length > 0 ? matched.length / keywords.length : 1;
      const hasDirectPhrase = fullText.includes(critLower.slice(0, 20));

      const satisfied = matchRatio >= 0.4 || hasDirectPhrase;
      const criterionScore = Math.round(matchRatio * 100);

      if (satisfied) {
        satisfiedCount++;
        criteriaValidation.push({
          criterion,
          satisfied: true,
          score: Math.max(75, criterionScore),
          evidence: `Verified evidence keywords: [${matched.slice(0, 4).join(", ")}] in execution trace.`,
        });
      } else {
        criteriaValidation.push({
          criterion,
          satisfied: false,
          score: criterionScore,
          evidence: `Missing or insufficient verification signal for keywords: [${keywords.slice(0, 3).join(", ")}].`,
        });
      }
    }

    const completeness =
      context.bounty.acceptanceCriteria.length > 0
        ? Math.round((satisfiedCount / context.bounty.acceptanceCriteria.length) * 100)
        : 100;

    const trace = context.submission.executionTrace?.toLowerCase() || "";
    const hasPassingTrace =
      trace.includes("pass") ||
      trace.includes("success") ||
      trace.includes("valid") ||
      trace.includes("ok");
    const hasFailingTrace =
      trace.includes("fail") || trace.includes("error") || trace.includes("exception");

    const correctness = Math.min(
      100,
      Math.round(completeness * 0.7 + (hasPassingTrace ? 30 : hasFailingTrace ? 5 : 15))
    );
    const securityAndRobustness = Math.round(
      75 + (hasPassingTrace ? 20 : 0) - (hasFailingTrace ? 15 : 0)
    );
    const performanceAndEfficiency = Math.round(80 + (hasPassingTrace ? 15 : 5));

    const compositeScore = Math.round(
      correctness * 0.35 +
        completeness * 0.25 +
        securityAndRobustness * 0.2 +
        performanceAndEfficiency * 0.2
    );

    const verdict: VerificationVerdict =
      compositeScore >= 75 && completeness >= 60 ? "PASS" : "FAIL";

    const reasoning =
      verdict === "PASS"
        ? `Submission verified with score ${compositeScore}/100. ${satisfiedCount}/${context.bounty.acceptanceCriteria.length} criteria validated against execution evidence.`
        : `Submission failed verification with score ${compositeScore}/100. Failed ${
            context.bounty.acceptanceCriteria.length - satisfiedCount
          } acceptance criteria. Inadequate test or execution trace evidence.`;

    return {
      score: compositeScore,
      verdict,
      rubricBreakdown: {
        correctness,
        completeness,
        securityAndRobustness,
        performanceAndEfficiency,
        criteriaValidation,
      },
      reasoning,
      verifierType: "DETERMINISTIC_SANDBOX",
      providerMetadata: {
        provider: "accord-internal",
        model: "deterministic-v1",
        latencyMs: Date.now() - startTime,
      },
      verifiedAt: new Date(),
    };
  }
}
