import {
  IAccordVerifier,
  VerificationResult,
  VerificationVerdict,
  RubricEvaluationBreakdown,
} from "@accord/protocol";

export class ConsensusVerifierAggregator implements IAccordVerifier {
  public readonly name = "accord-multi-agent-consensus";
  public readonly version = "1.0.0";
  private verifiers: IAccordVerifier[];

  constructor(verifiers: IAccordVerifier[]) {
    if (verifiers.length === 0) {
      throw new Error("Consensus aggregator requires at least one verifier");
    }
    this.verifiers = verifiers;
  }

  async evaluate(context: any): Promise<VerificationResult> {
    const results: VerificationResult[] = [];

    for (const verifier of this.verifiers) {
      try {
        const res = await verifier.evaluate(context);
        results.push(res);
      } catch (err) {
        console.error(`Verifier ${verifier.name} failed during consensus:`, err);
      }
    }

    if (results.length === 0) {
      throw new Error("All verifiers in consensus pool failed");
    }

    // Deterministic median / average score aggregation
    const scores = results.map((r) => r.score).sort((a, b) => a - b);
    const medianScore =
      scores.length % 2 === 0
        ? Math.round((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2)
        : scores[Math.floor(scores.length / 2)];

    const passCount = results.filter((r) => r.verdict === "PASS").length;
    const consensusVerdict: VerificationVerdict =
      passCount >= Math.ceil(results.length / 2) && medianScore >= 75 ? "PASS" : "FAIL";

    const averageCorrectness = Math.round(
      results.reduce((acc, r) => acc + r.rubricBreakdown.correctness, 0) / results.length
    );
    const averageCompleteness = Math.round(
      results.reduce((acc, r) => acc + r.rubricBreakdown.completeness, 0) / results.length
    );
    const averageSecurity = Math.round(
      results.reduce((acc, r) => acc + r.rubricBreakdown.securityAndRobustness, 0) / results.length
    );
    const averagePerformance = Math.round(
      results.reduce((acc, r) => acc + r.rubricBreakdown.performanceAndEfficiency, 0) / results.length
    );

    // Combine criteria validation evidence
    const combinedCriteria = results[0].rubricBreakdown.criteriaValidation.map((c, i) => {
      const satisfiedAcross = results.filter(
        (r) => r.rubricBreakdown.criteriaValidation[i]?.satisfied
      ).length;
      return {
        criterion: c.criterion,
        satisfied: satisfiedAcross >= Math.ceil(results.length / 2),
        score: Math.round(
          results.reduce(
            (acc, r) => acc + (r.rubricBreakdown.criteriaValidation[i]?.score || 0),
            0
          ) / results.length
        ),
        evidence: `Consensus agreement: ${satisfiedAcross}/${results.length} evaluators validated criterion.`,
      };
    });

    const consensusBreakdown: RubricEvaluationBreakdown = {
      correctness: averageCorrectness,
      completeness: averageCompleteness,
      securityAndRobustness: averageSecurity,
      performanceAndEfficiency: averagePerformance,
      criteriaValidation: combinedCriteria,
    };

    return {
      score: medianScore,
      verdict: consensusVerdict,
      rubricBreakdown: consensusBreakdown,
      reasoning: `Consensus reached across ${results.length} evaluators with median score ${medianScore}/100. Pass votes: ${passCount}/${results.length}.`,
      verifierType: "MULTI_AGENT_CONSENSUS",
      providerMetadata: {
        provider: "accord-consensus",
        model: `pool[${results.map((r) => r.providerMetadata?.model || r.verifierType).join(",")}]`,
      },
      verifiedAt: new Date(),
    };
  }
}
