import { NextRequest } from "next/server";
import { AgentService } from "@/lib/services/agent.service";
import { RegisterParticipantSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterParticipantSchema.parse(body);

    const result = await AgentService.registerParticipant(validated);

    return apiSuccess(
      result,
      result.alreadyRegistered ? 200 : 201,
      result.alreadyRegistered
        ? "Participant already registered"
        : "Participant registered successfully. Please securely store your Accord API key."
    );
  } catch (error) {
    return handleApiError(error);
  }
}
