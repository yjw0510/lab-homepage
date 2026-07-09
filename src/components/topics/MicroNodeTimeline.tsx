"use client";

import { useEffect, useRef, useState } from "react";
import type { Publication } from "@/types/publication";
import type { ResearchTopic } from "@/types/topic";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  publications: Publication[];
  topics: ResearchTopic[];
  lang: string;
}

/**
 * Compact timeline visualization for >30 papers.
 * Vermilion square nodes on a hairline spine with mono year markers.
 * Currently inactive (22 papers < 30 threshold).
 */
export function MicroNodeTimeline({ publications }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Reveal policy: content is visible by default. JS adds `.pre-reveal`
  // before observing, then `.visible` on intersect.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || reducedMotion) return;

    el.classList.add("pre-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("visible");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const years = Array.from(new Set(publications.map((p) => p.year))).sort();
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const range = maxYear - minYear || 1;

  return (
    <div ref={rootRef} className="multiscale-reveal relative py-8">
      {/* Year markers */}
      <div className="type-mono-meta mb-4 flex justify-between px-2 text-[12px] text-muted-foreground">
        {years.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>

      {/* Hairline spine with vermilion nodes */}
      <div className="relative h-16 border-t border-border">
        {publications.map((pub) => {
          const x = ((pub.year - minYear) / range) * 100;
          const isHovered = hovered === pub.slug;

          return (
            <div
              key={pub.slug}
              className="absolute -top-[2px]"
              style={{ left: `${x}%`, transform: "translateX(-50%)" }}
              onMouseEnter={() => setHovered(pub.slug)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="block h-[3px] w-[3px] bg-primary transition-transform"
                style={{ transform: isHovered ? "scale(2.5)" : undefined }}
              />
              {isHovered && (
                <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap border border-border bg-background px-3 py-2 text-xs">
                  <p className="max-w-[250px] truncate font-[600] text-foreground">
                    {pub.title}
                  </p>
                  <p className="type-mono-meta mt-0.5 text-[11px] text-muted-foreground">
                    {pub.journal}, {pub.year}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
