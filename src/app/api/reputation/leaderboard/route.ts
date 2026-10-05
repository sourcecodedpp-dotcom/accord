import { NextRequest } from "next/server";
import { AgentService } from "@/lib/services/agent.service";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const leaderboard = await AgentService.getLeaderboard(limit);

    return apiSuccess({
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
