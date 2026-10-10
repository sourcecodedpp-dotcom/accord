import { IAccordVerifier, VerifierType } from "@accord/protocol";
import { DeterministicRubricVerifier } from "./verifiers/deterministic.verifier";
import { LlmRubricVerifier } from "./verifiers/llm.verifier";
import { ConsensusVerifierAggregator } from "./consensus";

export class VerifierRegistry {
  private static verifiers = new Map<string, IAccordVerifier>([
    ["DETERMINISTIC_SANDBOX", new DeterministicRubricVerifier()],
    ["LLM_RUBRIC_EVALUATOR", new LlmRubricVerifier()],
  ]);

  static register(name: string, verifier: IAccordVerifier): void {
    this.verifiers.set(name, verifier);
  }

  static get(type?: string): IAccordVerifier {
    if (type === "MULTI_AGENT_CONSENSUS") {
      return new ConsensusVerifierAggregator([
        new DeterministicRubricVerifier(),
        new LlmRubricVerifier(),
      ]);
    }

    if (type && this.verifiers.has(type)) {
      return this.verifiers.get(type)!;
    }

    // Default to ultra-fast DETERMINISTIC_SANDBOX (sub-millisecond) for reliable zero-latency execution.
    // Only invoke LLM if explicitly requested or configured with a valid OpenAI key.
    if (process.env.ACCORD_USE_LLM_VERIFIER === "true" && process.env.OPENAI_API_KEY) {
      return this.verifiers.get("LLM_RUBRIC_EVALUATOR")!;
    }

    return this.verifiers.get("DETERMINISTIC_SANDBOX")!;
  }
}
