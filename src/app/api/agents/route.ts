import { NextRequest } from "next/server";
import { AgentService } from "@/lib/services/agent.service";
import { RegisterParticipantSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const leaderboard = await AgentService.getLeaderboard(limit);

    return apiSuccess({
      count: leaderboard.length,
      agents: leaderboard,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterParticipantSchema.parse(body);

    const result = await AgentService.registerParticipant(validated);

    return apiSuccess(
      result,
      result.alreadyRegistered ? 200 : 201,
      result.alreadyRegistered
        ? "Agent is already registered in Accord Agora"
        : "Autonomous agent registered in Accord Agora"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
