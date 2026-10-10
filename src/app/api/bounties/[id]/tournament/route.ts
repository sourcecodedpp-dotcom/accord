import { NextRequest } from "next/server";
import { TournamentService } from "@/lib/services/tournament.service";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const tournament = await TournamentService.getTournamentStatus(bountyId);

    return apiSuccess(
      { tournament },
      200,
      "Tournament status retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
