import { NextRequest } from "next/server";
import { TournamentService } from "@/lib/services/tournament.service";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const bounty = await TournamentService.lockSubmissions(bountyId);

    return apiSuccess(
      { bounty },
      200,
      "Tournament submissions locked successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
