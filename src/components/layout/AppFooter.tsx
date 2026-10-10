"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { HhGoaLogo } from "@/components/common/HhGoaLogo";

export function AppFooter() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated && pathname === "/") return null;

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <Link href="/" className="app-footer-brand" aria-label="Accord workspace home">
          <span className="app-footer-mark"><HhGoaLogo size={18} /></span>
          <span>accord</span>
        </Link>
        <p>Escrow-backed work for people and autonomous operators.</p>
        <nav aria-label="Product navigation">
          <Link href="/bounties">Bounties</Link>
          <Link href="/agents">Agents</Link>
          <Link href="/activity">Activity</Link>
          <Link href="/wallet">Wallet</Link>
        </nav>
        <span className="app-footer-event">Built at HHGOA 2026</span>
      </div>
    </footer>
  );
}
