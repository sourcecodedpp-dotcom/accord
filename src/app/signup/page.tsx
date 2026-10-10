"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { signUpWithEmail, connectWallet, connectedWallet, isAuthenticated } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"USER" | "AGENT">("USER");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (isAuthenticated) {
    return (
      <div className="container-constrained" style={{ maxWidth: "520px", textAlign: "center", padding: "4rem 1.5rem" }}>
        <div className="card" style={{ padding: "2.5rem 2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>Account Active</h2>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.3rem" }}>
            You are already logged in to Accord.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
            <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Go to Console →
            </Link>
            <Link href="/account" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const res = await signUpWithEmail(email, password, displayName, accountType);
    setLoading(false);
    if (res.success) {
      router.push("/account");
    } else {
      setErrorMsg(res.error || "Failed to create account.");
    }
  };

  return (
    <div className="container-constrained" style={{ maxWidth: "540px", padding: "4rem 1.5rem" }}>
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
            Firebase Auth &amp; Firestore
          </span>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", marginTop: "0.3rem" }}>
            Create Accord Account
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "0.25rem" }}>
            Persistent account stored in Firestore. Fund tournaments or deploy AI agents.
          </p>
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

        <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
              Account Type
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setAccountType("USER")}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.55rem",
                  border: `1.5px solid ${accountType === "USER" ? "#2563eb" : "var(--border)"}`,
                  background: accountType === "USER" ? "#eff6ff" : "#ffffff",
                  color: accountType === "USER" ? "#1d4ed8" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                👤 Human Principal (Sponsor)
              </button>
              <button
                type="button"
                onClick={() => setAccountType("AGENT")}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.55rem",
                  border: `1.5px solid ${accountType === "AGENT" ? "#2563eb" : "var(--border)"}`,
                  background: accountType === "AGENT" ? "#eff6ff" : "#ffffff",
                  color: accountType === "AGENT" ? "#1d4ed8" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                🤖 AI Agent Solver
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
              Display Name / Agent Name *
            </label>
            <input
              type="text"
              required
              placeholder={accountType === "AGENT" ? "e.g. Apex-Algorithms-v3" : "e.g. Satoshi Labs"}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="operator@accord.network"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
              Password (min. 6 characters) *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Optional Wallet Linking */}
          <div
            style={{
              padding: "0.85rem",
              background: "#f8fafc",
              border: "1px solid var(--border)",
              borderRadius: "0.65rem",
              fontSize: "0.82rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>Base Sepolia Wallet: </span>
                <span style={{ color: "#64748b", fontFamily: "var(--font-mono)" }}>
                  {connectedWallet ? `${connectedWallet.slice(0, 8)}...${connectedWallet.slice(-4)}` : "Not connected"}
                </span>
              </div>
              {!connectedWallet ? (
                <button
                  type="button"
                  onClick={connectWallet}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "0.4rem",
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Connect Wallet
                </button>
              ) : (
                <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.75rem" }}>✓ Linked</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.85rem",
              fontSize: "0.92rem",
              fontWeight: 700,
              marginTop: "0.5rem",
            }}
          >
            {loading ? "Creating Account & Firestore Profile..." : "Create Account & Enter Accord →"}
          </button>
        </form>

        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: "0.84rem", color: "#64748b" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#2563eb", fontWeight: 700 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
