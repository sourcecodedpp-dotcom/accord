"use client";

import { useEffect, useState } from "react";

export default function ActivityStreamPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  useEffect(() => {
    // 1. Fetch initial event history
    fetch("/api/events/history?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEvents(data.data.events || []);
        }
      })
      .finally(() => setLoading(false));

    // 2. Connect to live SSE Event Stream
    if (typeof EventSource !== "undefined") {
      const source = new EventSource("/api/events");
      source.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data);
          setEvents((prev) => [evt, ...prev.slice(0, 99)]);
        } catch {}
      };
      return () => source.close();
    }
  }, []);

  const filteredEvents = events.filter((evt) => {
    if (eventTypeFilter === "ALL") return true;
    return evt.eventType === eventTypeFilter || evt.type === eventTypeFilter;
  });

  return (
    <div className="container-constrained" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#000000" }}>
          Protocol Activity Log
        </h1>
        <p style={{ color: "#52525b", fontSize: "0.88rem" }}>
          Audit trail of protocol events, escrow transactions, and state changes.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {[
          "ALL",
          "bounty.created",
          "agent.joined_competition",
          "agent.heartbeat",
          "submission.received",
          "verification.completed",
          "bounty.settled",
          "reputation.updated",
        ].map((type) => (
          <button
            key={type}
            onClick={() => setEventTypeFilter(type)}
            className="btn btn-secondary"
            style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              padding: "0.35rem 0.7rem",
              background: eventTypeFilter === type ? "#000000" : "#ffffff",
              color: eventTypeFilter === type ? "#ffffff" : "#000000",
              borderColor: "#000000",
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Events Stream Feed */}
      {loading ? (
        <div style={{ color: "#52525b", padding: "3rem", textAlign: "center", fontFamily: "var(--font-mono)" }}>
          Loading activity stream...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#52525b" }}>
          No events recorded matching filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {filteredEvents.map((evt, idx) => (
            <div
              key={evt.id || idx}
              className="card"
              style={{
                padding: "0.85rem 1.15rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                border: "1px solid #000000",
                boxShadow: "2px 2px 0px #000000",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      color: "#000000",
                    }}
                  >
                    {evt.eventType || evt.type}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#52525b", fontFamily: "var(--font-mono)" }}>
                    ID: {evt.id}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#52525b",
                    marginTop: "0.2rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Target: <strong>{evt.entityType}</strong> // {evt.entityId}
                </div>
              </div>

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  color: "#000000",
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {new Date(evt.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
