"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";
import { getPublicationsForTopic, getTopicsForPublication } from "@/lib/topics";
import { getMultiscaleIcon } from "@/lib/icons";
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
        {/* Accent stripe */}
        <div
          className="h-[3px] w-full"
          style={{ backgroundColor: topic.color }}
        />

        {/* Title bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/90 backdrop-blur-sm border-b border-border/30">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 rounded-lg p-1.5"
              style={{ backgroundColor: `${topic.color}15` }}
            >
              {getMultiscaleIcon(topic.icon, "w-5 h-5")}
            </div>
            <h2 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero placeholder */}
        <div
          className="mx-6 mt-6 rounded-xl flex items-center justify-center h-40"
          style={{
            background: `linear-gradient(135deg, ${topic.color}12, ${topic.color}06)`,
          }}
        >
          {getMultiscaleIcon(topic.icon, "w-16 h-16 text-muted-foreground/30")}
        </div>

        {/* Description */}
        <div className="px-6 mt-6 text-[15px] leading-relaxed text-foreground/90 max-w-prose">
          {renderMarkdownBody(description, lang)}
        </div>

        {/* Publication section — skip for "future" kind */}
        {topic.kind !== "future" && topicPubs.length > 0 && (
          <>
        <hr
          className="mx-6 mt-8 mb-6 border-t"
          style={{ borderColor: `${topic.color}30` }}
        />

        <div className="px-6 pb-10">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            {lang === "ko"
              ? `관련 논문 (${topicPubs.length})`
              : `Publications (${topicPubs.length})`}
          </h3>

          {years.map((year) => (
            <div key={year} className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {year}
              </p>
              <div className="space-y-2">
                {byYear.get(year)!.map((pub) => {
                  const pubTopics = getTopicsForPublication(pub, topics);

                  return (
                    <div
                      key={pub.slug}
                      className="rounded-lg border border-border/30 px-4 py-3 bg-card/50"
                    >
                      {pub.doi ? (
                        <a
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
                        >
                          {pub.title}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                          {pub.title}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {pub.authors[0]}
                        {pub.authors.length > 1 ? " et al." : ""},{" "}
                        <span className="italic">{pub.journal}</span>
                      </p>

                      {/* Topic tags — other topics are clickable */}
                      {pubTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pubTopics.map((t) => {
                            const isCurrent = t.id === topic.id;
                            const label =
                              lang === "ko" ? t.titleKo : t.title;

                            if (isCurrent) {
                              return (
                                <span
                                  key={t.id}
                                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${t.color}25`,
                                    color: t.color,
                                  }}
                                >
                                  {label}
                                </span>
                              );
                            }

                            return (
                              <button
                                key={t.id}
                                onClick={() => onTopicSwitch(t.id)}
                                className="text-[11px] font-medium px-1.5 py-0.5 rounded-full cursor-pointer hover:brightness-110 transition-all"
                                style={{
                                  backgroundColor: `${t.color}18`,
                                  color: t.color,
                                }}
                                aria-label={`View ${t.title} details`}
                              >
                                {label} →
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
          </>
        )}
        {topic.kind === "future" && <div className="pb-10" />}
      </motion.div>
    </AnimatePresence>
  );
}
