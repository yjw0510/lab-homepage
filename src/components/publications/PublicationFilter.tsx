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
    // 황 wash, per DESIGN.md: "selection and active-toggle background tint". The red underline
    // this replaces is the masthead's active-nav mark and reads as navigation, not as a filter.
    active
      ? "bg-accent px-2 text-accent-foreground"
      : "px-2 text-muted-foreground hover:text-foreground"
  );
}

export function PublicationFilter({
  years,
  topics,
  selectedYear,
  selectedTopic,
  onYearChange,
  onTopicChange,
  labels,
}: {
  years: number[];
  topics: { id: string; label: string }[];
  selectedYear: number | null;
  selectedTopic: string | null;
  onYearChange: (year: number | null) => void;
  onTopicChange: (topic: string | null) => void;
  labels: PublicationFilterLabels;
}) {
  return (
    <div className="space-y-3">
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

      {/* Research-topic filter */}
      <div
        role="group"
        aria-label={labels.filterByTag}
        className="flex flex-wrap items-baseline gap-x-5 border-t border-border pt-3"
      >
        <button
          type="button"
          onClick={() => onTopicChange(null)}
          aria-pressed={selectedTopic === null}
          className={toggleClass(selectedTopic === null)}
        >
          {labels.allTags}
        </button>
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onTopicChange(topic.id === selectedTopic ? null : topic.id)}
            aria-pressed={selectedTopic === topic.id}
            className={toggleClass(selectedTopic === topic.id)}
          >
            {topic.label}
          </button>
        ))}
      </div>
    </div>
  );
}
