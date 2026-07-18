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
  tags,
  lang,
  labels,
}: {
  publications: Publication[];
  years: number[];
  tags: string[];
  lang: string;
  labels: PublicationListLabels;
}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = publications.filter((pub) => {
    if (selectedYear && pub.year !== selectedYear) return false;
    if (selectedTag && !pub.tags.includes(selectedTag)) return false;
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
      <div className="mt-8">
        <PublicationFilter
          years={years}
          tags={tags}
          selectedYear={selectedYear}
          selectedTag={selectedTag}
          onYearChange={setSelectedYear}
          onTagChange={setSelectedTag}
          labels={labels}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="mt-10">
          {yearOrder.map((year) => (
            <section key={year} className="grid grid-cols-12 gap-x-6">
              <h2 className="type-mono-meta col-span-12 border-t border-border pt-5 text-2xl text-accent-ink md:col-span-2">
                {year}
              </h2>
              <div className="col-span-12 md:col-span-10">
                {byYear.get(year)!.map((pub) => (
                  <PublicationCard
                    key={pub.slug}
                    publication={pub}
                    lang={lang}
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
