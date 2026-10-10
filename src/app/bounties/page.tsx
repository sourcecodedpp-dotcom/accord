"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtocolSimulatorModal } from "@/components/simulation/ProtocolSimulatorModal";

export default function BountiesMarketplacePage() {
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const fetchBounties = async () => {
    setLoading(true);
    try {
      let url = "/api/bounties?limit=50";
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery) {
        url += `&query=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBounties(data.data.bounties);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounties();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBounties();
  };

  return (
    <div className="container-constrained" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#000000" }}>
            Bounties
          </h1>
          <p style={{ color: "#52525b", fontSize: "0.88rem", marginTop: "0.2rem" }}>
            USDC bounties evaluated by deterministic consensus.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => setSimulatorOpen(true)}
            className="btn btn-secondary"
            style={{
              padding: "0.55rem 1.1rem",
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#ffffff",
              borderColor: "#cbd5e1",
              color: "#0f172a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>⚡</span> Live Simulator
          </button>

          <Link href="/bounties/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            + Post Bounty
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "#ffffff",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: "0.85rem 1.25rem",
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {["ALL", "OPEN", "COMPETING", "EVALUATING", "SETTLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn btn-secondary"
              style={{
                padding: "0.4rem 0.9rem",
                fontSize: "0.8rem",
                background: statusFilter === st ? "#0f172a" : "#ffffff",
                color: statusFilter === st ? "#ffffff" : "var(--text-main)",
                borderColor: statusFilter === st ? "#0f172a" : "var(--border)",
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", width: "320px" }}>
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
          />
          <button type="submit" className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem" }}>
            Search
          </button>
        </form>
      </div>

      {/* Bounty Cards Grid */}
      {loading ? (
        <div style={{ color: "#52525b", textAlign: "center", padding: "3rem", fontFamily: "var(--font-mono)" }}>
          Loading bounties...
        </div>
      ) : bounties.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#52525b" }}>
          No bounties found matching criteria.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {bounties.map((bounty) => (
            <Link
              key={bounty.id}
              href={`/bounties/${bounty.id}`}
              style={{ textDecoration: "none" }}
            >
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#000000" }}>
                      {bounty.title}
                    </span>
                    <div style={{ fontSize: "0.78rem", color: "#52525b", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
                      ID: {bounty.id} // Posted by {bounty.creator?.name || bounty.creatorId}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#000000", fontFamily: "var(--font-mono)" }}>
                      ${bounty.rewardUsdc.toFixed(2)}{" "}
                      <span style={{ fontSize: "0.78rem", color: "#52525b" }}>USDC</span>
                    </div>
                    <span className="badge">
                      {bounty.status}
                    </span>
                  </div>
                </div>

                <p style={{ color: "#52525b", fontSize: "0.88rem", lineHeight: 1.4 }}>
                  {bounty.description}
                </p>

                {/* Criteria preview */}
                {bounty.acceptanceCriteria && Array.isArray(bounty.acceptanceCriteria) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {bounty.acceptanceCriteria.slice(0, 3).map((crit: string, i: number) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "0.75rem",
                          background: "#f4f4f5",
                          border: "1px solid #e4e4e7",
                          padding: "0.2rem 0.5rem",
                          fontFamily: "var(--font-mono)",
                          color: "#000000",
                        }}
                      >
                        ✓ {crit}
                      </span>
                    ))}
                    {bounty.acceptanceCriteria.length > 3 && (
                      <span style={{ fontSize: "0.75rem", color: "#52525b", alignSelf: "center", fontFamily: "var(--font-mono)" }}>
                        +{bounty.acceptanceCriteria.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #e4e4e7",
                    paddingTop: "0.6rem",
                    fontSize: "0.78rem",
                    color: "#52525b",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <div>
                    Mode: <strong>{bounty.competitionMode}</strong> • Max Competitors: {bounty.maxParticipants || 10}
                  </div>
                  <div>
                    Submissions: {bounty.submissionCount ?? bounty._count?.submissions ?? 0}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ProtocolSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </div>
  );
}
