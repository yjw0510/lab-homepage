"use client";

import { useState } from "react";
import { PublicationCard } from "./PublicationCard";
import {
  PublicationFilter,
  type PublicationFilterLabels,
} from "./PublicationFilter";
import type { Publication } from "@/types/publication";

export interface PublicationListLabels extends PublicationFilterLabels {
  noResults: string;
}

export function PublicationList({
  publications,
  years,
  topics,
  topicsBySlug,
  lang,
  labels,
}: {
  publications: Publication[];
  years: number[];
  /** Research topics that hold at least one paper, in the Research Topics page's order. */
  topics: { id: string; label: string }[];
  topicsBySlug: Record<string, string[]>;
  lang: string;
  labels: PublicationListLabels;
}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const topicLabel = new Map(topics.map((t) => [t.id, t.label]));

  const filtered = publications.filter((pub) => {
    if (selectedYear && pub.year !== selectedYear) return false;
    if (selectedTopic && !topicsBySlug[pub.slug].includes(selectedTopic)) return false;
    return true;
  });

  // Group by year, preserving the loader's descending-year order.
  const yearOrder: number[] = [];
  const byYear = new Map<number, Publication[]>();
  for (const pub of filtered) {
    if (!byYear.has(pub.year)) {
      byYear.set(pub.year, []);
      yearOrder.push(pub.year);
    }
    byYear.get(pub.year)!.push(pub);
  }

  return (
    <div>
      <PublicationFilter
        years={years}
        topics={topics}
        selectedYear={selectedYear}
        selectedTopic={selectedTopic}
        onYearChange={setSelectedYear}
        onTopicChange={setSelectedTopic}
        labels={labels}
      />

      {filtered.length > 0 ? (
        <div className="mt-10">
          {yearOrder.map((year) => (
            <section key={year} className="grid grid-cols-12 gap-x-6">
              <h3 className="type-mono-meta col-span-12 border-t border-border pt-5 text-2xl text-accent-ink md:col-span-2">
                {year}
              </h3>
              <div className="col-span-12 md:col-span-10">
                {byYear.get(year)!.map((pub) => (
                  <PublicationCard
                    key={pub.slug}
                    publication={pub}
                    lang={lang}
                    topics={topicsBySlug[pub.slug].map((id) => topicLabel.get(id) ?? id)}
                  />
                ))}
              </div>
            </section>
          ))}
          <p className="type-mono-meta border-t border-border pt-3 text-[12px] text-muted-foreground">
            {filtered.length} / {publications.length}
          </p>
        </div>
      ) : (
        <div className="mt-10 border-t border-b border-border py-10">
          <p className="type-mono-meta text-[12px] text-muted-foreground">
            0 / {publications.length}
          </p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            {labels.noResults}
          </p>
        </div>
      )}
    </div>
  );
}
