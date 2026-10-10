import { NextRequest } from "next/server";
import { BountyService } from "@/lib/services/bounty.service";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bounty = await BountyService.getBountyById(id);

    if (!bounty) {
      return apiError(`Bounty '${id}' not found`, 404, "NOT_FOUND");
    }

    return apiSuccess({ bounty });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await BountyService.updateBounty(id, body);

    return apiSuccess(
      { bounty: updated },
      200,
      `Bounty '${id}' updated successfully`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

