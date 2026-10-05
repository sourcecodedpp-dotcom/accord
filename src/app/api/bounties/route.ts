import { NextRequest, NextResponse } from "next/server";
import { BountyService } from "@/lib/services/bounty.service";
import { CreateBountySchema } from "@/lib/types/accord";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const minReward = searchParams.get("minReward") ? Number(searchParams.get("minReward")) : undefined;
    const creatorId = searchParams.get("creatorId") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;

    const bounties = await BountyService.listBounties({
      status,
      minReward,
      creatorId,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      count: bounties.length,
      bounties,
    });
  } catch (error: any) {
    console.error("GET /api/bounties error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch bounties" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateBountySchema.parse(body);

    const bounty = await BountyService.createBounty(validated);

    return NextResponse.json(
      {
        success: true,
        message: "Bounty created and live on Accord Polis Agora",
        bounty,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/bounties error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.errors || error.message || "Invalid bounty creation payload",
      },
      { status: 400 }
    );
  }
}
