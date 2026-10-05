import { NextRequest, NextResponse } from "next/server";
import { BountyService } from "@/lib/services/bounty.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bounty = await BountyService.getBountyById(id);

    if (!bounty) {
      return NextResponse.json(
        { success: false, error: `Bounty with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bounty,
    });
  } catch (error: any) {
    console.error(`GET /api/bounties/[id] error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve bounty" },
      { status: 500 }
    );
  }
}
