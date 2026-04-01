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
  "flex h-9 w-9 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/10";

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
    <div ref={panelRef} className="absolute right-3 top-3 z-10 flex items-start gap-1.5">
      {/* Expanding action bar — slides in from the right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0, originX: 1 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={transition}
            className="flex items-center gap-1 rounded-xl border border-white/12 bg-slate-950/85 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.36)] backdrop-blur-md"
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
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <button
        type="button"
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/12 bg-slate-950/78 text-white/90 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-white/22 hover:bg-slate-900/86"
        onClick={onToggle}
        aria-label={lang === "ko" ? "뷰어 도구" : "Viewer tools"}
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
