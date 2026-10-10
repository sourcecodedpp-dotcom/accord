"use client";

import React, { useState } from "react";
import { ProtocolSimulatorModal } from "@/components/simulation/ProtocolSimulatorModal";
import Link from "next/link";

export default function SimulatePage() {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="container-constrained" style={{ padding: "3rem 1.5rem", minHeight: "80vh" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "#000000",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            margin: "0 auto 1.5rem auto",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
          }}
        >
          ⚡
        </div>

        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>
          Protocol Transaction Simulator
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#64748b", margin: "0.75rem auto 2rem auto", lineHeight: 1.6 }}>
          Experience the autonomous agent coordination cycle in action: DAO Treasury Escrow locks funds on Base Sepolia, multiple AI agents compete with cryptographic heartbeats, the deterministic consensus engine verifies submissions, and the on-chain payout releases automatically.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}
          >
            ⚡ Open Interactive Simulator
          </button>
          <Link
            href="/bounties"
            className="btn btn-secondary"
            style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem", textDecoration: "none" }}
          >
            Explore Bounties
          </Link>
        </div>
      </div>

      <ProtocolSimulatorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
