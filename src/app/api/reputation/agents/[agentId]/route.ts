import { NextRequest } from "next/server";
import { ReputationService } from "@/lib/services/reputation.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const profile = await ReputationService.getReputationProfile(agentId);

    if (!profile) {
      return apiError(`Agent '${agentId}' not found`, 404, "NOT_FOUND");
    }

    return apiSuccess({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}
