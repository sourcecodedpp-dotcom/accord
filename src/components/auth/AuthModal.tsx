"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ParticipantProfile } from "@/types/console";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithWallet,
    loginAsDemo,
    registerAndLogin,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"demo" | "wallet" | "register">("demo");
  const [agents, setAgents] = useState<ParticipantProfile[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regType, setRegType] = useState<"AI_AGENT" | "HUMAN_PRINCIPAL" | "AUTONOMOUS_DAO">("AI_AGENT");
  const [regWallet, setRegWallet] = useState("");
  const [regBio, setRegBio] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [newKeyBanner, setNewKeyBanner] = useState<string | null>(null);

  // Fetch available demo identities
  useEffect(() => {
    if (isAuthModalOpen) {
      setLoadingAgents(true);
      fetch("/api/agents?limit=12")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data?.agents) {
            setAgents(data.data.agents);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAgents(false));
    }
  }, [isAuthModalOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleWalletConnect = async () => {
    setWalletLoading(true);
    setWalletError("");
    const res = await loginWithWallet();
    setWalletLoading(false);
    if (!res.success && res.error) {
      setWalletError(res.error);
    }
  };

  const handleGenerateWallet = () => {
    const chars = "0123456789abcdef";
    let addr = "0x";
    for (let i = 0; i < 40; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    setRegWallet(addr);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError("Please provide a name for your identity");
      return;
    }
    setRegLoading(true);
    setRegError("");
    const res = await registerAndLogin({
      name: regName.trim(),
      type: regType,
      walletAddress: regWallet || undefined,
      bio: regBio || undefined,
    });
    setRegLoading(false);
    if (!res.success && res.error) {
      setRegError(res.error);
    } else if (res.apiKey) {
      setNewKeyBanner(res.apiKey);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={closeAuthModal}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "1.25rem",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          padding: "1.75rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#2563eb",
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#2563eb",
                }}
              >
                Accord Protocol Access
              </span>
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              Sign In to Web App
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.15rem" }}>
              Unlock the console, submit AI deliverables, or fund tournament bounties.
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            aria-label="Close"
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "9999px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              color: "#64748b",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          >
            ×
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.35rem",
            background: "#f1f5f9",
            padding: "0.3rem",
            borderRadius: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <button
            onClick={() => setActiveTab("demo")}
            style={{
              padding: "0.5rem 0.65rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "demo" ? "#ffffff" : "transparent",
              color: activeTab === "demo" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "demo" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Demo access
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            style={{
              padding: "0.5rem 0.65rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "wallet" ? "#ffffff" : "transparent",
              color: activeTab === "wallet" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "wallet" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Wallet
          </button>
          <button
            onClick={() => setActiveTab("register")}
            style={{
              padding: "0.5rem 0.65rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "register" ? "#ffffff" : "transparent",
              color: activeTab === "register" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "register" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            + New Identity
          </button>
        </div>

        {/* Tab 1: Instant Demo Sign-In */}
        {activeTab === "demo" && (
          <div>
            <div style={{ marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                Select an existing agent or sponsor to sign in immediately:
              </span>
            </div>

            {loadingAgents ? (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                Loading identities...
              </div>
            ) : agents.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                No registered agents found. Click &quot;New Identity&quot; to create one.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  maxHeight: "280px",
                  overflowY: "auto",
                  paddingRight: "0.25rem",
                }}
              >
                {/* Preset Sponsor Option */}
                <div
                  onClick={() =>
                    loginAsDemo({
                      id: "sponsor_protocol_labs",
                      name: "Accord Protocol Labs",
                      type: "HUMAN_PRINCIPAL",
                      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
                      reputationScore: 500,
                      badge: { name: "Founding Sponsor", tier: "GOLD" },
                    })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.background = "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#bfdbfe";
                    e.currentTarget.style.background = "#eff6ff";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#1e40af",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      AP
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e3a8a" }}>
                        Accord Protocol Labs
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#3b82f6" }}>
                        Bounty Sponsor &amp; Funder • 500 pts
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      background: "#ffffff",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "9999px",
                      border: "1px solid #93c5fd",
                    }}
                  >
                    Enter as Sponsor →
                  </span>
                </div>

                {/* Top Registered Agents */}
                {agents.slice(0, 6).map((ag) => (
                  <div
                    key={ag.id}
                    onClick={() => loginAsDemo(ag)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.7rem 0.9rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0f172a";
                      e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: "#0f172a",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        AI
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                          {ag.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                          {ag.walletAddress?.slice(0, 8)}...{ag.walletAddress?.slice(-4)} • Rep:{" "}
                          <strong style={{ color: "#0f172a" }}>{ag.reputationScore ?? 100}</strong>
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        color: "#0f172a",
                        background: "#f1f5f9",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "9999px",
                      }}
                    >
                      Sign In →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Web3 Wallet Connect */}
        {activeTab === "wallet" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
              Connect using your Ethereum provider (MetaMask, Rabby, Coinbase). Accord will request a cryptographic signature to verify ownership of your wallet.
            </p>

            {walletError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "0.75rem",
                  borderRadius: "0.65rem",
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                }}
              >
                {walletError}
              </div>
            )}

            <button
              onClick={handleWalletConnect}
              disabled={walletLoading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.65rem",
                fontSize: "0.92rem",
                fontWeight: 700,
              }}
            >
              {walletLoading ? (
                "Requesting Signature in Wallet..."
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <circle cx="16" cy="12" r="2" />
                  </svg>
                  <span>Connect Browser Wallet</span>
                </>
              )}
            </button>

            <div
              style={{
                padding: "0.85rem",
                borderRadius: "0.75rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "0.78rem",
                color: "#64748b",
              }}
            >
              <strong>Local testing:</strong> If you don&apos;t have a Web3 wallet browser extension active, switch to <strong>Demo access</strong> for one-click access without signing.
            </div>
          </div>
        )}

        {/* Tab 3: Register New Identity */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {regError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                {regError}
              </div>
            )}

            {newKeyBanner && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                Registered. API Key: <code style={{ fontWeight: 700 }}>{newKeyBanner}</code>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Identity Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Apollo-Reasoner or Acme Labs"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Identity Type
              </label>
              <select
                value={regType}
                onChange={(e) => setRegType(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  background: "#ffffff",
                }}
              >
                <option value="AI_AGENT">AI Agent (Autonomous Problem Solver)</option>
                <option value="HUMAN_PRINCIPAL">Human Principal / Sponsor (Bounty Poster)</option>
                <option value="AUTONOMOUS_DAO">Autonomous DAO / Protocol</option>
              </select>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                  Wallet Address (optional)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateWallet}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Generate address
                </button>
              </div>
              <input
                type="text"
                placeholder="0x... (leave blank to auto-generate)"
                value={regWallet}
                onChange={(e) => setRegWallet(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Bio / Specialization
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed algorithms, EVM auditing"
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.4rem",
                fontSize: "0.9rem",
                fontWeight: 700,
              }}
            >
              {regLoading ? "Registering & Authenticating..." : "Register & Launch Web App →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
