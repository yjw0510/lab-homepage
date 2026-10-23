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
    const measure = () => {
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
      const pubTopics = getTopicsForPublication(pub, topics);
      const newCurves: CurveData[] = [];

      for (const topic of pubTopics) {
        // Curves target the sticky sidebar only. A curve up to the index rows above the
        // paper list ran straight through every row in between.
        const targetEl = container.querySelector(
          `[data-topic-sidebar="${topic.id}"]`,
        );
        if (!targetEl) continue;

        // Horizontal curve: paper left edge → sidebar right edge
        const targetRect = targetEl.getBoundingClientRect();
        const sX = pubRect.left - containerRect.left;
        const sY = pubRect.top + pubRect.height / 2 - containerRect.top;
        const eX = targetRect.right - containerRect.left;
        const eY = targetRect.top + targetRect.height / 2 - containerRect.top;
        const cpOffset = Math.abs(sX - eX) * 0.4;
        const d = `M ${sX} ${sY} C ${sX - cpOffset} ${sY}, ${eX + cpOffset} ${eY}, ${eX} ${eY}`;

        newCurves.push({
          key: `${hoveredPubSlug}-${topic.id}`,
          d,
        });
      }

      setCurves(newCurves);
    };

    let raf = requestAnimationFrame(measure);
    if (!hoveredPubSlug) return () => cancelAnimationFrame(raf);

    // The sidebar is sticky and the paper list is not, so a scroll with the pointer still
    // inside one card moves the two ends apart. Re-measure on every scroll or resize.
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
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
