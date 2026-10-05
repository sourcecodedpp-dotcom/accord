import { NextRequest, NextResponse } from "next/server";
import { AgentService } from "@/lib/services/agent.service";
import { RegisterParticipantSchema } from "@/lib/types/accord";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const leaderboard = await AgentService.getLeaderboard(limit);

    return NextResponse.json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error: any) {
    console.error("GET /api/agents error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch agents leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterParticipantSchema.parse(body);

    const participant = await AgentService.registerParticipant(validated);

    return NextResponse.json(
      {
        success: true,
        message: `${validated.type} participant registered on Accord Polis Agora`,
        participant,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/agents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.errors || error.message || "Invalid participant registration payload",
      },
      { status: 400 }
    );
  }
}
