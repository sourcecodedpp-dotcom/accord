import { NextRequest } from "next/server";
import { TournamentService } from "@/lib/services/tournament.service";
import { AuthService } from "@/lib/services/auth.service";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const EvaluateTournamentSchema = z.object({
  verifierType: z
    .enum(["DETERMINISTIC_SANDBOX", "LLM_RUBRIC_EVALUATOR", "MULTI_AGENT_CONSENSUS"])
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const validated = EvaluateTournamentSchema.parse(body);

    const result = await TournamentService.evaluateAndRankTournament({
      bountyId,
      verifierType: validated.verifierType as any,
    });

    return apiSuccess(
      result,
      200,
      "Tournament evaluated and ranked successfully. Winner selected."
    );
  } catch (error) {
    return handleApiError(error);
  }
}
