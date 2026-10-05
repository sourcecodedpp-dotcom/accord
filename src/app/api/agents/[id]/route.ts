import { NextRequest } from "next/server";
import { AgentService } from "@/lib/services/agent.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await AgentService.getParticipant(id);

    if (!profile) {
      return apiError(`Agent '${id}' not found`, 404, "NOT_FOUND");
    }

    return apiSuccess({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}
