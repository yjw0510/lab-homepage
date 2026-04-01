"use client";

import { useState, useRef } from "react";
import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BentoGrid } from "./BentoGrid";
import { PaperOverview } from "./PaperOverview";
import { TopicDrawer } from "./TopicDrawer";
import { BezierOverlay } from "./BezierOverlay";
import { TopicSidebar } from "./TopicSidebar";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Props {
  topics: ResearchTopic[];
  publications: Publication[];
  paperCounts: Record<string, number>;
  lang: string;
  dict: Dictionary;
}

export function TopicsPageClient({
  topics,
  publications,
  paperCounts,
  lang,
  dict,
}: Props) {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [hoveredPubSlug, setHoveredPubSlug] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isWideScreen = useMediaQuery("(min-width: 1400px)");

  const activeTopic = activeTopicId
    ? topics.find((t) => t.id === activeTopicId) ?? null
    : null;

  return (
    <div className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          title={dict.topics?.title ?? "Research Topics"}
          subtitle={
            dict.topics?.subtitle ??
            "Thematic overview of our research directions and associated publications."
          }
        />

        <div ref={containerRef} className="relative">
          {isWideScreen && (
            <div className="absolute -left-[156px] top-0 w-[140px] h-full">
              <div className="sticky top-20">
                <TopicSidebar
                  topics={topics}
                  publications={publications}
                  lang={lang}
                  hoveredPubSlug={hoveredPubSlug}
                  onTopicClick={setActiveTopicId}
                />
              </div>
            </div>
          )}

          <BentoGrid
            topics={topics}
            paperCounts={paperCounts}
            lang={lang}
            onTopicClick={setActiveTopicId}
          />

          <PaperOverview
            publications={publications}
            topics={topics}
            lang={lang}
            hoveredPubSlug={hoveredPubSlug}
            onPubHover={setHoveredPubSlug}
          />

          {isDesktop && (
            <BezierOverlay
              containerRef={containerRef}
              hoveredPubSlug={hoveredPubSlug}
              publications={publications}
              topics={topics}
            />
          )}
        </div>
      </div>

      <TopicDrawer
        topicId={activeTopicId}
        topics={topics}
        publications={publications}
        lang={lang}
        onClose={() => setActiveTopicId(null)}
        onTopicSwitch={setActiveTopicId}
      />
    </div>
  );
}
