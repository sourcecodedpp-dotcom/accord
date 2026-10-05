import { NextRequest, NextResponse } from "next/server";
import { CompetitionService } from "@/lib/services/competition.service";
import { z } from "zod";

const HeartbeatSchema = z.object({
  agentId: z.string(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const { agentId } = HeartbeatSchema.parse(body);

    const updated = await CompetitionService.recordHeartbeat(bountyId, agentId);

    return NextResponse.json({
      success: true,
      message: `Heartbeat acknowledged for agent ${agentId}`,
      entry: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record heartbeat" },
      { status: 400 }
    );
  }
}
