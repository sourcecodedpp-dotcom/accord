"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeTransactions } from "@/lib/firebase/hooks";
import {
  getBaseScanAddressUrl,
  getBaseScanTxUrl,
  publicBlockchainClient,
} from "@/lib/blockchain/client";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/blockchain/artifacts/contracts";

export default function WalletPage() {
  const {
    connectedWallet,
    usdcBalance,
    ethBalance,
    connectWallet,
    disconnectWallet,
    refreshWalletBalance,
    account,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { transactions } = useRealtimeTransactions(25);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWalletBalance();
    setRefreshing(false);
  };

  const copyAddress = () => {
    if (connectedWallet) {
      navigator.clipboard?.writeText(connectedWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container-constrained" style={{ maxWidth: "980px", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#16a34a",
                background: "#f0fdf4",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid #bbf7d0",
              }}
            >
              Authoritative On-Chain State
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Base Sepolia Testnet (EVM)
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>
            Base Sepolia Wallet
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Non-custodial Web3 wallet connection. Balances are queried directly from the blockchain via RPC.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing || !connectedWallet}
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem", padding: "0.55rem 1.15rem" }}
          >
            {refreshing ? "Querying RPC..." : "🔄 Refresh On-Chain"}
          </button>
          {!connectedWallet ? (
            <button
              onClick={connectWallet}
              className="btn btn-primary"
              style={{ fontSize: "0.85rem", padding: "0.55rem 1.25rem" }}
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={disconnectWallet}
              className="btn btn-secondary"
              style={{ fontSize: "0.85rem", padding: "0.55rem 1rem", color: "#dc2626" }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Main Balances Bento Card */}
      <div
        className="card"
        style={{
          padding: "2.5rem 2rem",
          background: "#0f172a",
          color: "#ffffff",
          borderRadius: "1.25rem",
          boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
              Native Testnet USDC Balance
            </div>
            <div
              style={{
                fontSize: "clamp(2.4rem, 5vw, 3.4rem)",
                fontWeight: 900,
                fontFamily: "var(--font-mono)",
                color: "#ffffff",
                letterSpacing: "-0.03em",
                marginTop: "0.35rem",
              }}
            >
              ${usdcBalance} <span style={{ fontSize: "1.25rem", color: "#94a3b8", fontWeight: 600 }}>USDC</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
              ETH Gas: {ethBalance} ETH (Base Sepolia)
            </div>
          </div>

          <div
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(255, 255, 255, 0.06)",
              borderRadius: "0.85rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              minWidth: "260px",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              Active Address
            </div>
            {connectedWallet ? (
              <div style={{ marginTop: "0.35rem" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>
                  {connectedWallet.slice(0, 10)}...{connectedWallet.slice(-6)}
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    onClick={copyAddress}
                    style={{
                      background: copied ? "#16a34a" : "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "0.3rem",
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <a
                    href={getBaseScanAddressUrl(connectedWallet)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#60a5fa", fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center" }}
                  >
                    BaseScan ↗
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "0.35rem", fontSize: "0.82rem", color: "#94a3b8" }}>
                Connect your browser extension to view address and funds.
              </div>
            )}
          </div>
        </div>

        {/* Security Invariant Callout */}
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            fontSize: "0.78rem",
          }}
        >
          <div>
            <span style={{ color: "#94a3b8" }}>Chain ID: </span>
            <span style={{ fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
              {BASE_SEPOLIA_CHAIN_ID} (Base Sepolia)
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8" }}>USDC Contract: </span>
            <span style={{ fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
              {BASE_SEPOLIA_USDC_ADDRESS.slice(0, 8)}...{BASE_SEPOLIA_USDC_ADDRESS.slice(-4)}
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8" }}>Escrow Contract: </span>
            <span style={{ fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
              0x7f03...c2f9 (AccordEscrow.sol)
            </span>
          </div>
        </div>
      </div>

      {/* Protocol Money Flow Architecture Notice */}
      <div
        className="card"
        style={{
          padding: "1.5rem 1.75rem",
          background: "#ffffff",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
          How Accord Manages Escrow (Zero Fake Balances)
        </h3>
        <p style={{ fontSize: "0.86rem", color: "#64748b", lineHeight: 1.6 }}>
          Accord strictly enforces non-custodial smart contract custody. When you post or fund a tournament bounty, your USDC transfers directly to the verified AccordEscrow smart contract on Base Sepolia. The backend evaluates submissions using multi-LLM consensus, and the winner receives USDC released directly from the contract to their wallet. Firestore persists transaction metadata, while the blockchain remains the sole source of truth for funds.
        </p>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            background: "#f8fafc",
            padding: "0.75rem 1rem",
            borderRadius: "0.6rem",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono)",
            color: "#475569",
          }}
        >
          <span>USER WALLET → USDC → AccordEscrow.sol → Multi-Verifier Consensus → WINNER WALLET</span>
        </div>
      </div>

      {/* Realtime On-Chain Transactions Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
            On-Chain Escrow Transactions
          </h2>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Live Realtime Updates via Firestore
          </span>
        </div>

        <div className="card" style={{ padding: "0", background: "#ffffff", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Transaction Hash</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Event Type</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Amount</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Chain</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#64748b" }}>BaseScan</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "#64748b" }}>
                    No recorded transactions yet. When bounties are funded or settled on Base Sepolia, verified receipts will appear here in real time.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.txHash} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)" }}>
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{tx.type || "ESCROW_DEPOSIT"}</td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                      ${tx.amount} USDC
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>Base Sepolia</td>
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
                        Verify On-Chain ↗
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
