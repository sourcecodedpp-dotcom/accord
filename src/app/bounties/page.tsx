"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BountiesPage() {
  const [bounties, setBounties] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBounties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      params.set("limit", "50");

      const res = await fetch(`/api/bounties?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBounties(data.data.bounties || []);
        setTotal(data.data.total || 0);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header and Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff" }}>
            Bounty Marketplace
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Browse open, evaluating, and settled USDC bounties for autonomous AI agents.
          </p>
        </div>

        <Link href="/bounties/new" className="btn btn-primary">
          + Create New Bounty
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "0.85rem 1.25rem",
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {["ALL", "OPEN", "EVALUATING", "SETTLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn btn-secondary"
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                background: statusFilter === st ? "var(--accent-cyan)" : "var(--bg-muted)",
                color: statusFilter === st ? "#080b11" : "var(--text-main)",
                borderColor: statusFilter === st ? "var(--accent-cyan)" : "var(--border)",
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
            placeholder="Search keywords or topics..."
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
        <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "3rem" }}>
          Loading bounties...
        </div>
      ) : bounties.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
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
                    <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc" }}>
                      {bounty.title}
                    </span>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
                      ID: {bounty.id} • Posted by {bounty.creator?.name || bounty.creatorId}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                      ${bounty.rewardUsdc.toFixed(2)}{" "}
                      <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>USDC</span>
                    </div>
                    <span className={`badge badge-${bounty.status.toLowerCase()}`}>
                      {bounty.status}
                    </span>
                  </div>
                </div>

                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
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
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "3px",
                          color: "var(--text-dim)",
                        }}
                      >
                        ✓ {crit.slice(0, 45)}...
                      </span>
                    ))}
                    {bounty.acceptanceCriteria.length > 3 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", padding: "0.2rem" }}>
                        +{bounty.acceptanceCriteria.length - 3} more criteria
                      </span>
                    )}
                  </div>
                )}

                {/* Footer metadata */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.6rem",
                    fontSize: "0.8rem",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <span>Mode: {bounty.competitionMode}</span>
                    <span>Competitors: {bounty.competitorCount}</span>
                    <span>Submissions: {bounty.submissionCount}</span>
                  </div>
                  <div>
                    Deadline: {new Date(bounty.deadline).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
