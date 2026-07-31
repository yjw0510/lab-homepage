"use client";

import type { ResearchTopic } from "@/types/topic";
import { TopicRow } from "./TopicRow";

interface Props {
  topics: ResearchTopic[];
  paperCounts: Record<string, number>;
  lang: string;
  activeTopicId: string | null;
  onTopicClick: (id: string) => void;
}

/** Ledger index with one shared heading for research topics. */
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
        <h2 className="type-heading flex items-baseline border-t border-border-strong pt-4 text-[21px] text-foreground">
          <span
            aria-hidden="true"
            className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary"
          />
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
          {/* Same shape as the section above. A strong rule with nothing on it reads as a gap
              in the ledger rather than the start of a group: 48px of space, the rule, 16px
              more, then the first row's own hairline 17px below the first. */}
          <h2 className="type-heading flex items-baseline border-t border-border-strong pt-4 text-[21px] text-foreground">
            <span
              aria-hidden="true"
              className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary"
            />
            {lang === "ko" ? "그 외" : "Other"}
          </h2>
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
