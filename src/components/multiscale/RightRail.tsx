"use client";

import { Fragment, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { EquationDisplay } from "./equations/EquationDisplay";
import { PlotSlot } from "./plots/PlotSlot";
import { DftScfSlider } from "./DftScfSlider";
import { LEVELS, type LevelConfig, type LevelId, type ScrollState } from "./scrollState";

// Short scale labels for the flagship selector; the full level name sits in the
// rail readout above, so the selector only needs to be scannable and jumpable.
export const SCALE_SHORT: Record<string, { en: string; ko: string }> = {
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
  dft: { text: "text-lv-dft-text", line: "border-lv-dft-line", tab: "border-lv-dft text-lv-dft-text" },
  mlff: { text: "text-lv-mlff-text", line: "border-lv-mlff-line", tab: "border-lv-mlff text-lv-mlff-text" },
  allatom: { text: "text-lv-aa", line: "border-lv-aa-line", tab: "border-lv-aa text-lv-aa" },
  meso: { text: "text-lv-meso", line: "border-lv-meso-line", tab: "border-lv-meso text-lv-meso" },
};
import { PROVENANCE_KIND_LABEL, type StepConfig } from "./levelData";
import { ConceptText } from "./ConceptText";
import type { AllAtomForceFieldTerm } from "./allatom/allAtomPagePolicy";

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
  onLevelSwitch,
  showDftScfSlider,
  dftSnapshots,
  scfValue,
  onScfChange,
  stepTitles,
  previousStepTitle,
  nextStepTitle,
  interactionHint,
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
  onLevelSwitch?: (levelIndex: number) => void;
  showDftScfSlider?: boolean;
  dftSnapshots?: ScfSnapshotMeta[];
  scfValue?: number;
  onScfChange?: (index: number) => void;
  stepTitles: string[];
  previousStepTitle?: string;
  nextStepTitle?: string;
  interactionHint?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<string>("");
  const isAllAtomLevel = level.id === "allatom";
  const isAllAtomForceFieldStep = stepConfig.sceneKey === "A3_forcefield";
  // On the force-field step the reader's selection is what lights a term, so nothing is lit
  // until they pick one. Feeding all five in as "active" left every segment coloured and none
  // dimmed, so selecting one changed nothing on screen.
  const equationActiveTerms =
    isAllAtomLevel && isAllAtomForceFieldStep
      ? (allAtomSelectedTerm ? [allAtomSelectedTerm] : [])
      : stepConfig.activeTerms;
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
    <div data-rail-role="provenance" className="mb-5 border-y border-border py-3.5">
      <p className="text-sm font-medium text-muted-foreground">
        {lang === "ko" ? "화면 자료" : "Visual source"}
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
              {PROVENANCE_KIND_LABEL[layer.kind][lang as "en" | "ko"] ?? layer.kind}
            </span>
            <span className="break-keep text-muted-foreground">
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
      // This fade is set from JS, so the global reduced-motion rules cannot reach it.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        railRef.current.scrollTop = 0;
        return;
      }
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
      // Reset the element that actually scrolls. After the rail was flattened to a
      // single scroll context this became railRef, which is the one that scrolls.
      railRef.current.scrollTop = 0;
    }
  }, [scrollState.level, scrollState.step]);

  // Does the pane continue past its edge? With no cue the scroller cuts a line of prose
  // through the middle and the paragraph reads as finished. The signal is a mask rather
  // than a painted gradient, so it carries no colour of its own and is right in both
  // themes by construction, and it is applied only on an edge that really has more
  // behind it: at rest, top and bottom both settled, the rail is left untouched.
  const [railEdges, setRailEdges] = useState({ atTop: true, atBottom: true });

  useEffect(() => {
    const node = railRef.current;
    if (!node || isStack) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = node;
      setRailEdges({
        atTop: scrollTop <= 1,
        atBottom: scrollTop + clientHeight >= scrollHeight - 1,
      });
    };

    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [isStack, lang, scrollState.level, scrollState.step]);

  // Shorter than one line box on purpose: the cue has to say "this continues" without
  // taking a line out of the eight the rail policy requires to stay legible.
  const RAIL_FADE = "1.15rem";
  const railMask =
    isStack || (railEdges.atTop && railEdges.atBottom)
      ? undefined
      : railEdges.atTop
        ? `linear-gradient(to bottom, #000 calc(100% - ${RAIL_FADE}), transparent)`
        : railEdges.atBottom
          ? `linear-gradient(to bottom, transparent, #000 ${RAIL_FADE})`
          : `linear-gradient(to bottom, transparent, #000 ${RAIL_FADE}, #000 calc(100% - ${RAIL_FADE}), transparent)`;

  // Interactive controls wired to the live 3D view (SCF snapshot, RDF radius).
  // On mobile the view sits above this panel, so these are hoisted to the top of
  // the stack (below the status row) to stay co-visible with what they drive.
  const scfSliderBlock =
    showDftScfSlider && dftSnapshots && dftSnapshots.length > 1 && onScfChange ? (
      <div id="multiscale-scf-control" data-rail-role="instrument" className="mb-3 flex-shrink-0 scroll-mt-32 border border-border px-4 py-3" style={{ touchAction: "pan-x" }}>
        <DftScfSlider
          snapshots={dftSnapshots}
          value={scfValue ?? 0}
          lang={lang}
          onChange={onScfChange}
        />
      </div>
    ) : null;

  const interactiveControls = scfSliderBlock;
  const blockControls = interactiveControls;
  const blockProvenance = visualEvidenceBlock;

  // Every block the rail can render, named once. Composition is declared below as an
  // ordered list rather than written out as nested JSX, so adding a block means
  // choosing a position in a list that a reader of this file can see at a glance,
  // and so the desktop and stacked orders can differ without duplicating markup.
  // The scene title over the canvas already prints the level name, so the rail
  // carries only what that title does not: which variables this tier resolves. It
  // sits with the tabs it qualifies rather than on the overlay, so its existence
  // does not depend on a pointer-events-none layer painted over the render.
  const blockLevelIdentity = (
    <p data-rail-role="frame" className="type-mono-meta mb-2 flex-shrink-0 text-[0.78125rem] text-muted-foreground">
      {level.scale[lang as "en" | "ko"] ?? level.scale.en}
    </p>
  );

  // One flagship per scale, so this is the primary cross-scale jump; the step
  // navigation below moves between the two steps of the level in view.
  const blockLevelTabs = onLevelSwitch ? (
    <div data-rail-role="frame" className="mb-4 flex flex-shrink-0 gap-1">
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
  ) : null;

  const blockApplicability = (
    // The lede of the body, not a separate register. DESIGN.md defines type-lead as
    // "the one sentence a block turns on", which is this sentence's job, and weight
    // rather than size is what carries emphasis in that ladder. Measured across all
    // eight steps at both rail widths, 16px never adds a line and saves 14-46px.
    <div data-rail-role="frame" className={`flex-shrink-0 border-b border-border pb-4 ${isStack ? "mb-3" : "mb-5"}`}>
      <p className="type-mono-meta mb-1.5 text-[0.78125rem] leading-4 text-muted-foreground">
        {lang === "ko" ? "질문" : "Question"}
      </p>
      <p className="type-lead break-keep text-base text-foreground">
        {stepConfig.question[lang as "en" | "ko"] ?? stepConfig.question.en}
      </p>
    </div>
  );

  const blockEquation = stepConfig.showEquation !== false ? (
    <div data-rail-role="frame" className={`flex-shrink-0 ${isStack ? "mb-2" : "mb-4"}`}>
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
  ) : null;

  const blockHint = interactionHint ? (
    <p data-rail-role="frame" className="mb-5 flex-shrink-0 border-y border-border py-3 text-sm leading-relaxed text-muted-foreground">
      {interactionHint}
    </p>
  ) : null;

  // The reading floor. `min-h-[8lh]` is written on the element that carries the prose
  // line-height, because `lh` resolves against the element it is written on and the
  // body sets its own leading.
  const blockBody = (
    <div data-rail-role="body" className={`min-h-[8lh] flex-shrink-0 ${isStack ? "" : "mb-6"}`}>
      <ConceptText
        text={stepConfig.concept[lang as "en" | "ko"] ?? stepConfig.concept.en}
        lang={lang}
        className="max-w-[65ch] break-keep text-base leading-[1.75] text-foreground"
      />
      {/* The tier's own ink, not signal red. `text-primary` is also the MLFF level colour, so
          this header wore MLFF's identity on the DFT, all-atom and meso pages too, and
          DESIGN.md reserves signal red for nav underline, focus ring, heading anchor, ruler
          origin tick, PI name and the primary button fill — not a section header. */}
      {scrollState.step === 0 && (
        <div className={`mt-5 border-t ${LEVEL_CHROME[level.id].line} pt-4`}>
          <p className={`type-heading mb-2 text-sm ${LEVEL_CHROME[level.id].text}`}>
            {lang === "ko" ? "다음 계층으로" : "To the next tier"}
          </p>
          <ConceptText
            text={stepConfig.takeaway[lang as "en" | "ko"] ?? stepConfig.takeaway.en}
            lang={lang}
            className="break-keep text-base font-semibold leading-[1.7] text-foreground"
          />
        </div>
      )}
    </div>
  );

  const blockPlot = stepConfig.plotType ? (
    <div data-rail-role="instrument" className="mb-4 flex-shrink-0">
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
      />
    </div>
  ) : null;

  const blockMethodLink = (
    <Link
      data-rail-role="nav"
      href={`/${lang}/multiscale/${level.id}`}
      className="type-mono-meta mb-2 flex flex-shrink-0 items-center justify-between gap-3 border border-border-strong px-3.5 py-3 text-xs text-foreground transition-colors hover:bg-muted"
    >
      <span>{lang === "ko" ? "방법 개요 읽기" : "Read the method overview"}</span>
      <ArrowUpRight className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
    </Link>
  );

  // Reading order.
  //
  // Desktop puts the body third. Measured at 1024x768, the four blocks that used to
  // sit above it (equation 190px, slider 146px, provenance 195px, hint 92px) plus the
  // three that remain summed to 918px of chrome against a 562px scroll viewport, so
  // the reader landed on a screen with zero lines of prose on it at every desktop
  // size tested. The three that remain sum to 296px, which leaves at least eight
  // lines of body copy on screen before any scrolling.
  //
  // The stage sits in the left grid column on desktop, side by side with the rail, so
  // moving the slider down the rail does not separate it from what it drives. On the
  // stacked path the stage is above the rail, which is why the controls lead there.
  const composition = isStack
    ? [blockControls, blockApplicability, blockEquation, blockHint, blockBody, blockMethodLink, blockProvenance, blockPlot]
    : [blockLevelIdentity, blockLevelTabs, blockApplicability, blockBody, blockEquation, blockControls, blockHint, blockProvenance, blockPlot, blockMethodLink];

  return (
    <div
      data-testid="multiscale-right-rail"
      className={`flex min-h-0 flex-col bg-surface-sunken text-foreground ${
        isStack
          ? "h-auto justify-start px-4 py-5"
          : "h-full justify-start px-6 py-8 pt-10"
      }`}
    >
      {/* One scroll context. The rail itself scrolls; nothing inside it does. */}
      <div
        ref={railRef}
        {...(isStack
          ? {}
          : {
              tabIndex: 0,
              role: "region",
              "aria-label": `${level.label[lang as "en" | "ko"] ?? level.label.en}: ${currentStepTitle}`,
            })}
        // No overscroll containment: the instrument is a 100dvh pane with the
        // multiscale overview below it, and containing the chain here removes the
        // reader's only wheel path to that section.
        data-rail-scroll={isStack ? undefined : ""}
        data-rail-continues={
          isStack || (railEdges.atTop && railEdges.atBottom)
            ? undefined
            : railEdges.atTop
              ? "bottom"
              : railEdges.atBottom
                ? "top"
                : "both"
        }
        className={`flex min-h-0 flex-col ${
          isStack ? "" : "flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
        }`}
        style={railMask ? { maskImage: railMask, WebkitMaskImage: railMask } : undefined}
      >
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {`${level.label[lang as "en" | "ko"] ?? level.label.en}: ${currentStepTitle}`}
        </div>
        {composition.map((block, i) =>
          block ? <Fragment key={i}>{block}</Fragment> : null
        )}
      </div>

      {!isMobile && (
        <div data-rail-role="nav" className="mt-3 flex-shrink-0 border-t border-border pt-3">
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

            {/* Named. Unlabelled, this "1 / 2" sat beside the title card's "01 / 08" in the same
                register and size, so one screen carried two counters with different totals and
                nothing said which was which. */}
            <span className="type-mono-meta whitespace-nowrap text-xs text-muted-foreground">
              {SCALE_SHORT[level.id][lang as "en" | "ko"] ?? SCALE_SHORT[level.id].en} {scrollState.step + 1} / {scrollState.stepCount}
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
