"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { HhGoaLogo } from "@/components/common/HhGoaLogo";

/**
 * Single, refined, high-end watermark for Hacker House Goa 2026.
 * Positioned cleanly in the bottom corner with ambient glass backdrop.
 */
export function AmbientWatermark() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated && pathname === "/") {
    return null;
  }

  return (
    <aside
      aria-label="Event Watermark"
      style={{
        position: "fixed",
        bottom: "1.25rem",
        right: "1.25rem",
        zIndex: 40,
        pointerEvents: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(226, 232, 240, 0.85)",
        borderRadius: "9999px",
        padding: "0.38rem 0.85rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.72rem",
        fontWeight: 600,
        color: "#334155",
        letterSpacing: "0.02em",
        boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.06)",
        userSelect: "none",
      }}
    >
      <HhGoaLogo size={16} badge={false} />
      <span>Hacker House Goa 2026</span>
    </aside>
  );
}

export function WatermarkBadge() {
  return null; // Deprecated in favor of single ambient watermark to prevent multi-badge clutter
}
