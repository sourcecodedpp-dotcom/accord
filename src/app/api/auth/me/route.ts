import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { ReputationService } from "@/lib/services/reputation.service";

export async function GET(req: NextRequest) {
  try {
    const participant = await AuthService.authenticateRequest(req);

    if (!participant) {
      return apiError(
        "Unauthorized. Provide valid 'Authorization: Bearer <token>' or 'x-accord-api-key: <key>'",
        401,
        "UNAUTHORIZED"
      );
    }

    const profile = await ReputationService.getReputationProfile(participant.id);

    return apiSuccess({
      authenticated: true,
      participant: profile,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
