"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Maximize2, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { withBasePath } from "@/lib/basePath";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMounted } from "@/hooks/useMounted";
import { VisualStage, type ResearchCameraActions } from "./VisualStage";
import { RightRail, LEVEL_CHROME } from "./RightRail";
import { MobileStatusRow } from "./MobileStatusRow";
import { MobileViewerToolbar } from "./MobileViewerToolbar";
import { SceneLegend } from "./SceneLegend";
import { getScrollState, globalStepFromLevel, LEVELS, type ScrollState } from "./scrollState";
import { CHOREOGRAPHY } from "./levelData";
import {
  DEFAULT_MOBILE_SCENE_HEIGHT,
  MOBILE_SCENE_HEIGHT,
  MULTISCALE_TYPE,
} from "./visualRules";
import type { AllAtomForceFieldTerm } from "./allatom/allAtomPagePolicy";
import type { DftOutputMode } from "./overlays/DftMechanism";

const TOTAL_RESEARCH_STEPS = LEVELS.reduce((sum, level) => sum + level.steps, 0);
const STEP_HOLD_PROGRESS = 0.8;

// A hint may only point at a control that is on the reader's screen. The all-atom interaction
// tiles live in the mechanism band, which only the phone composition renders, so on desktop
// that hint sent the reader looking for a diagram that was not there.
function getInteractionHint(sceneKey: string | undefined, lang: string, isMobile: boolean) {
  const isKorean = lang === "ko";
  const hints: Record<string, { en: string; ko: string; mobileOnly?: true }> = {
    M2_mapping: {
      en: "Watch the double helix become a row of beads. The next page follows 100 bead chains moving together.",
      ko: "이중 나선이 비드 한 줄로 바뀌는 과정을 살펴보세요. 다음 장에서는 비드 사슬 100개가 함께 움직이는 모습을 보여 줍니다.",
    },
    A3_forcefield: {
      en: "Pick an interaction below the scene to see what it does.",
      ko: "장면 아래에서 상호작용 하나를 골라 역할을 확인해 보세요.",
      mobileOnly: true,
    },
    D4_scf: {
      en: "Drag the slider to step through the density updates and follow each one on the energy chart.",
      ko: "슬라이더를 움직여 밀도 갱신을 한 단계씩 넘기며 에너지 그래프와 함께 보세요.",
    },
  };
  const hint = sceneKey ? hints[sceneKey] : undefined;
  if (!hint || (hint.mobileOnly && !isMobile)) return undefined;
  return isKorean ? hint.ko : hint.en;
}

const DFT_OUTPUT_MODES: Array<{ id: DftOutputMode; en: string; ko: string }> = [
  { id: "density", en: "Electron density", ko: "전자 밀도" },
  { id: "homo", en: "HOMO", ko: "HOMO" },
  { id: "lumo", en: "LUMO", ko: "LUMO" },
];

declare global {
  interface Window {
    __multiscaleDebug?: {
      jumpToScene: (
        level: ScrollState["level"],
        step: number,
        stepProgress?: number,
        manualSnapshotIndex?: number | null,
      ) => void;
      clearOverride: () => void;
      fit: () => void;
      reset: () => void;
      zoomIn: () => void;
      zoomOut: () => void;
      getState: () => ScrollState;
      getMetrics: () => Record<string, unknown> | null;
    };
  }
}

