"use client";

import { cn } from "@/lib/utils";

export interface PublicationFilterLabels {
  filterByYear: string;
  filterByTag: string;
  allYears: string;
  allTags: string;
}

function toggleClass(active: boolean): string {
  return cn(
    "type-mono-meta inline-flex min-h-11 items-center text-[12.5px] transition-colors",
    active
      ? "text-foreground underline decoration-primary decoration-2 underline-offset-[4px]"
      : "text-muted-foreground hover:text-foreground"
  );
}

export function PublicationFilter({
  years,
  tags,
  selectedYear,
  selectedTag,
  onYearChange,
  onTagChange,
  labels,
}: {
  years: number[];
  tags: string[];
  selectedYear: number | null;
  selectedTag: string | null;
  onYearChange: (year: number | null) => void;
  onTagChange: (tag: string | null) => void;
  labels: PublicationFilterLabels;
}) {
  return (
    <div className="space-y-1">
      {/* Year filter */}
      <div
        role="group"
        aria-label={labels.filterByYear}
        className="flex flex-wrap items-baseline gap-x-5"
      >
        <button
          type="button"
          onClick={() => onYearChange(null)}
          aria-pressed={selectedYear === null}
          className={toggleClass(selectedYear === null)}
        >
          {labels.allYears}
        </button>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year === selectedYear ? null : year)}
            aria-pressed={selectedYear === year}
            className={toggleClass(selectedYear === year)}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div
        role="group"
        aria-label={labels.filterByTag}
        className="flex flex-wrap items-baseline gap-x-5"
      >
        <button
          type="button"
          onClick={() => onTagChange(null)}
          aria-pressed={selectedTag === null}
          className={toggleClass(selectedTag === null)}
        >
          {labels.allTags}
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagChange(tag === selectedTag ? null : tag)}
            aria-pressed={selectedTag === tag}
            className={toggleClass(selectedTag === tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
