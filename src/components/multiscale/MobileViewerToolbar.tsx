"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ResearchCameraActions } from "./VisualStage";

interface Props {
  cameraActionsRef: React.RefObject<ResearchCameraActions | null>;
  lang: string;
  isOpen: boolean;
  onToggle: () => void;
}

const ACTIONS = [
  { key: "zoomIn", icon: ZoomIn, en: "Zoom in", ko: "확대" },
  { key: "zoomOut", icon: ZoomOut, en: "Zoom out", ko: "축소" },
  { key: "fit", icon: Maximize2, en: "Fit", ko: "맞춤" },
  { key: "reset", icon: RotateCcw, en: "Reset", ko: "재설정" },
] as const;

const BTN =
  "flex h-12 w-12 items-center justify-center text-foreground transition-colors hover:bg-muted";

export function MobileViewerToolbar({ cameraActionsRef, lang, isOpen, onToggle }: Props) {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isOpen, onToggle]);

  const transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, damping: 25, stiffness: 400 };

  return (
    <div
      ref={panelRef}
      className="absolute right-3 top-3 z-10"
      data-testid="mobile-viewer-toolbar"
    >
      {/* Trigger stays anchored beside the title. */}
      <button
        type="button"
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-border-strong bg-surface-raised text-foreground transition-colors hover:bg-muted"
        onClick={onToggle}
        aria-label={lang === "ko" ? "뷰어 도구" : "Viewer tools"}
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {/* A compact 2×2 tray opens below the title line. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0, originY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={transition}
            className="absolute right-0 top-[7rem] grid grid-cols-2 gap-1 border border-border-strong bg-surface-raised p-1"
            data-testid="mobile-viewer-toolbar-tray"
          >
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              const label = lang === "ko" ? action.ko : action.en;
              return (
                <button
                  key={action.key}
                  type="button"
                  className={BTN}
                  onClick={() => {
                    cameraActionsRef.current?.[action.key as keyof ResearchCameraActions]?.();
                  }}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
