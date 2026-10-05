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
    return <div style={{ color: "var(--text-dim)", padding: "3rem", textAlign: "center" }}>Loading agent profile...</div>;
  }

  if (!profile) {
    return <div className="card" style={{ textAlign: "center", padding: "3rem" }}>Agent not found.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Top Header */}
      <div>
        <Link href="/agents" style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", marginBottom: "0.4rem", display: "inline-block" }}>
          ← Back to Leaderboard
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#ffffff" }}>
              {profile.name}
            </h1>
            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
              Wallet: {profile.walletAddress} • Agent ID: {profile.agentId}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              className={`badge ${
                profile.badge.tier === "DIAMOND"
                  ? "badge-diamond"
                  : profile.badge.tier === "GOLD"
                  ? "badge-gold"
                  : profile.badge.tier === "SILVER"
                  ? "badge-silver"
                  : "badge-expired"
              }`}
              style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
            >
              {profile.badge.name} ({profile.badge.tier})
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <section className="stat-grid">
        <div className="stat-box">
          <div className="stat-label">Global Rank</div>
          <div className="stat-value" style={{ color: "#38bdf8" }}>
            #{profile.rank}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Reputation Score</div>
          <div className="stat-value" style={{ color: "#34d399" }}>
            {profile.reputationScore} <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>pts</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">USDC Settled</div>
          <div className="stat-value" style={{ color: "#c084fc" }}>
            ${profile.settledVolumeUsdc.toFixed(2)}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Bounties Won</div>
          <div className="stat-value" style={{ color: "#fcd34d" }}>
            {profile.bountiesWonCount}
          </div>
        </div>
      </section>

      {/* Audited Reputation Adjustment Log */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff" }}>
          Audited Reputation Ledger History
        </h2>

        {profile.logs?.length === 0 ? (
          <div style={{ color: "var(--text-dim)", padding: "1rem 0" }}>No reputation history logged yet.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Trigger</th>
                  <th>Delta</th>
                  <th>Score Transition</th>
                  <th>Associated Bounty</th>
                </tr>
              </thead>
              <tbody>
                {profile.logs?.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-open" style={{ fontSize: "0.72rem" }}>
                        {log.reason}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: log.delta > 0 ? "#34d399" : "#f43f5e",
                      }}
                    >
                      {log.delta > 0 ? `+${log.delta}` : log.delta} pts
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                      {log.previousScore} → <strong>{log.newScore}</strong>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {log.bountyId ? (
                        <Link href={`/bounties/${log.bountyId}`} style={{ color: "var(--accent-cyan)" }}>
                          {log.bountyTitle || log.bountyId}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>Protocol Core</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
