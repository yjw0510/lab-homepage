"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMounted } from "@/hooks/useMounted";
import { DftScfSlider } from "./DftScfSlider";
import { RDFBinSlider, type RdfBin } from "./RDFBinSlider";
import { VisualStage, type ResearchCameraActions } from "./VisualStage";
import { RightRail } from "./RightRail";
import { PaperCard } from "./PaperCard";
import { getScrollState, globalStepFromLevel, LEVELS, type ScrollState } from "./scrollState";
import { CHOREOGRAPHY } from "./levelData";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allatom/allAtomPagePolicy";
import type { MultiscaleArea } from "@/types/multiscale";
import type { Publication } from "@/types/publication";

const NAVBAR_SAFE_OFFSET = 64;
const TOTAL_RESEARCH_STEPS = LEVELS.reduce((sum, level) => sum + level.steps, 0);
const STEP_HOLD_PROGRESS = 0.8;

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

// Reduced-motion fallback — simple vertical layout
function ReducedMotionLayout({
  areas,
  publications,
  lang,
}: {
  areas: MultiscaleArea[];
  publications: Record<string, Publication[]>;
  lang: string;
}) {
  return (
    <div className="bg-gray-950 min-h-screen">
      <div className="h-[40vh] flex items-center justify-center bg-gradient-to-b from-[#050510] to-gray-950">
        <div className="text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {lang === "ko" ? "다중 스케일 분자 시뮬레이션" : "Multiscale Molecular Simulation"}
          </h1>
          <p className="text-lg text-gray-400">
            {lang === "ko" ? "양자 정밀도에서 메조스케일 창발까지" : "From quantum precision to mesoscale emergence"}
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        {areas.map((area, i) => {
          const pubs = publications[area.slug] || [];
          return (
            <section key={area.slug}>
              <h2 className="text-3xl font-bold mb-4" style={{ color: LEVELS[i]?.color }}>
                {area.title}
              </h2>
              {area.scale && (
                <span className="inline-block px-3 py-1 rounded-full text-xs bg-white/10 text-gray-300 mb-4">
                  {area.scale}
                </span>
              )}
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {lang === "ko" && area.shortDescriptionKo ? area.shortDescriptionKo : area.shortDescription}
              </p>
              {pubs.length > 0 && (
                <div className="space-y-2">
                  {pubs.slice(0, 3).map((pub) => (
                    <PaperCard
                      key={pub.slug}
                      publication={pub}
                      accentColor={LEVELS[i]?.color || "#888"}
                      lang={lang}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function MultiscalePinned({
  areas,
  publications,
  lang,
}: {
  areas: MultiscaleArea[];
  publications: Record<string, Publication[]>;
  lang: string;
}) {
  const mounted = useMounted();
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1200px)");
  const isTablet = useMediaQuery("(min-width: 900px)");
  const isMobile = !isTablet;

  // Step-based navigation state — restore from URL ?step= on mount
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(() => {
    const raw = searchParams.get("step");
    if (raw === null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(TOTAL_RESEARCH_STEPS - 1, n)) : 0;
  });
  const [animatedProgress, setAnimatedProgress] = useState(STEP_HOLD_PROGRESS);

  // Dummy progressRef for VisualStage prop compatibility (scenes void it)
  const progressRef = useRef(0);

  const autoRotateRef = useRef(false);
  const cameraActionsRef = useRef<ResearchCameraActions | null>(null);
  const [dftSnapshots, setDftSnapshots] = useState<Array<{ index: number; iteration: number; label: string }>>([]);
  const [manualScfIndex, setManualScfIndex] = useState<number | null>(null);
  const [isDraggingScf, setIsDraggingScf] = useState(false);
  const [rdfBins, setRdfBins] = useState<RdfBin[]>([]);
  const [rdfBinIndex, setRdfBinIndex] = useState(0);
  const [debugScrollStateOverride, setDebugScrollStateOverride] = useState<ScrollState | null>(null);
  const [allAtomHoveredTerm, setAllAtomHoveredTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomLockedTerm, setAllAtomLockedTerm] = useState<AllAtomForceFieldTerm | null>(null);
  const [allAtomHoveredReadout, setAllAtomHoveredReadout] = useState<AllAtomReadoutId | null>(null);
  const [allAtomLockedReadout, setAllAtomLockedReadout] = useState<AllAtomReadoutId | null>(null);

  // Derive scrollState from currentStep + animatedProgress
  const scrollState = useMemo(
    () => getScrollState((currentStep + Math.min(animatedProgress, 0.999)) / TOTAL_RESEARCH_STEPS),
    [currentStep, animatedProgress],
  );

  // Sync currentStep → URL ?step= (replaceState to avoid history spam)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentStep === 0) {
      url.searchParams.delete("step");
    } else {
      url.searchParams.set("step", String(currentStep));
    }
    window.history.replaceState(null, "", url.toString());
  }, [currentStep]);

  // Navigation handlers
  const goToStep = useCallback((step: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_RESEARCH_STEPS - 1, step));
    setCurrentStep(clamped);
    setAnimatedProgress(STEP_HOLD_PROGRESS);
    setDebugScrollStateOverride(null);
    setManualScfIndex(null);
    setIsDraggingScf(false);
  }, []);

  const goNext = useCallback(() => goToStep(currentStep + 1), [currentStep, goToStep]);
  const goPrev = useCallback(() => goToStep(currentStep - 1), [currentStep, goToStep]);

  const goToLevel = useCallback((levelIndex: number) => {
    const firstStep = LEVELS.slice(0, levelIndex).reduce((s, l) => s + l.steps, 0);
    goToStep(firstStep);
  }, [goToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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

  // Debug API
  useEffect(() => {
    window.__multiscaleDebug = {
      jumpToScene: (levelId, step, _stepProgress = 0.5, manualSnapshotIndex = null) => {
        const config = LEVELS.find((entry) => entry.id === levelId);
        if (!config) return;
        const clampedStep = Math.max(0, Math.min(step, config.steps - 1));
        const levelIndex = LEVELS.findIndex((entry) => entry.id === levelId);
        goToStep(globalStepFromLevel(levelIndex, clampedStep));
        setManualScfIndex(manualSnapshotIndex);
      },
      clearOverride: () => {
        setDebugScrollStateOverride(null);
        setManualScfIndex(null);
      },
      fit: () => cameraActionsRef.current?.fit(),
      reset: () => cameraActionsRef.current?.reset(),
      zoomIn: () => cameraActionsRef.current?.zoomIn(),
      zoomOut: () => cameraActionsRef.current?.zoomOut(),
      getState: () => debugScrollStateOverride ?? scrollState,
      getMetrics: () => cameraActionsRef.current?.getMetrics?.() ?? null,
    };

    return () => {
      delete window.__multiscaleDebug;
    };
  }, [debugScrollStateOverride, scrollState, goToStep]);

  // Load DFT SCF snapshots
  useEffect(() => {
    fetch("/data/multiscale/dft/scf.json")
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

  // Load RDF bins (tiny: 640 bytes, 80 interleaved r,g pairs)
  useEffect(() => {
    fetch("/data/dna/rdf/rdf.bin")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const arr = new Float32Array(buf);
        const bins: RdfBin[] = [];
        for (let i = 0; i < arr.length; i += 2) {
          bins.push({ r: arr[i], g: arr[i + 1] });
        }
        setRdfBins(bins);
      })
      .catch(() => {});
  }, []);

  const effectiveScrollState = debugScrollStateOverride ?? scrollState;
  const level = LEVELS[effectiveScrollState.levelIndex];
  const isAllAtomLevel = effectiveScrollState.level === "allatom";
  const isAllAtomForceFieldStep = isAllAtomLevel && effectiveScrollState.step === 1;
  const isAllAtomReadoutStep = isAllAtomLevel && effectiveScrollState.step === 4;
  const choreography = CHOREOGRAPHY[effectiveScrollState.level];
  const stepConfig = choreography.steps[effectiveScrollState.step];
  const isDftScfStep = effectiveScrollState.level === "dft" && stepConfig?.sceneKey === "D6_density";
  const defaultScfIndex = useMemo(() => {
    if (!dftSnapshots.length || effectiveScrollState.level !== "dft") return 0;
    if (effectiveScrollState.step >= 8) return dftSnapshots.length - 1;
    return 0;
  }, [dftSnapshots, effectiveScrollState.level, effectiveScrollState.step]);

  // Keep manual selection active until user navigates away from the SCF step
  const manualScfIndexActive =
    manualScfIndex !== null && isDftScfStep ? manualScfIndex : null;

  const effectiveScfIndex = manualScfIndexActive ?? defaultScfIndex;
  const showDftScfSlider = isDftScfStep && dftSnapshots.length > 1;
  const showRdfSlider = effectiveScrollState.level === "meso" && effectiveScrollState.step === 4 && rdfBins.length > 1;
  const activeAllAtomTerm = isAllAtomForceFieldStep ? (allAtomLockedTerm ?? allAtomHoveredTerm) : null;
  const activeAllAtomReadout = isAllAtomReadoutStep ? (allAtomLockedReadout ?? allAtomHoveredReadout) : null;

  useEffect(() => {
    setAllAtomHoveredTerm(null);
    setAllAtomLockedTerm(null);
    setAllAtomHoveredReadout(null);
    setAllAtomLockedReadout(null);
  }, [effectiveScrollState.level, effectiveScrollState.step]);

  // Find the paper for the current step
  const currentPaper = stepConfig?.paperSlug
    ? Object.values(publications)
        .flat()
        .find((p) => p.slug === stepConfig.paperSlug) || null
    : null;

  const canGoNext = currentStep < TOTAL_RESEARCH_STEPS - 1;
  const canGoPrev = currentStep > 0;

  const stageStyle = isDesktop
    ? {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) clamp(380px, 30vw, 460px)",
      }
    : { display: "grid", gridTemplateRows: "minmax(0, 50vh) minmax(0, 1fr)" };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  if (reducedMotion) {
    return <ReducedMotionLayout areas={areas} publications={publications} lang={lang} />;
  }

  return (
    <div className="bg-gray-950 overflow-hidden pt-16" style={{ height: "100vh" }}>
      <div
        data-testid="multiscale-stage-shell"
        className="h-full overflow-hidden"
        style={stageStyle}
      >
        {/* Visual stage */}
        <div className="relative min-h-0" data-testid="multiscale-visual-panel">
          <VisualStage
            progressRef={progressRef}
            scrollState={effectiveScrollState}
            isMobile={isMobile}
            autoRotateRef={autoRotateRef}
            actionsRef={cameraActionsRef}
            dftManualSnapshotIndex={manualScfIndexActive}
            rdfBinIndex={rdfBinIndex}
            allAtomActiveTerm={activeAllAtomTerm}
            allAtomActiveReadout={activeAllAtomReadout}
          />

          {showRdfSlider && (
            <RDFBinSlider
              bins={rdfBins}
              value={rdfBinIndex}
              lang={lang}
              onChange={setRdfBinIndex}
            />
          )}

          {showDftScfSlider && (
            <DftScfSlider
              snapshots={dftSnapshots}
              value={effectiveScfIndex}
              lang={lang}
              onChange={(nextIndex) => {
                setManualScfIndex(nextIndex);
              }}
              onPointerStart={() => {
                setIsDraggingScf(true);
              }}
              onPointerEnd={() => {
                setIsDraggingScf(false);
              }}
            />
          )}

          {/* Camera controls */}
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
                  className={`flex items-center justify-center gap-2 border border-white/12 bg-slate-950/78 text-sm font-medium text-white/92 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-white/22 hover:bg-slate-900/86 ${
                    "h-11 min-w-11 rounded-2xl px-3"
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
          </div>

          {/* Scene title overlay */}
          <div
            className={`pointer-events-none absolute left-6 z-10 sm:left-8 ${
              isAllAtomLevel ? "top-6 sm:top-8" : isMobile ? "bottom-16" : "bottom-20"
            }`}
            data-testid="multiscale-scene-title"
          >
            <div className={`${isAllAtomLevel ? "max-w-[28rem] rounded-2xl border border-cyan-400/16 bg-slate-950/54 px-4 py-3 shadow-[0_18px_56px_rgba(0,0,0,0.34)] backdrop-blur-md" : ""}`}>
              {isAllAtomLevel && (
                <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300/78">
                  {level.label[lang as "en" | "ko"] ?? level.label.en}
                </div>
              )}
              <h3
                className={`font-bold tracking-tight text-white/95 ${
                  isAllAtomLevel
                    ? "text-[1.45rem] leading-tight sm:text-[1.75rem]"
                    : "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-2xl shadow-[0_12px_40px_rgba(0,0,0,0.32)] backdrop-blur-md sm:text-3xl"
                }`}
              >
                {stepConfig?.title?.[lang as "en" | "ko"] ?? stepConfig?.title?.en ?? ""}
              </h3>
            </div>
          </div>

          {/* Level selector + step navigation (mobile: includes prev/next, desktop: level dots only) */}
          <div className={`absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 border border-white/10 bg-slate-950/70 shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur-md ${
            isAllAtomLevel ? "rounded-2xl px-3.5 py-2" : "rounded-full px-3 py-1.5"
          }`}>
            {/* Prev button — mobile only */}
            {isMobile && (
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={goPrev}
                className="flex items-center justify-center rounded-full p-1 text-white/80 transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={lang === "ko" ? "이전 단계" : "Previous step"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {LEVELS.map((l, i) => (
              <button
                key={l.id}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-all"
                style={{
                  backgroundColor: i === effectiveScrollState.levelIndex ? `${l.color}24` : "transparent",
                  color: i === effectiveScrollState.levelIndex ? l.color : "#7a7a87",
                  borderWidth: 1,
                  borderColor: i === effectiveScrollState.levelIndex ? `${l.color}40` : "transparent",
                }}
                aria-label={`Jump to ${l.label.en} level`}
                onClick={() => goToLevel(i)}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: l.color, opacity: i === effectiveScrollState.levelIndex ? 1 : 0.45 }}
                />
                <span className={i === effectiveScrollState.levelIndex ? "inline" : "hidden sm:inline"}>
                  {l.label[lang as "en" | "ko"] ?? l.label.en}
                </span>
              </button>
            ))}

            {/* Step counter + Next button — mobile only */}
            {isMobile && (
              <>
                <span className="text-xs text-white/50 tabular-nums mx-1">
                  {effectiveScrollState.step + 1}/{effectiveScrollState.stepCount}
                </span>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={goNext}
                  className="flex items-center justify-center rounded-full p-1 text-white/80 transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={lang === "ko" ? "다음 단계" : "Next step"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Rail */}
        <div
          className="min-h-0 border-t border-white/6 xl:border-l xl:border-white/6 xl:border-t-0 bg-[#050913]"
          data-testid="multiscale-right-rail-panel"
        >
          <RightRail
            scrollState={effectiveScrollState}
            level={level}
            stepConfig={stepConfig}
            equationKey={choreography.equationKey}
            paper={currentPaper}
            lang={lang}
            isMobile={isMobile}
            scfActiveIndexOverride={showDftScfSlider ? effectiveScfIndex : undefined}
            rdfActiveRadius={showRdfSlider ? rdfBins[rdfBinIndex]?.r : undefined}
            onNext={goNext}
            onPrev={goPrev}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
            allAtomActiveTerm={activeAllAtomTerm}
            onAllAtomTermHover={setAllAtomHoveredTerm}
            onAllAtomTermLeave={() => setAllAtomHoveredTerm(null)}
            onAllAtomTermToggle={(term) => {
              setAllAtomLockedTerm((current) => (current === term ? null : term));
            }}
            allAtomActiveReadout={activeAllAtomReadout}
            onAllAtomReadoutHover={setAllAtomHoveredReadout}
            onAllAtomReadoutLeave={() => setAllAtomHoveredReadout(null)}
            onAllAtomReadoutToggle={(readout) => {
              setAllAtomLockedReadout((current) => (current === readout ? null : readout));
            }}
            onStepClick={(localStep) => {
              goToStep(globalStepFromLevel(effectiveScrollState.levelIndex, localStep));
            }}
          />
        </div>
      </div>
    </div>
  );
}
