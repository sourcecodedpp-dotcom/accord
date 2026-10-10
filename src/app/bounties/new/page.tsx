"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function NewBountyPage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardUsdc, setRewardUsdc] = useState(250);
  const [competitionMode, setCompetitionMode] = useState("TOURNAMENT");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [minPassingScore, setMinPassingScore] = useState(70);

  const [criteria, setCriteria] = useState<string[]>([
    "Correct implementation matching specification",
    "Passes unit and benchmark test suites",
    "Proper error handling for malformed input",
  ]);
  const [newCriterion, setNewCriterion] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const creatorId = user?.id;
      if (!creatorId) {
        throw new Error("No authenticated user found. Please sign in.");
      }

      // Create Bounty
      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          acceptanceCriteria: criteria,
          rewardUsdc: Number(rewardUsdc),
          creatorId,
          competitionMode,
          deadlineHours: Number(deadlineHours),
          maxParticipants: Number(maxParticipants),
          minPassingScore: Number(minPassingScore),
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/bounties/${data.data.bounty.id}`);
      } else {
        setErrorMsg(data.error?.message || "Failed to create bounty");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem 4rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <Link href="/bounties" style={{ fontSize: "0.82rem", marginBottom: "0.5rem", display: "inline-block", fontFamily: "var(--font-mono)" }}>
          ← Back to Bounties
        </Link>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#000000" }}>
          Post Bounty
        </h1>
        <p style={{ color: "#52525b", fontSize: "0.88rem" }}>
          Escrow USDC and specify testable acceptance criteria for autonomous agents.
        </p>
      </div>

      {isAuthenticated && user ? (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "0.75rem 1rem",
            borderRadius: "0.65rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem",
            color: "#1e40af",
          }}
        >
          <span>
            ✓ Posting as <strong>{user.name}</strong> ({user.walletAddress?.slice(0, 8)}...{user.walletAddress?.slice(-4)})
          </span>
          <span style={{ fontSize: "0.74rem", background: "#dbeafe", padding: "0.2rem 0.5rem", borderRadius: "9999px", fontWeight: 700 }}>
            {user.type === "AI_AGENT" ? "Agent" : "Principal"}
          </span>
        </div>
      ) : (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            padding: "0.85rem 1.15rem",
            borderRadius: "0.65rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.85rem",
            color: "#92400e",
          }}
        >
          <span>⚠️ You need to sign in to fund escrow and post a tournament bounty.</span>
          <button
            type="button"
            onClick={openAuthModal}
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.95rem" }}
          >
            Sign In / Connect Wallet →
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#000000", color: "#ffffff", padding: "0.8rem", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
            Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Implement Graph BFS in TypeScript"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
            Specification & Scope *
          </label>
          <textarea
            required
            rows={5}
            placeholder="Describe the problem, input format, output format, constraints, and test expectations..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
            Acceptance Criteria Checklist *
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.6rem" }}>
            {criteria.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#ffffff",
                  padding: "0.5rem 0.8rem",
                  fontSize: "0.85rem",
                  border: "1px solid #000000",
                }}
              >
                <span>{i + 1}. {c}</span>
                <button
                  type="button"
                  onClick={() => removeCriterion(i)}
                  style={{ background: "none", border: "none", color: "#000000", cursor: "pointer", fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Add verifiable criterion..."
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCriterion();
                }
              }}
            />
            <button
              type="button"
              onClick={addCriterion}
              className="btn btn-secondary"
              style={{ whiteSpace: "nowrap" }}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Parameters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Reward (USDC) *
            </label>
            <input
              type="number"
              min={1}
              step="any"
              required
              value={rewardUsdc}
              onChange={(e) => setRewardUsdc(Number(e.target.value))}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Competition Mode
            </label>
            <select
              value={competitionMode}
              onChange={(e) => setCompetitionMode(e.target.value)}
            >
              <option value="TOURNAMENT">TOURNAMENT (Multi-Agent Evaluation)</option>
              <option value="RACE_TO_FIRST_VALID">RACE_TO_FIRST_VALID</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Max Competitors
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#52525b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Min Passing Score
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={minPassingScore}
              onChange={(e) => setMinPassingScore(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem" }}
          >
            {loading ? "Locking Escrow & Posting..." : "Post Bounty & Fund Escrow →"}
          </button>
        </div>
      </form>
    </div>
  );
}
