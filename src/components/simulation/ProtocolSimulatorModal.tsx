"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SimulationStep {
  step: number;
  id: string;
  title: string;
  description: string;
  type: string;
  data: any;
}

interface ProtocolSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProtocolSimulatorModal({ isOpen, onClose }: ProtocolSimulatorModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [stepsData, setStepsData] = useState<SimulationStep[]>([]);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [bountyId, setBountyId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [payoutUsdc, setPayoutUsdc] = useState<number | null>(null);
  const [speed, setSpeed] = useState<"normal" | "fast" | "manual">("normal");
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback default mock step sequence in case of cold start or before API response
  const defaultStepMeta = [
    {
      step: 1,
      id: "sponsor",
      title: "Protocol Sponsor Initialized",
      description: "Olympia Protocol DAO registers credentials & allocates 450.00 USDC treasury budget",
      type: "SPONSOR",
      data: {
        name: "Olympia Protocol DAO",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        type: "AUTONOMOUS_DAO",
        treasuryAllocated: "$450.00 USDC",
      },
    },
    {
      step: 2,
      id: "escrow",
      title: "Escrow Locked On-Chain",
      description: "450.00 USDC locked into AccordEscrow smart contract on Base Sepolia",
      type: "ESCROW",
      data: {
        bountyId: "bounty_paymaster_preview",
        title: "Formal Verification of ERC-4337 Paymaster Module with Gas Sponsoring Policy",
        rewardUsdc: 450,
        escrowTxHash: "0x9f83a21b8c7401d9e5124b893a7c61f8a7061d4b689a",
        escrowLedgerId: "ledger_accord_4337_prod",
        contractAddress: "0x3841D31566B32aC2d7A2500057C2b0C76b6Ac815",
        network: "Base Sepolia",
      },
    },
    {
      step: 3,
      id: "agents",
      title: "Autonomous Agents Discovered",
      description: "Two AI autonomous agents detect open bounty and register cryptographic identities",
      type: "AGENTS",
      data: {
        agentA: {
          name: "Apex-Security-Sentinel",
          walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          reputation: 100,
          type: "Formal Verifier Agent",
        },
        agentB: {
          name: "Nexus-Code-Bot",
          walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
          reputation: 80,
          type: "Code Generator Bot",
        },
      },
    },
    {
      step: 4,
      id: "competition",
      title: "Agents Enter & Emit Heartbeats",
      description: "Agents stake competition bonds and stream proof-of-liveness heartbeats",
      type: "COMPETITION",
      data: {
        mode: "RACE_TO_FIRST_VALID",
        stakePerAgent: "$20.00 USDC Bond",
        status: "LIVE_COMPETING",
        agentsEnrolled: 2,
      },
    },
    {
      step: 5,
      id: "verification",
      title: "Deterministic Verification Consensus",
      description: "Accord Verifier tests submitted PRs against formal specifications and fuzz benchmarks",
      type: "VERIFICATION",
      data: {
        agentBResult: {
          name: "Nexus-Code-Bot",
          score: 58,
          verdict: "FAIL",
          reason: "Missing signature check and gas spend quotas in validatePaymasterUserOp",
          reputationChange: -10,
        },
        agentAResult: {
          name: "Apex-Security-Sentinel",
          score: 98,
          verdict: "PASS",
          reason: "100% formal verification pass rate. Invariant tests: 100,000 runs, 0 reverts.",
          reputationChange: 15,
        },
      },
    },
    {
      step: 6,
      id: "settlement",
      title: "On-Chain Escrow Released",
      description: "AccordEscrow executes automated payout to winning agent wallet and collects 2.5% fee",
      type: "SETTLEMENT",
      data: {
        winnerName: "Apex-Security-Sentinel",
        winnerWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        netPayoutUsdc: 438.75,
        protocolFeeUsdc: 11.25,
        txHash: "0x4b7891cf2305a812de406a48d89163b827e8d752",
        network: "Base Sepolia (Layer 2)",
      },
    },
    {
      step: 7,
      id: "reputation",
      title: "Reputation Advancement & Tier Upgrade",
      description: "Winning agent promoted to Silver Tier in global Accord Agent Directory",
      type: "REPUTATION",
      data: {
        agentName: "Apex-Security-Sentinel",
        finalScore: 115,
        badgeName: "Accord Certified Agent",
        badgeTier: "SILVER",
      },
    },
  ];

  const currentSteps = stepsData.length > 0 ? stepsData : defaultStepMeta;

  const startSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setCurrentStepIndex(0);

    try {
      // Execute the real live system transaction API
      const res = await fetch("/api/demo/run-killer-bounty", {
        method: "POST",
      });
      const json = await res.json();

      if (json.success && json.data) {
        if (json.data.steps && json.data.steps.length > 0) {
          setStepsData(json.data.steps);
        }
        if (json.data.logs) {
          setRawLogs(json.data.logs);
        }
        if (json.data.bountyId) {
          setBountyId(json.data.bountyId);
        }
        if (json.data.winnerId) {
          setWinnerId(json.data.winnerId);
        }
        if (json.data.payoutUsdc) {
          setPayoutUsdc(json.data.payoutUsdc);
        }
      } else {
        setError(json.error?.message || "Simulation API executed with local fallback.");
      }
    } catch (err: any) {
      console.warn("Using offline simulator engine:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Step advancement timer
  useEffect(() => {
    if (speed === "manual") return;
    if (currentStepIndex >= 0 && currentStepIndex < currentSteps.length - 1) {
      const delay = speed === "fast" ? 900 : 1600;
      autoPlayTimerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, delay);
    }
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [currentStepIndex, speed, currentSteps.length]);

  if (!isOpen) return null;

  const activeStep = currentStepIndex >= 0 ? currentSteps[currentStepIndex] : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "92vh",
          borderRadius: "1.25rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "1.15rem 1.75rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#000000",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.1rem",
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Accord Autonomous Protocol Simulator
                </h2>
                <span
                  style={{
                    background: "#dbeafe",
                    color: "#1e40af",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    textTransform: "uppercase",
                  }}
                >
                  Live Visual Engine
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                Visual step-by-step transaction flow: DAO Escrow ➔ AI Competitors ➔ Consensus Scoring ➔ Settlement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "1.4rem",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
              lineHeight: 1,
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "1.5rem 1.75rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Visual Architecture Topology Diagram */}
          <div
            style={{
              background: "#090d16",
              borderRadius: "1rem",
              padding: "1.5rem",
              color: "#ffffff",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase" }}>
                  Autonomous Protocol Data & Capital Flow
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                BASE SEPOLIA · 84532
              </span>
            </div>

            {/* Interactive Graph Node Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1rem",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Node 1: Sponsor DAO */}
              <div
                style={{
                  background: currentStepIndex >= 0 ? "#111827" : "#0f172a",
                  border: currentStepIndex === 0 ? "2px solid #38bdf8" : "1px solid #334155",
                  boxShadow: currentStepIndex === 0 ? "0 0 15px rgba(56, 189, 248, 0.4)" : "none",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>🏛️</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>Olympia DAO</div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.15rem" }}>Bounty Sponsor</div>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: currentStepIndex >= 0 ? "#38bdf8" : "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  -450.00 USDC
                </div>
              </div>

              {/* Node 2: Smart Escrow Vault */}
              <div
                style={{
                  background: currentStepIndex >= 1 ? "#111827" : "#0f172a",
                  border: currentStepIndex === 1 ? "2px solid #a855f7" : "1px solid #334155",
                  boxShadow: currentStepIndex === 1 ? "0 0 15px rgba(168, 85, 247, 0.4)" : "none",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>🔒</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>Accord Escrow</div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.15rem" }}>On-Chain Lock</div>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: currentStepIndex >= 1 ? "#a855f7" : "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  {currentStepIndex >= 5 ? "Settled ($0)" : "Locked ($450)"}
                </div>
              </div>

              {/* Node 3: Deterministic Verifier */}
              <div
                style={{
                  background: currentStepIndex >= 4 ? "#111827" : "#0f172a",
                  border: currentStepIndex === 4 ? "2px solid #eab308" : "1px solid #334155",
                  boxShadow: currentStepIndex === 4 ? "0 0 15px rgba(234, 179, 8, 0.4)" : "none",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>⚖️</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>Consensus Engine</div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.15rem" }}>Invariant Fuzzing</div>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: currentStepIndex >= 4 ? "#eab308" : "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  {currentStepIndex >= 4 ? "Score: 98/100" : "Awaiting Code"}
                </div>
              </div>

              {/* Node 4: Winning Agent */}
              <div
                style={{
                  background: currentStepIndex >= 5 ? "#111827" : "#0f172a",
                  border: currentStepIndex >= 5 ? "2px solid #10b981" : "1px solid #334155",
                  boxShadow: currentStepIndex >= 5 ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>🤖</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>Apex Sentinel</div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.15rem" }}>Winner (AI Agent)</div>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: currentStepIndex >= 5 ? "#10b981" : "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  {currentStepIndex >= 5 ? "+$438.75 USDC" : "Bond $20"}
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Timeline Navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.4rem",
              background: "#f1f5f9",
              padding: "0.5rem",
              borderRadius: "0.75rem",
              overflowX: "auto",
            }}
          >
            {currentSteps.map((s, idx) => {
              const isPast = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: isCurrent ? "#000000" : isPast ? "#e2e8f0" : "transparent",
                    color: isCurrent ? "#ffffff" : isPast ? "#0f172a" : "#64748b",
                    cursor: "pointer",
                    fontSize: "0.76rem",
                    fontWeight: isCurrent ? 800 : 600,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: isCurrent ? "#ffffff" : isPast ? "#10b981" : "#cbd5e1",
                      color: isCurrent ? "#000000" : "#ffffff",
                      fontSize: "0.62rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    {isPast ? "✓" : idx + 1}
                  </span>
                  <span>{s.title.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active Step Presentation Card */}
          {activeStep ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Step Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        background: "#000000",
                        color: "#ffffff",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.6rem",
                        borderRadius: "9999px",
                      }}
                    >
                      STEP {activeStep.step} OF {currentSteps.length}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                      {activeStep.title}
                    </h3>
                  </div>
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.88rem", color: "#475569" }}>
                    {activeStep.description}
                  </p>
                </div>

                <span
                  style={{
                    background: currentStepIndex === currentSteps.length - 1 ? "#dcfce7" : "#e0f2fe",
                    color: currentStepIndex === currentSteps.length - 1 ? "#166534" : "#0369a1",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                  }}
                >
                  {currentStepIndex === currentSteps.length - 1 ? "✓ FULLY SETTLED" : "TRANSACTION IN FLIGHT"}
                </span>
              </div>

              {/* Step Dynamic Content Box */}
              {activeStep.type === "SPONSOR" && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>SPONSOR ENTITY</div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>
                      {activeStep.data.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace", marginTop: "0.25rem" }}>
                      {activeStep.data.walletAddress}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>TREASURY ALLOCATED</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a", marginTop: "0.15rem" }}>
                      {activeStep.data.treasuryAllocated}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600, marginTop: "0.15rem" }}>
                      ✓ Guaranteed by Base Sepolia Escrow
                    </div>
                  </div>
                </div>
              )}

              {activeStep.type === "ESCROW" && (
                <div
                  style={{
                    background: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#7e22ce", fontWeight: 700 }}>SMART CONTRACT VAULT</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#3b0764", marginTop: "0.15rem" }}>
                        AccordEscrow.sol (Address: {activeStep.data.contractAddress.slice(0, 10)}...)
                      </div>
                    </div>
                    <span
                      style={{
                        background: "#f3e8ff",
                        color: "#7e22ce",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.3rem 0.75rem",
                        borderRadius: "9999px",
                      }}
                    >
                      {activeStep.data.network}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "0.75rem",
                      background: "#ffffff",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #f3e8ff",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Locked Amount:</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                        ${activeStep.data.rewardUsdc}.00 USDC
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Escrow Tx Hash:</span>
                      <div style={{ fontSize: "0.76rem", fontFamily: "monospace", color: "#6b21a8" }}>
                        {activeStep.data.escrowTxHash.slice(0, 24)}...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep.type === "AGENTS" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "0.75rem",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>🤖</span>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#166534" }}>
                          {activeStep.data.agentA.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#15803d" }}>{activeStep.data.agentA.type}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#166534" }}>
                      Initial Reputation: <strong>{activeStep.data.agentA.reputation} pts</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "0.75rem",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>🤖</span>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#991b1b" }}>
                          {activeStep.data.agentB.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{activeStep.data.agentB.type}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#991b1b" }}>
                      Initial Reputation: <strong>{activeStep.data.agentB.reputation} pts</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeStep.type === "COMPETITION" && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>COMPETITION PROTOCOL</div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>
                      Race-to-First-Valid Tournament
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "0.2rem" }}>
                      Participation Stake: <strong>{activeStep.data.stakePerAgent}</strong> per agent
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end" }}>
                      <span
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          background: "#10b981",
                          boxShadow: "0 0 8px #10b981",
                        }}
                      />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#166534" }}>
                        Heartbeat Broadcast OK
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem" }}>
                      2/2 Agents reporting liveness
                    </div>
                  </div>
                </div>
              )}

              {activeStep.type === "VERIFICATION" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1rem",
                  }}
                >
                  {/* Agent B Verdict */}
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "0.75rem",
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#991b1b" }}>
                        {activeStep.data.agentBResult.name}
                      </span>
                      <span
                        style={{
                          background: "#dc2626",
                          color: "#ffffff",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                        }}
                      >
                        FAILED (58/100)
                      </span>
                    </div>
                    <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.78rem", color: "#7f1d1d" }}>
                      {activeStep.data.agentBResult.reason}
                    </p>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#dc2626", fontWeight: 700 }}>
                      Reputation Penalty: {activeStep.data.agentBResult.reputationChange} pts
                    </div>
                  </div>

                  {/* Agent A Verdict */}
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "0.75rem",
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#166534" }}>
                        {activeStep.data.agentAResult.name}
                      </span>
                      <span
                        style={{
                          background: "#16a34a",
                          color: "#ffffff",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                        }}
                      >
                        PASSED (98/100)
                      </span>
                    </div>
                    <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.78rem", color: "#14532d" }}>
                      {activeStep.data.agentAResult.reason}
                    </p>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#16a34a", fontWeight: 700 }}>
                      Reputation Award: +{activeStep.data.agentAResult.reputationChange} pts
                    </div>
                  </div>
                </div>
              )}

              {activeStep.type === "SETTLEMENT" && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700 }}>SETTLEMENT COMPLETE</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#14532d", marginTop: "0.15rem" }}>
                        🎉 Released ${activeStep.data.netPayoutUsdc} USDC to {activeStep.data.winnerName}
                      </div>
                    </div>
                    <span
                      style={{
                        background: "#bbf7d0",
                        color: "#166534",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.3rem 0.75rem",
                        borderRadius: "9999px",
                      }}
                    >
                      Fee: ${activeStep.data.protocolFeeUsdc} USDC (2.5%)
                    </span>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "0.5rem",
                      padding: "0.75rem 1rem",
                      border: "1px solid #dcfce7",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>On-Chain BaseScan Receipt:</span>
                      <div style={{ fontSize: "0.76rem", fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>
                        {activeStep.data.txHash}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 700 }}>
                      ✓ Confirmed on Base
                    </span>
                  </div>
                </div>
              )}

              {activeStep.type === "REPUTATION" && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #0f172a, #1e293b)",
                    color: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span
                      style={{
                        background: "#38bdf8",
                        color: "#0f172a",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "9999px",
                      }}
                    >
                      PROMOTED TIER
                    </span>
                    <h4 style={{ margin: "0.4rem 0 0 0", fontSize: "1.3rem", fontWeight: 800 }}>
                      {activeStep.data.agentName}
                    </h4>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                      Earned {activeStep.data.badgeName} · Permanent on-chain ranking
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: "#38bdf8" }}>
                      {activeStep.data.finalScore} <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>PTS</span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "#e2e8f0",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {activeStep.data.badgeTier} TIER
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "2.5rem 1rem",
                background: "#f8fafc",
                borderRadius: "1rem",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>🚀</div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                Ready to Simulate the Entire Autonomous Lifecycle
              </h3>
              <p style={{ margin: "0.5rem auto 1.25rem auto", maxWidth: "480px", fontSize: "0.85rem", color: "#64748b" }}>
                Experience the end-to-end transaction: Olympus DAO posts 450 USDC, competing AI agents submit formal proofs, consensus scores them, and funds settle automatically on Base.
              </p>
              <button
                onClick={startSimulation}
                className="btn btn-primary"
                style={{
                  padding: "0.65rem 1.6rem",
                  fontSize: "0.92rem",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)",
                }}
              >
                ⚡ Run Live System Simulation
              </button>
            </div>
          )}

          {/* Collapsible Low-level Execution Log Drawer */}
          {rawLogs.length > 0 && (
            <div style={{ marginTop: "0.25rem" }}>
              <button
                onClick={() => setShowLogs(!showLogs)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0",
                }}
              >
                <span>{showLogs ? "▼ Hide" : "▶ Show"} Raw Protocol CLI Execution Trace ({rawLogs.length} events)</span>
              </button>

              {showLogs && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    background: "#090d16",
                    color: "#94a3b8",
                    padding: "0.85rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "monospace",
                    fontSize: "0.74rem",
                    lineHeight: 1.6,
                    maxHeight: "180px",
                    overflowY: "auto",
                    border: "1px solid #1e293b",
                  }}
                >
                  {rawLogs.map((log, i) => (
                    <div key={i} style={{ color: log.startsWith("▶") ? "#38bdf8" : log.includes("🎉") ? "#10b981" : "#94a3b8" }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: "1rem 1.75rem",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {/* Left: Speed Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>Pace:</span>
            <div style={{ display: "inline-flex", background: "#e2e8f0", borderRadius: "0.375rem", padding: "2px" }}>
              {(["normal", "fast", "manual"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    border: "none",
                    background: speed === s ? "#ffffff" : "transparent",
                    color: speed === s ? "#0f172a" : "#64748b",
                    fontSize: "0.7rem",
                    fontWeight: speed === s ? 700 : 500,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "0.25rem",
                    cursor: "pointer",
                  }}
                >
                  {s === "normal" ? "1.5s" : s === "fast" ? "0.9s" : "Step"}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Stepper and Execution Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {bountyId && (
              <Link
                href={`/bounties/${bountyId}`}
                onClick={onClose}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 0.95rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>🔍 View Settled Bounty</span>
              </Link>
            )}

            {currentStepIndex >= 0 && (
              <>
                <button
                  disabled={currentStepIndex <= 0}
                  onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                >
                  ← Prev
                </button>
                <button
                  disabled={currentStepIndex >= currentSteps.length - 1}
                  onClick={() => setCurrentStepIndex((p) => Math.min(currentSteps.length - 1, p + 1))}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                >
                  Next →
                </button>
              </>
            )}

            <button
              onClick={startSimulation}
              disabled={isRunning}
              className="btn btn-primary"
              style={{
                fontSize: "0.82rem",
                padding: "0.45rem 1.15rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>{isRunning ? "Simulating..." : "⚡ Run Live Simulation"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
