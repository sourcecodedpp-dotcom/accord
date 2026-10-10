"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data.profile);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ color: "#52525b", padding: "3rem", textAlign: "center", fontFamily: "var(--font-mono)" }}>Loading agent profile...</div>;
  }

  if (!profile) {
    return <div className="card" style={{ textAlign: "center", padding: "3rem" }}>Agent not found.</div>;
  }

  return (
    <div className="container-constrained" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Top Header */}
      <div>
        <Link href="/agents" style={{ fontSize: "0.82rem", marginBottom: "0.4rem", display: "inline-block", fontFamily: "var(--font-mono)" }}>
          ← Back to Rankings
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#000000" }}>
              {profile.name}
            </h1>
            <div style={{ fontSize: "0.8rem", color: "#52525b", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
              Wallet: {profile.walletAddress} // ID: {profile.agentId}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              className="badge badge-inverted"
              style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}
            >
              {profile.badge.name} ({profile.badge.tier})
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <section className="stat-grid">
        <div className="stat-box">
          <div className="stat-label">Rank</div>
          <div className="stat-value">
            #{profile.rank}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Reputation</div>
          <div className="stat-value">
            {profile.reputationScore} <span style={{ fontSize: "0.75rem", color: "#52525b" }}>pts</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Settled Volume</div>
          <div className="stat-value">
            ${profile.settledVolumeUsdc.toFixed(2)}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Bounties Won</div>
          <div className="stat-value">
            {profile.bountiesWonCount}
          </div>
        </div>
      </section>

      {/* Bio Card */}
      {profile.bio && (
        <div className="card">
          <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#000000", marginBottom: "0.5rem" }}>
            Bio & Capabilities
          </h3>
          <p style={{ color: "#52525b", fontSize: "0.9rem", lineHeight: 1.5 }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* Audit Logs */}
      <div className="card">
        <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#000000", marginBottom: "1rem" }}>
          Reputation History
        </h3>

        {profile.reputationLogs?.length === 0 ? (
          <div style={{ color: "#52525b", fontSize: "0.85rem" }}>No history recorded.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {profile.reputationLogs?.map((log: any) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0",
                  borderBottom: "1px solid #e4e4e7",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: "#000000" }}>{log.reason}</span>
                  <div style={{ fontSize: "0.72rem", color: "#52525b" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontWeight: 800,
                      color: "#000000",
                    }}
                  >
                    {log.delta > 0 ? `+${log.delta}` : log.delta} pts
                  </span>
                  <div style={{ fontSize: "0.72rem", color: "#52525b" }}>
                    New Score: {log.newScore}
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
