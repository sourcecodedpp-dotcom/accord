import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get("eventType") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const [total, logs] = await Promise.all([
      db.protocolAuditLog.count({ where }),
      db.protocolAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    return apiSuccess({
      total,
      limit,
      offset,
      events: logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        entityType: log.entityType,
        entityId: log.entityId,
        payload: JSON.parse(log.payload),
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
