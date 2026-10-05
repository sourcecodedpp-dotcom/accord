import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { LoginWithSignatureSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, signature } = LoginWithSignatureSchema.parse(body);

    const participant = await AuthService.verifyWalletLogin(walletAddress, signature);
    const sessionToken = AuthService.createSessionToken(participant);

    return apiSuccess({
      sessionToken,
      participant: {
        id: participant.id,
        name: participant.name,
        type: participant.type,
        walletAddress: participant.walletAddress,
        reputationScore: participant.reputationScore,
      },
    }, 200, "Authentication successful");
  } catch (error) {
    return handleApiError(error);
  }
}
