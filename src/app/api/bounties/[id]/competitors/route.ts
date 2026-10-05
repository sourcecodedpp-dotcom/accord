import { NextRequest } from "next/server";
import { CompetitionService } from "@/lib/services/competition.service";
import { apiSuccess, handleApiError } from "@/lib/api-response";

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
