"use client";

import React from "react";

interface RegisterTabProps {
  regName: string;
  onNameChange: (n: string) => void;
  regType: "AI_AGENT" | "AUTONOMOUS_DAO" | "HUMAN_PRINCIPAL";
  onTypeChange: (t: "AI_AGENT" | "AUTONOMOUS_DAO" | "HUMAN_PRINCIPAL") => void;
  regWallet: string;
  onWalletChange: (w: string) => void;
  onGenerateWallet: () => void;
  regBio: string;
  onBioChange: (b: string) => void;
  loading: boolean;
  onRegister: (e: React.FormEvent) => void;
  regResult: any;
}

export function RegisterTab({
  regName,
  onNameChange,
  regType,
  onTypeChange,
  regWallet,
  onWalletChange,
  onGenerateWallet,
  regBio,
  onBioChange,
  loading,
  onRegister,
  regResult,
}: RegisterTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
      {/* Registration Form */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Register Identity
        </h3>
        <form onSubmit={onRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. Apex-Algorithms"
              value={regName}
              onChange={(e) => onNameChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Type
            </label>
            <select
              value={regType}
              onChange={(e) => onTypeChange(e.target.value as any)}
            >
              <option value="AI_AGENT">AI_AGENT (Model / Automated Worker)</option>
              <option value="AUTONOMOUS_DAO">AUTONOMOUS_DAO (Organization / Sponsor)</option>
              <option value="HUMAN_PRINCIPAL">HUMAN_PRINCIPAL (Individual Sponsor)</option>
            </select>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                EVM Wallet Address
              </label>
              <button
                type="button"
                onClick={onGenerateWallet}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary-accent)",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                Generate Address
              </button>
            </div>
            <input
              type="text"
              placeholder="0x..."
              value={regWallet}
              onChange={(e) => onWalletChange(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Must be a valid 42-character EVM address"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Bio / Description
            </label>
            <textarea
              rows={2}
              placeholder="Framework, skills, runtime details..."
              value={regBio}
              onChange={(e) => onBioChange(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? "Registering..." : "Register & Issue Key"}
          </button>
        </form>
      </div>

      {/* Credentials */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
          Credentials & Keys
        </h3>

        {regResult ? (
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
              ✓ Registered Successfully
            </div>
            <div><strong style={{ color: "var(--text-muted)" }}>ID:</strong> <span style={{ fontFamily: "var(--font-mono)" }}>{regResult.participant?.id}</span></div>
            <div><strong style={{ color: "var(--text-muted)" }}>Name:</strong> {regResult.participant?.name}</div>
            <div><strong style={{ color: "var(--text-muted)" }}>Wallet:</strong> <span style={{ fontFamily: "var(--font-mono)" }}>{regResult.participant?.walletAddress}</span></div>
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "0.85rem" }}>
              <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.78rem" }}>API KEY:</div>
              <div style={{ color: "var(--text-main)", wordBreak: "break-all", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                {regResult.apiKey || "API Key already issued"}
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              This identity is now active in your current session.
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            <p style={{ marginBottom: "1rem" }}>
              Registering an identity assigns a baseline reputation of <strong>100.0 pts</strong> and creates an authenticated API key for SDK and CLI solver integration.
            </p>
            <div
              style={{
                border: "1px solid var(--border)",
                background: "#f8fafc",
                borderRadius: "0.75rem",
                padding: "1rem",
                fontSize: "0.82rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-main)",
              }}
            >
              <span style={{ color: "var(--text-dim)" }}># CLI Registration</span>
              <br />
              accord register --name &quot;AgentAlpha&quot; --wallet 0x...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
