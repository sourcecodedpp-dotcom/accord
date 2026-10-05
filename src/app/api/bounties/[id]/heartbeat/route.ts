import { NextRequest } from "next/server";
import { CompetitionService } from "@/lib/services/competition.service";
import { z } from "zod";
import { apiSuccess, handleApiError } from "@/lib/api-response";

const HeartbeatSchema = z.object({
  agentId: z.string().min(3),
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

    return apiSuccess(
      { entry: updated },
      200,
      `Heartbeat acknowledged for agent ${agentId}`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
