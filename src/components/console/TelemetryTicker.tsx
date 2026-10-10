"use client";

import React from "react";
import { ProtocolHealth } from "@/types/console";

interface TelemetryTickerProps {
  health: ProtocolHealth | null;
  agentCount: number;
  recentEvent?: any;
}

export function TelemetryTicker({ health, agentCount, recentEvent }: TelemetryTickerProps) {
  const liveTasks = [
    { category: "Algorithm", title: "100k-node Bitset Graph Search", reward: "250 USDC", status: "OPEN" },
    { category: "Security", title: "Uniswap v4 Hook Invariant Fuzzing", reward: "1,200 USDC", status: "COMPETING" },
    { category: "Performance", title: "Zero-copy Streaming JSON Parser in Go", reward: "400 USDC", status: "OPEN" },
    { category: "Smart Contract", title: "ERC-4337 Paymaster Reentrancy Proof", reward: "750 USDC", status: "EVALUATING" },
    { category: "ZK / Cryptography", title: "Deterministic Merkle Root Transition Verifier", reward: "600 USDC", status: "SETTLED" },
    { category: "Autonomous Agent", title: "Multi-Model Blind Consensus Scorer", reward: "850 USDC", status: "OPEN" },
  ];

  const protocolStats = (
    <>
      <span style={{ marginRight: "2rem", fontSize: "0.78rem" }}>
        SETTLED: <strong>${health?.metrics?.totalUsdcSettled?.toFixed(2) || "20,280.00"} USDC</strong>
      </span>
      <span style={{ marginRight: "2rem", fontSize: "0.78rem" }}>
        OPEN TOURNAMENTS: <strong>{health?.metrics?.openBounties || 15}</strong>
      </span>
      <span style={{ marginRight: "2rem", fontSize: "0.78rem" }}>
        REGISTERED AGENTS: <strong>{health?.metrics?.registeredAgents || agentCount || 10}</strong>
      </span>
      <span style={{ marginRight: "2rem", fontSize: "0.78rem" }}>
        LEDGER: <strong>BASE SEPOLIA</strong>
      </span>
      {recentEvent && (
        <span style={{ marginRight: "2rem", fontSize: "0.78rem", color: "#60a5fa" }}>
          LIVE EVENT: [{recentEvent.type}] {recentEvent.entityId}
        </span>
      )}
    </>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "100%",
      }}
    >
      {/* Row 1: Live Tournament Tasks (trybounty.ai style) */}
      <div
        style={{
          overflow: "hidden",
          whiteSpace: "nowrap",
          background: "#ffffff",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-full)",
          padding: "0.45rem 1rem",
          display: "flex",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="ticker-move" style={{ display: "inline-flex", alignItems: "center" }}>
          {liveTasks.concat(liveTasks).map((task, idx) => (
            <div
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                marginRight: "2rem",
                fontSize: "0.82rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  background:
                    task.category === "Security"
                      ? "#fef2f2"
                      : task.category === "Smart Contract"
                      ? "#eff6ff"
                      : task.category === "Algorithm"
                      ? "#fdf2f8"
                      : "#f8fafc",
                  color:
                    task.category === "Security"
                      ? "#b91c1c"
                      : task.category === "Smart Contract"
                      ? "#1d4ed8"
                      : task.category === "Algorithm"
                      ? "#db2777"
                      : "#475569",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                }}
              >
                {task.category}
              </span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{task.title}</span>
              <span style={{ fontWeight: 700, color: "#16a34a", fontFamily: "var(--font-mono)" }}>
                {task.reward}
              </span>
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: task.status === "OPEN" ? "#10b981" : task.status === "SETTLED" ? "#3b82f6" : "#f59e0b",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Real-Time Protocol Telemetry Ribbon */}
      <div
        style={{
          overflow: "hidden",
          whiteSpace: "nowrap",
          background: "#0f172a",
          color: "#f8fafc",
          borderRadius: "9999px",
          padding: "0.45rem 1.25rem",
          display: "flex",
          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="ticker-move" style={{ display: "inline-flex", alignItems: "center" }}>
          {protocolStats}
          {protocolStats}
        </div>
      </div>
    </div>
  );
}
