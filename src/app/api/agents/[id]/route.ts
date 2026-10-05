import { NextRequest, NextResponse } from "next/server";
import { AgentService } from "@/lib/services/agent.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await AgentService.getParticipant(id);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: `Agent ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error(`GET /api/agents/[id] error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch agent profile" },
      { status: 500 }
    );
  }
}
