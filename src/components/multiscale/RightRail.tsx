"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaperCard } from "./PaperCard";
import { EquationDisplay } from "./equations/EquationDisplay";
import { PlotSlot } from "./plots/PlotSlot";
import type { LevelConfig, ScrollState } from "./scrollState";
import type { StepConfig } from "./levelData";
import type { Publication } from "@/types/publication";
import { ConceptText } from "./ConceptText";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allatom/allAtomPagePolicy";

export function RightRail({
  scrollState,
  level,
  stepConfig,
  equationKey,
  paper,
  lang,
  isMobile,
  scfActiveIndexOverride,
  rdfActiveRadius,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  allAtomActiveTerm,
  onAllAtomTermHover,
  onAllAtomTermLeave,
  onAllAtomTermToggle,
  allAtomActiveReadout,
  onAllAtomReadoutHover,
  onAllAtomReadoutLeave,
  onAllAtomReadoutToggle,
  onStepClick,
}: {
  scrollState: ScrollState;
  level: LevelConfig;
  stepConfig: StepConfig;
  equationKey: string;
  paper: Publication | null;
  lang: string;
  isMobile: boolean;
  scfActiveIndexOverride?: number;
  rdfActiveRadius?: number;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  allAtomActiveTerm?: AllAtomForceFieldTerm | null;
  onAllAtomTermHover?: (term: AllAtomForceFieldTerm) => void;
  onAllAtomTermLeave?: () => void;
  onAllAtomTermToggle?: (term: AllAtomForceFieldTerm) => void;
  allAtomActiveReadout?: AllAtomReadoutId | null;
  onAllAtomReadoutHover?: (readout: AllAtomReadoutId) => void;
  onAllAtomReadoutLeave?: () => void;
  onAllAtomReadoutToggle?: (readout: AllAtomReadoutId) => void;
  onStepClick: (localStep: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<string>("");
  const isAllAtomLevel = level.id === "allatom";
  // Always pass all configured terms so the grouped sub-equations maintain constant height.
  // The hoveredTerm prop handles visual emphasis without layout shift.
  const equationActiveTerms = stepConfig.activeTerms;

  // Fade transition on step change + reset scroll position
  useEffect(() => {
    const key = `${scrollState.level}-${scrollState.step}`;
    if (key !== prevStepRef.current && railRef.current) {
      prevStepRef.current = key;
      railRef.current.style.opacity = "0";
      railRef.current.style.transform = "translateY(8px)";
      requestAnimationFrame(() => {
        if (railRef.current) {
          railRef.current.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          railRef.current.style.opacity = "1";
          railRef.current.style.transform = "translateY(0)";
        }
      });
      // Reset scrollable content to top on step change
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [scrollState.level, scrollState.step]);

  return (
    <div
      data-testid="multiscale-right-rail"
      className={`flex h-full min-h-0 flex-col ${
        isMobile ? "justify-start px-4 py-2" : "justify-start px-6 py-8 pt-10"
      }`}
    >
      <div ref={railRef} className="flex min-h-0 flex-1 flex-col">
        {/* Level badge */}
        <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? "mb-2" : "mb-3"}`}>
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: level.color }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: level.color }}>
            {level.label[lang as "en" | "ko"] ?? level.label.en}
          </span>
          <span className="text-xs text-gray-500 ml-1">{level.scale[lang as "en" | "ko"] ?? level.scale.en}</span>
        </div>

        {/* Step indicator — clickable */}
        <div className={`flex gap-1 flex-shrink-0 ${isMobile ? "mb-2" : "mb-4"}`}>
          {Array.from({ length: scrollState.stepCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className="h-1.5 rounded-full flex-1 transition-colors duration-300 cursor-pointer hover:opacity-80"
              style={{
                backgroundColor:
                  i < scrollState.step
                    ? level.color
                    : i === scrollState.step
                      ? `${level.color}80`
                      : "var(--muted)",
              }}
              onClick={() => onStepClick(i)}
              aria-label={`${lang === "ko" ? "단계" : "Step"} ${i + 1} / ${scrollState.stepCount}`}
            />
          ))}
        </div>

        {/* Equation — fixed, non-scrolling */}
        {stepConfig.showEquation !== false && (
          <div className={`flex-shrink-0 ${isMobile ? "mb-2" : "mb-4"}`}>
            <EquationDisplay
              equationKey={equationKey}
              activeTerms={equationActiveTerms}
              accentColor={level.color}
              detailMode={stepConfig.equationDetailMode}
              interactiveTerms={isAllAtomLevel && scrollState.step === 1 ? ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"] : undefined}
              hoveredTerm={allAtomActiveTerm}
              onTermHover={onAllAtomTermHover}
              onTermLeave={onAllAtomTermLeave}
              onTermClick={onAllAtomTermToggle}
            />
          </div>
        )}

        {/* Scrollable content area: concept text + plot + paper card */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto pr-1"
        >
          <div>
            <ConceptText
              text={stepConfig.concept[lang as "en" | "ko"] ?? stepConfig.concept.en}
              lang={lang}
              className={`text-gray-300 leading-[1.72] ${isMobile ? "text-[0.98rem]" : "text-[1.05rem]"}`}
            />
          </div>

          {stepConfig.plotType && (
            <div className="mt-4">
              <PlotSlot
                plotType={stepConfig.plotType}
                progress={stepConfig.sceneKey === "D9_settle" ? 1 : scrollState.stepProgress}
                accentColor={level.color}
                activeIndexOverride={stepConfig.plotType === "scf" ? scfActiveIndexOverride : undefined}
                rdfActiveRadius={stepConfig.plotType === "beadRDF" ? rdfActiveRadius : undefined}
                activeTerm={allAtomActiveTerm}
                onTermHover={onAllAtomTermHover}
                onTermLeave={onAllAtomTermLeave}
                onTermToggle={onAllAtomTermToggle}
                activeReadout={allAtomActiveReadout}
                onReadoutHover={onAllAtomReadoutHover}
                onReadoutLeave={onAllAtomReadoutLeave}
                onReadoutToggle={onAllAtomReadoutToggle}
              />
            </div>
          )}

          {paper && (
            <div className="mt-4">
              <PaperCard
                publication={paper}
                accentColor={level.color}
                lang={lang}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation bar — desktop only (mobile nav is in viewer overlay) */}
      {!isMobile && (
        <div className="mt-3 flex-shrink-0 border-t border-white/8 pt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={onPrev}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={lang === "ko" ? "이전 단계" : "Previous step"}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{lang === "ko" ? "이전" : "Prev"}</span>
          </button>

          <span className="text-sm text-white/60 tabular-nums">
            {scrollState.step + 1} / {scrollState.stepCount}
          </span>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={onNext}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={lang === "ko" ? "다음 단계" : "Next step"}
          >
            <span>{lang === "ko" ? "다음" : "Next"}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
