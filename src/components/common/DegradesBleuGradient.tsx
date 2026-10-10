"use client";

import React, { useEffect, useRef } from "react";

/**
 * Recreates the "Dégradés bleu" gradient from 21st.dev (Silk Blend).
 * Palette: #FFFFFF (White) @ 54%, #78B8F9 (Sky blue) @ 57%, #5667FF (Ultramarine) @ 60%, #4D2FF9 (Iris) @ 100%
 * Motion: Animated via requestAnimationFrame with elapsed-seconds clock `t`.
 * Formula: angle = baseAngle + Math.sin(spin * 0.6) * 24 * amt (sway, 0 at ph = 0).
 * Softened & stabilized with oversized layer blur to eliminate harsh banding.
 */
export function DegradesBleuGradient({
  className = "",
  children,
  style = {},
  fullBleed = false,
}: {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  fullBleed?: boolean;
}) {
  const canvasLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;
    const baseAngle = 191;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = (now - startTime) / 1000;
      const ph = t * 0.6; // gentle, stable clock
      const amt = 0.22;   // controlled subtle sway so horizon remains stable
      const dir = 1;
      const spin = ph * dir;
      // Formula: angle + sin(spin * 0.6) * 24 * amt (starts at 0 when ph=0)
      const currentAngle = baseAngle + Math.sin(spin * 0.6) * 24 * amt;

      if (canvasLayerRef.current) {
        canvasLayerRef.current.style.backgroundImage = `
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 40%, rgba(0, 0, 0, 0.06) 100%),
          linear-gradient(${currentAngle}deg, #FFFFFF 48%, #78B8F9 60%, #5667FF 74%, #4D2FF9 100%)
        `;
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className={className}
      style={{
        backgroundColor: "#FFFFFF",
        position: fullBleed ? "absolute" : "relative",
        overflow: "hidden",
        ...(fullBleed
          ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }
          : {}),
        ...style,
      }}
    >
      {/* Oversized Softened Canvas Layer (Silk Blend Diffusion) */}
      <div
        ref={canvasLayerRef}
        style={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          right: "-10%",
          bottom: "-15%",
          width: "120%",
          height: "130%",
          backgroundColor: "#FFFFFF",
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 40%, rgba(0, 0, 0, 0.06) 100%), linear-gradient(191deg, #FFFFFF 48%, #78B8F9 60%, #5667FF 74%, #4D2FF9 100%)`,
          filter: "blur(42px)",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
