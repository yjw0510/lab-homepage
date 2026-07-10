"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaperCard } from "./PaperCard";
import { EquationDisplay } from "./equations/EquationDisplay";
import { PlotSlot } from "./plots/PlotSlot";
import { DftScfSlider } from "./DftScfSlider";
import { RDFBinSlider, type RdfBin } from "./RDFBinSlider";
import type { LevelConfig, ScrollState } from "./scrollState";
import type { StepConfig } from "./levelData";
import type { Publication } from "@/types/publication";
import { ConceptText } from "./ConceptText";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allatom/allAtomPagePolicy";

interface ScfSnapshotMeta {
  index: number;
  iteration: number;
  label: string;
}

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
  allAtomSelectedTerm,
  onAllAtomTermHover,
  onAllAtomTermLeave,
  onAllAtomTermToggle,
  allAtomActiveReadout,
  allAtomSelectedReadout,
  onAllAtomReadoutHover,
  onAllAtomReadoutLeave,
  onAllAtomReadoutToggle,
  onStepClick,
  variant = "rail",
  showDftScfSlider,
  dftSnapshots,
  scfValue,
  onScfChange,
  onScfPointerStart,
  onScfPointerEnd,
  showRdfSlider,
  rdfBins,
  rdfBinIndex,
  onRdfChange,
  stepTitles,
  previousStepTitle,
  nextStepTitle,
  interactionHint,
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
  allAtomSelectedTerm?: AllAtomForceFieldTerm | null;
  onAllAtomTermHover?: (term: AllAtomForceFieldTerm) => void;
  onAllAtomTermLeave?: () => void;
  onAllAtomTermToggle?: (term: AllAtomForceFieldTerm) => void;
  allAtomActiveReadout?: AllAtomReadoutId | null;
  allAtomSelectedReadout?: AllAtomReadoutId | null;
  onAllAtomReadoutHover?: (readout: AllAtomReadoutId) => void;
  onAllAtomReadoutLeave?: () => void;
  onAllAtomReadoutToggle?: (readout: AllAtomReadoutId) => void;
  onStepClick: (localStep: number) => void;
  // Sheet variant props
  variant?: "rail" | "sheet";
  showDftScfSlider?: boolean;
  dftSnapshots?: ScfSnapshotMeta[];
  scfValue?: number;
  onScfChange?: (index: number) => void;
  onScfPointerStart?: () => void;
  onScfPointerEnd?: () => void;
  showRdfSlider?: boolean;
  rdfBins?: RdfBin[];
  rdfBinIndex?: number;
  onRdfChange?: (index: number) => void;
  stepTitles: string[];
  previousStepTitle?: string;
  nextStepTitle?: string;
  interactionHint?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<string>("");
  const isAllAtomLevel = level.id === "allatom";
  const equationActiveTerms = stepConfig.activeTerms;
  const isSheet = variant === "sheet";
  const currentStepTitle = stepTitles[scrollState.step] ?? `${lang === "ko" ? "단계" : "Step"} ${scrollState.step + 1}`;
  const previousLabel = previousStepTitle
    ? `${lang === "ko" ? "이전" : "Prev"}: ${previousStepTitle}`
    : lang === "ko" ? "이전 단계" : "Previous step";
  const nextLabel = nextStepTitle
    ? `${lang === "ko" ? "다음" : "Next"}: ${nextStepTitle}`
    : lang === "ko" ? "다음 단계" : "Next step";
  const previousButtonText = previousStepTitle ?? (lang === "ko" ? "이전" : "Prev");
  const nextButtonText = nextStepTitle ?? (lang === "ko" ? "다음" : "Next");

  // Fade transition on step change + reset scroll position
  useEffect(() => {
    const key = `${scrollState.level}-${scrollState.step}`;
    if (key !== prevStepRef.current && railRef.current) {
      prevStepRef.current = key;
      railRef.current.style.opacity = "0";
      railRef.current.style.transform = "translateY(8px)";
      requestAnimationFrame(() => {
        if (railRef.current) {
          railRef.current.style.transition =
            "opacity var(--dur-med) var(--ease-ledger), transform var(--dur-med) var(--ease-ledger)";
          railRef.current.style.opacity = "1";
          railRef.current.style.transform = "translateY(0)";
        }
      });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [scrollState.level, scrollState.step]);

  return (
    <div
      data-testid="multiscale-right-rail"
      className={`dark flex h-full min-h-0 flex-col ${
        isSheet
          ? "justify-start px-4 py-2"
          : isMobile
            ? "justify-start px-4 py-2"
            : "justify-start px-6 py-8 pt-10"
      }`}
    >
      <div ref={railRef} className="flex min-h-0 flex-1 flex-col">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {`${level.label[lang as "en" | "ko"] ?? level.label.en}: ${currentStepTitle}`}
        </div>
        {/* Level readout — rail only (sheet has it in status row) */}
        {!isSheet && (
          <div className={`flex items-baseline gap-2.5 flex-shrink-0 ${isMobile ? "mb-2" : "mb-3"}`}>
            <span className="type-mono-meta text-xs text-foreground">
              {level.label[lang as "en" | "ko"] ?? level.label.en}
            </span>
            <span className="type-mono-meta text-[11px] text-muted-foreground">
              {level.scale[lang as "en" | "ko"] ?? level.scale.en}
            </span>
          </div>
        )}

        {/* Step indicator — rail only */}
        {!isSheet && (
          <div className={`flex gap-1 flex-shrink-0 ${isMobile ? "mb-1" : "mb-3"}`}>
            {Array.from({ length: scrollState.stepCount }, (_, i) => (
              <button
                key={i}
                type="button"
                className="group flex h-6 flex-1 cursor-pointer items-center"
                onClick={() => onStepClick(i)}
                aria-label={`${stepTitles[i] ?? `${lang === "ko" ? "단계" : "Step"} ${i + 1}`}, ${i + 1} / ${scrollState.stepCount}`}
                aria-current={i === scrollState.step ? "step" : undefined}
                title={stepTitles[i]}
              >
                <span
                  className="h-[2px] w-full transition-colors duration-300 group-hover:opacity-80"
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
        )}

        {/* Equation — fixed, non-scrolling */}
        {stepConfig.showEquation !== false && (
          <div className={`flex-shrink-0 ${isSheet ? "mb-2" : isMobile ? "mb-2" : "mb-4"}`}>
            <EquationDisplay
              equationKey={equationKey}
              activeTerms={equationActiveTerms}
              accentColor={level.color}
              lang={lang}
              detailMode={stepConfig.equationDetailMode}
              interactiveTerms={isAllAtomLevel && scrollState.step === 1 ? ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"] : undefined}
              hoveredTerm={allAtomActiveTerm}
              selectedTerm={allAtomSelectedTerm}
              onTermHover={onAllAtomTermHover}
              onTermLeave={onAllAtomTermLeave}
              onTermClick={onAllAtomTermToggle}
            />
          </div>
        )}

        {/* Inline SCF slider — sheet only */}
        {isSheet && showDftScfSlider && dftSnapshots && dftSnapshots.length > 1 && onScfChange && (
          <div className="mb-3 flex-shrink-0 border border-border px-4 py-3" style={{ touchAction: "pan-x" }}>
            <DftScfSlider
              snapshots={dftSnapshots}
              value={scfValue ?? 0}
              lang={lang}
              onChange={onScfChange}
              onPointerStart={onScfPointerStart ?? (() => {})}
              onPointerEnd={onScfPointerEnd ?? (() => {})}
              inline
            />
          </div>
        )}

        {/* Inline RDF slider — sheet only */}
        {isSheet && showRdfSlider && rdfBins && rdfBins.length > 1 && onRdfChange && (
          <div className="mb-3 flex-shrink-0 border border-border px-4 py-3" style={{ touchAction: "pan-x" }}>
            <RDFBinSlider
              bins={rdfBins}
              value={rdfBinIndex ?? 0}
              lang={lang}
              onChange={onRdfChange}
              inline
            />
          </div>
        )}

        {/* Scrollable content area: concept text + plot + paper card */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto pr-1"
        >
          <div>
            {interactionHint && (
              <p className="type-mono-meta mb-4 border-y border-white/10 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {interactionHint}
              </p>
            )}
            <ConceptText
              text={stepConfig.concept[lang as "en" | "ko"] ?? stepConfig.concept.en}
              lang={lang}
              className={`break-keep leading-[1.7] text-foreground ${isMobile || isSheet ? "text-sm" : "text-base"}`}
            />
          </div>

          {stepConfig.plotType && (
            <div className="mt-4">
              <PlotSlot
                plotType={stepConfig.plotType}
                progress={stepConfig.sceneKey === "D9_settle" ? 1 : scrollState.stepProgress}
                accentColor={level.color}
                lang={lang}
                activeIndexOverride={stepConfig.plotType === "scf" ? scfActiveIndexOverride : undefined}
                rdfActiveRadius={stepConfig.plotType === "beadRDF" ? rdfActiveRadius : undefined}
                activeTerm={allAtomActiveTerm}
                selectedTerm={allAtomSelectedTerm}
                onTermHover={onAllAtomTermHover}
                onTermLeave={onAllAtomTermLeave}
                onTermToggle={onAllAtomTermToggle}
                activeReadout={allAtomActiveReadout}
                selectedReadout={allAtomSelectedReadout}
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

      {/* Navigation bar — desktop only (sheet has nav in MobileStatusRow) */}
      {!isSheet && !isMobile && (
        <div className="mt-3 flex-shrink-0 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={onPrev}
              className="type-mono-meta flex min-w-0 flex-1 h-11 items-center gap-1.5 border border-border-strong px-3 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={previousLabel}
              title={previousLabel}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              <span className="min-w-0 truncate">{previousButtonText}</span>
            </button>

            <span className="type-mono-meta text-xs text-muted-foreground">
              {scrollState.step + 1} / {scrollState.stepCount}
            </span>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={onNext}
              className="type-mono-meta flex min-w-0 flex-1 h-11 items-center justify-end gap-1.5 border border-border-strong px-3 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={nextLabel}
              title={nextLabel}
            >
              <span className="min-w-0 truncate">{nextButtonText}</span>
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
