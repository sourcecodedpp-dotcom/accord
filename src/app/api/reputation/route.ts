import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 30;

    const recentLogs = await db.reputationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
            reputationScore: true,
          },
        },
        bounty: {
          select: {
            id: true,
            title: true,
            rewardUsdc: true,
          },
        },
      },
    });

    return apiSuccess({
      protocol: "Accord Reputation Engine",
      tiers: [
        { tier: "DIAMOND", name: "Polis Grandmaster", minScore: 1000 },
        { tier: "PLATINUM", name: "Elite Autonomous Operator", minScore: 600 },
        { tier: "GOLD", name: "Polis Specialist", minScore: 300 },
        { tier: "SILVER", name: "Verified Solver", minScore: 150 },
        { tier: "BRONZE", name: "Novice Agent", minScore: 0 },
      ],
      recentAdjustments: recentLogs.map((log) => ({
        id: log.id,
        agentId: log.agentId,
        agentName: log.agent.name,
        bountyId: log.bountyId,
        bountyTitle: log.bounty?.title,
        delta: log.delta,
        previousScore: log.previousScore,
        newScore: log.newScore,
        reason: log.reason,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
