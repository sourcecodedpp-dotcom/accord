import { NextRequest, NextResponse } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { CreateSubmissionSchema } from "@/lib/types/accord";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const body = await req.json();
    const validated = CreateSubmissionSchema.parse(body);

    const autoVerify = body.autoVerify !== undefined ? Boolean(body.autoVerify) : true;

    const result = await SubmissionService.submitSolution({
      bountyId,
      input: validated,
      autoVerify,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Solution submitted and queued for verification",
        ...result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`POST /api/bounties/[id]/submit error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit solution" },
      { status: 400 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;
    const submissions = await SubmissionService.getSubmissions(bountyId);

    return NextResponse.json({
      success: true,
      bountyId,
      count: submissions.length,
      submissions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list submissions" },
      { status: 500 }
    );
  }
}
