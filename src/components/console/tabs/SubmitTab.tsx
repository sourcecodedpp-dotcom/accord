"use client";

import React from "react";
import { ParticipantProfile } from "@/types/console";

interface SubmitTabProps {
  subBountyId: string;
  onBountyIdChange: (id: string) => void;
  subDeliverableType: string;
  onDeliverableTypeChange: (t: string) => void;
  subUrl: string;
  onUrlChange: (u: string) => void;
  subSummary: string;
  onSummaryChange: (s: string) => void;
  subTrace: string;
  onTraceChange: (t: string) => void;
  loading: boolean;
  activeAgent: ParticipantProfile | null;
  onSubmit: (e: React.FormEvent) => void;
  subResult: any;
}

export function SubmitTab({
  subBountyId,
  onBountyIdChange,
  subDeliverableType,
  onDeliverableTypeChange,
  subUrl,
  onUrlChange,
  subSummary,
  onSummaryChange,
  subTrace,
  onTraceChange,
  loading,
  activeAgent,
  onSubmit,
  subResult,
}: SubmitTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
      {/* Submission Form */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Submit Solution Deliverable
        </h3>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Tournament ID
            </label>
            <input
              type="text"
              placeholder="e.g. bounty_base_sepolia_4754f9"
              value={subBountyId}
              onChange={(e) => onBountyIdChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Deliverable Type
            </label>
            <select
              value={subDeliverableType}
              onChange={(e) => onDeliverableTypeChange(e.target.value)}
            >
              <option value="CODE_PR">CODE_PR (Pull Request / Code Repository)</option>
              <option value="DATA_ARTIFACT">DATA_ARTIFACT (Output Dataset)</option>
              <option value="SMART_CONTRACT">SMART_CONTRACT (Verified Contract)</option>
              <option value="API_ENDPOINT">API_ENDPOINT (HTTP Service Endpoint)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Deliverable URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/..."
              value={subUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Summary
            </label>
            <textarea
              rows={3}
              placeholder="Describe your implementation, tests, and coverage..."
              value={subSummary}
              onChange={(e) => onSummaryChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Execution Trace / Benchmark Log
            </label>
            <textarea
              rows={3}
              placeholder="Benchmark output, passing test suite logs..."
              value={subTrace}
              onChange={(e) => onTraceChange(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !activeAgent}
            className="btn btn-primary"
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? "Verifying..." : "Submit Solution & Run Verification"}
          </button>
        </form>
      </div>

      {/* Verification Output */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Verification Output
        </h3>

        {subResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Score Banner */}
            <div
              style={{
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: "1rem",
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", fontWeight: 600 }}>
                  VERDICT
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                  {subResult.verification?.verdict || "RECORDED"}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", fontWeight: 600 }}>
                  SCORE
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#60a5fa" }}>
                  {subResult.verification?.score ?? "N/A"}/100
                </div>
              </div>
            </div>

            {/* Rubric Breakdown */}
            {subResult.verification?.breakdown && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="stat-box" style={{ padding: "0.75rem 1rem" }}>
                  <div className="stat-label">Correctness</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "0.2rem" }}>
                    {subResult.verification.breakdown.correctness}/100
                  </div>
                </div>
                <div className="stat-box" style={{ padding: "0.75rem 1rem" }}>
                  <div className="stat-label">Completeness</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "0.2rem" }}>
                    {subResult.verification.breakdown.completeness}/100
                  </div>
                </div>
                <div className="stat-box" style={{ padding: "0.75rem 1rem" }}>
                  <div className="stat-label">Security & Robustness</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "0.2rem" }}>
                    {subResult.verification.breakdown.securityAndRobustness}/100
                  </div>
                </div>
                <div className="stat-box" style={{ padding: "0.75rem 1rem" }}>
                  <div className="stat-label">Performance</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "0.2rem" }}>
                    {subResult.verification.breakdown.performanceAndEfficiency}/100
                  </div>
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "1rem",
                fontSize: "0.85rem",
                color: "var(--text-main)",
                lineHeight: 1.5,
              }}
            >
              <div style={{ color: "var(--text-muted)", marginBottom: "0.35rem", fontWeight: 700, fontSize: "0.78rem" }}>
                EVALUATOR REASONING:
              </div>
              <div>{subResult.verification?.reasoning || "Evaluation processed and recorded in ledger."}</div>
            </div>

            {/* SHA-256 Fingerprint */}
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
              SHA-256: {subResult.submission?.contentHash}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "2.5rem 0", textAlign: "center" }}>
            Submit a solution to view multi-verifier consensus scoring and rubric breakdown.
          </div>
        )}
      </div>
    </div>
  );
}
