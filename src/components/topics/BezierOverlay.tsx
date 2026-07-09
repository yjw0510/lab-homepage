"use client";

import { useState, useEffect, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Publication } from "@/types/publication";
import type { ResearchTopic } from "@/types/topic";
import { getTopicsForPublication } from "@/lib/topics";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  containerRef: RefObject<HTMLDivElement | null>;
  hoveredPubSlug: string | null;
  publications: Publication[];
  topics: ResearchTopic[];
}

interface CurveData {
  key: string;
  d: string;
}

export function BezierOverlay({
  containerRef,
  hoveredPubSlug,
  publications,
  topics,
}: Props) {
  const [curves, setCurves] = useState<CurveData[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Measure after paint; setState only inside the rAF callback.
    const raf = requestAnimationFrame(() => {
      if (!hoveredPubSlug || !containerRef.current) {
        setCurves([]);
        return;
      }

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      const pubEl = container.querySelector(
        `[data-pub-slug="${hoveredPubSlug}"]`,
      );
      if (!pubEl) {
        setCurves([]);
        return;
      }

      const pub = publications.find((p) => p.slug === hoveredPubSlug);
      if (!pub) {
        setCurves([]);
        return;
      }

      const pubRect = pubEl.getBoundingClientRect();
      const startX = pubRect.left + pubRect.width / 2 - containerRect.left;
      const startY = pubRect.top - containerRect.top;

      const pubTopics = getTopicsForPublication(pub, topics);
      const newCurves: CurveData[] = [];

      for (const topic of pubTopics) {
        // Prefer topic index row if visible, otherwise fall back to sidebar
        const gridEl = container.querySelector(
          `[data-topic-id="${topic.id}"]`,
        );
        const sidebarEl = container.querySelector(
          `[data-topic-sidebar="${topic.id}"]`,
        );

        let targetEl: Element | null = null;
        let useSidebar = false;

        if (gridEl) {
          const rect = gridEl.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            targetEl = gridEl;
          }
        }
        if (!targetEl && sidebarEl) {
          targetEl = sidebarEl;
          useSidebar = true;
        }
        if (!targetEl) continue;

        const targetRect = targetEl.getBoundingClientRect();
        let d: string;

        if (useSidebar) {
          // Horizontal curve: paper left edge → sidebar right edge
          const sX = pubRect.left - containerRect.left;
          const sY = pubRect.top + pubRect.height / 2 - containerRect.top;
          const eX = targetRect.right - containerRect.left;
          const eY = targetRect.top + targetRect.height / 2 - containerRect.top;
          const cpOffset = Math.abs(sX - eX) * 0.4;
          d = `M ${sX} ${sY} C ${sX - cpOffset} ${sY}, ${eX + cpOffset} ${eY}, ${eX} ${eY}`;
        } else {
          // Vertical curve: paper top center → index row bottom center
          const endX =
            targetRect.left + targetRect.width / 2 - containerRect.left;
          const endY = targetRect.bottom - containerRect.top;
          const cpOffset = Math.abs(startY - endY) * 0.4;
          d = `M ${startX} ${startY} C ${startX} ${startY - cpOffset}, ${endX} ${endY + cpOffset}, ${endX} ${endY}`;
        }

        newCurves.push({
          key: `${hoveredPubSlug}-${topic.id}`,
          d,
        });
      }

      setCurves(newCurves);
    });

    return () => cancelAnimationFrame(raf);
  }, [hoveredPubSlug, containerRef, publications, topics]);

  if (reducedMotion) {
    // Static representation: same connection lines, no draw-on animation
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        {curves.map((curve) => (
          <path
            key={curve.key}
            d={curve.d}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
            fill="none"
            opacity={0.9}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <AnimatePresence>
        {curves.map((curve) => (
          <motion.path
            key={curve.key}
            d={curve.d}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </svg>
  );
}
