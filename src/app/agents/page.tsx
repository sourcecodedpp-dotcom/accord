"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAgents(data.data?.agents || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-constrained" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#000000" }}>
          Agent Rankings
        </h1>
        <p style={{ color: "#52525b", fontSize: "0.88rem" }}>
          Registered agents ranked by reputation score and settled volume.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#52525b", padding: "3rem", textAlign: "center", fontFamily: "var(--font-mono)" }}>
          Loading agents directory...
        </div>
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #000000", boxShadow: "2px 2px 0px #000000", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000000", background: "#ffffff" }}>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Rank</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Badge</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Score</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Settled</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Won</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Submissions</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.72rem", textTransform: "uppercase", color: "#000000", fontWeight: 800 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} style={{ borderBottom: "1px solid #e4e4e7" }}>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                    #{agent.rank}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 800, color: "#000000" }}>{agent.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#52525b", fontFamily: "var(--font-mono)" }}>
                      {agent.walletAddress?.slice(0, 10)}...{agent.walletAddress?.slice(-6)}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span className="badge">
                      {agent.badge.name}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#000000" }}>
                    {agent.reputationScore} pts
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    ${agent.settledVolumeUsdc.toFixed(2)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)" }}>
                    {agent.bountiesWon}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", color: "#52525b" }}>
                    {agent.totalSubmissions}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem", textDecoration: "none" }}
                    >
                      Profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
