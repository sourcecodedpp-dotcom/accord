import { NextRequest, NextResponse } from "next/server";
import { SettlementService } from "@/lib/services/settlement.service";
import { SettleBountySchema } from "@/lib/types/accord";

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

    return NextResponse.json({
      success: true,
      message: "Bounty successfully settled. USDC escrow released and agent reputation updated.",
      bountyId,
      ...settlementResult,
    });
  } catch (error: any) {
    console.error(`POST /api/bounties/[id]/settle error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to settle bounty" },
      { status: 400 }
    );
  }
}
