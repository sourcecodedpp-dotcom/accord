import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAccordEscrowLedger } from "@/lib/blockchain/accord-escrow-ledger";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bountyId } = await params;

    const bounty = await db.bounty.findUnique({
      where: { id: bountyId },
      select: {
        id: true,
        title: true,
        rewardUsdc: true,
        escrowLedgerId: true,
        escrowStatus: true,
        escrowTxHash: true,
        settlementTxHash: true,
        winnerAgentId: true,
      },
    });

    if (!bounty) {
      return apiError(`Bounty '${bountyId}' not found`, 404, "NOT_FOUND");
    }

    const ledger = getAccordEscrowLedger();
    const ledgerState = await ledger.getEscrowState(bountyId);

    return apiSuccess({
      bountyId,
      rewardUsdc: bounty.rewardUsdc,
      escrowStatus: bounty.escrowStatus,
      escrowLedgerId: bounty.escrowLedgerId,
      depositTxHash: bounty.escrowTxHash,
      settlementTxHash: bounty.settlementTxHash,
      onChainLedgerDetails: ledgerState,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
