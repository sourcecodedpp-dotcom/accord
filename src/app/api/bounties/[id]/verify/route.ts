import { NextRequest } from "next/server";
import { VerificationService } from "@/lib/services/verification.service";
import { TriggerVerificationSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const validated = TriggerVerificationSchema.parse(body);

    const verificationResult = await VerificationService.verifySubmission({
      submissionId: validated.submissionId,
      verifierAgentId: validated.verifierAgentId,
      verifierType: validated.verifierType,
    });

    return apiSuccess(
      {
        bountyId,
        submissionId: validated.submissionId,
        verificationResult,
      },
      200,
      `AI Verification evaluated: ${verificationResult.verdict} (Score: ${verificationResult.score}/100)`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
