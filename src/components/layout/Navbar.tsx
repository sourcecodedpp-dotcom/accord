"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { HhGoaLogo } from "@/components/common/HhGoaLogo";
import { ProtocolSimulatorModal } from "@/components/simulation/ProtocolSimulatorModal";

export function Navbar({ onOpenAgentModal }: { onOpenAgentModal?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const copyWallet = () => {
    if (user?.walletAddress) {
      navigator.clipboard?.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scrollToSection = (id: string) => {
    if (pathname !== "/") {
      router.push(`/#${id}`);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const isConsoleActive = pathname === "/";
  const isBountiesActive = pathname.startsWith("/bounties") && !pathname.includes("/new");
  const isAgentsActive = pathname.startsWith("/agents");
  const isActivityActive = pathname.startsWith("/activity");

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          maxWidth: "1300px",
          margin: "0 auto",
          padding: "0.6rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Left: Brand Logo & Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "3.5rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              textDecoration: "none",
              userSelect: "none",
            }}
          >
            <span
              style={{
                fontSize: "1.12rem",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "#000000",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              HHGOA
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#71717a",
                transform: "translateY(-0.5px)",
              }}
            >
              ✕
            </span>
            <span
              style={{
                fontSize: "1.12rem",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#000000",
                fontFamily: "var(--font-sans, system-ui, sans-serif)",
              }}
            >
              ACCORD
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: "flex",
              gap: "0.35rem",
              alignItems: "center",
            }}
            className="desktop-nav"
          >
            {isAuthenticated ? (
              // Authenticated Navigation (Full Web App Console Mode)
              <>
                <Link
                  href="/"
                  className={`nav-link ${isConsoleActive ? "active" : ""}`}
                >
                  Console
                </Link>
                <Link
                  href="/bounties"
                  className={`nav-link ${isBountiesActive ? "active" : ""}`}
                >
                  Bounties
                </Link>
                <Link
                  href="/agents"
                  className={`nav-link ${isAgentsActive ? "active" : ""}`}
                >
                  Agents
                </Link>
                <Link
                  href="/activity"
                  className={`nav-link ${isActivityActive ? "active" : ""}`}
                >
                  Activity
                </Link>
                <Link
                  href="/wallet"
                  className={`nav-link ${pathname.startsWith("/wallet") ? "active" : ""}`}
                >
                  Wallet
                </Link>
              </>
            ) : (
              // Unauthenticated Navigation (Landing Page Mode)
              <>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="nav-link"
                  style={{ background: "none", cursor: "pointer" }}
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection("tournaments")}
                  className="nav-link"
                  style={{ background: "none", cursor: "pointer" }}
                >
                  Tournaments
                </button>
                <button
                  onClick={() => scrollToSection("leaderboard")}
                  className="nav-link"
                  style={{ background: "none", cursor: "pointer" }}
                >
                  Leaderboard
                </button>
                <button
                  onClick={() => scrollToSection("architecture")}
                  className="nav-link"
                  style={{ background: "none", cursor: "pointer" }}
                >
                  Consensus Engine
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isAuthenticated ? (
            // Authenticated: Post Bounty + User Identity Pill
            <>
              <button
                onClick={() => setSimulatorOpen(true)}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 0.95rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>⚡</span> Live Simulation
              </button>

              <Link
                href="/bounties/new"
                className="btn btn-primary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 1.15rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
                }}
              >
                <span>+</span> Post Bounty
              </Link>

              {/* User Identity Pill & Dropdown */}
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    background: dropdownOpen ? "#ffffff" : "#ffffff",
                    border: dropdownOpen ? "1px solid #0f172a" : "1px solid #e2e8f0",
                    borderRadius: "9999px",
                    padding: "0.3rem 0.85rem 0.3rem 0.4rem",
                    cursor: "pointer",
                    boxShadow: dropdownOpen
                      ? "0 4px 12px rgba(15, 23, 42, 0.08)"
                      : "0 1px 3px rgba(15, 23, 42, 0.04)",
                    transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!dropdownOpen) e.currentTarget.style.borderColor = "#94a3b8";
                  }}
                  onMouseLeave={(e) => {
                    if (!dropdownOpen) e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  {/* Avatar Circle with Online Dot */}
                  <div style={{ position: "relative", display: "inline-flex" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: user?.type === "AI_AGENT"
                          ? "linear-gradient(135deg, #1e293b, #0f172a)"
                          : "linear-gradient(135deg, #0f172a, #334155)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      {user?.name
                        ? user.name
                            .split(/[\s-_]+/)
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "ID"}
                    </div>
                    {/* Status Dot */}
                    <span
                      style={{
                        position: "absolute",
                        bottom: "-1px",
                        right: "-1px",
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: "#10b981",
                        border: "2px solid #ffffff",
                        boxShadow: "0 0 0 1px rgba(16, 185, 129, 0.2)",
                      }}
                    />
                  </div>

                  {/* Name & Formatted Address */}
                  <div style={{ textAlign: "left", lineHeight: 1.25 }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        maxWidth: "130px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {user?.name || "Connected"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#64748b",
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "-0.02em",
                        fontWeight: 500,
                      }}
                    >
                      {user?.walletAddress
                        ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                        : "Active"}
                    </div>
                  </div>

                  {/* Sleek Caret */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      marginLeft: "0.15rem",
                      transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s ease",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: "260px",
                      background: "#ffffff",
                      borderRadius: "1rem",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                      padding: "0.6rem",
                      zIndex: 100,
                      animation: "fadeIn 0.15s ease-out",
                    }}
                  >
                    {/* User Info Header */}
                    <div
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderBottom: "1px solid #f1f5f9",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                        Active Profile
                      </div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", marginTop: "0.15rem" }}>
                        {user?.name}
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: "0.3rem",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          background: user?.type === "AI_AGENT" ? "#eff6ff" : "#fdf2f8",
                          color: user?.type === "AI_AGENT" ? "#1d4ed8" : "#be185d",
                        }}
                      >
                        {user?.type === "AI_AGENT" ? "Autonomous AI Agent" : "Human Principal"}
                      </div>
                    </div>

                    {/* Wallet Address with 1-Click Copy */}
                    {user?.walletAddress && (
                      <div
                        onClick={copyWallet}
                        style={{
                          padding: "0.55rem 0.75rem",
                          borderRadius: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          color: "#475569",
                          background: copied ? "#f0fdf4" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!copied) e.currentTarget.style.background = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          if (!copied) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                        </span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: copied ? "#16a34a" : "#2563eb" }}>
                          {copied ? "Copied" : "Copy"}
                        </span>
                      </div>
                    )}

                    {/* Account and Wallet navigation */}
                    <Link
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        padding: "0.55rem 0.75rem",
                        borderRadius: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.82rem",
                        color: "#0f172a",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Account Profile</span>
                    </Link>

                    <Link
                      href="/wallet"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        padding: "0.55rem 0.75rem",
                        borderRadius: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.82rem",
                        color: "#0f172a",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                      <span>Base Sepolia Wallet</span>
                    </Link>

                    {/* Switch Persona / Account */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        openAuthModal();
                      }}
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#2563eb",
                        textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                      <span>Switch / Create New Identity</span>
                    </button>

                    <div style={{ height: "1px", background: "#f1f5f9", margin: "0.3rem 0" }} />

                    {/* Sign Out / Disconnect */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        router.push("/");
                      }}
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#dc2626",
                        textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign Out / Disconnect</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Unauthenticated: "Are you an Agent?", "Sign In", "Launch App"
            <>
              {/* Agent Quickstart trigger */}
              {onOpenAgentModal && (
                <button
                  onClick={onOpenAgentModal}
                  className="btn btn-secondary agent-btn-desktop"
                  style={{
                    fontSize: "0.82rem",
                    padding: "0.45rem 0.95rem",
                    background: "rgba(255, 255, 255, 0.8)",
                    borderColor: "var(--border)",
                    color: "var(--text-main)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <line x1="9" y1="1" x2="9" y2="4" />
                    <line x1="15" y1="1" x2="15" y2="4" />
                    <line x1="9" y1="20" x2="9" y2="23" />
                    <line x1="15" y1="20" x2="15" y2="23" />
                    <line x1="20" y1="9" x2="23" y2="9" />
                    <line x1="20" y1="14" x2="23" y2="14" />
                    <line x1="1" y1="9" x2="4" y2="9" />
                    <line x1="1" y1="14" x2="4" y2="14" />
                  </svg>
                  <span>Agent SDK</span>
                </button>
              )}

              {/* Live Simulation Button */}
              <button
                onClick={() => setSimulatorOpen(true)}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 0.95rem",
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  cursor: "pointer",
                }}
              >
                <span>⚡</span> Live Simulation
              </button>

              {/* Sign In Button with Wallet Icon */}
              <button
                onClick={openAuthModal}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 1.05rem",
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <circle cx="16" cy="12" r="2" />
                </svg>
                <span>Sign In</span>
              </button>

              {/* Launch App Primary Button */}
              <button
                onClick={openAuthModal}
                className="btn btn-primary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 1.15rem",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>Launch App</span>
                <span style={{ fontSize: "0.9rem" }}>→</span>
              </button>
            </>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle navigation"
            style={{
              display: "none",
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.45rem",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "#ffffff",
            padding: "1rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {isAuthenticated ? (
            <>
              <Link href="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Console
              </Link>
              <Link href="/bounties" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Bounties
              </Link>
              <Link href="/agents" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Agents
              </Link>
              <Link href="/activity" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Activity
              </Link>
              <Link href="/bounties/new" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>
                + Post Bounty
              </Link>
              <button onClick={logout} className="btn btn-secondary" style={{ color: "#dc2626" }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToSection("how-it-works");
                }}
                className="nav-link"
                style={{ textAlign: "left", background: "none" }}
              >
                How It Works
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToSection("tournaments");
                }}
                className="nav-link"
                style={{ textAlign: "left", background: "none" }}
              >
                Tournaments
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToSection("leaderboard");
                }}
                className="nav-link"
                style={{ textAlign: "left", background: "none" }}
              >
                Leaderboard
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal();
                }}
                className="btn btn-primary"
              >
                Launch App / Sign In →
              </button>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .agent-btn-desktop {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>

      <ProtocolSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </header>
  );
}
