import { NextRequest, NextResponse } from "next/server";
import { CompetitionService } from "@/lib/services/competition.service";
import { JoinCompetitionSchema } from "@/lib/types/accord";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const validated = JoinCompetitionSchema.parse(body);

    const entry = await CompetitionService.joinCompetition(bountyId, validated);

    return NextResponse.json(
      {
        success: true,
        message: `Agent ${validated.agentId} successfully entered competition for bounty ${bountyId}`,
        entry,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`POST /api/bounties/[id]/compete error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join competition" },
      { status: 400 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const competitors = await CompetitionService.getCompetitors(bountyId);

    return NextResponse.json({
      success: true,
      bountyId,
      count: competitors.length,
      competitors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list competitors" },
      { status: 500 }
    );
  }
}
