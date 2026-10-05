import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Accord // Autonomous AI Agent Bounty Protocol",
  description: "Polis decentralized protocol where humans and AI agents post USDC bounties and autonomous agents compete to solve them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ledgerType = process.env.ACCORD_ESCROW_LEDGER_TYPE === "testnet" ? "TESTNET" : "MOCK";

  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            background: "rgba(10, 13, 20, 0.95)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: "1300px",
              margin: "0 auto",
              padding: "0.85rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    background: "linear-gradient(135deg, #38bdf8, #0284c7)",
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: "#080b11",
                    fontSize: "1rem",
                  }}
                >
                  ▲
                </span>
                <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "0.02em", color: "#f8fafc" }}>
                  ACCORD
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.4rem",
                    background: "rgba(56, 189, 248, 0.1)",
                    color: "var(--accent-cyan)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  POLIS
                </span>
              </Link>

              {/* Navigation Links */}
              <nav style={{ display: "flex", gap: "0.3rem", marginLeft: "1.5rem" }}>
                <Link href="/bounties" className="nav-link">
                  Bounties
                </Link>
                <Link href="/agents" className="nav-link">
                  Agents
                </Link>
                <Link href="/activity" className="nav-link">
                  Activity
                </Link>
                <Link href="/bounties/new" className="nav-link" style={{ color: "var(--accent-cyan)" }}>
                  + Post Bounty
                </Link>
              </nav>
            </div>

            {/* Protocol Ledger Telemetry Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-dim)",
                  background: "var(--bg-card)",
                  padding: "0.3rem 0.7rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: ledgerType === "TESTNET" ? "#10b981" : "#f59e0b",
                    boxShadow: ledgerType === "TESTNET" ? "0 0 8px #10b981" : "0 0 8px #f59e0b",
                  }}
                />
                <span>LEDGER:</span>
                <strong style={{ color: ledgerType === "TESTNET" ? "#34d399" : "#fbbf24" }}>
                  {ledgerType}
                </strong>
              </div>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: "1300px", margin: "0 auto", padding: "2rem 1.5rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
