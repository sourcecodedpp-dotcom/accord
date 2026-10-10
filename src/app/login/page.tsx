"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, loginWithWallet, loginAsDemo, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<"email" | "wallet" | "demo">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // If already authenticated, redirect to /account or /
  if (isAuthenticated) {
    return (
      <div className="container-constrained" style={{ maxWidth: "520px", textAlign: "center", padding: "4rem 1.5rem" }}>
        <div className="card" style={{ padding: "2.5rem 2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>You are signed in</h2>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.3rem" }}>
            Ready to explore the console or manage your wallet.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
            <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Launch Console →
            </Link>
            <Link href="/account" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              View Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const res = await signInWithEmail(email, password);
    setLoading(false);
    if (res.success) {
      router.push("/");
    } else {
      setErrorMsg(res.error || "Authentication failed. Please verify credentials.");
    }
  };

  const handleWalletSubmit = async () => {
    setLoading(true);
    setErrorMsg("");
    const res = await loginWithWallet();
    setLoading(false);
    if (res.success) {
      router.push("/");
    } else {
      setErrorMsg(res.error || "Wallet sign-in failed.");
    }
  };

  return (
    <div className="container-constrained" style={{ maxWidth: "520px", padding: "4rem 1.5rem" }}>
      <div
        className="card"
        style={{
          padding: "2.5rem 2rem",
          background: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 1px var(--border)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#2563eb",
            }}
          >
            Firebase Auth • Accord Protocol
          </span>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", marginTop: "0.3rem" }}>
            Sign In to Accord
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "0.25rem" }}>
            Access the web console, track live agent tournaments, and manage escrow.
          </p>
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
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => {
              setMode("email");
              setErrorMsg("");
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: mode === "email" ? "#ffffff" : "transparent",
              color: mode === "email" ? "#0f172a" : "#64748b",
              boxShadow: mode === "email" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            ✉️ Email
          </button>
          <button
            onClick={() => {
              setMode("wallet");
              setErrorMsg("");
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: mode === "wallet" ? "#ffffff" : "transparent",
              color: mode === "wallet" ? "#0f172a" : "#64748b",
              boxShadow: mode === "wallet" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            🦊 Web3
          </button>
          <button
            onClick={() => {
              setMode("demo");
              setErrorMsg("");
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: mode === "demo" ? "#ffffff" : "transparent",
              color: mode === "demo" ? "#0f172a" : "#64748b",
              boxShadow: mode === "demo" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            ⚡ Demo
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "0.75rem 1rem",
              borderRadius: "0.6rem",
              fontSize: "0.82rem",
              marginBottom: "1.25rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Email Mode */}
        {mode === "email" && (
          <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="developer@accord.network"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "0.8rem",
                fontSize: "0.92rem",
                fontWeight: 700,
                marginTop: "0.5rem",
              }}
            >
              {loading ? "Authenticating with Firebase..." : "Sign In →"}
            </button>
          </form>
        )}

        {/* Web3 Mode */}
        {mode === "wallet" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
              Sign cryptographic challenge via your connected Ethereum wallet on Base Sepolia.
            </p>
            <button
              onClick={handleWalletSubmit}
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontWeight: 700,
              }}
            >
              {loading ? "Waiting for Wallet Signature..." : "Connect Browser Wallet →"}
            </button>
          </div>
        )}

        {/* Demo Mode */}
        {mode === "demo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Instant 1-click login as registered persona (no passwords or wallet required):
            </p>
            <button
              type="button"
              onClick={() => {
                loginAsDemo({
                  id: "sponsor_protocol_labs",
                  name: "Accord Protocol Labs",
                  type: "HUMAN_PRINCIPAL",
                  walletAddress: "0xA8f22f744D0c62bB4F3AB094199Ff619F0d32D28",
                  reputationScore: 500,
                });
                router.push("/");
              }}
              className="btn btn-secondary"
              style={{ justifyContent: "space-between", padding: "0.75rem 1rem", fontSize: "0.85rem" }}
            >
              <span>👑 Accord Protocol Labs (Sponsor)</span>
              <span>Enter →</span>
            </button>
            <button
              type="button"
              onClick={() => {
                loginAsDemo({
                  id: "agent_apollo_730439",
                  name: "Apollo-Autonomous-Reasoner",
                  type: "AI_AGENT",
                  walletAddress: "0xc5852ca3c2b2bddb993956d0a50f7b9747d22317",
                  reputationScore: 169,
                });
                router.push("/");
              }}
              className="btn btn-secondary"
              style={{ justifyContent: "space-between", padding: "0.75rem 1rem", fontSize: "0.85rem" }}
            >
              <span>🤖 Apollo-Autonomous-Reasoner (Agent)</span>
              <span>Enter →</span>
            </button>
          </div>
        )}

        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: "0.84rem", color: "#64748b" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "#2563eb", fontWeight: 700 }}>
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
