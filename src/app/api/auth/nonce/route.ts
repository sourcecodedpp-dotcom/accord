import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { RequestNonceSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = RequestNonceSchema.parse(body);

    const nonce = await AuthService.generateNonce(walletAddress);

    return apiSuccess({
      walletAddress,
      nonce,
      challengeMessage: `Accord Authentication Challenge: ${nonce}`,
      expiresInMinutes: 10,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
