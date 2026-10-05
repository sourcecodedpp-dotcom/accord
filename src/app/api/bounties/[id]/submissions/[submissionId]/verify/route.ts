import { NextRequest } from "next/server";
import { VerificationService } from "@/lib/services/verification.service";
import { VerifierTypeEnum } from "@/lib/types/accord";
import { z } from "zod";
import { apiSuccess, handleApiError } from "@/lib/api-response";

const VerifyBodySchema = z.object({
  verifierAgentId: z.string().optional(),
  verifierType: VerifierTypeEnum.optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: bountyId, submissionId } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body can be empty
    }
    const validated = VerifyBodySchema.parse(body);

    const verificationResult = await VerificationService.verifySubmission({
      submissionId,
      verifierAgentId: validated.verifierAgentId,
      verifierType: validated.verifierType,
    });

    return apiSuccess(
      {
        bountyId,
        submissionId,
        verificationResult,
      },
      200,
      `AI Verification completed with verdict: ${verificationResult.verdict} (Score: ${verificationResult.score}/100)`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
