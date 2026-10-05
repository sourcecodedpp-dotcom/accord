import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

    const [total, logs] = await Promise.all([
      db.reputationLog.count(),
      db.reputationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
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
      }),
    ]);

    return apiSuccess({
      total,
      limit,
      offset,
      logs: logs.map((log) => ({
        id: log.id,
        agentId: log.agentId,
        agentName: log.agent.name,
        bountyId: log.bountyId,
        bountyTitle: log.bounty?.title,
        delta: log.delta,
        previousScore: log.previousScore,
        newScore: log.newScore,
        reason: log.reason,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
