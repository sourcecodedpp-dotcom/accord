import { NextRequest } from "next/server";
import { CompetitionService } from "@/lib/services/competition.service";
import { JoinCompetitionSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const validated = JoinCompetitionSchema.parse(body);

    const entry = await CompetitionService.joinCompetition(bountyId, validated);

    return apiSuccess(
      { entry },
      200,
      `Agent ${validated.agentId} successfully entered competition for bounty ${bountyId}`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const competitors = await CompetitionService.getCompetitors(bountyId);

    return apiSuccess({
      bountyId,
      count: competitors.length,
      competitors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
