"use client";

import { cn } from "@/lib/utils";

export function PublicationFilter({
  years,
  tags,
  selectedYear,
  selectedTag,
  onYearChange,
  onTagChange,
}: {
  years: number[];
  tags: string[];
  selectedYear: number | null;
  selectedTag: string | null;
  onYearChange: (year: number | null) => void;
  onTagChange: (tag: string | null) => void;
}) {
  return (
    <div className="space-y-4 mb-8">
      {/* Year filter */}
      <div role="group" aria-label="Filter by year" className="flex flex-wrap gap-2">
        <button
          onClick={() => onYearChange(null)}
          aria-pressed={selectedYear === null}
          className={cn(
            "px-4 py-2 text-sm rounded-lg transition-colors",
            selectedYear === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All Years
        </button>
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year === selectedYear ? null : year)}
            aria-pressed={selectedYear === year}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-colors",
              selectedYear === year
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
        <button
          onClick={() => onTagChange(null)}
          aria-pressed={selectedTag === null}
          className={cn(
            "px-4 py-2 text-sm rounded-lg transition-colors",
            selectedTag === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All Topics
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagChange(tag === selectedTag ? null : tag)}
            aria-pressed={selectedTag === tag}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-colors",
              selectedTag === tag
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
