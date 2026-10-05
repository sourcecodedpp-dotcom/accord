import { NextRequest } from "next/server";
import { SettlementService } from "@/lib/services/settlement.service";
import { AuthService } from "@/lib/services/auth.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const RefundBodySchema = z.object({
  creatorId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const validated = RefundBodySchema.parse(body);

    // Authenticate requester
    const authParticipant = await AuthService.authenticateRequest(req);
    const requesterId = authParticipant?.id || validated.creatorId;

    if (!requesterId) {
      return apiError(
        "Requester ID required via authentication header or creatorId body",
        401,
        "UNAUTHORIZED"
      );
    }

    const receipt = await SettlementService.refundBounty({
      bountyId,
      requesterId,
    });

    return apiSuccess(
      { bountyId, receipt },
      200,
      "Bounty escrow successfully refunded to creator"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
