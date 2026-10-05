import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: bountyId, submissionId } = await params;

    const runs = await db.verificationRun.findMany({
      where: {
        bountyId,
        submissionId,
      },
      include: {
        verifierAgent: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
          },
        },
      },
      orderBy: { verifiedAt: "desc" },
    });

    if (runs.length === 0) {
      return apiError(
        `No verification runs found for submission '${submissionId}'`,
        404,
        "NOT_FOUND"
      );
    }

    return apiSuccess({
      bountyId,
      submissionId,
      count: runs.length,
      runs: runs.map((run) => ({
        ...run,
        rubricBreakdown: JSON.parse(run.rubricBreakdown),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
