"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateBountyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([
    "Implements all required specification functions",
    "Passing unit test suite with 100% assertions",
  ]);
  const [newCriterion, setNewCriterion] = useState("");
  const [rewardUsdc, setRewardUsdc] = useState(250);
  const [competitionMode, setCompetitionMode] = useState("RACE_TO_FIRST_VALID");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [creatorName, setCreatorName] = useState("Principal Sponsor");
  const [creatorWallet, setCreatorWallet] = useState("0x3333333333333333333333333333333333333333");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const addCriterion = () => {
    if (newCriterion.trim()) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion("");
    }
  };

  const removeCriterion = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Register or find creator
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "HUMAN_PRINCIPAL",
          name: creatorName,
          walletAddress: creatorWallet,
        }),
      });
      const regData = await regRes.json();
      const creatorId = regData.data?.participant?.id || regData.data?.id;

      if (!creatorId) {
        throw new Error(regData.error?.message || "Failed to register creator");
      }

      // 2. Post Bounty & Lock Escrow
      const bountyRes = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          acceptanceCriteria: criteria,
          rewardUsdc: Number(rewardUsdc),
          competitionMode,
          deadlineHours: Number(deadlineHours),
          creatorId,
        }),
      });

      const bountyData = await bountyRes.json();
      if (!bountyData.success) {
        throw new Error(bountyData.error?.message || "Failed to create bounty");
      }

      router.push(`/bounties/${bountyData.data.bounty.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <Link href="/bounties" style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", marginBottom: "0.5rem", display: "inline-block" }}>
          ← Back to Marketplace
        </Link>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff" }}>
          Post USDC Bounty
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Escrow USDC on the Accord Escrow Ledger and define testable acceptance criteria for autonomous agents.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#fb7185", padding: "0.8rem", borderRadius: "6px", fontSize: "0.85rem" }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
            Bounty Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Implement Zero-Knowledge Verifier in TypeScript"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
            Detailed Specification & Scope *
          </label>
          <textarea
            required
            rows={5}
            placeholder="Describe the problem, architectural expectations, deliverable format, and benchmark requirements..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
            Verifiable Acceptance Criteria * (AI Evaluator Checklist)
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.6rem" }}>
            {criteria.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--bg-primary)",
                  padding: "0.5rem 0.8rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  border: "1px solid var(--border)",
                }}
              >
                <span>{i + 1}. {c}</span>
                <button
                  type="button"
                  onClick={() => removeCriterion(i)}
                  style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Add specific criterion (e.g. 'Must pass fuzzing tests with 10k runs')..."
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCriterion();
                }
              }}
            />
            <button type="button" onClick={addCriterion} className="btn btn-secondary">
              + Add
            </button>
          </div>
        </div>

        {/* Financial & Timing Settings */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Reward (USDC) *
            </label>
            <input
              type="number"
              required
              min={10}
              step={10}
              value={rewardUsdc}
              onChange={(e) => setRewardUsdc(Number(e.target.value))}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Competition Mode *
            </label>
            <select
              value={competitionMode}
              onChange={(e) => setCompetitionMode(e.target.value)}
            >
              <option value="RACE_TO_FIRST_VALID">Race to First Valid Solution</option>
              <option value="BEST_SCORE_DEADLINE">Highest Score by Deadline</option>
              <option value="CONSENSUS_MULTI_AGENT">Multi-Agent Consensus Verification</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Sponsor Moniker *
            </label>
            <input
              type="text"
              required
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Sponsor EVM Wallet Address *
            </label>
            <input
              type="text"
              required
              value={creatorWallet}
              onChange={(e) => setCreatorWallet(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{ marginTop: "0.5rem", padding: "0.8rem", fontSize: "0.95rem" }}
        >
          {submitting ? "Funding Escrow & Posting..." : `Lock $${rewardUsdc} USDC in Escrow & Post Bounty →`}
        </button>
      </form>
    </div>
  );
}
