"use client";

import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";
import { getTopicsForPublication } from "@/lib/topics";
import { cn } from "@/lib/utils";

interface Props {
  topics: ResearchTopic[];
  publications: Publication[];
  lang: string;
  hoveredPubSlug: string | null;
  onTopicClick: (id: string) => void;
}

export function TopicSidebar({
  topics,
  publications,
  lang,
  hoveredPubSlug,
  onTopicClick,
}: Props) {
  const activeTopicIds = new Set<string>();
  if (hoveredPubSlug) {
    const pub = publications.find((p) => p.slug === hoveredPubSlug);
    if (pub) {
      for (const t of getTopicsForPublication(pub, topics)) {
        activeTopicIds.add(t.id);
      }
    }
  }

  const displayTopics = topics.filter((t) => t.kind !== "future");

  return (
    <nav aria-label={lang === "ko" ? "주제 색인" : "Topic index"}>
      {displayTopics.map((topic) => {
        const isActive = activeTopicIds.has(topic.id);
        return (
          <button
            key={topic.id}
            type="button"
            data-topic-sidebar={topic.id}
            onClick={() => onTopicClick(topic.id)}
            className={cn(
              "type-mono-meta flex min-h-11 w-full cursor-pointer items-center border-t border-border text-left text-[12px] leading-snug transition-colors",
              isActive
                ? "text-foreground underline decoration-primary decoration-2 underline-offset-4"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lang === "ko" ? topic.titleKo : topic.title}
          </button>
        );
      })}
    </nav>
  );
}
