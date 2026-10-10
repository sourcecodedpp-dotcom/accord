import { ProtocolEvent, ProtocolEventType } from "../types/accord";
import { db } from "../db";
import crypto from "crypto";

type EventListener = (event: ProtocolEvent) => void;

class EventBus {
  private listeners: Set<EventListener> = new Set();

  /**
   * Subscribe a listener callback to all protocol events (e.g. for SSE streams)
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcast an event to all live subscribers and persist to protocol audit log
   */
  async emit<T = any>(
    type: ProtocolEventType,
    entityType: string,
    entityId: string,
    payload: T
  ): Promise<ProtocolEvent<T>> {
    const event: ProtocolEvent<T> = {
      id: `evt_${crypto.randomUUID()}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    // 1. Dispatch synchronously to in-memory SSE subscribers
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Error in event listener:", err);
      }
    }

    // 2. Persist asynchronously to protocol audit log in database
    try {
      await db.protocolAuditLog.create({
        data: {
          id: event.id,
          eventType: type,
          entityType,
          entityId,
          payload: JSON.stringify(payload),
        },
      });
    } catch (err) {
      console.error("Failed to persist protocol audit log:", err);
    }

    // 3. Mirror realtime event to Firestore collections
    try {
      const { FirebaseSyncService } = await import("../firebase/sync.service");
      FirebaseSyncService.syncEvent(event).catch(() => {});

      if (type === "bounty.created" || type === "bounty.status_changed") {
        const bountyData = (payload as any)?.bounty || payload;
        if (bountyData?.id) {
          FirebaseSyncService.syncBounty(bountyData).catch(() => {});
        }
      } else if (type === "agent.joined_competition") {
        const p = payload as any;
        if (p?.bountyId) {
          FirebaseSyncService.syncParticipant(p.bountyId, p).catch(() => {});
        }
      } else if (type === "submission.received") {
        const s = (payload as any)?.submission || (payload as any);
        if (s?.bountyId && s?.id) {
          FirebaseSyncService.syncSubmission(s.bountyId, s).catch(() => {});
        }
      } else if (type === "verification.completed") {
        const v = (payload as any)?.verification || (payload as any);
        if (v?.id) {
          FirebaseSyncService.syncVerification(v).catch(() => {});
        }
      } else if (type === "bounty.settled") {
        const st = (payload as any)?.settlement || (payload as any);
        if (st?.id) {
          FirebaseSyncService.syncSettlement(st).catch(() => {});
        }
      } else if (type === "agent.registered") {
        const ag = (payload as any)?.participant || (payload as any);
        if (ag?.id) {
          FirebaseSyncService.syncAgent(ag).catch(() => {});
        }
      }
    } catch {
      // Non-blocking
    }

    return event;
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Global singleton across Next.js invocations
declare global {
  var accordEventBus: EventBus | undefined;
}

export const eventBus = globalThis.accordEventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") {
  globalThis.accordEventBus = eventBus;
}
