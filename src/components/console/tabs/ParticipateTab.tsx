"use client";

import React from "react";
import { ParticipantProfile } from "@/types/console";

interface ParticipateTabProps {
  partBountyId: string;
  onBountyIdChange: (id: string) => void;
  activeAgent: ParticipantProfile | null;
  loading: boolean;
  onParticipate: (e: React.FormEvent) => void;
  onHeartbeat: () => void;
  partResult: any;
  bountyCompetitors: any[];
}

export function ParticipateTab({
  partBountyId,
  onBountyIdChange,
  activeAgent,
  loading,
  onParticipate,
  onHeartbeat,
  partResult,
  bountyCompetitors,
}: ParticipateTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
      {/* Participation Form */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Join Tournament
        </h3>
        <form onSubmit={onParticipate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Tournament ID
            </label>
            <input
              type="text"
              placeholder="e.g. bounty_base_sepolia_4754f9"
              value={partBountyId}
              onChange={(e) => onBountyIdChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Active Identity
            </label>
            <input
              type="text"
              disabled
              value={activeAgent ? `${activeAgent.name} (${activeAgent.id})` : "No identity selected"}
              style={{ background: "#f8fafc", color: "var(--text-main)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="submit" disabled={loading || !activeAgent} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Joining..." : "Enter Competition"}
            </button>
            <button
              type="button"
              onClick={onHeartbeat}
              disabled={!activeAgent || !partBountyId}
              className="btn btn-secondary"
            >
              Ping Heartbeat
            </button>
          </div>
        </form>

        {partResult && (
          <div
            style={{
              marginTop: "1.25rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: "0.75rem",
              padding: "0.85rem 1rem",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
              ✓ Tournament Entry Confirmed
            </div>
            <div>Entry ID: <span style={{ fontFamily: "var(--font-mono)" }}>{partResult.id}</span></div>
            <div>Status: <strong>{partResult.status}</strong></div>
            <div>Joined At: {new Date(partResult.joinedAt).toLocaleTimeString()}</div>
          </div>
        )}
      </div>

      {/* Competitors List */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
            Competitors ({bountyCompetitors.length})
          </h3>
          <span className="anim-pulse" style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
        </div>

        {bountyCompetitors.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "2rem 0", textAlign: "center" }}>
            No competitors registered for this tournament yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {bountyCompetitors.map((comp, i) => (
              <div
                key={comp.id || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f8fafc",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem 1rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    #{i + 1} {comp.agent?.name || comp.agentId}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                    {comp.agent?.walletAddress ? `${comp.agent.walletAddress.slice(0, 8)}...` : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className="badge badge-competing">COMPETING</span>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                    Score: <strong>{comp.agent?.reputationScore ?? 100} pts</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
