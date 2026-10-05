import { NextRequest } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const submission = await SubmissionService.getSubmissionById(submissionId);

    if (!submission) {
      return apiError(`Submission '${submissionId}' not found`, 404, "NOT_FOUND");
    }

    return apiSuccess({ submission });
  } catch (error) {
    return handleApiError(error);
  }
}
