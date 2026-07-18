"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
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
import { MULTISCALE_TYPE } from "./visualRules";
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
      ko: "식이나 도식의 힘장 항을 선택해 각 항의 기여를 따로 살펴보세요.",
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
  const [manualScfIndex, setManualScfIndex] = useState<number | null>(null);
  const [allAtomHoveredTerm, setAllAtomHoveredTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomLockedTerm, setAllAtomLockedTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomHoveredReadout, setAllAtomHoveredReadout] = useState<AllAtomReadoutId | null>(null);
  const [allAtomLockedReadout, setAllAtomLockedReadout] = useState<AllAtomReadoutId | null>(null);
  const [measuredContactDistance, setMeasuredContactDistance] = useState<number | null>(null);
  const handleMeasuredDistance = useCallback((value: number | null) => {
    setMeasuredContactDistance(value);
  }, []);

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
    setAllAtomHoveredTerm(null);
    setAllAtomLockedTerm(null);
    setAllAtomHoveredReadout(null);
    setAllAtomLockedReadout(null);
    setMeasuredContactDistance(null);
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
        e.target.closest("input, textarea, select, button, a, [contenteditable='true']")
      ) return;
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
      },
      clearOverride: () => {
        setManualScfIndex(null);
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

  const effectiveScfIndex = manualScfIndexActive ?? defaultScfIndex;
  const showDftScfSlider = isDftScfStep && dftSnapshots.length > 1;
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
    allAtomActiveReadout: activeAllAtomReadout,
    allAtomSelectedReadout: allAtomLockedReadout,
    onAllAtomReadoutHover: setAllAtomHoveredReadout,
    onAllAtomReadoutLeave: () => setAllAtomHoveredReadout(null),
    onAllAtomReadoutToggle: (readout: AllAtomReadoutId) => {
      setAllAtomLockedReadout((current) => (current === readout ? null : readout));
    },
    onLevelSwitch: goToLevel,
    stepTitles,
    previousStepTitle: previousStepContext ?? undefined,
    nextStepTitle: nextStepContext ?? undefined,
    interactionHint,
    measuredContactDistance,
  } as const;

  const sceneTitleKey = `${effectiveScrollState.level}-${effectiveScrollState.step}`;
  const sceneTitle = (
    <div
      className={`multiscale-scene-title pointer-events-none absolute z-10 max-w-[min(28rem,calc(100%-2rem))] ${
        isMobile
            ? effectiveScrollState.level === "mlff"
              ? "left-4 top-4 !max-w-[calc(100%-2rem)]"
              : "left-4 top-4 !max-w-[calc(100%-5.75rem)]"
          : "left-6 top-6 sm:left-8 sm:top-8"
      }`}
      data-testid="multiscale-scene-title"
    >
      <div
        key={sceneTitleKey}
        className={`multiscale-scene-title-inner border ${LEVEL_CHROME[level.id].line} bg-surface-sunken/90 px-3.5 py-2.5`}
      >
        <div className="type-mono-meta mb-1.5 flex items-center justify-between gap-4 text-[0.78125rem] text-muted-foreground">
          <span className={LEVEL_CHROME[level.id].text}>{level.label[lang as "en" | "ko"] ?? level.label.en}</span>
          <span>{String(activeGlobalStep + 1).padStart(2, "0")} / {TOTAL_RESEARCH_STEPS}</span>
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
    const scfLabel = showDftScfSlider
      ? `${lang === "ko" ? "SCF 반복" : "SCF iteration"} ${dftSnapshots[effectiveScfIndex]?.iteration ?? effectiveScfIndex + 1}`
      : null;
    // Heights are validated per scene because the scientific panels have different aspect needs.
    const mobileVisualHeight =
      stepConfig.sceneKey === "D6_outputs"
        ? "910px"
        : stepConfig.sceneKey === "D4_scf"
          ? "900px"
          : stepConfig.sceneKey === "L1_why"
            ? "1520px"
            : stepConfig.sceneKey === "L5_energy_force"
              ? "1640px"
              : stepConfig.sceneKey === "A6_observables"
                ? "1140px"
                : stepConfig.sceneKey === "A3_forcefield"
                  ? "1140px"
                  : stepConfig.sceneKey === "M5_collective"
                    ? "1040px"
                    : stepConfig.sceneKey === "M2_mapping"
                      ? "1300px"
                      : "min(80dvh, 900px)";

    return (
      <div
        className="min-h-[100dvh] overflow-x-hidden bg-background pt-16 text-foreground"
        data-testid="multiscale-stage-shell"
      >
        <h1 className="sr-only">
          {lang === "ko"
            ? "멀티스케일 분자 시뮬레이션 — 양자 정밀도에서 메조스케일 창발까지"
            : "Multiscale molecular simulation, from quantum precision to mesoscale emergence"}
        </h1>
        <div
          className="relative w-full"
          style={{ height: mobileVisualHeight }}
          data-testid="multiscale-visual-panel"
        >
          <VisualStage
            scrollState={effectiveScrollState}
            isMobile={isMobile}
            actionsRef={cameraActionsRef}
            dftManualSnapshotIndex={manualScfIndexActive}
            allAtomActiveTerm={activeAllAtomTerm}
            allAtomActiveReadout={activeAllAtomReadout}
            lang={lang}
            sceneKey={stepConfig.sceneKey}
            reducedMotion={reducedMotion}
            onMeasuredDistance={handleMeasuredDistance}
          />

          {sceneTitle}

          {effectiveScrollState.level !== "mlff" ? (
            <MobileViewerToolbar
              cameraActionsRef={cameraActionsRef}
              lang={lang}
              isOpen={cameraMenuOpen}
              onToggle={() => setCameraMenuOpen((v) => !v)}
            />
          ) : null}
        </div>

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
          />
        </div>

        <section className="border-t border-border bg-surface-sunken pb-[env(safe-area-inset-bottom)]">
          <RightRail
            {...rightRailProps}
            isMobile
            showDftScfSlider={showDftScfSlider}
            dftSnapshots={dftSnapshots}
            scfValue={effectiveScfIndex}
            onScfChange={(nextIndex) => setManualScfIndex(nextIndex)}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center overflow-hidden bg-background pt-16 text-foreground" style={{ height: "100dvh" }}>
      <h1 className="sr-only">
        {lang === "ko"
          ? "멀티스케일 분자 시뮬레이션 — 양자 정밀도에서 메조스케일 창발까지"
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
            allAtomActiveTerm={activeAllAtomTerm}
            allAtomActiveReadout={activeAllAtomReadout}
            lang={lang}
            sceneKey={stepConfig.sceneKey}
            reducedMotion={reducedMotion}
            hideMechanism={effectiveScrollState.level !== "mlff"}
            onMeasuredDistance={handleMeasuredDistance}
          />

          {effectiveScrollState.level !== "mlff" ? (
          <div
            className="absolute right-4 top-4 z-10 grid grid-cols-2 gap-2 sm:right-6 sm:top-6"
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
          </div>
          ) : null}

          {sceneTitle}
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
            onScfChange={(nextIndex) => setManualScfIndex(nextIndex)}
          />
        </div>
      </div>
    </div>
  );
}
