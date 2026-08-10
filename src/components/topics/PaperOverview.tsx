"use client";

import type { Publication } from "@/types/publication";
import type { ResearchTopic } from "@/types/topic";
import { getTopicsForPublication } from "@/lib/topics";
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
  // Group by year descending
  const byYear = new Map<number, Publication[]>();
  for (const pub of publications) {
    const list = byYear.get(pub.year) ?? [];
    list.push(pub);
    byYear.set(pub.year, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <section>
      <h2 className="type-heading flex items-baseline border-t border-border-strong pt-4 text-[21px] text-foreground">
        <span
          aria-hidden="true"
          className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary"
        />
        {lang === "ko" ? "전체 논문" : "All Publications"}
      </h2>

      <div className="mt-4">
        {years.map((year) =>
          byYear.get(year)!.map((pub, i) => {
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
                  "grid grid-cols-12 items-baseline gap-x-4 border-t border-border py-4 transition-colors",
                  isHovered && "bg-muted/50",
                )}
              >
                <span className="type-mono-meta col-span-2 text-[13px] text-muted-foreground sm:col-span-1">
                  {i === 0 ? year : ""}
                </span>
                <div className="col-span-10 sm:col-span-11">
                  <p className="text-[15px] font-[600] leading-snug text-foreground">
                    {pub.title}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {pub.authors[0] === "Ji Woong Yu" ? (
                      <span className="type-lead text-lv-mlff-text">
                        {pub.authors[0]}
                      </span>
                    ) : (
                      pub.authors[0]
                    )}
                    {pub.authors.length > 1 ? " et al." : ""},{" "}
                    <span className="type-mono-meta text-[12.5px]">
                      {pub.journal}
                    </span>
                  </p>
                  {pubTopics.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {pubTopics.map((t) => (
                        <span
                          key={t.id}
                          className="type-mono-meta text-[11.5px] text-muted-foreground"
                        >
                          [{lang === "ko" ? t.titleKo : t.title}]
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </section>
  );
}
