"use client";

import React from "react";
import Link from "next/link";

interface DiscoverTabProps {
  bounties: any[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  onRefresh: () => void;
  onSelectParticipate: (bountyId: string) => void;
  onSelectSubmit: (bountyId: string) => void;
}

export function DiscoverTab({
  bounties,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  onSelectParticipate,
  onSelectSubmit,
}: DiscoverTabProps) {
  const filteredBounties = bounties.filter((b) => {
    const matchesSearch =
      searchQuery === "" ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "OPEN":
        return "badge-open";
      case "COMPETING":
        return "badge-competing";
      case "SETTLED":
        return "badge-settled";
      case "EVALUATING":
      case "RANKED":
        return "badge-evaluating";
      default:
        return "badge-expired";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Controls Bar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search tournaments by title, ID, or criteria..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ flex: "1 1 300px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="COMPETING">COMPETING</option>
          <option value="SUBMISSIONS_LOCKED">LOCKED</option>
          <option value="EVALUATING">EVALUATING</option>
          <option value="RANKED">RANKED</option>
          <option value="SETTLED">SETTLED</option>
        </select>
        <button onClick={onRefresh} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {/* Bounty Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filteredBounties.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            No tournaments match current filters.
          </div>
        ) : (
          filteredBounties.map((b) => (
            <div
              key={b.id}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      marginBottom: "0.35rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className={`badge ${getStatusBadgeClass(b.status)}`}>
                      {b.status}
                    </span>
                    <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                      ID: {b.id}
                    </span>
                    {b.competitionMode === "TOURNAMENT" && (
                      <span
                        className="badge"
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          border: "1px solid #e2e8f0",
                          fontSize: "0.72rem",
                        }}
                      >
                        TOURNAMENT ({b.competitorCount || 0}/{b.maxParticipants || 10})
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {b.title}
                  </h4>
                </div>

                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 800,
                      color: "var(--text-main)",
                    }}
                  >
                    ${b.rewardUsdc} <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 500 }}>USDC</span>
                  </div>
                </div>
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {b.description}
              </p>

              {/* Actions Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.85rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  Submissions: <strong style={{ color: "var(--text-main)" }}>{b.submissionCount || 0}</strong> • Passing Score: <strong style={{ color: "var(--text-main)" }}>{b.minPassingScore || 70}/100</strong>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => onSelectParticipate(b.id)}
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
                  >
                    Join
                  </button>
                  <button
                    onClick={() => onSelectSubmit(b.id)}
                    className="btn btn-primary"
                    style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
                  >
                    Submit
                  </button>
                  <Link
                    href={`/bounties/${b.id}`}
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", textDecoration: "none" }}
                  >
                    Details ↗
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
