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

    // Default to LLM if key is present, otherwise deterministic
    return process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
      ? this.verifiers.get("LLM_RUBRIC_EVALUATOR")!
      : this.verifiers.get("DETERMINISTIC_SANDBOX")!;
  }
}
