"use client";

import { useRef } from "react";
import type { ResearchTopic } from "@/types/topic";
import { TopicCard } from "./TopicCard";
import { useGSAP } from "@/hooks/useGSAP";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Props {
  topics: ResearchTopic[];
  paperCounts: Record<string, number>;
  lang: string;
  onTopicClick: (id: string) => void;
}

export function BentoGrid({ topics, paperCounts, lang, onTopicClick }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useGSAP(
    (gsap) => {
      if (reducedMotion || !gridRef.current) return;
      gsap.from("[data-topic-card]", {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 85%",
        },
      });
    },
    [reducedMotion],
  );

  return (
    <div
      ref={gridRef}
      className="grid gap-4 mb-12"
      style={{
        gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr",
        gridAutoRows: isDesktop ? "minmax(180px, auto)" : "auto",
      }}
    >
      {topics.map((topic) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          paperCount={paperCounts[topic.id] ?? 0}
          lang={lang}
          isDesktop={isDesktop}
          onClick={() => onTopicClick(topic.id)}
        />
      ))}
    </div>
  );
}
