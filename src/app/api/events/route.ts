import { NextRequest } from "next/server";
import { eventBus } from "@/lib/services/event.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connected handshake event
      const handshake = `event: accord.connected\ndata: ${JSON.stringify({
        status: "connected",
        protocol: "Accord Polis Live Event Stream",
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(handshake));

      // 2. Subscribe to the global Accord event bus
      const unsubscribe = eventBus.subscribe((event) => {
        try {
          const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream might have closed
        }
      });

      // 3. Clean up subscription on disconnect / abort
      req.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
