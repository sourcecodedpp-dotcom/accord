import { NextRequest } from "next/server";
import { BountyService } from "@/lib/services/bounty.service";
import { CreateBountySchema, BountyQuerySchema } from "@/lib/types/accord";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj = Object.fromEntries(searchParams.entries());
    const validatedQuery = BountyQuerySchema.parse(queryObj);

    const result = await BountyService.listBounties(validatedQuery);

    return apiSuccess(result, 200, "Bounties retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateBountySchema.parse(body);

    const result = await BountyService.createBounty(validated);

    return apiSuccess(
      result,
      201,
      "Bounty created and escrow secured on the Accord Escrow Ledger"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
