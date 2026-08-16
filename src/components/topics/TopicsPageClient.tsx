"use client";

import { useState, useRef } from "react";
import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { TopicIndex } from "./TopicIndex";
import { PaperOverview } from "./PaperOverview";
import { TopicDrawer } from "./TopicDrawer";
import { BezierOverlay } from "./BezierOverlay";
import { TopicSidebar } from "./TopicSidebar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

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
  const hasSidebar = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="py-20 sm:py-28">
      {/* Gutter on the clamped element, not outside it. Applied to the outer div, `mx-auto`
          absorbs it and the column measures 1152px instead of the declared 1088, so body
          content on these four routes ruled 32px wider than the navbar above and the footer
          below it on the same screen. */}
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Masthead: display title + subtitle over a double rule */}
        <header className="mb-14 sm:mb-20">
          <h1 className="type-display text-[37px] text-foreground sm:text-[49px]">
            {dict.topics.title}
          </h1>
          <p className="mt-4 max-w-[34rem] leading-relaxed text-muted-foreground">
            {dict.topics.subtitle}
          </p>
          <div className="mt-8 h-[3px] border-y border-border-strong" />
        </header>

        <div
          ref={containerRef}
          className={cn("relative", hasSidebar && "grid grid-cols-12 gap-x-8")}
        >
          {hasSidebar && (
            <aside className="col-span-3">
              <div className="sticky top-20">
                <TopicSidebar
                  topics={topics}
                  publications={publications}
                  lang={lang}
                  hoveredPubSlug={hoveredPubSlug}
                  onTopicClick={setActiveTopicId}
                />
              </div>
            </aside>
          )}

          <div className={cn(hasSidebar && "col-span-9")}>
            <TopicIndex
              topics={topics}
              paperCounts={paperCounts}
              lang={lang}
              activeTopicId={activeTopicId}
              onTopicClick={setActiveTopicId}
            />

            <PaperOverview
              publications={publications}
              topics={topics}
              lang={lang}
              hoveredPubSlug={hoveredPubSlug}
              onPubHover={setHoveredPubSlug}
            />
          </div>

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
