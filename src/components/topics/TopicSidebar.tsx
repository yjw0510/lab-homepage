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
    <nav className="space-y-1.5">
      {displayTopics.map((topic) => {
        const isActive = activeTopicIds.has(topic.id);
        return (
          <button
            key={topic.id}
            data-topic-sidebar={topic.id}
            onClick={() => onTopicClick(topic.id)}
            className={cn(
              "w-full text-left text-[11px] leading-tight px-2 py-1.5 rounded-r border-l-2 transition-all duration-200 cursor-pointer",
              isActive
                ? "bg-accent/50"
                : "opacity-50 hover:opacity-90 hover:bg-accent/20",
            )}
            style={{
              borderLeftColor: isActive ? topic.color : `${topic.color}60`,
              color: isActive ? topic.color : undefined,
            }}
          >
            {lang === "ko" ? topic.titleKo : topic.title}
          </button>
        );
      })}
    </nav>
  );
}
