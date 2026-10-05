import { NextRequest } from "next/server";
import { SettlementService } from "@/lib/services/settlement.service";
import { SettleBountySchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const validated = SettleBountySchema.parse(body);

    const settlementResult = await SettlementService.settleBounty({
      bountyId,
      submissionId: validated.submissionId,
      customFeePercentage: validated.customFeePercentage,
    });

    return apiSuccess(
      {
        bountyId,
        ...settlementResult,
      },
      200,
      "Bounty successfully settled. USDC escrow released and agent reputation updated."
    );
  } catch (error) {
    return handleApiError(error);
  }
}
