import { NextRequest } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { CreateSubmissionSchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const validated = CreateSubmissionSchema.parse(body);

    const result = await SubmissionService.submitSolution({
      bountyId,
      input: validated,
    });

    return apiSuccess(
      result,
      201,
      "Solution submitted and queued for AI verification"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const submissions = await SubmissionService.getSubmissions(bountyId);

    return apiSuccess({
      bountyId,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
