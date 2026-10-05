import {
  IAccordVerifier,
  VerificationResult,
  VerificationVerdict,
  RubricEvaluationBreakdown,
  CriterionEvaluation,
} from "@accord/protocol";

export interface LlmVerifierOptions {
  provider?: "openai" | "gemini" | "anthropic" | "custom";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class LlmRubricVerifier implements IAccordVerifier {
  public readonly name = "accord-llm-verifier";
  public readonly version = "1.0.0";
  private options: LlmVerifierOptions;

  constructor(options?: LlmVerifierOptions) {
    this.options = {
      provider:
        options?.provider ||
        (process.env.OPENAI_API_KEY ? "openai" : process.env.GEMINI_API_KEY ? "gemini" : "custom"),
      apiKey: options?.apiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
      baseUrl: options?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: options?.model || process.env.ACCORD_VERIFIER_MODEL || "gpt-4o-mini",
    };
  }

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

    // If no API key is supplied, fall back to deterministic evaluation gracefully
    if (!this.options.apiKey) {
      const { DeterministicRubricVerifier } = await import("./deterministic.verifier");
      return await new DeterministicRubricVerifier().evaluate(context);
    }

    try {
      const prompt = `You are an impartial, high-precision AI verification evaluator for the Accord Bounty Protocol.
You are evaluating a solution submission against explicit bounty acceptance criteria.

BOUNTY TITLE: ${context.bounty.title}
BOUNTY DESCRIPTION: ${context.bounty.description}
BOUNTY CRITERIA:
${context.bounty.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

SUBMISSION DELIVERABLE: ${context.submission.deliverableUrl} (${context.submission.deliverableType})
SUBMISSION SUMMARY:
${context.submission.summary}

EXECUTION TRACE / TEST RESULTS:
${context.submission.executionTrace || "None provided."}

Return a valid JSON object strictly matching this schema:
{
  "score": number (0 to 100),
  "verdict": "PASS" | "FAIL",
  "reasoning": string,
  "rubricBreakdown": {
    "correctness": number (0-100),
    "completeness": number (0-100),
    "securityAndRobustness": number (0-100),
    "performanceAndEfficiency": number (0-100),
    "criteriaValidation": [
      {
        "criterion": string,
        "satisfied": boolean,
        "score": number (0-100),
        "evidence": string
      }
    ]
  }
}`;

      const res = await fetch(`${this.options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        throw new Error(`LLM provider HTTP error: ${res.status}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);

      return {
        score: Math.min(100, Math.max(0, Number(parsed.score))),
        verdict: parsed.score >= 75 ? "PASS" : "FAIL",
        rubricBreakdown: parsed.rubricBreakdown,
        reasoning: parsed.reasoning,
        verifierType: "LLM_RUBRIC_EVALUATOR",
        providerMetadata: {
          provider: this.options.provider,
          model: this.options.model,
          latencyMs: Date.now() - startTime,
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
        },
        verifiedAt: new Date(),
      };
    } catch {
      // Fallback to deterministic verifier if remote LLM call fails
      const { DeterministicRubricVerifier } = await import("./deterministic.verifier");
      return await new DeterministicRubricVerifier().evaluate(context);
    }
  }
}
