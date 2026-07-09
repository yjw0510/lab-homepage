"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";
import { getPublicationsForTopic, getTopicsForPublication } from "@/lib/topics";
import { renderMarkdownBody } from "@/lib/markdown";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  topic: ResearchTopic;
  topics: ResearchTopic[];
  publications: Publication[];
  lang: string;
  onClose: () => void;
  onTopicSwitch: (id: string) => void;
}

export function TopicDrawerContent({
  topic,
  topics,
  publications,
  lang,
  onClose,
  onTopicSwitch,
}: Props) {
  const reducedMotion = useReducedMotion();
  const title = lang === "ko" ? topic.titleKo : topic.title;
  const description = lang === "ko" ? topic.descriptionKo : topic.description;

  const topicPubs = getPublicationsForTopic(topic, publications, topics);

  // Group by year descending
  const byYear = new Map<number, Publication[]>();
  for (const pub of topicPubs) {
    const list = byYear.get(pub.year) ?? [];
    list.push(pub);
    byYear.set(pub.year, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={topic.id}
        initial={reducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Title bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
          <h2 className="type-heading truncate text-lg text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Description */}
        <div className="max-w-prose px-6 pt-6 text-[15px] leading-relaxed text-foreground">
          {renderMarkdownBody(description, lang)}
        </div>

        {/* Publication section, skipped for "future" kind */}
        {topic.kind !== "future" && topicPubs.length > 0 && (
          <div className="px-6 pb-10 pt-10">
            <h3 className="border-t border-border-strong pt-3 text-sm font-[600] text-foreground">
              {lang === "ko" ? "관련 논문" : "Publications"}{" "}
              <span className="type-mono-meta text-[12.5px] text-muted-foreground">
                ({topicPubs.length})
              </span>
            </h3>

            <div className="mt-3">
              {years.map((year) =>
                byYear.get(year)!.map((pub, i) => {
                  const pubTopics = getTopicsForPublication(pub, topics);

                  return (
                    <div
                      key={pub.slug}
                      className="grid grid-cols-12 items-baseline gap-x-3 border-t border-border py-3"
                    >
                      <span className="type-mono-meta col-span-2 text-[12px] text-muted-foreground">
                        {i === 0 ? pub.year : ""}
                      </span>
                      <div className="col-span-10">
                        {pub.doi ? (
                          <a
                            href={`https://doi.org/${pub.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-[600] leading-snug text-foreground decoration-[1px] underline-offset-[3px] transition-colors hover:text-accent-ink hover:underline"
                          >
                            {pub.title}
                          </a>
                        ) : (
                          <p className="text-sm font-[600] leading-snug text-foreground">
                            {pub.title}
                          </p>
                        )}
                        <p className="mt-1 text-[12.5px] text-muted-foreground">
                          {pub.authors[0]}
                          {pub.authors.length > 1 ? " et al." : ""},{" "}
                          <span className="type-mono-meta text-[12px]">
                            {pub.journal}
                          </span>
                        </p>

                        {/* Topic labels; other topics switch the drawer */}
                        {pubTopics.length > 0 && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {pubTopics.map((t) => {
                              const isCurrent = t.id === topic.id;
                              const label = lang === "ko" ? t.titleKo : t.title;

                              if (isCurrent) {
                                return (
                                  <span
                                    key={t.id}
                                    className="type-mono-meta text-[11.5px] text-muted-foreground"
                                  >
                                    [{label}]
                                  </span>
                                );
                              }

                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => onTopicSwitch(t.id)}
                                  className="type-mono-meta cursor-pointer py-1 text-[11.5px] text-accent-ink underline decoration-[1px] underline-offset-[3px] transition-colors hover:text-primary"
                                  aria-label={`View ${t.title} details`}
                                >
                                  [{label}]
                                </button>
                              );
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        )}
        {topic.kind === "future" && <div className="pb-10" />}
      </motion.div>
    </AnimatePresence>
  );
}