export function MultiscalePinned({
  lang,
}: {
  lang: string;
}) {
  const mounted = useMounted();
  const reducedMotion = useReducedMotion();
  const isTablet = useMediaQuery("(min-width: 900px)");
  const isMobile = !isTablet;

  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(() => {
    const raw = searchParams.get("step");
    if (raw === null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(TOTAL_RESEARCH_STEPS - 1, Math.trunc(n))) : 0;
  });
  const [animatedProgress, setAnimatedProgress] = useState(STEP_HOLD_PROGRESS);

  const cameraActionsRef = useRef<ResearchCameraActions | null>(null);
  const [dftSnapshots, setDftSnapshots] = useState<Array<{ index: number; iteration: number; label: string }>>([]);
  const [dftStatus, setDftStatus] = useState<string>("");
  // The reader's pick on the outputs page. Until there is one the stage cycles the three surfaces.
  const [dftOutputOverride, setDftOutputOverride] = useState<DftOutputMode | null>(null);
  // First snapshot whose energy change is below the run's own stopping threshold.
  const [scfConvergedFrom, setScfConvergedFrom] = useState(0);
  const [manualScfIndex, setManualScfIndex] = useState<number | null>(null);
  // Where the SCF sequence actually is. The stage owns the sequence, so the slider has to be told
  // rather than derive it; before this it sat on the first tick through the whole animation.
  const [scfIndex, setScfIndex] = useState(0);
  const [scfPlaying, setScfPlaying] = useState(true);
  // Keep the scrub target following playback while it runs. Left behind at the last scrubbed
  // value, re-picking that same index was a no-op — setState with an unchanged number does not
  // re-run the stage's effect — so the slider snapped back to wherever playback had reached and
  // the control looked dead for exactly the index the reader chose last.
  const reportScfIndex = useCallback((index: number) => {
    setScfIndex(index);
    setManualScfIndex((current) => (current === null ? null : index));
  }, []);
  const [allAtomHoveredTerm, setAllAtomHoveredTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomLockedTerm, setAllAtomLockedTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);

  const scrollState = useMemo(
    () => getScrollState((currentStep + Math.min(animatedProgress, 0.999)) / TOTAL_RESEARCH_STEPS),
    [currentStep, animatedProgress],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentStep === 0) {
      url.searchParams.delete("step");
    } else {
      url.searchParams.set("step", String(currentStep));
    }
    window.history.replaceState(null, "", url.toString());
  }, [currentStep]);

  const goToStep = useCallback((step: number, stepProgress = STEP_HOLD_PROGRESS) => {
    const clamped = Math.max(0, Math.min(TOTAL_RESEARCH_STEPS - 1, step));
    setCurrentStep(clamped);
    setAnimatedProgress(Math.max(0, Math.min(0.999, stepProgress)));
    setManualScfIndex(null);
    setScfPlaying(true);
    setAllAtomHoveredTerm(null);
    setAllAtomLockedTerm(null);
    setDftOutputOverride(null);
  }, []);

  const goNext = useCallback(() => goToStep(currentStep + 1), [currentStep, goToStep]);
  const goPrev = useCallback(() => goToStep(currentStep - 1), [currentStep, goToStep]);

  const goToLevel = useCallback((levelIndex: number) => {
    const firstStep = LEVELS.slice(0, levelIndex).reduce((s, l) => s + l.steps, 0);
    goToStep(firstStep);
  }, [goToStep]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input, textarea, select, button, a, [contenteditable='true'], [data-rail-scroll]")
      ) return;
      // The rail became the page's only scroll context for the prose. Without the
      // stand-down above, ArrowDown inside it advances the step instead of scrolling,
      // which leaves roughly 1500px of body copy unreachable from the keyboard.
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToStep(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToStep(TOTAL_RESEARCH_STEPS - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, goToStep]);

  useEffect(() => {
    window.__multiscaleDebug = {
      jumpToScene: (levelId, step, stepProgress = 0.5, manualSnapshotIndex = null) => {
        const config = LEVELS.find((entry) => entry.id === levelId);
        if (!config) return;
        const clampedStep = Math.max(0, Math.min(step, config.steps - 1));
        const levelIndex = LEVELS.findIndex((entry) => entry.id === levelId);
        goToStep(globalStepFromLevel(levelIndex, clampedStep), stepProgress);
        setManualScfIndex(manualSnapshotIndex);
        setScfPlaying(manualSnapshotIndex === null);
      },
      clearOverride: () => {
        setManualScfIndex(null);
        setScfPlaying(true);
      },
      fit: () => cameraActionsRef.current?.fit(),
      reset: () => cameraActionsRef.current?.reset(),
      zoomIn: () => cameraActionsRef.current?.zoomIn(),
      zoomOut: () => cameraActionsRef.current?.zoomOut(),
      getState: () => scrollState,
      getMetrics: () => cameraActionsRef.current?.getMetrics?.() ?? null,
    };

    return () => {
      delete window.__multiscaleDebug;
    };
  }, [scrollState, goToStep]);

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/dft/scf.json"))
      .then((response) => response.json())
      .then((next) => {
        if (Array.isArray(next?.snapshots)) {
          const snapshots = next.snapshots.filter(
            (entry: { index?: number; iteration?: number; label?: string }) =>
              typeof entry?.index === "number" &&
              typeof entry?.iteration === "number" &&
              typeof entry?.label === "string",
          );
          // Where the run itself says it converged, so the slider's state label follows the
          // calculation rather than fixed thirds of the track. A run that never got below its
          // threshold is never called converged.
          const threshold = typeof next?.threshold === "number" ? next.threshold : null;
          const trajectory: Array<{ deltaE?: number }> = Array.isArray(next?.trajectory) ? next.trajectory : [];
          const converged = threshold === null
            ? -1
            : trajectory.findIndex((entry) => typeof entry?.deltaE === "number" && Math.abs(entry.deltaE) < threshold);
          setScfConvergedFrom(converged >= 0 ? converged : snapshots.length);
          setDftSnapshots(snapshots);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveScrollState = scrollState;
  const level = LEVELS[effectiveScrollState.levelIndex];
  const choreography = CHOREOGRAPHY[effectiveScrollState.level];
  const stepConfig = choreography.steps[effectiveScrollState.step];
  const isAllAtomLevel = effectiveScrollState.level === "allatom";
  const isAllAtomForceFieldStep = isAllAtomLevel && stepConfig?.sceneKey === "A3_forcefield";
  const isDftScfStep = effectiveScrollState.level === "dft" && stepConfig?.sceneKey === "D4_scf";
  const defaultScfIndex = useMemo(() => {
    if (!dftSnapshots.length || effectiveScrollState.level !== "dft") return 0;
    if (stepConfig?.sceneKey === "D6_outputs") {
      return dftSnapshots.length - 1;
    }
    return 0;
  }, [dftSnapshots, effectiveScrollState.level, stepConfig?.sceneKey]);

  const manualScfIndexActive =
    manualScfIndex !== null && isDftScfStep ? manualScfIndex : null;

  const effectiveScfIndex = isDftScfStep ? scfIndex : defaultScfIndex;
  const showDftScfSlider = isDftScfStep && dftSnapshots.length > 1;
  const scfPlaybackTitle = scfPlaying
    ? (lang === "ko" ? "이 밀도 갱신에서 멈춤" : "Hold this density update")
    : (lang === "ko" ? "밀도 갱신 이어서 재생" : "Resume density updates");
  const isDftOutputStep = effectiveScrollState.level === "dft" && stepConfig?.sceneKey === "D6_outputs";
  // The stage reports which surface is drawn, including the ones its own cycle moved to.
  const dftOutputMode: DftOutputMode = dftStatus === "HOMO" ? "homo" : dftStatus === "LUMO" ? "lumo" : "density";
  const activeAllAtomTerm = isAllAtomForceFieldStep ? (allAtomLockedTerm ?? allAtomHoveredTerm) : null;

  const getStepContext = (globalStep: number) => {
    if (globalStep < 0 || globalStep >= TOTAL_RESEARCH_STEPS) return null;
    let remaining = globalStep;
    for (const levelConfig of LEVELS) {
      const levelChoreography = CHOREOGRAPHY[levelConfig.id];
      if (remaining < levelChoreography.steps.length) {
        const config = levelChoreography.steps[remaining];
        return { title: config.title[lang as "en" | "ko"] ?? config.title.en, levelId: levelConfig.id };
      }
      remaining -= levelChoreography.steps.length;
    }
    return null;
  };
  const activeGlobalStep = globalStepFromLevel(effectiveScrollState.levelIndex, effectiveScrollState.step);
  const previousStepContext = getStepContext(activeGlobalStep - 1);
  const nextStepContext = getStepContext(activeGlobalStep + 1);
  const stepTitles = choreography.steps.map(
    (config) => config.title[lang as "en" | "ko"] ?? config.title.en,
  );
  const interactionHint = getInteractionHint(stepConfig?.sceneKey, lang, isMobile);

  const canGoNext = currentStep < TOTAL_RESEARCH_STEPS - 1;
  const canGoPrev = currentStep > 0;

  // Bound the desktop instrument so its fixed-width panels remain readable on very large displays.
  const desktopStageStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) clamp(340px, 32vw, 460px)",
    width: "100%",
    height: "100%",
    maxWidth: "2880px",
    maxHeight: "1440px",
  };

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  const rightRailProps = {
    scrollState: effectiveScrollState,
    level,
    stepConfig,
    equationKey: stepConfig.equationKey ?? choreography.equationKey,
    lang,
    scfActiveIndexOverride: showDftScfSlider ? effectiveScfIndex : undefined,
    scfConvergedFrom,
    onNext: goNext,
    onPrev: goPrev,
    canGoNext,
    canGoPrev,
    allAtomActiveTerm: activeAllAtomTerm,
    allAtomSelectedTerm: allAtomLockedTerm,
    onAllAtomTermHover: setAllAtomHoveredTerm,
    onAllAtomTermLeave: () => setAllAtomHoveredTerm(null),
    onAllAtomTermToggle: (term: AllAtomForceFieldTerm) => {
      setAllAtomLockedTerm((current) => (current === term ? null : term));
    },
    onLevelSwitch: goToLevel,
    stepTitles,
    previousStepTitle: previousStepContext?.title,
    nextStepTitle: nextStepContext?.title,
    nextStepLevel: nextStepContext?.levelId,
    interactionHint,
  } as const;

  // Fit and Reset run the same code on the meso stage (base zoom, default view), so Fit is hidden
  // there. On DFT and all-atom, Fit re-frames at base zoom and keeps the direction the reader has
  // turned the scene to; Reset also restores the scheduled view. MLFF keeps its Reset-only toolbar.
  const showFitAction = effectiveScrollState.level === "allatom" || effectiveScrollState.level === "dft";

  const sceneTitleKey = `${effectiveScrollState.level}-${effectiveScrollState.step}`;
  // Desktop only; the mobile branch passes the title through as a string prop instead.
  const sceneTitleCard = (
    <div
      className="multiscale-scene-title pointer-events-none min-w-0 max-w-[20rem]"
      data-testid="multiscale-scene-title"
    >
      <div
        key={sceneTitleKey}
        // Opaque, not a 90% wash. At /90 the card was a scrim over the live canvas: measured on
        // the DFT orbital step the HOMO lobe read (18,16,21) one pixel inside the card border
        // and (87,96,172) one pixel outside it, so the subject was sliced by a hard rectangle
        // and the step counter printed over a dimmed orbital. The level hairline already
        // separates the card from the scene.
        className={`multiscale-scene-title-inner border ${LEVEL_CHROME[level.id].line} bg-surface-sunken px-3.5 py-2.5`}
      >
        <div className="type-mono-meta mb-1.5 flex items-center justify-between gap-4 text-[0.78125rem] text-muted-foreground">
          <span className={LEVEL_CHROME[level.id].text}>{level.label[lang as "en" | "ko"] ?? level.label.en}</span>
          <span className="shrink-0 whitespace-nowrap">{String(activeGlobalStep + 1).padStart(2, "0")} / {String(TOTAL_RESEARCH_STEPS).padStart(2, "0")}</span>
        </div>
        <h2
          className={`type-heading text-foreground ${MULTISCALE_TYPE.sceneTitle}`}
        >
          {stepConfig?.title?.[lang as "en" | "ko"] ?? stepConfig?.title?.en ?? ""}
        </h2>
      </div>
    </div>
  );

  if (isMobile) {
    // The scene reports every iteration it moves to, including the ones it advanced to on its
    // own, so this always names the frame on screen.
    const scfLabel = !showDftScfSlider
      ? null
      : lang === "ko" ? "전자 밀도 갱신" : "density update";
    // The panel no longer carries a height. Its scene gets a definite one from
    // MOBILE_SCENE_HEIGHT and the mechanism band under it sizes to its content, so the
    // panel is the sum of the two rather than a number someone has to keep re-tuning
    // against the copy.
    const mobileSceneHeight =
      MOBILE_SCENE_HEIGHT[stepConfig.sceneKey] ?? DEFAULT_MOBILE_SCENE_HEIGHT;

    return (
      // The page wrapper pulls the instrument up under the masthead, and pt-16 brings the status
      // row back out from under it. The row used to be `sticky top-16` instead, but this shell's
      // overflow-x-hidden makes it a scroll container, so the row never stuck to the viewport:
      // it only sat 64px below its place in the flow and covered the top 64px of the scene.
      <div
        className="min-h-[100dvh] overflow-x-hidden bg-background pt-16 text-foreground"
        data-testid="multiscale-stage-shell"
      >
        <div className="relative z-30">
          <MobileStatusRow
            scrollState={effectiveScrollState}
            level={level}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
            onNext={goNext}
            onPrev={goPrev}
            onStepClick={(localStep) => {
              goToStep(globalStepFromLevel(effectiveScrollState.levelIndex, localStep));
            }}
            onLevelSwitch={goToLevel}
            lang={lang}
            stepTitles={stepTitles}
            previousStepTitle={previousStepContext?.title}
            nextStepTitle={nextStepContext?.title}
            scfLabel={scfLabel}
            sceneTitle={stepConfig?.title?.[lang as "en" | "ko"] ?? stepConfig?.title?.en}
            levelId={level.id}
            onChipTap={() => {
              document
                .getElementById("multiscale-scf-control")
                ?.scrollIntoView({ block: "center", behavior: "smooth" });
            }}
          />
        </div>

        <div className="relative w-full" data-testid="multiscale-visual-panel">
          <VisualStage
            scrollState={effectiveScrollState}
            isMobile={isMobile}
            mobileSceneHeight={mobileSceneHeight}
            onAllAtomTermChange={setAllAtomLockedTerm}
            actionsRef={cameraActionsRef}
            dftManualSnapshotIndex={manualScfIndexActive}
            onDftStatusChange={setDftStatus}
            dftScfPlaying={scfPlaying}
            onDftScfIndexChange={reportScfIndex}
            allAtomActiveTerm={activeAllAtomTerm}
            lang={lang}
            sceneKey={stepConfig.sceneKey}
            reducedMotion={reducedMotion}
          />

          {/* Overlays are anchored to the scene box, not to the panel. The panel also contains
              the mobile mechanism band, so `absolute bottom-3` put the camera trigger at
              top 999px in an 844px viewport — rendered, opacity 1, and below the fold on the
              one composition where a bad framing cannot be recovered by dragging. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: mobileSceneHeight }}
          >
            <SceneLegend
              scrollState={effectiveScrollState}
              lang={lang}
              dftOutputMode={dftOutputMode}
              className="pointer-events-auto absolute bottom-3 left-3 w-[9.5rem]"
            />
            {effectiveScrollState.level !== "mlff" ? (
              <div className="pointer-events-auto">
                <MobileViewerToolbar
                  cameraActionsRef={cameraActionsRef}
                  lang={lang}
                  showFit={showFitAction}
                  isOpen={cameraMenuOpen}
                  onToggle={() => setCameraMenuOpen((v) => !v)}
                />
              </div>
            ) : null}
          </div>
        </div>



        <section className="border-t border-border bg-surface-sunken pb-[env(safe-area-inset-bottom)]">
          <RightRail
            {...rightRailProps}
            isMobile
            showDftScfSlider={showDftScfSlider}
            dftSnapshots={dftSnapshots}
            scfValue={effectiveScfIndex}
            onScfChange={(nextIndex) => { setManualScfIndex(nextIndex); setScfPlaying(false); }}
          />
        </section>
      </div>
    );
  }

  const isMlffLevel = effectiveScrollState.level === "mlff";
  const cameraActions = [
    {
      key: "zoomIn",
      label: "+",
      icon: ZoomIn,
      title: lang === "ko" ? "확대" : "Zoom in",
    },
    {
      key: "zoomOut",
      label: "−",
      icon: ZoomOut,
      title: lang === "ko" ? "축소" : "Zoom out",
    },
    ...(showFitAction
      ? [{
          key: "fit",
          label: lang === "ko" ? "맞춤" : "Fit",
          icon: Maximize2,
          title: lang === "ko" ? "장면 맞춤" : "Fit scene",
        }]
      : []),
    {
      key: "reset",
      label: lang === "ko" ? "재설정" : "Reset",
      icon: RotateCcw,
      title: lang === "ko" ? "시점 재설정" : "Reset view",
    },
  ];

  return (
    <div className="flex items-center justify-center overflow-hidden bg-background pt-16 text-foreground" style={{ height: "100dvh" }}>
      <div
        data-testid="multiscale-stage-shell"
        className="multiscale-hires-frame overflow-hidden"
        style={desktopStageStyle}
      >
        <div className="relative min-h-0" data-testid="multiscale-visual-panel">
          <VisualStage
            scrollState={effectiveScrollState}
            isMobile={false}
            actionsRef={cameraActionsRef}
            dftManualSnapshotIndex={manualScfIndexActive}
            onDftStatusChange={setDftStatus}
            dftScfPlaying={scfPlaying}
            onDftScfIndexChange={reportScfIndex}
            dftOutputModeOverride={dftOutputOverride}
            allAtomActiveTerm={activeAllAtomTerm}
            lang={lang}
            sceneKey={stepConfig.sceneKey}
            reducedMotion={reducedMotion}
            hideMechanism={!isMlffLevel}
          />

          {/* Title card and camera controls share one row rather than being two
              absolutely positioned siblings, so no title length in any language can
              reach the toolbar: the toolbar takes its intrinsic width first and the
              card wraps into whatever is left. */}
          <div className="pointer-events-none absolute inset-x-6 top-6 z-10 flex items-start justify-between gap-4 sm:inset-x-8 sm:top-8">
            {sceneTitleCard}
            {!isMlffLevel ? (
              <div
                className="pointer-events-auto grid shrink-0 grid-cols-2 gap-2"
                data-testid="multiscale-camera-controls"
              >
                {cameraActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      className={`flex h-11 min-w-11 items-center justify-center gap-2 border border-border-strong bg-surface-raised px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted ${
                        action.key === "reset" && !showFitAction ? "col-span-2" : ""
                      }`}
                      title={action.title}
                      aria-label={action.title}
                      onClick={() => {
                        cameraActionsRef.current?.[action.key as keyof ResearchCameraActions]?.();
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">{action.label}</span>
                    </button>
                  );
                })}
                {/* The SCF page runs its iterations on its own, so the caption naming the one on
                    screen is also the control that holds it there and starts it again. */}
                {isDftScfStep && dftStatus ? (
                  <button
                    type="button"
                    onClick={() => setScfPlaying((playing) => !playing)}
                    className="col-span-2 flex h-11 items-center justify-center gap-2 border
                               border-border-strong bg-surface-raised px-3 text-sm font-semibold
                               tabular-nums text-foreground transition-colors hover:bg-muted"
                    data-testid="dft-scene-status"
                    title={scfPlaybackTitle}
                  >
                    {scfPlaying ? <Pause className="h-4 w-4 shrink-0" />
                                : <Play className="h-4 w-4 shrink-0" />}
                    {dftStatus}
                  </button>
                ) : null}
                {/* The outputs page asks the reader to compare HOMO and LUMO, so the reader picks
                    the surface. Until they do, the stage keeps walking density -> HOMO -> LUMO, and
                    the pressed button follows it. Above the legend, which appears only for the
                    orbitals, so the legend coming and going never moves the buttons. */}
                {isDftOutputStep ? (
                  <div
                    role="group"
                    aria-label={lang === "ko" ? "표시할 표면" : "Surface shown"}
                    className="col-span-2 flex border border-border-strong bg-surface-raised"
                    data-testid="dft-output-selector"
                  >
                    {DFT_OUTPUT_MODES.map((mode) => {
                      const active = dftOutputMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setDftOutputOverride(mode.id)}
                          className={`flex h-11 flex-1 items-center justify-center whitespace-nowrap border-l border-border-strong px-3 text-sm transition-colors first:border-l-0 ${
                            active
                              ? "bg-lv-dft-wash font-semibold text-lv-dft-text"
                              : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {lang === "ko" ? mode.ko : mode.en}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <SceneLegend
                  scrollState={effectiveScrollState}
                  lang={lang}
                  dftOutputMode={dftOutputMode}
                  className="col-span-2"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* The desktop branch renders only from 900px, where the rail always sits beside the
            stage, so it always takes the left rule. Below xl it used to take a top rule instead,
            which left no edge between scene and text and doubled the rule under the masthead. */}
        <div
          className="min-h-0 border-l border-border bg-surface-sunken"
          data-testid="multiscale-right-rail-panel"
        >
          <RightRail
            {...rightRailProps}
            isMobile={false}
            showDftScfSlider={showDftScfSlider}
            dftSnapshots={dftSnapshots}
            scfValue={effectiveScfIndex}
            onScfChange={(nextIndex) => { setManualScfIndex(nextIndex); setScfPlaying(false); }}
          />
        </div>
      </div>
    </div>
  );
}
