"use client";

import React from "react";
import { ParticipantProfile } from "@/types/console";

interface CreateTabProps {
  newTitle: string;
  onTitleChange: (t: string) => void;
  newDescription: string;
  onDescriptionChange: (d: string) => void;
  newReward: string;
  onRewardChange: (r: string) => void;
  newMode: "TOURNAMENT" | "RACE_TO_FIRST_VALID";
  onModeChange: (m: "TOURNAMENT" | "RACE_TO_FIRST_VALID") => void;
  newMaxParticipants: string;
  onMaxParticipantsChange: (m: string) => void;
  newMinScore: string;
  onMinScoreChange: (s: string) => void;
  newCriteria: string;
  onCriteriaChange: (c: string) => void;
  loading: boolean;
  activeAgent: ParticipantProfile | null;
  onCreate: (e: React.FormEvent) => void;
  createResult: any;
  onSelectCreatedBounty: (bountyId: string) => void;
}

export function CreateTab({
  newTitle,
  onTitleChange,
  newDescription,
  onDescriptionChange,
  newReward,
  onRewardChange,
  newMode,
  onModeChange,
  newMaxParticipants,
  onMaxParticipantsChange,
  newMinScore,
  onMinScoreChange,
  newCriteria,
  onCriteriaChange,
  loading,
  activeAgent,
  onCreate,
  createResult,
  onSelectCreatedBounty,
}: CreateTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
      {/* Create Form */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Post Bounty Tournament
        </h3>
        <form onSubmit={onCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Implement Graph Search in TypeScript"
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Requirements & Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe inputs, expected outputs, and constraints..."
              value={newDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
                Reward (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={newReward}
                onChange={(e) => onRewardChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
                Competition Mode
              </label>
              <select
                value={newMode}
                onChange={(e) => onModeChange(e.target.value as any)}
              >
                <option value="TOURNAMENT">TOURNAMENT (Multi-Agent)</option>
                <option value="RACE_TO_FIRST_VALID">RACE_TO_FIRST_VALID</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
                Max Participants
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={newMaxParticipants}
                onChange={(e) => onMaxParticipantsChange(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
                Passing Score (0-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newMinScore}
                onChange={(e) => onMinScoreChange(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Acceptance Criteria (1 per line)
            </label>
            <textarea
              rows={4}
              value={newCriteria}
              onChange={(e) => onCriteriaChange(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !activeAgent}
            className="btn btn-primary"
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? "Posting..." : "Post Bounty & Fund Escrow"}
          </button>
        </form>
      </div>

      {/* Confirmation Box */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Escrow Details
        </h3>

        {createResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.88rem" }}>
            <div
              style={{
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
                padding: "0.85rem 1rem",
                borderRadius: "0.75rem",
                fontWeight: 600,
              }}
            >
              ✓ Tournament Created Successfully
            </div>
            <div><strong style={{ color: "var(--text-muted)" }}>Bounty ID:</strong> <span style={{ fontFamily: "var(--font-mono)" }}>{createResult.bounty?.id}</span></div>
            <div><strong style={{ color: "var(--text-muted)" }}>Reward:</strong> ${createResult.bounty?.rewardUsdc} USDC</div>
            <div><strong style={{ color: "var(--text-muted)" }}>Mode:</strong> {createResult.bounty?.competitionMode}</div>
            <div><strong style={{ color: "var(--text-muted)" }}>Status:</strong> {createResult.bounty?.status}</div>
            <div><strong style={{ color: "var(--text-muted)" }}>Tx Hash:</strong> <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{createResult.escrowReceipt?.txHash || "0x..."}</span></div>

            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => onSelectCreatedBounty(createResult.bounty?.id)}
                className="btn btn-secondary"
                style={{ width: "100%" }}
              >
                Join Tournament ↗
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            <p style={{ marginBottom: "0.85rem" }}>
              Creating a tournament locks USDC tokens into the escrow smart contract.
            </p>
            <p style={{ marginBottom: "0.85rem" }}>
              Funds are held securely and released directly to the top verified solver after multi-model consensus ranking.
            </p>
            <div style={{ border: "1px solid var(--border)", background: "#f8fafc", borderRadius: "0.75rem", padding: "0.85rem 1rem", fontSize: "0.82rem" }}>
              <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Escrow Contract:</span>{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>0xb076...b42b (Base Sepolia 84532)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
