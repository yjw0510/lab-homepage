"use client";

import { useState } from "react";
import { PublicationCard } from "./PublicationCard";
import { PublicationFilter } from "./PublicationFilter";
import type { Publication } from "@/types/publication";

export function PublicationList({
  publications,
  years,
  tags,
}: {
  publications: Publication[];
  years: number[];
  tags: string[];
}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = publications.filter((pub) => {
    if (selectedYear && pub.year !== selectedYear) return false;
    if (selectedTag && !pub.tags.includes(selectedTag)) return false;
    return true;
  });

  return (
    <div>
      <PublicationFilter
        years={years}
        tags={tags}
        selectedYear={selectedYear}
        selectedTag={selectedTag}
        onYearChange={setSelectedYear}
        onTagChange={setSelectedTag}
      />

      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((pub) => (
            <PublicationCard key={pub.slug} publication={pub} />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-12">
            No publications match the selected filters.
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        Showing {filtered.length} of {publications.length} publications
      </p>
    </div>
  );
}
