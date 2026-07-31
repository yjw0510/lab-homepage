"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { LEVELS, type LevelConfig, type ScrollState } from "./scrollState";
import { LEVEL_CHROME, SCALE_SHORT } from "./RightRail";

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
  stepTitles: string[];
  previousStepTitle?: string;
  nextStepTitle?: string;
  scfLabel?: string | null;
  onChipTap?: () => void;
  sceneTitle?: string;
  levelId?: string;
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
  stepTitles,
  previousStepTitle,
  nextStepTitle,
  scfLabel,
  onChipTap,
  sceneTitle,
  levelId,
}: Props) {
  const chipLabel = scfLabel ?? null;
  const previousLabel = previousStepTitle
    ? `${lang === "ko" ? "이전" : "Previous"}: ${previousStepTitle}`
    : lang === "ko" ? "이전 단계" : "Previous step";
  const nextLabel = nextStepTitle
    ? `${lang === "ko" ? "다음" : "Next"}: ${nextStepTitle}`
    : lang === "ko" ? "다음 단계" : "Next step";

  return (
    <div className="flex-shrink-0 border-t border-border bg-surface-sunken text-foreground">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`${level.label[lang as "en" | "ko"] ?? level.label.en}: ${stepTitles[scrollState.step] ?? scrollState.step + 1}`}
      </div>
      {/* Level tabs. Four equal columns rather than a horizontal scroller: the full
          labels laid out to 537px on a 390px viewport, so two of the four tiers sat
          off screen behind a swipe with no cue that one existed. The short names are
          the ones the footer ruler, the specimen plates and the desktop rail already
          print, so this closes a fourth vocabulary rather than opening one. */}
      <div className="grid grid-cols-4 px-3 pt-2 pb-1">
        {LEVELS.map((l, i) => {
          const isActive = i === scrollState.levelIndex;
          const short = SCALE_SHORT[l.id] ?? { en: l.id, ko: l.id };
          return (
            <button
              key={l.id}
              type="button"
              className={`type-mono-meta flex min-h-11 min-w-0 items-center justify-center border-b-2 px-2 py-2 text-xs transition-colors ${
                isActive ? LEVEL_CHROME[l.id].tab : "border-border text-muted-foreground"
              }`}
              onClick={() => onLevelSwitch(i)}
              aria-label={`${l.label[lang as "en" | "ko"] ?? l.label.en} ${lang === "ko" ? "계층" : "tier"}`}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="truncate">{short[lang as "en" | "ko"] ?? short.en}</span>
            </button>
          );
        })}
      </div>

      {/* What the tier resolves. The desktop rail prints this beside the level label;
          the tab strip above carries only the short name, so without this line a phone
          reader never learns which variables the level actually works in. */}
      <p className="type-mono-meta px-3 pt-0.5 text-[0.625rem] leading-tight text-muted-foreground">
        {level.scale[lang as "en" | "ko"] ?? level.scale.en}
      </p>

      {/* The scene title lives here rather than over the canvas. As an overlay it sat
          under this sticky row and had its first line sliced off, and it covered the
          render besides. */}
      {sceneTitle ? (
        <div className="flex items-baseline gap-2.5 px-3 pt-1.5">
          <span
            className={`type-mono-meta shrink-0 text-[0.6875rem] ${
              levelId ? LEVEL_CHROME[levelId as keyof typeof LEVEL_CHROME].text : "text-muted-foreground"
            }`}
          >
            {String(scrollState.step + 1).padStart(2, "0")}
          </span>
          <h2 className="type-heading min-w-0 break-keep text-[0.9375rem] leading-tight text-foreground">
            {sceneTitle}
          </h2>
        </div>
      ) : null}

      {/* Step navigation */}
      <div className="flex items-center gap-1 px-3 pb-2 pt-0.5">
        {/* Step segments */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: scrollState.stepCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className="flex h-12 w-6 flex-shrink-0 items-center"
              onClick={() => onStepClick(i)}
              aria-label={`${stepTitles[i] ?? `${lang === "ko" ? "단계" : "Step"} ${i + 1}`}, ${i + 1} / ${scrollState.stepCount}`}
              aria-current={i === scrollState.step ? "step" : undefined}
              title={stepTitles[i]}
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
        <span className="type-mono-meta text-xs text-muted-foreground">
          {scrollState.step + 1}/{scrollState.stepCount}
        </span>

        {/* SCF / RDF chip */}
        {chipLabel && (
          <button
            type="button"
            className="type-mono-meta min-h-12 flex-shrink-0 border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            onClick={onChipTap}
            aria-label={lang === "ko" ? `${chipLabel} 열기` : `Open ${chipLabel}`}
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
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-border-strong text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={previousLabel}
          title={previousLabel}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={onNext}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-border-strong text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={nextLabel}
          title={nextLabel}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
