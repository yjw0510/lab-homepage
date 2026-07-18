"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { EquationDisplay } from "./equations/EquationDisplay";
import { PlotSlot } from "./plots/PlotSlot";
import { DftScfSlider } from "./DftScfSlider";
import { LEVELS, type LevelConfig, type LevelId, type ScrollState } from "./scrollState";

// Short scale labels for the flagship selector; the full level name sits in the
// rail readout above, so the selector only needs to be scannable and jumpable.
const SCALE_SHORT: Record<string, { en: string; ko: string }> = {
  dft: { en: "DFT", ko: "DFT" },
  mlff: { en: "MLFF", ko: "MLFF" },
  allatom: { en: "All-atom", ko: "전원자" },
  meso: { en: "Meso", ko: "메조" },
};

// Level identity chrome (mode-aware tokens in globals.css). Values are full
// literal class strings so Tailwind can compile them: `text` is the level mark,
// `line` the translucent hairline border, `tab` the active-tab text + 2px
// underline color.
export const LEVEL_CHROME: Record<LevelId, { text: string; line: string; tab: string }> = {
  dft: { text: "text-lv-dft", line: "border-lv-dft-line", tab: "border-lv-dft text-lv-dft" },
  mlff: { text: "text-lv-mlff", line: "border-lv-mlff-line", tab: "border-lv-mlff text-lv-mlff" },
  allatom: { text: "text-lv-aa", line: "border-lv-aa-line", tab: "border-lv-aa text-lv-aa" },
  meso: { text: "text-lv-meso", line: "border-lv-meso-line", tab: "border-lv-meso text-lv-meso" },
};
import type { StepConfig } from "./levelData";
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
  lang,
  isMobile,
  scfActiveIndexOverride,
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
  onLevelSwitch,
  showDftScfSlider,
  dftSnapshots,
  scfValue,
  onScfChange,
  stepTitles,
  previousStepTitle,
  nextStepTitle,
  interactionHint,
  measuredContactDistance,
}: {
  scrollState: ScrollState;
  level: LevelConfig;
  stepConfig: StepConfig;
  equationKey: string;
  lang: string;
  isMobile: boolean;
  scfActiveIndexOverride?: number;
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
  onLevelSwitch?: (levelIndex: number) => void;
  showDftScfSlider?: boolean;
  dftSnapshots?: ScfSnapshotMeta[];
  scfValue?: number;
  onScfChange?: (index: number) => void;
  stepTitles: string[];
  previousStepTitle?: string;
  nextStepTitle?: string;
  interactionHint?: string;
  measuredContactDistance?: number | null;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<string>("");
  const isAllAtomLevel = level.id === "allatom";
  const isAllAtomForceFieldStep = stepConfig.sceneKey === "A3_forcefield";
  const equationActiveTerms = stepConfig.activeTerms;
  const isStack = isMobile;
  const currentStepTitle = stepTitles[scrollState.step] ?? `${lang === "ko" ? "단계" : "Step"} ${scrollState.step + 1}`;
  const previousLabel = previousStepTitle
    ? `${lang === "ko" ? "이전" : "Prev"}: ${previousStepTitle}`
    : lang === "ko" ? "이전 단계" : "Previous step";
  const nextLabel = nextStepTitle
    ? `${lang === "ko" ? "다음" : "Next"}: ${nextStepTitle}`
    : lang === "ko" ? "다음 단계" : "Next step";
  const previousButtonText = previousStepTitle ?? (lang === "ko" ? "이전" : "Prev");
  const nextButtonText = nextStepTitle ?? (lang === "ko" ? "다음" : "Next");
  const visualEvidenceBlock = (
    <div className="mb-5 border-y border-border py-3.5">
      <p className="text-sm font-medium text-muted-foreground">
        {lang === "ko" ? "화면에 보이는 근거" : "What the visual is based on"}
      </p>
      <div className="mt-3 space-y-2">
        {stepConfig.visualLayers.map((layer, index) => (
          <div
            key={`${layer.kind}-${index}`}
            className="grid grid-cols-[auto_1fr] items-start gap-2.5 text-sm leading-snug"
          >
            <span
              className={`type-mono-meta border px-2 py-1 text-xs ${
                layer.kind === "TARGET NOT AVAILABLE"
                  ? "border-primary/60 text-primary"
                  : "border-border-strong text-muted-foreground"
              }`}
            >
              {layer.kind}
            </span>
            <span className="text-muted-foreground">
              {layer.label[lang as "en" | "ko"] ?? layer.label.en}
            </span>
          </div>
        ))}
      </div>
      <p className="type-mono-meta mt-3 text-[0.78125rem] leading-relaxed text-muted-foreground/90">
        {stepConfig.systemCaption[lang as "en" | "ko"] ??
          stepConfig.systemCaption.en}
      </p>
    </div>
  );

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

  // Interactive controls wired to the live 3D view (SCF snapshot, RDF radius).
  // On mobile the view sits above this panel, so these are hoisted to the top of
  // the stack (below the status row) to stay co-visible with what they drive.
  const scfSliderBlock =
    showDftScfSlider && dftSnapshots && dftSnapshots.length > 1 && onScfChange ? (
      <div className="mb-3 flex-shrink-0 border border-border px-4 py-3" style={{ touchAction: "pan-x" }}>
        <DftScfSlider
          snapshots={dftSnapshots}
          value={scfValue ?? 0}
          lang={lang}
          onChange={onScfChange}
        />
      </div>
    ) : null;

  const interactiveControls = scfSliderBlock;

  return (
    <div
      data-testid="multiscale-right-rail"
      className={`flex min-h-0 flex-col bg-surface-sunken text-foreground ${
        isStack
          ? "h-auto justify-start px-4 py-5"
          : "h-full justify-start px-6 py-8 pt-10"
      }`}
    >
      <div
        ref={railRef}
        className={`flex min-h-0 flex-col ${isStack ? "" : "flex-1"}`}
      >
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {`${level.label[lang as "en" | "ko"] ?? level.label.en}: ${currentStepTitle}`}
        </div>
        {/* Mobile/compact: interactive controls lead the panel so they stay
            visible with the 3D view stacked above them. */}
        {isStack && interactiveControls}
        {!isStack && (
          <div className={`flex items-baseline gap-2.5 flex-shrink-0 ${isMobile ? "mb-3" : "mb-4"}`}>
            <span className="type-heading text-base text-foreground">
              {level.label[lang as "en" | "ko"] ?? level.label.en}
            </span>
            <span className="type-mono-meta text-[0.78125rem] text-muted-foreground">
              {level.scale[lang as "en" | "ko"] ?? level.scale.en}
            </span>
          </div>
        )}

        {/* Scale selector — rail only. One flagship per scale, so this is the
            primary cross-scale jump; prev/next steps between the same four. */}
        {!isStack && onLevelSwitch && (
          <div className={`flex gap-1 flex-shrink-0 ${isMobile ? "mb-3" : "mb-4"}`}>
            {LEVELS.map((entry, i) => {
              const isActive = i === scrollState.levelIndex;
              const short = SCALE_SHORT[entry.id] ?? { en: entry.id, ko: entry.id };
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`type-mono-meta flex-1 border-b-2 px-1 pb-1.5 pt-1 text-xs transition-colors ${
                    isActive
                      ? LEVEL_CHROME[entry.id].tab
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => onLevelSwitch(i)}
                  aria-label={`${entry.label[lang as "en" | "ko"] ?? entry.label.en}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {short[lang as "en" | "ko"] ?? short.en}
                </button>
              );
            })}
          </div>
        )}

        {/* Selection criterion — fixed so deep-linked pages remain self-contained. */}
        <div className={`flex-shrink-0 border-y border-border py-4 ${isStack ? "mb-3" : "mb-5"}`}>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {lang === "ko" ? "이 계층을 선택하는 기준" : "When this tier enters the stack"}
          </p>
          <p className="text-lg font-semibold leading-[1.55] text-foreground">
            {stepConfig.question[lang as "en" | "ko"] ?? stepConfig.question.en}
          </p>
        </div>

        {/* Equation — fixed, non-scrolling */}
        {stepConfig.showEquation !== false && (
          <div className={`flex-shrink-0 ${isStack ? "mb-2" : "mb-4"}`}>
            <EquationDisplay
              equationKey={equationKey}
              activeTerms={equationActiveTerms}
              accentColor={level.color}
              lang={lang}
              detailMode={stepConfig.equationDetailMode}
              interactiveTerms={isAllAtomLevel && isAllAtomForceFieldStep ? ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"] : undefined}
              hoveredTerm={allAtomActiveTerm}
              selectedTerm={allAtomSelectedTerm}
              onTermHover={onAllAtomTermHover}
              onTermLeave={onAllAtomTermLeave}
              onTermClick={onAllAtomTermToggle}
            />
          </div>
        )}

        {/* Desktop controls sit beside the stage; mobile controls lead the stacked panel. */}
        {!isStack && interactiveControls}

        {/* Measured contact readout — the exact O-H distance of the contact
            drawn on the observable page, updating as the trajectory plays. */}
        {stepConfig.sceneKey === "A6_observables" && measuredContactDistance != null && (
          <div className="mb-3 flex-shrink-0 border border-border px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="type-mono-meta text-xs text-muted-foreground">
                {lang === "ko" ? "측정된 수소결합" : "Measured hydrogen bond"}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {measuredContactDistance.toFixed(2)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">Å</span>
              </p>
            </div>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {lang === "ko"
                ? "카페인 카보닐 O와 물 H 사이 거리, 현재 프레임. 프레임마다 요동한다."
                : "Carbonyl O to water H, this frame. It fluctuates frame to frame."}
            </p>
          </div>
        )}

        {/* Scrollable content area: provenance + concept + takeaway + plot */}
        <div
          ref={scrollRef}
          className={`min-h-0 pr-1 ${
            isStack ? "overflow-visible" : "flex-1 overflow-y-auto"
          }`}
        >
          <div>
            {!isStack && visualEvidenceBlock}

            {interactionHint && (
              <p className="mb-5 border-y border-border py-3 text-sm leading-relaxed text-muted-foreground">
                {interactionHint}
              </p>
            )}
            <ConceptText
              text={stepConfig.concept[lang as "en" | "ko"] ?? stepConfig.concept.en}
              lang={lang}
              className="max-w-[65ch] break-keep text-base leading-[1.75] text-foreground"
            />

            {scrollState.step === 0 && (
              <div className="mt-5 border-t border-primary/60 pt-4">
                <p className="mb-2 text-sm font-semibold text-primary">
                  {lang === "ko" ? "우리 연구 스택에서의 역할" : "Role in our research stack"}
                </p>
                <ConceptText
                  text={stepConfig.takeaway[lang as "en" | "ko"] ?? stepConfig.takeaway.en}
                  lang={lang}
                  className="break-keep text-base font-semibold leading-[1.7] text-foreground"
                />
              </div>
            )}

            {/* Bridge to the mechanism depth for this scale. */}
            <Link
              href={`/${lang}/multiscale/${level.id}`}
              className="type-mono-meta mt-5 flex items-center justify-between gap-3 border border-border-strong px-3.5 py-3 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <span>
                {lang === "ko" ? "전체 방법 노트" : "Full method notes"}
              </span>
              <ArrowUpRight className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            </Link>

            {isStack && <div className="mt-6">{visualEvidenceBlock}</div>}
          </div>

          {stepConfig.plotType && (
            <div className="mt-4">
              <PlotSlot
                plotType={stepConfig.plotType}
                progress={scrollState.stepProgress}
                accentColor={level.color}
                lang={lang}
                activeIndexOverride={stepConfig.plotType === "scf" ? scfActiveIndexOverride : undefined}
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

        </div>
      </div>

      {!isMobile && (
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
