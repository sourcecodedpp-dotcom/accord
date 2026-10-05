import { NextRequest, NextResponse } from "next/server";
import { VerificationService } from "@/lib/services/verification.service";
import { z } from "zod";

const TriggerVerificationSchema = z.object({
  submissionId: z.string(),
  verifierAgentId: z.string().optional(),
  verifierType: z
    .enum(["LLM_RUBRIC_EVALUATOR", "DETERMINISTIC_SANDBOX", "MULTI_AGENT_CONSENSUS"])
    .optional(),
});

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

    return NextResponse.json({
      success: true,
      bountyId,
      submissionId: validated.submissionId,
      verificationResult,
    });
  } catch (error: any) {
    console.error(`POST /api/bounties/[id]/verify error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute AI verification" },
      { status: 400 }
    );
  }
}
