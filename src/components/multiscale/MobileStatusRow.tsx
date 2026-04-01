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
  level,
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
    <div className="flex-shrink-0 bg-[#050913] border-t border-white/8">
      {/* Level tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-3 pt-2 pb-1">
        {LEVELS.map((l, i) => {
          const isActive = i === scrollState.levelIndex;
          return (
            <button
              key={l.id}
              type="button"
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: isActive ? `${l.color}20` : "transparent",
                color: isActive ? l.color : "#7a7a87",
                borderWidth: 1,
                borderColor: isActive ? `${l.color}36` : "transparent",
              }}
              onClick={() => onLevelSwitch(i)}
              aria-label={`${l.label.en} level`}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: l.color, opacity: isActive ? 1 : 0.4 }}
              />
              {l.label[lang as "en" | "ko"] ?? l.label.en}
            </button>
          );
        })}
      </div>

      {/* Step navigation */}
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-0.5">
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: scrollState.stepCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className="h-[6px] w-[6px] flex-shrink-0 rounded-full transition-colors"
              style={{
                backgroundColor:
                  i < scrollState.step
                    ? level.color
                    : i === scrollState.step
                      ? `${level.color}cc`
                      : "rgba(255,255,255,0.15)",
              }}
              onClick={() => onStepClick(i)}
              aria-label={`${lang === "ko" ? "단계" : "Step"} ${i + 1}`}
            />
          ))}
        </div>

        {/* Step counter */}
        <span className="text-[10px] tabular-nums text-white/40">
          {scrollState.step + 1}/{scrollState.stepCount}
        </span>

        {/* SCF / RDF chip */}
        {chipLabel && (
          <button
            type="button"
            className="flex-shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/65 transition hover:bg-white/12"
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
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={lang === "ko" ? "이전 단계" : "Previous step"}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={onNext}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={lang === "ko" ? "다음 단계" : "Next step"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
