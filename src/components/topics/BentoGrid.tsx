"use client";

import type { ResearchTopic } from "@/types/topic";
import { TopicRow } from "./TopicCard";

interface Props {
  topics: ResearchTopic[];
  paperCounts: Record<string, number>;
  lang: string;
  activeTopicId: string | null;
  onTopicClick: (id: string) => void;
}

/** Ledger index of research topics. Replaces the bento grid.
 * Research topics get the group heading; the misc and future singletons are
 * self-titled rows, so they continue the same ledger without duplicate
 * headers ("기타" above a row titled "기타"). */
export function TopicIndex({
  topics,
  paperCounts,
  lang,
  activeTopicId,
  onTopicClick,
}: Props) {
  const research = topics.filter((t) => (t.kind ?? "research") === "research");
  const others = topics.filter((t) => (t.kind ?? "research") !== "research");

  return (
    <div className="mb-16 sm:mb-20">
      <section>
        <h2 className="type-heading flex items-baseline border-t border-border-strong pt-4 text-[21px] text-foreground"><span aria-hidden="true" className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary" />
          {lang === "ko" ? "연구 분야" : "Research areas"}
        </h2>
        <div className="mt-4">
          {research.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              paperCount={paperCounts[topic.id] ?? 0}
              lang={lang}
              isOpen={activeTopicId === topic.id}
              onClick={() => onTopicClick(topic.id)}
            />
          ))}
        </div>
      </section>
      {others.length > 0 && (
        <section className="mt-12">
          <div className="border-t border-border-strong" />
          <div className="mt-4">
            {others.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                paperCount={paperCounts[topic.id] ?? 0}
                lang={lang}
                isOpen={activeTopicId === topic.id}
                onClick={() => onTopicClick(topic.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
