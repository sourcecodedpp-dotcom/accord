"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeTransactions } from "@/lib/firebase/hooks";
import { getBaseScanTxUrl, getBaseScanAddressUrl } from "@/lib/blockchain/client";

export default function AccountPage() {
  const {
    firebaseUser,
    account,
    user,
    connectedWallet,
    usdcBalance,
    ethBalance,
    connectWallet,
    disconnectWallet,
    refreshWalletBalance,
    logout,
  } = useAuth();

  const [bounties, setBounties] = useState<any[]>([]);
  const [loadingBounties, setLoadingBounties] = useState(false);
  const { transactions } = useRealtimeTransactions(20);

  useEffect(() => {
    if (user || connectedWallet) {
      setLoadingBounties(true);
      fetch("/api/bounties?limit=50")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.bounties) {
            const myBounties = d.data.bounties.filter(
              (b: any) =>
                b.creatorId === user?.id ||
                b.creator?.walletAddress?.toLowerCase() === connectedWallet?.toLowerCase()
            );
            setBounties(myBounties);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBounties(false));
    }
  }, [user, connectedWallet]);

  return (
    <div className="container-constrained" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#2563eb",
                background: "#eff6ff",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid #bfdbfe",
              }}
            >
              Firestore User Profile
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              ID: {account?.id || firebaseUser?.uid || user?.id || "N/A"}
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>
            {account?.displayName || user?.name || "Account Overview"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
            Manage identity, on-chain Base Sepolia wallet, escrow settlements, and tournament history.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/wallet" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            💳 Open Wallet
          </Link>
          <Link href="/bounties/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            + Post Bounty
          </Link>
        </div>
      </div>

      {/* Grid: Account Card & On-Chain Wallet Card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {/* Account Details */}
        <div className="card" style={{ padding: "1.75rem", background: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              Application Account
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
              {account?.displayName || user?.name || "User"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.15rem" }}>
              {account?.email || firebaseUser?.email || "Web3 / Demo Account"}
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                <span style={{ color: "#64748b" }}>Account Type:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {account?.accountType === "AGENT" || user?.type === "AI_AGENT" ? "🤖 AI Agent" : "👤 Human Principal"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                <span style={{ color: "#64748b" }}>Reputation Score:</span>
                <span style={{ fontWeight: 700, color: "#16a34a" }}>
                  {user?.reputationScore ?? 100} pts
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                <span style={{ color: "#64748b" }}>Created Bounties:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{bounties.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Total Volume Settled:</span>
                <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
                  ${user?.settledVolumeUsdc ?? 0} USDC
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={logout}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Sign Out of Account
            </button>
          </div>
        </div>

        {/* Real On-Chain Wallet Card */}
        <div className="card" style={{ padding: "1.75rem", background: "#0f172a", color: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
                Base Sepolia Wallet (Chain 84532)
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  background: connectedWallet ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  color: connectedWallet ? "#34d399" : "#f87171",
                  border: `1px solid ${connectedWallet ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                  fontWeight: 700,
                }}
              >
                {connectedWallet ? "● Connected" : "○ Disconnected"}
              </span>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>On-Chain USDC Balance:</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#ffffff", marginTop: "0.15rem" }}>
                ${usdcBalance}{" "}
                <span style={{ fontSize: "0.95rem", color: "#94a3b8" }}>USDC</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem", fontFamily: "var(--font-mono)" }}>
                Gas: {ethBalance} ETH (Base Sepolia)
              </div>
            </div>

            <div style={{ marginTop: "1.25rem", padding: "0.65rem 0.85rem", background: "rgba(255, 255, 255, 0.05)", borderRadius: "0.5rem", fontSize: "0.78rem" }}>
              <div style={{ color: "#94a3b8", marginBottom: "0.2rem" }}>Address:</div>
              {connectedWallet ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#ffffff" }}>
                    {connectedWallet.slice(0, 10)}...{connectedWallet.slice(-6)}
                  </span>
                  <a
                    href={getBaseScanAddressUrl(connectedWallet)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#60a5fa", fontSize: "0.72rem", fontWeight: 600 }}
                  >
                    BaseScan ↗
                  </a>
                </div>
              ) : (
                <span style={{ color: "#94a3b8" }}>No wallet connected yet.</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
            {!connectedWallet ? (
              <button
                onClick={connectWallet}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.65rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                Connect Browser Wallet
              </button>
            ) : (
              <div style={{ display: "flex", width: "100%", gap: "0.5rem" }}>
                <button
                  onClick={refreshWalletBalance}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    fontSize: "0.8rem",
                  }}
                >
                  🔄 Refresh Balance
                </button>
                <button
                  onClick={disconnectWallet}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.6rem 0.85rem",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#f87171",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    fontSize: "0.8rem",
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Created Bounties Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
            My Created Bounties ({bounties.length})
          </h2>
          <Link href="/bounties/new" style={{ fontSize: "0.82rem", color: "#2563eb", fontWeight: 700 }}>
            + Create New Bounty
          </Link>
        </div>

        {loadingBounties ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading bounties...</div>
        ) : bounties.length === 0 ? (
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "#64748b" }}>
            <p>You haven&apos;t created any bounties yet.</p>
            <Link href="/bounties/new" className="btn btn-primary" style={{ display: "inline-block", marginTop: "1rem", textDecoration: "none" }}>
              Post Your First Bounty
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            {bounties.map((b) => (
              <div key={b.id} className="card" style={{ padding: "1.25rem", background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span className="badge">{b.status}</span>
                  <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)" }}>${b.rewardUsdc} USDC</span>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
                  {b.title}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "var(--font-mono)", marginBottom: "1rem" }}>
                  Escrow: {b.escrowLedgerId?.slice(0, 14)}...
                </div>
                <Link
                  href={`/bounties/${b.id}`}
                  style={{
                    display: "inline-block",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#2563eb",
                  }}
                >
                  View Details &amp; Telemetry →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Realtime On-Chain Transactions (Firestore transactions mirror) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
          On-Chain Escrow Activity &amp; Transactions
        </h2>
        <div className="card" style={{ padding: "0", background: "#ffffff", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Tx Hash</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Action</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Amount</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                    No recorded on-chain transactions yet. Escrow deposits and releases will appear here in real time.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.txHash} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)" }}>
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{tx.type || "ESCROW_DEPOSIT"}</td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      ${tx.amount} USDC
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className="badge badge-settled">{tx.status}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <a
                        href={getBaseScanTxUrl(tx.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2563eb", fontWeight: 600 }}
                      >
                        BaseScan ↗
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
