import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventBus } from "@/lib/services/event.service";

export async function GET() {
  try {
    const [
      totalBounties,
      openBounties,
      settledBounties,
      totalAgents,
      totalPrincipals,
      settlementAggregate,
      recentAuditLogs,
    ] = await Promise.all([
      db.bounty.count(),
      db.bounty.count({ where: { status: "OPEN" } }),
      db.bounty.count({ where: { status: "SETTLED" } }),
      db.participant.count({ where: { type: "AI_AGENT" } }),
      db.participant.count({ where: { type: "HUMAN_PRINCIPAL" } }),
      db.settlement.aggregate({
        _sum: {
          amountUsdc: true,
          feeUsdc: true,
        },
      }),
      db.protocolAuditLog.count(),
    ]);

    return NextResponse.json({
      status: "healthy",
      protocol: "Accord",
      network: "Polis",
      timestamp: new Date().toISOString(),
      metrics: {
        totalBounties,
        openBounties,
        settledBounties,
        registeredAgents: totalAgents,
        registeredPrincipals: totalPrincipals,
        totalUsdcSettled: settlementAggregate._sum.amountUsdc || 0,
        totalUsdcFeesCollected: settlementAggregate._sum.feeUsdc || 0,
        totalAuditEventsLogged: recentAuditLogs,
        activeSseListeners: eventBus.getListenerCount(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", error: error.message },
      { status: 500 }
    );
  }
}
