"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Maximize2, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { BANDS } from "./plots/AllAtomCoordinationPlot";
import { DENSITY_RAMP } from "./molstar/shared";
import { withBasePath } from "@/lib/basePath";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMounted } from "@/hooks/useMounted";
import { VisualStage, type ResearchCameraActions } from "./VisualStage";
import { RightRail, LEVEL_CHROME } from "./RightRail";
import { MobileStatusRow } from "./MobileStatusRow";
import { MobileViewerToolbar } from "./MobileViewerToolbar";
import { getScrollState, globalStepFromLevel, LEVELS, type ScrollState } from "./scrollState";
import { CHOREOGRAPHY } from "./levelData";
import {
  DEFAULT_MOBILE_SCENE_HEIGHT,
  MOBILE_SCENE_HEIGHT,
  MULTISCALE_TYPE,
} from "./visualRules";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allatom/allAtomPagePolicy";

const TOTAL_RESEARCH_STEPS = LEVELS.reduce((sum, level) => sum + level.steps, 0);
const STEP_HOLD_PROGRESS = 0.8;

function getInteractionHint(sceneKey: string | undefined, lang: string) {
  const isKorean = lang === "ko";
  const hints: Record<string, { en: string; ko: string }> = {
    M2_mapping: {
      en: "A single teaching chain fading into its beads. The 8,000-bead melt on the previous page is a separate, larger system.",
      ko: "사슬 하나가 비드로 바뀌는 학습용 모티프입니다. 앞 장의 8,000비드 용융계는 별도의 더 큰 계입니다.",
    },
    A3_forcefield: {
      en: "Select a force-field term in the equation or diagram to isolate its contribution.",
      ko: "식이나 도식에서 역장 항을 하나 골라 그 기여만 남겨 보세요.",
    },
    A6_observables: {
      en: "Select a readout to connect one trajectory frame to its measured signal and distribution.",
      ko: "관측량을 선택해 궤적 프레임과 해당 신호·분포를 연결해 보세요.",
    },
    D4_scf: {
      en: "Move the SCF control to compare total-density snapshots and the synchronized energy-change trace.",
      ko: "SCF 조절기로 총 전자 밀도 스냅샷과 동기화된 에너지 변화 곡선을 비교해 보세요.",
    },
  };
  const hint = sceneKey ? hints[sceneKey] : undefined;
  return hint ? (isKorean ? hint.ko : hint.en) : undefined;
}

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
  const [dftCyclePaused, setDftCyclePaused] = useState(false);
  const [manualScfIndex, setManualScfIndex] = useState<number | null>(null);
  // Where the SCF sequence actually is. The stage owns the sequence, so the slider has to be told
  // rather than derive it; before this it sat on the first tick through the whole animation.
  const [scfIndex, setScfIndex] = useState(0);
  const [scfPlaying, setScfPlaying] = useState(true);
  const [allAtomHoveredTerm, setAllAtomHoveredTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomLockedTerm, setAllAtomLockedTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomHoveredReadout, setAllAtomHoveredReadout] = useState<AllAtomReadoutId | null>(null);
  const [allAtomLockedReadout, setAllAtomLockedReadout] = useState<AllAtomReadoutId | null>(null);
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
    setAllAtomHoveredReadout(null);
    setAllAtomLockedReadout(null);
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
          setDftSnapshots(
            next.snapshots.filter(
              (entry: { index?: number; iteration?: number; label?: string }) =>
                typeof entry?.index === "number" &&
                typeof entry?.iteration === "number" &&
                typeof entry?.label === "string",
            ),
          );
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
  const isAllAtomReadoutStep = isAllAtomLevel && stepConfig?.sceneKey === "A6_observables";
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
  // Each DFT page runs on its own timer, so which one the caption's play/pause reaches depends on
  // the page: the SCF sequence here, the density -> HOMO -> LUMO walk on the outputs page.
  const dftPlayback = isDftScfStep
    ? {
        paused: !scfPlaying,
        toggle: () => setScfPlaying((playing) => !playing),
        title: scfPlaying
          ? (lang === "ko" ? "이 반복에서 멈춤" : "Hold this iteration")
          : (lang === "ko" ? "이어서 재생" : "Resume iterating"),
      }
    : {
        paused: dftCyclePaused,
        toggle: () => setDftCyclePaused((paused) => !paused),
        title: dftCyclePaused
          ? (lang === "ko" ? "자동 전환 재개" : "Resume cycling")
          : (lang === "ko" ? "이 표면에서 멈춤" : "Hold this surface"),
      };
  const activeAllAtomTerm = isAllAtomForceFieldStep ? (allAtomLockedTerm ?? allAtomHoveredTerm) : null;
  const activeAllAtomReadout = isAllAtomReadoutStep ? (allAtomLockedReadout ?? allAtomHoveredReadout) : null;

  const getStepContext = (globalStep: number) => {
    if (globalStep < 0 || globalStep >= TOTAL_RESEARCH_STEPS) return null;
    let remaining = globalStep;
    for (const levelConfig of LEVELS) {
      const levelChoreography = CHOREOGRAPHY[levelConfig.id];
      if (remaining < levelChoreography.steps.length) {
        const config = levelChoreography.steps[remaining];
        return config.title[lang as "en" | "ko"] ?? config.title.en;
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
  const interactionHint = getInteractionHint(stepConfig?.sceneKey, lang);

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
    previousStepTitle: previousStepContext ?? undefined,
    nextStepTitle: nextStepContext ?? undefined,
    interactionHint,
  } as const;

  const sceneTitleKey = `${effectiveScrollState.level}-${effectiveScrollState.step}`;
  // Desktop only; the mobile branch passes the title through as a string prop instead.
  const sceneTitleCard = (
    <div
      className="multiscale-scene-title pointer-events-none min-w-0 max-w-[28rem]"
      data-testid="multiscale-scene-title"
    >
      <div
        key={sceneTitleKey}
        className={`multiscale-scene-title-inner border ${LEVEL_CHROME[level.id].line} bg-surface-sunken/90 px-3.5 py-2.5`}
      >
        <div className="type-mono-meta mb-1.5 flex items-center justify-between gap-4 text-[0.78125rem] text-muted-foreground">
          <span className={LEVEL_CHROME[level.id].text}>{level.label[lang as "en" | "ko"] ?? level.label.en}</span>
          <span>{String(activeGlobalStep + 1).padStart(2, "0")} / {String(TOTAL_RESEARCH_STEPS).padStart(2, "0")}</span>
        </div>
        <h3
          className={`type-heading text-foreground ${MULTISCALE_TYPE.sceneTitle}`}
        >
          {stepConfig?.title?.[lang as "en" | "ko"] ?? stepConfig?.title?.en ?? ""}
        </h3>
      </div>
    </div>
  );

  if (isMobile) {
    // The scene reports every iteration it moves to, including the ones it advanced to on its
    // own, so this always names the frame on screen.
    const scfLabel = !showDftScfSlider
      ? null
      : `${lang === "ko" ? "SCF 반복" : "SCF iteration"} ${dftSnapshots[effectiveScfIndex]?.iteration ?? effectiveScfIndex + 1}`;
    // The panel no longer carries a height. Its scene gets a definite one from
    // MOBILE_SCENE_HEIGHT and the mechanism band under it sizes to its content, so the
    // panel is the sum of the two rather than a number someone has to keep re-tuning
    // against the copy.
    const mobileSceneHeight =
      MOBILE_SCENE_HEIGHT[stepConfig.sceneKey] ?? DEFAULT_MOBILE_SCENE_HEIGHT;

    return (
      <div
        className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground"
        data-testid="multiscale-stage-shell"
      >
        <h1 className="sr-only">
          {lang === "ko"
            ? "멀티스케일 분자 시뮬레이션, 양자 정밀도에서 메조스케일 창발까지"
            : "Multiscale molecular simulation, from quantum precision to mesoscale emergence"}
        </h1>

        <div className="sticky top-16 z-30">
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
            previousStepTitle={previousStepContext ?? undefined}
            nextStepTitle={nextStepContext ?? undefined}
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
            onAllAtomReadoutChange={setAllAtomLockedReadout}
            actionsRef={cameraActionsRef}
            dftManualSnapshotIndex={manualScfIndexActive}
            onDftStatusChange={setDftStatus}
            dftCyclePaused={dftCyclePaused}
            dftScfPlaying={scfPlaying}
            onDftScfIndexChange={setScfIndex}
            allAtomActiveTerm={activeAllAtomTerm}
            allAtomActiveReadout={activeAllAtomReadout}
            lang={lang}
            sceneKey={stepConfig.sceneKey}
            reducedMotion={reducedMotion}
          />

          {effectiveScrollState.level !== "mlff" ? (
            <MobileViewerToolbar
              cameraActionsRef={cameraActionsRef}
              lang={lang}
              isOpen={cameraMenuOpen}
              onToggle={() => setCameraMenuOpen((v) => !v)}
            />
          ) : null}
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

  return (
    <div className="flex items-center justify-center overflow-hidden bg-background pt-16 text-foreground" style={{ height: "100dvh" }}>
      <h1 className="sr-only">
        {lang === "ko"
          ? "멀티스케일 분자 시뮬레이션, 양자 정밀도에서 메조스케일 창발까지"
          : "Multiscale molecular simulation, from quantum precision to mesoscale emergence"}
      </h1>
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
            dftCyclePaused={dftCyclePaused}
            dftScfPlaying={scfPlaying}
            onDftScfIndexChange={setScfIndex}
            allAtomActiveTerm={activeAllAtomTerm}
            allAtomActiveReadout={activeAllAtomReadout}
            lang={lang}
            sceneKey={stepConfig.sceneKey}
            reducedMotion={reducedMotion}
            hideMechanism={effectiveScrollState.level !== "mlff"}
          />

          {/* Title card and camera controls share one row rather than being two
              absolutely positioned siblings, so no title length in any language can
              reach the toolbar: the toolbar takes its intrinsic width first and the
              card wraps into whatever is left. */}
          <div className="pointer-events-none absolute inset-x-6 top-6 z-10 flex items-start justify-between gap-4 sm:inset-x-8 sm:top-8">
            {sceneTitleCard}
            {effectiveScrollState.level !== "mlff" ? (
          <div
            className="pointer-events-auto grid shrink-0 grid-cols-2 gap-2"
            data-testid="multiscale-camera-controls"
          >
            {[
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
              {
                key: "fit",
                label: lang === "ko" ? "맞춤" : "Fit",
                icon: Maximize2,
                title: lang === "ko" ? "장면 맞춤" : "Fit scene",
              },
              {
                key: "reset",
                label: lang === "ko" ? "재설정" : "Reset",
                icon: RotateCcw,
                title: lang === "ko" ? "시점 재설정" : "Reset view",
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  className="flex h-11 min-w-11 items-center justify-center gap-2 border border-border-strong bg-surface-raised px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
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
            {effectiveScrollState.level === "allatom" && effectiveScrollState.step === 1 ? (
              // The cell page colours 68 ions by how many carbonyl oxygens each is holding, and
              // the panel that says so is off to the side. Same bands, same source, next to the
              // thing they describe.
              <div
                className="col-span-2 flex flex-col gap-1 border border-border-strong
                           bg-surface-raised px-3 py-2 text-xs text-foreground"
                data-testid="coordination-legend"
              >
                <span className="text-muted-foreground">
                  {lang === "ko" ? "리튬 배위수" : "Li⁺ coordination"}
                </span>
                {BANDS.map((band) => (
                  <span key={band.label} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: band.color }} />
                    {band.name}
                  </span>
                ))}
              </div>
            ) : null}
            {effectiveScrollState.level === "dft" && effectiveScrollState.step === 0 ? (
              // The SCF surface is the total density; the colour on it is this iteration
              // against the converged one. Continuous, so a strip rather than swatches.
              <div
                className="col-span-2 flex flex-col gap-1 border border-border-strong
                           bg-surface-raised px-3 py-2 text-xs text-foreground"
                data-testid="density-legend"
              >
                <span className="text-muted-foreground">
                  {lang === "ko" ? "수렴 대비 밀도" : "vs converged"}
                </span>
                <span
                  className="h-2 w-full"
                  style={{ background: `linear-gradient(to right, ${DENSITY_RAMP.join(", ")})` }}
                />
                <span className="flex justify-between tabular-nums text-muted-foreground">
                  <span>{lang === "ko" ? "낮음" : "lower"}</span>
                  <span>{lang === "ko" ? "높음" : "higher"}</span>
                </span>
              </div>
            ) : null}
            {/* Both DFT pages run on their own: one walks the SCF iterations, the other walks
                density -> HOMO -> LUMO. So on both, the caption naming what is on screen is also
                the control that holds it there and starts it again. */}
            {effectiveScrollState.level === "dft" && dftStatus ? (
              <button
                type="button"
                onClick={() => dftPlayback.toggle()}
                className="col-span-2 flex h-11 items-center justify-center gap-2 border
                           border-border-strong bg-surface-raised px-3 text-sm font-semibold
                           tabular-nums text-foreground transition-colors hover:bg-muted"
                data-testid="dft-scene-status"
                title={dftPlayback.title}
              >
                {dftPlayback.paused ? <Play className="h-4 w-4 shrink-0" />
                                    : <Pause className="h-4 w-4 shrink-0" />}
                {dftStatus}
              </button>
            ) : null}
          </div>
            ) : null}
          </div>
        </div>

        <div
          className="min-h-0 border-t border-border bg-surface-sunken xl:border-l xl:border-t-0"
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
