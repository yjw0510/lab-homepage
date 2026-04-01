"use client";

import { useRef } from "react";
import type { Publication } from "@/types/publication";
import type { ResearchTopic } from "@/types/topic";
import { getTopicsForPublication } from "@/lib/topics";
import { useGSAP } from "@/hooks/useGSAP";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface Props {
  publications: Publication[];
  topics: ResearchTopic[];
  lang: string;
  hoveredPubSlug: string | null;
  onPubHover: (slug: string | null) => void;
}

export function PaperOverview({
  publications,
  topics,
  lang,
  hoveredPubSlug,
  onPubHover,
}: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    (gsap) => {
      if (reducedMotion || !sectionRef.current) return;
      gsap.from("[data-paper-card]", {
        y: 20,
        opacity: 0,
        stagger: 0.04,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
        },
      });
    },
    [reducedMotion],
  );

  // Group by year descending
  const byYear = new Map<number, Publication[]>();
  for (const pub of publications) {
    const list = byYear.get(pub.year) ?? [];
    list.push(pub);
    byYear.set(pub.year, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div ref={sectionRef}>
      <h2 className="text-xl font-semibold text-foreground mb-6">
        {lang === "ko" ? "전체 논문" : "All Publications"}
      </h2>

      {years.map((year) => (
        <div key={year} className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-16 bg-background/80 backdrop-blur-sm py-1 z-[5]">
            {year}
          </h3>
          <div className="space-y-2">
            {byYear.get(year)!.map((pub) => {
              const pubTopics = getTopicsForPublication(pub, topics);
              const isHovered = hoveredPubSlug === pub.slug;

              return (
                <div
                  key={pub.slug}
                  data-paper-card
                  data-pub-slug={pub.slug}
                  onMouseEnter={() => onPubHover(pub.slug)}
                  onMouseLeave={() => onPubHover(null)}
                  className={cn(
                    "rounded-lg border border-border/40 px-4 py-3 transition-all",
                    isHovered
                      ? "bg-accent/60 border-border shadow-sm"
                      : "bg-card/50 hover:bg-accent/30",
                  )}
                >
                  <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                    {pub.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pub.authors[0]}
                    {pub.authors.length > 1 ? " et al." : ""},{" "}
                    <span className="italic">{pub.journal}</span>
                  </p>
                  {pubTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pubTopics.map((t) => (
                        <span
                          key={t.id}
                          className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${t.color}18`,
                            color: t.color,
                          }}
                        >
                          {lang === "ko" ? t.titleKo : t.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
