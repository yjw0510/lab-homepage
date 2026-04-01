"use client";

import { motion } from "framer-motion";
import type { ResearchTopic } from "@/types/topic";
import { getMultiscaleIcon } from "@/lib/icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  topic: ResearchTopic;
  paperCount: number;
  lang: string;
  isDesktop: boolean;
  onClick: () => void;
}

export function TopicCard({
  topic,
  paperCount,
  lang,
  isDesktop,
  onClick,
}: Props) {
  const reducedMotion = useReducedMotion();
  const title = lang === "ko" ? topic.titleKo : topic.title;
  const tagline = lang === "ko" ? topic.taglineKo : topic.tagline;

  return (
    <motion.div
      data-topic-card
      data-topic-id={topic.id}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      whileHover={reducedMotion ? undefined : { scale: 1.02 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative rounded-xl border border-border/60 bg-card p-6 cursor-pointer
                 hover:shadow-lg transition-shadow"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: topic.color,
        gridColumn: isDesktop ? `span ${topic.gridSpan[0]}` : undefined,
        gridRow: isDesktop ? `span ${topic.gridSpan[1]}` : undefined,
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex-shrink-0 rounded-lg p-2"
          style={{ backgroundColor: `${topic.color}15` }}
        >
          {getMultiscaleIcon(topic.icon, "w-6 h-6")}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground leading-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {tagline}
          </p>
        </div>
      </div>

      {topic.kind !== "future" && (
        <div className="mt-auto pt-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${topic.color}18`,
              color: topic.color,
            }}
          >
            {paperCount} {paperCount === 1 ? "paper" : "papers"}
          </span>
        </div>
      )}
    </motion.div>
  );
}
