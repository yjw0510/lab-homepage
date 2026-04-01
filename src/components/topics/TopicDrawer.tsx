"use client";

import { useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ResearchTopic } from "@/types/topic";
import type { Publication } from "@/types/publication";
import { TopicDrawerContent } from "./TopicDrawerContent";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  topicId: string | null;
  topics: ResearchTopic[];
  publications: Publication[];
  lang: string;
  onClose: () => void;
  onTopicSwitch: (id: string) => void;
}

export function TopicDrawer({
  topicId,
  topics,
  publications,
  lang,
  onClose,
  onTopicSwitch,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useReducedMotion();
  const triggerRef = useRef<Element | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const topic = topicId ? topics.find((t) => t.id === topicId) ?? null : null;
  const isOpen = topic !== null;

  // Save trigger element for focus restoration
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Body scroll lock + Escape key
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // Focus trapping
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length > 0) focusables[0].focus();

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", onTab);

    return () => {
      panel.removeEventListener("keydown", onTab);
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, topicId]);

  const dur = reducedMotion ? 0 : undefined;

  const panelVariants = isDesktop
    ? {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
      };

  const handleTopicSwitch = useCallback(
    (id: string) => {
      onTopicSwitch(id);
    },
    [onTopicSwitch],
  );

  return (
    <AnimatePresence>
      {isOpen && topic && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur ?? 0.25 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={topic.title}
            {...panelVariants}
            transition={
              dur !== undefined
                ? { duration: 0 }
                : { type: "spring", damping: 30, stiffness: 300 }
            }
            className={
              isDesktop
                ? "fixed top-0 right-0 z-50 h-full w-[55vw] max-w-3xl border-l border-border/50 bg-card/85 backdrop-blur-xl overflow-y-auto"
                : "fixed bottom-0 left-0 right-0 z-50 h-[85vh] rounded-t-2xl border-t border-border/50 bg-card/85 backdrop-blur-xl overflow-y-auto"
            }
          >
            <TopicDrawerContent
              topic={topic}
              topics={topics}
              publications={publications}
              lang={lang}
              onClose={onClose}
              onTopicSwitch={handleTopicSwitch}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
