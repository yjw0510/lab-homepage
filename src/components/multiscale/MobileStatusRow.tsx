"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { LEVELS, type LevelConfig, type ScrollState } from "./scrollState";

interface Props {
  scrollState: ScrollState;
  level: LevelConfig;
  canGoNext: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onStepClick: (localStep: number) => void;
  onLevelSwitch: (levelIndex: number) => void;
  lang: string;
  scfLabel?: string | null;
  rdfLabel?: string | null;
  onChipTap?: () => void;
}

export function MobileStatusRow({
  scrollState,
  canGoNext,
  canGoPrev,
  onNext,
  onPrev,
  onStepClick,
  onLevelSwitch,
  lang,
  scfLabel,
  rdfLabel,
  onChipTap,
}: Props) {
  const chipLabel = scfLabel ?? rdfLabel ?? null;

  return (
    <div className="dark flex-shrink-0 border-t border-border bg-surface-sunken">
      {/* Level tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-3 pt-2 pb-1">
        {LEVELS.map((l, i) => {
          const isActive = i === scrollState.levelIndex;
          return (
            <button
              key={l.id}
              type="button"
              className={`type-mono-meta flex-shrink-0 border-b-2 px-3 py-2 text-[11px] transition-colors ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
              onClick={() => onLevelSwitch(i)}
              aria-label={`${l.label.en} level`}
            >
              {l.label[lang as "en" | "ko"] ?? l.label.en}
            </button>
          );
        })}
      </div>

      {/* Step navigation */}
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-0.5">
        {/* Step segments */}
        <div className="flex items-center gap-1">
          {Array.from({ length: scrollState.stepCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className="flex h-7 w-2 flex-shrink-0 items-center"
              onClick={() => onStepClick(i)}
              aria-label={`${lang === "ko" ? "단계" : "Step"} ${i + 1}`}
            >
              <span
                className="h-[2px] w-full transition-colors"
                style={{
                  backgroundColor:
                    i === scrollState.step
                      ? "var(--primary)"
                      : i < scrollState.step
                        ? "var(--border-strong)"
                        : "var(--border)",
                }}
              />
            </button>
          ))}
        </div>

        {/* Step counter */}
        <span className="type-mono-meta text-[11px] text-muted-foreground">
          {scrollState.step + 1}/{scrollState.stepCount}
        </span>

        {/* SCF / RDF chip */}
        {chipLabel && (
          <button
            type="button"
            className="type-mono-meta flex-shrink-0 border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
            onClick={onChipTap}
          >
            {chipLabel}
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Prev / Next */}
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={onPrev}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-border-strong text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={lang === "ko" ? "이전 단계" : "Previous step"}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={onNext}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-border-strong text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={lang === "ko" ? "다음 단계" : "Next step"}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
