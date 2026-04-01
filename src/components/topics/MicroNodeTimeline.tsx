"use client";

import { useState } from "react";
import type { Publication } from "@/types/publication";
import type { ResearchTopic } from "@/types/topic";
import { getTopicsForPublication } from "@/lib/topics";

interface Props {
  publications: Publication[];
  topics: ResearchTopic[];
  lang: string;
}

/**
 * Compact timeline visualization for >30 papers.
 * Renders colored dots on a horizontal year axis with hover tooltips.
 * Currently inactive (22 papers < 30 threshold).
 */
export function MicroNodeTimeline({ publications, topics, lang }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const years = Array.from(new Set(publications.map((p) => p.year))).sort();
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const range = maxYear - minYear || 1;

  return (
    <div className="relative py-8">
      {/* Year axis */}
      <div className="flex justify-between text-xs text-muted-foreground mb-4 px-2">
        {years.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>

      {/* Dot area */}
      <div className="relative h-24">
        {publications.map((pub) => {
          const pubTopics = getTopicsForPublication(pub, topics);
          const color = pubTopics[0]?.color ?? "#9ca3af";
          const x = ((pub.year - minYear) / range) * 100;
          const isHovered = hovered === pub.slug;

          return (
            <div
              key={pub.slug}
              className="absolute"
              style={{ left: `${x}%`, transform: "translateX(-50%)" }}
              onMouseEnter={() => setHovered(pub.slug)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-2 h-2 rounded-full transition-transform"
                style={{
                  backgroundColor: color,
                  transform: isHovered ? "scale(1.6)" : "scale(1)",
                }}
              />
              {isHovered && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-card border border-border rounded-lg px-3 py-2 shadow-lg z-20 text-xs">
                  <p className="font-medium text-foreground max-w-[250px] truncate">
                    {pub.title}
                  </p>
                  <p className="text-muted-foreground">
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
