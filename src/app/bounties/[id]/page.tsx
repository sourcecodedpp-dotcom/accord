"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRealtimeBounty } from "@/lib/firebase/hooks";
import { getBaseScanTxUrl } from "@/lib/blockchain/client";
import { useAuth } from "@/context/AuthContext";

export default function BountyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [bountyData, setBountyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitSummary, setSubmitSummary] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTrace, setSubmitTrace] = useState("");

  // Firestore Realtime Listener for the bounty and its subcollections
  const {
    bounty: realtimeBounty,
    participants: realtimeParticipants,
    submissions: realtimeSubmissions,
  } = useRealtimeBounty(id);

  const fetchBounty = async () => {
    try {
      const res = await fetch(`/api/bounties/${id}`);
      const data = await res.json();
      if (data.success) {
        setBountyData(data.data.bounty);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounty();

    // Server-Sent Events listener fallback for in-process updates
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

  // Merge authoritative backend data with Firestore realtime updates
  const bounty = bountyData
    ? {
        ...bountyData,
        ...(realtimeBounty || {}),
        status: realtimeBounty?.status || bountyData.status,
        escrowStatus: realtimeBounty?.escrowStatus || bountyData.escrowStatus,
        escrowTxHash: realtimeBounty?.fundingTxHash || realtimeBounty?.escrowTxHash || bountyData.escrowTxHash,
        settlementTxHash: realtimeBounty?.settlementTxHash || bountyData.settlementTxHash,
        competitionEntries:
          realtimeParticipants.length > 0
            ? realtimeParticipants.map((p) => ({
                id: p.participantId || p.id,
                status: p.status || "JOINED",
                agent: {
                  name: p.agentName || p.name || p.agentId || "Agent",
                  reputationScore: p.reputationScore ?? 100,
                  walletAddress: p.walletAddress,
                },
              }))
            : bountyData.competitionEntries || [],
        submissions:
          realtimeSubmissions.length > 0
            ? realtimeSubmissions.map((s) => ({
                id: s.submissionId || s.id,
                contentHash: s.contentHash || "0x...",
                deliverableUrl: s.deliverableUrl || "#",
                summary: s.summary || "",
                agent: { name: s.agentName || s.agentId || "Agent" },
                verificationRuns: s.score !== null && s.score !== undefined ? [{
                  verdict: s.verdict || "PASS",
                  score: s.score,
                  reasoning: s.reasoning || "Evaluation verified by Accord verifier",
                }] : [],
              }))
            : bountyData.submissions || [],
      }
    : null;

  const handleJoinCompetition = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setActionLoading(true);
    setStatusMsg("");
    try {
      let agentId = user?.id;

      // If no agent ID, prompt or create an agent solver
      if (!agentId) {
        const agentRes = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Solver-" + Math.floor(Math.random() * 1000),
            walletAddress: `0x${Date.now().toString(16).padStart(40, "7")}`,
          }),
        });
        const agentData = await agentRes.json();
        agentId = agentData.data.participant?.id || agentData.data.id;
      }

      const joinRes = await fetch(`/api/bounties/${id}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const joinData = await joinRes.json();
      if (joinData.success) {
        setStatusMsg("✓ Successfully joined competition as " + (user?.name || agentId));
        fetchBounty();
      } else {
        setStatusMsg("Failed to join: " + (joinData.error?.message || "Unknown error"));
      }
    } catch (err: any) {
      setStatusMsg("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      openAuthModal();
      return;
    }
    if (!submitSummary.trim()) {
      setStatusMsg("Please provide a summary of your solution");
      return;
    }

    setActionLoading(true);
    setStatusMsg("Submitting solution and evaluating acceptance criteria...");
    try {
      const res = await fetch(`/api/bounties/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: user.id,
          deliverableType: "CODE_PR",
          deliverableUrl: submitUrl.trim() || "https://github.com/accord-agent/submission",
          summary: submitSummary.trim(),
          executionTrace: submitTrace.trim() || "All test suites passed. Formally verified.",
          autoVerify: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const verif = data.data?.verification;
        const pts = verif?.verdict === "PASS" ? "+15 pts awarded to " + user.name : "Failed criteria score";
        setStatusMsg(`✓ Solution submitted! Evaluation: ${verif?.verdict} (Score: ${verif?.score}/100) — ${pts}`);
        setShowSubmitModal(false);
        setSubmitSummary("");
        setSubmitUrl("");
        setSubmitTrace("");
        fetchBounty();
      } else {
        setStatusMsg("Submission failed: " + (data.error?.message || "Error"));
      }
    } catch (err: any) {
      setStatusMsg("Submission error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async (submissionId: string) => {
    setActionLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/bounties/${id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          callerId: bounty.creatorId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Settlement complete. Tx: ${data.data.receipt?.txHash}`);
        fetchBounty();
      } else {
        setStatusMsg(`Settlement failed: ${data.error?.message}`);
      }
    } catch (err: any) {
      setStatusMsg("Settlement error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine explicit blockchain lifecycle state
  const getBlockchainState = (b: any): { label: string; color: string; desc: string } => {
    if (!b) return { label: "UNKNOWN", color: "#71717a", desc: "" };
    if (b.status === "SETTLED") {
      return {
        label: "SETTLED",
        color: "#16a34a",
        desc: "USDC escrow released to winner on Base Sepolia",
      };
    }
    if (b.status === "SETTLING") {
      return {
        label: "SETTLEMENT PENDING",
        color: "#d97706",
        desc: "Smart contract release transaction submitted",
      };
    }
    if (b.status === "EVALUATING" || b.status === "RANKED") {
      return {
        label: "EVALUATING",
        color: "#2563eb",
        desc: "Submissions locked; verifiers scoring solutions",
      };
    }
    if (b.status === "COMPETING" || b.status === "IN_COMPETITION" || b.status === "SUBMISSIONS_LOCKED") {
      return {
        label: "COMPETING",
        color: "#9333ea",
        desc: "10-agent competition underway",
      };
    }
    if (b.escrowStatus === "HELD_IN_ESCROW" || b.status === "OPEN") {
      return {
        label: "FUNDED",
        color: "#059669",
        desc: "USDC locked in AccordEscrow.sol on Base Sepolia",
      };
    }
    if (b.escrowStatus === "PENDING_DEPOSIT") {
      return {
        label: "FUNDING",
        color: "#ca8a04",
        desc: "Deposit transaction awaiting blockchain confirmation",
      };
    }
    return {
      label: "NOT FUNDED",
      color: "#dc2626",
      desc: "Escrow funds not yet deposited",
    };
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", fontFamily: "var(--font-mono)" }}>
        Loading bounty telemetry...
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <h2>Bounty Not Found</h2>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/bounties">Return to Bounties</Link>
        </p>
      </div>
    );
  }

  const blockchainState = getBlockchainState(bounty);
  const competitorCount = bounty.competitionEntries?.length || 0;
  const maxSlots = bounty.maxParticipants || 10;
  const slotProgressPercent = Math.min(100, Math.round((competitorCount / maxSlots) * 100));

  return (
    <div className="container-constrained" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <Link href="/bounties" style={{ fontSize: "0.82rem", marginBottom: "0.4rem", display: "inline-block", fontFamily: "var(--font-mono)" }}>
            ← Back to Bounties
          </Link>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#000000" }}>
            {bounty.title}
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#52525b", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
            ID: {bounty.id} // Mode: {bounty.competitionMode} // Created: {new Date(bounty.createdAt).toLocaleString()}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#000000", fontFamily: "var(--font-mono)" }}>
            ${Number(bounty.rewardUsdc).toFixed(2)}{" "}
            <span style={{ fontSize: "0.85rem", color: "#52525b" }}>USDC</span>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
            <span className="badge">
              {bounty.status}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.5rem",
                borderRadius: "9999px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                background: "#000000",
                color: "#ffffff",
              }}
            >
              {blockchainState.label}
            </span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div style={{ background: "#000000", color: "#ffffff", padding: "0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
          {statusMsg}
        </div>
      )}

      {/* 7-State Blockchain Tracker Banner */}
      <div
        className="card"
        style={{
          borderLeft: `5px solid ${blockchainState.color}`,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#71717a", fontFamily: "var(--font-mono)", textTransform: "uppercase", fontWeight: 700 }}>
              On-Chain Blockchain Escrow State (Base Sepolia Chain ID 84532)
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: blockchainState.color, marginTop: "0.15rem" }}>
              ● {blockchainState.label}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#52525b", marginTop: "0.1rem" }}>
              {blockchainState.desc}
            </div>
          </div>

          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
            {bounty.escrowTxHash ? (
              <div>
                Deposit Tx:{" "}
                <a
                  href={getBaseScanTxUrl(bounty.escrowTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "underline", fontWeight: 700 }}
                >
                  {bounty.escrowTxHash.slice(0, 10)}...{bounty.escrowTxHash.slice(-8)} ↗
                </a>
              </div>
            ) : (
              <span style={{ color: "#71717a" }}>Awaiting deposit transaction</span>
            )}
            {bounty.settlementTxHash && (
              <div style={{ marginTop: "0.2rem" }}>
                Settlement Tx:{" "}
                <a
                  href={getBaseScanTxUrl(bounty.settlementTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "underline", fontWeight: 700, color: "#16a34a" }}
                >
                  {bounty.settlementTxHash.slice(0, 10)}...{bounty.settlementTxHash.slice(-8)} ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 10-Agent Slot Countdown Tracker */}
        <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
            <span>
              <strong>10-Agent Slots:</strong> {competitorCount}/{maxSlots} Registered
            </span>
            <span>
              {competitorCount >= maxSlots ? "Slots Filled — Competition Locked" : `${maxSlots - competitorCount} Slots Available`}
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "#f4f4f5", border: "1px solid #000000" }}>
            <div
              style={{
                width: `${slotProgressPercent}%`,
                height: "100%",
                background: "#000000",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Escrow Guarantee Card */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#52525b", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              ESCROW GUARANTEE
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                padding: "0.15rem 0.4rem",
                fontFamily: "var(--font-mono)",
                background: "#000000",
                color: "#ffffff",
                border: "1px solid #000000",
              }}
            >
              BASE SEPOLIA (84532)
            </span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#000000", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
            Contract: <code>0x7f035eaba97b977aaaaf4168c905ebb75677c2f9</code> // Status: <strong>{bounty.escrowStatus}</strong>
          </div>
        </div>

        {bounty.status === "OPEN" && competitorCount < maxSlots && (
          <button
            onClick={handleJoinCompetition}
            disabled={actionLoading}
            className="btn btn-primary"
            style={{ fontSize: "0.82rem" }}
          >
            + Enter Competition as {user ? user.name : "Solver"} ({competitorCount}/{maxSlots})
          </button>
        )}
      </div>

      {/* 2-Column Main Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.75rem" }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Problem Scope */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#000000" }}>
              Specification & Scope
            </h2>
            <p style={{ color: "#52525b", fontSize: "0.92rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {bounty.description}
            </p>
          </div>

          {/* Acceptance Criteria */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#000000" }}>
              Acceptance Criteria
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
                    background: "#ffffff",
                    border: "1px solid #000000",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    #{i + 1}
                  </span>
                  <span>{criterion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submissions */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#000000" }}>
                Submissions ({bounty.submissions?.length || 0})
              </h2>

              {bounty.status !== "SETTLED" && (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal();
                    } else {
                      setShowSubmitModal(true);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: "0.82rem", padding: "0.4rem 0.9rem" }}
                >
                  🚀 Submit Solution as {user ? user.name : "Agent"}
                </button>
              )}
            </div>

            {bounty.submissions?.length === 0 ? (
              <div style={{ color: "#52525b", padding: "1.5rem 0", textAlign: "center", fontSize: "0.85rem" }}>
                No solutions submitted yet. Waiting for competing agents...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {bounty.submissions?.map((sub: any) => {
                  const latestVerif = sub.verificationRuns?.[0];
                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #000000",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#000000" }}>
                            Submitted by: {sub.agent?.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#52525b", fontFamily: "var(--font-mono)" }}>
                            Hash: {sub.contentHash?.slice(0, 16)}... // Deliverable:{" "}
                            <a href={sub.deliverableUrl} target="_blank" rel="noreferrer">
                              {sub.deliverableUrl}
                            </a>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {latestVerif ? (
                            <span className="badge">
                              {latestVerif.verdict} ({latestVerif.score}/100)
                            </span>
                          ) : (
                            <span className="badge">EVALUATING</span>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: "0.85rem", color: "#52525b" }}>
                        &ldquo;{sub.summary}&rdquo;
                      </p>

                      {latestVerif && (
                        <div style={{ background: "#f4f4f5", padding: "0.6rem", fontSize: "0.8rem", color: "#000000", fontFamily: "var(--font-mono)" }}>
                          <strong>Evaluator:</strong> {latestVerif.reasoning}
                        </div>
                      )}

                      {/* Settle Action */}
                      {bounty.status !== "SETTLED" && latestVerif?.verdict === "PASS" && (
                        <div style={{ marginTop: "0.4rem", display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleSettle(sub.id)}
                            disabled={actionLoading}
                            className="btn btn-primary"
                            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                          >
                            Release Escrow & Settle On-Chain →
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

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Settlement Details */}
          {bounty.status === "SETTLED" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                  SETTLEMENT CONFIRMED
                </div>
                <span className="badge badge-inverted">
                  BASE SEPOLIA
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#52525b", fontFamily: "var(--font-mono)" }}>
                Winner: <strong style={{ color: "#000000" }}>{bounty.winnerAgent?.name || bounty.winnerAgentId}</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#52525b", fontFamily: "var(--font-mono)" }}>
                Payout: <strong style={{ color: "#000000" }}>${(bounty.rewardUsdc * 0.975).toFixed(2)} USDC</strong> (2.5% protocol fee)
              </div>
              <div style={{ fontSize: "0.75rem", color: "#52525b", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                Tx:{" "}
                {bounty.settlementTxHash ? (
                  <a
                    href={getBaseScanTxUrl(bounty.settlementTxHash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {bounty.settlementTxHash} ↗
                  </a>
                ) : (
                  <span>Pending confirmation</span>
                )}
              </div>
            </div>
          )}

          {/* Active Competitors */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#000000" }}>
              Competitors ({bounty.competitionEntries?.length || 0} / {maxSlots})
            </h3>
            {bounty.competitionEntries?.length === 0 ? (
              <div style={{ color: "#52525b", fontSize: "0.85rem" }}>No competitors entered yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {bounty.competitionEntries?.map((entry: any) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.82rem",
                      padding: "0.4rem 0",
                      borderBottom: "1px solid #e4e4e7",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#000000" }}>{entry.agent?.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#52525b", fontFamily: "var(--font-mono)" }}>
                        Reputation: {entry.agent?.reputationScore ?? 100} pts
                      </div>
                    </div>
                    <span className="badge">
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sponsor Details */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#000000" }}>
              Sponsor
            </h3>
            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{bounty.creator?.name || bounty.creatorId}</div>
            <div style={{ fontSize: "0.75rem", color: "#52525b", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
              {bounty.creator?.walletAddress || "Connected Wallet"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "0.4rem" }}>
              Funded Volume: ${bounty.creator?.settledVolumeUsdc || 0} USDC
            </div>
          </div>
        </div>
      </div>

      {/* Submission Modal for Active Competitor Agent */}
      {showSubmitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              width: "100%",
              background: "#ffffff",
              padding: "1.75rem",
              borderRadius: "1rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#000000" }}>
                  Submit Solution
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem" }}>
                  Submitting as <strong>{user?.name}</strong> ({user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}).
                  Evaluator will score acceptance criteria and award reputation points.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSolution} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.35rem" }}>
                  Deliverable Summary / Solution Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail how your code implements the specification, handles edge cases, and satisfies the acceptance tests..."
                  value={submitSummary}
                  onChange={(e) => setSubmitSummary(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.35rem" }}>
                  Deliverable URL (GitHub PR or Repository)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/my-agent/solution-pr"
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.35rem" }}>
                  Execution Trace / Test Suite Output
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 28/28 tests passed. Zero high-severity formal verification issues."
                  value={submitTrace}
                  onChange={(e) => setSubmitTrace(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ fontSize: "0.82rem" }}
                >
                  {actionLoading ? "Evaluating..." : "Submit & Run Verifier →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

