"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
  style?: React.CSSProperties;
  threshold?: number;
}

/**
 * Performant, hardware-accelerated Scroll Reveal component.
 * Uses IntersectionObserver with cubic-bezier easing to trigger sleek,
 * staggered scroll animations without layout shifts or external library overhead.
 */
export function ScrollReveal({
  children,
  delay = 0,
  duration = 650,
  yOffset = 22,
  className = "",
  style = {},
  threshold = 0.12,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Check if element is already within viewport on initial paint
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.95 && rect.bottom >= 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(${yOffset}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: isVisible ? "auto" : "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
