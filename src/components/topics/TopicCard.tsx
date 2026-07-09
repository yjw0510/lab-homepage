"use client";

import type { ResearchTopic } from "@/types/topic";
import { cn } from "@/lib/utils";

interface Props {
  topic: ResearchTopic;
  paperCount: number;
  lang: string;
  isOpen: boolean;
  onClick: () => void;
}

/** One ledger index row: mono paper count in the margin column,
 *  title + one-line tagline in the content columns. Triggers the drawer. */
export function TopicRow({ topic, paperCount, lang, isOpen, onClick }: Props) {
  const title = lang === "ko" ? topic.titleKo : topic.title;
  const tagline = lang === "ko" ? topic.taglineKo : topic.tagline;

  return (
    <button
      type="button"
      data-topic-card
      data-topic-id={topic.id}
      onClick={onClick}
      className={cn(
        "grid w-full cursor-pointer grid-cols-12 items-baseline gap-x-4 border-t border-border py-5 text-left transition-colors",
        isOpen ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "type-mono-meta col-span-2 text-[13px] sm:col-span-1",
          isOpen ? "text-accent-foreground" : "text-muted-foreground",
        )}
      >
        {topic.kind === "future" ? "" : paperCount}
      </span>
      <span className="col-span-10 sm:col-span-11">
        <span
          className={cn(
            "block font-[600]",
            isOpen ? "text-accent-foreground" : "text-foreground",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "mt-1 block text-sm leading-relaxed",
            isOpen ? "text-accent-foreground/80" : "text-muted-foreground",
          )}
        >
          {tagline}
        </span>
      </span>
    </button>
  );
}
