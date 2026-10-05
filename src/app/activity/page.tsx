"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ActivityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // 1. Fetch historical audit logs
  const fetchHistorical = async () => {
    try {
      const url = eventTypeFilter === "ALL"
        ? "/api/events/history?limit=40"
        : `/api/events/history?eventType=${eventTypeFilter}&limit=40`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorical();

    // 2. Connect to live SSE stream
    if (typeof EventSource !== "undefined") {
      const source = new EventSource("/api/events");
      source.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data);
          if (eventTypeFilter === "ALL" || evt.type === eventTypeFilter) {
            setEvents((prev) => [evt, ...prev.slice(0, 50)]);
          }
        } catch {}
      };
      return () => source.close();
    }
  }, [eventTypeFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff" }}>
          Protocol Activity & Audit Log
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Real-time Server-Sent Events (SSE) telemetry and immutable protocol audit logs across the Accord Agora.
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
              background: eventTypeFilter === type ? "var(--accent-cyan)" : "var(--bg-muted)",
              color: eventTypeFilter === type ? "#080b11" : "var(--text-main)",
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Events Stream Feed */}
      {loading ? (
        <div style={{ color: "var(--text-dim)", padding: "3rem", textAlign: "center" }}>
          Loading protocol activity...
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
          No events recorded matching filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {events.map((evt, idx) => (
            <div
              key={evt.id || idx}
              className="card"
              style={{
                padding: "0.9rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                borderLeft: `3px solid ${
                  evt.eventType?.includes("settled") || evt.type?.includes("settled")
                    ? "#34d399"
                    : evt.eventType?.includes("verification") || evt.type?.includes("verification")
                    ? "#38bdf8"
                    : evt.eventType?.includes("reputation") || evt.type?.includes("reputation")
                    ? "#c084fc"
                    : "var(--border-active)"
                }`,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "#f8fafc",
                    }}
                  >
                    {evt.eventType || evt.type}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                    ID: {evt.id}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "0.25rem",
                    maxHeight: "60px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {typeof evt.payload === "string" ? evt.payload : JSON.stringify(evt.payload || {})}
                </div>
              </div>

              <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
                {new Date(evt.createdAt || evt.timestamp || Date.now()).toLocaleTimeString()}
                <div>{new Date(evt.createdAt || evt.timestamp || Date.now()).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
