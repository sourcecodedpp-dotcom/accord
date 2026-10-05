"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function BountyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bounty, setBounty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchBounty = async () => {
    try {
      const res = await fetch(`/api/bounties/${id}`);
      const data = await res.json();
      if (data.success) {
        setBounty(data.data.bounty);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounty();

    // Listen to live events for this bounty
    if (typeof EventSource !== "undefined") {
      const source = new EventSource("/api/events");
      source.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data);
          if (
            evt.payload?.bountyId === id ||
            evt.entityId === id ||
            evt.type.startsWith("bounty.")
          ) {
            fetchBounty();
          }
        } catch {}
      };
      return () => source.close();
    }
  }, [id]);

  // Quick Action: Join Competition
  const handleQuickJoin = async () => {
    setActionLoading(true);
    setStatusMsg("");
    try {
      // Register or find agent
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Agent-Solver-" + Math.floor(Math.random() * 1000),
          walletAddress: `0x${Date.now().toString(16).padStart(40, "7")}`,
        }),
      });
      const agentData = await agentRes.json();
      const agentId = agentData.data.participant?.id || agentData.data.id;

      const joinRes = await fetch(`/api/bounties/${id}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const joinData = await joinRes.json();
      if (joinData.success) {
        setStatusMsg(`✅ Joined competition as ${agentId}!`);
        fetchBounty();
      } else {
        setStatusMsg(`❌ Error: ${joinData.error?.message}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Settle Bounty
  const handleSettle = async (submissionId: string) => {
    setActionLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/bounties/${id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`🎉 Bounty settled! Released $${data.data.netPayoutUsdc} USDC.`);
        fetchBounty();
      } else {
        setStatusMsg(`❌ Settlement error: ${data.error?.message}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--text-dim)", padding: "3rem", textAlign: "center" }}>Loading bounty...</div>;
  }

  if (!bounty) {
    return <div className="card" style={{ textAlign: "center", padding: "3rem" }}>Bounty not found.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Breadcrumb & Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <Link href="/bounties" style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", marginBottom: "0.4rem", display: "inline-block" }}>
            ← Back to Marketplace
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#ffffff" }}>
            {bounty.title}
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
            Bounty ID: {bounty.id} • Mode: {bounty.competitionMode} • Created: {new Date(bounty.createdAt).toLocaleString()}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
            ${bounty.rewardUsdc.toFixed(2)}{" "}
            <span style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>USDC</span>
          </div>
          <span className={`badge badge-${bounty.status.toLowerCase()}`}>
            {bounty.status}
          </span>
        </div>
      </div>

      {statusMsg && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--accent-cyan)", padding: "0.75rem", borderRadius: "6px", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
          {statusMsg}
        </div>
      )}

      {/* Escrow Telemetry Card */}
      <div className="card" style={{ background: "rgba(6, 182, 212, 0.04)", borderColor: "rgba(6, 182, 212, 0.25)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            ESCROW LEDGER GUARANTEE
          </div>
          <div style={{ fontSize: "0.95rem", color: "#38bdf8", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
            Status: <strong>{bounty.escrowStatus}</strong> • Deposit Hash: <code style={{ color: "#f8fafc" }}>{bounty.escrowTxHash?.slice(0, 18)}...</code>
          </div>
        </div>

        {bounty.status === "OPEN" && (
          <button
            onClick={handleQuickJoin}
            disabled={actionLoading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            + Enter Competition as Agent
          </button>
        )}
      </div>

      {/* 2-Column Main Layout: Description & Side Telemetry */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.75rem" }}>
        {/* Left Column: Scope, Criteria, Submissions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Specification */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>
              Specification & Problem Scope
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {bounty.description}
            </p>
          </div>

          {/* Acceptance Criteria Checklist */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>
              Verifiable Acceptance Criteria
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {bounty.acceptanceCriteria?.map((criterion: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-primary)",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    fontSize: "0.88rem",
                  }}
                >
                  <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
                    #{i + 1}
                  </span>
                  <span>{criterion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submissions & AI Verification Scores */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>
                Submissions ({bounty.submissions?.length || 0})
              </h2>
            </div>

            {bounty.submissions?.length === 0 ? (
              <div style={{ color: "var(--text-dim)", padding: "1.5rem 0", textAlign: "center", fontSize: "0.9rem" }}>
                No solutions submitted yet. Agents are actively competing.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {bounty.submissions?.map((sub: any) => {
                  const latestVerif = sub.verificationRuns?.[0];
                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                            Submitted by: {sub.agent?.name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                            Hash: {sub.contentHash.slice(0, 16)}... • Deliverable: <a href={sub.deliverableUrl} target="_blank" rel="noreferrer">{sub.deliverableUrl}</a>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {latestVerif ? (
                            <span className={`badge ${latestVerif.verdict === "PASS" ? "badge-open" : "badge-expired"}`}>
                              {latestVerif.verdict} ({latestVerif.score}/100)
                            </span>
                          ) : (
                            <span className="badge badge-evaluating">EVALUATING</span>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        &ldquo;{sub.summary}&rdquo;
                      </p>

                      {latestVerif && (
                        <div style={{ background: "rgba(0, 0, 0, 0.2)", padding: "0.6rem", borderRadius: "4px", fontSize: "0.8rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                          <strong>AI Evaluator:</strong> {latestVerif.reasoning}
                        </div>
                      )}

                      {/* Settlement Action Button */}
                      {bounty.status !== "SETTLED" && latestVerif?.verdict === "PASS" && (
                        <div style={{ marginTop: "0.4rem", display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleSettle(sub.id)}
                            disabled={actionLoading}
                            className="btn btn-success"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                          >
                            Release Escrow & Settle Winner →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Competitors, Sponsor, Settlement View */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Settlement Card if Settled */}
          {bounty.status === "SETTLED" && (
            <div className="card" style={{ background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.3)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ color: "#34d399", fontWeight: 700, fontSize: "0.95rem" }}>
                🎉 SETTLED ON-CHAIN
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Winner: <strong>{bounty.winnerAgent?.name}</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Payout: <strong>${(bounty.rewardUsdc * 0.975).toFixed(2)} USDC</strong> (2.5% protocol fee)
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                Tx: {bounty.settlementTxHash}
              </div>
            </div>
          )}

          {/* Active Competitors */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Competing Agents ({bounty.competitionEntries?.length || 0})
            </h3>
            {bounty.competitionEntries?.length === 0 ? (
              <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No agents entered yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {bounty.competitionEntries?.map((entry: any) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.85rem",
                      padding: "0.4rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>{entry.agent?.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        Reputation: {entry.agent?.reputationScore} pts
                      </div>
                    </div>
                    <span className="badge badge-open" style={{ fontSize: "0.7rem" }}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bounty Sponsor Details */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Sponsor Principal
            </h3>
            <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{bounty.creator?.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
              {bounty.creator?.walletAddress}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
              Total Volume Funded: ${bounty.creator?.settledVolumeUsdc || 0} USDC
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
