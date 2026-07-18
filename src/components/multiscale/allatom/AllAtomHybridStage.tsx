"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { MolstarAllAtomStage } from "../molstar/MolstarAllAtomStage";
import type { CameraSnapshotLike, ResearchCameraActions } from "../molstar/shared";
import { AllAtomMechanism } from "../overlays/AllAtomMechanism";
import { useReducedMotionPreference } from "../overlays/allatom/useReducedMotionPreference";
import { AllAtomOverlayStage } from "./AllAtomOverlayStage";
import { normalizeAllAtomSceneKey } from "./allAtomConfig";
import type { AllAtomCameraState } from "./allAtomVisuals";
import type { ScrollState } from "../scrollState";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allAtomPagePolicy";

const BASE_ZOOM_INDEX = 2;
const MIN_ZOOM_INDEX = 0;
const MAX_ZOOM_INDEX = 4;

export function AllAtomHybridStage({
  progressRef,
  scrollState,
  isMobile,
  autoRotateRef,
  actionsRef,
  activeTerm,
  activeReadout,
  lang,
  sceneKey,
  reducedMotion,
  hideMechanism = false,
  onMeasuredDistance,
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  activeReadout: AllAtomReadoutId | null;
  lang?: string;
  sceneKey?: string;
  reducedMotion?: boolean;
  hideMechanism?: boolean;
  onMeasuredDistance?: (nm: number | null) => void;
}) {
  const [cameraState, setCameraState] = useState<AllAtomCameraState>({
    zoomIndex: BASE_ZOOM_INDEX,
    viewRevision: 0,
  });
  const [mechanismTerm, setMechanismTerm] = useState<AllAtomForceFieldTerm>("Ubond");
  const [mechanismReadout, setMechanismReadout] = useState<AllAtomReadoutId>("orientation");
  const cameraSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const displayAtomsRef = useRef<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);
  const activeSceneKey = normalizeAllAtomSceneKey(sceneKey, scrollState.step);
  const effectiveLang =
    lang ??
    (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en");
  const motionReduced = useReducedMotionPreference(reducedMotion);
  const effectiveTerm =
    activeTerm ?? (activeSceneKey === "A3_forcefield" ? mechanismTerm : null);
  const effectiveReadout =
    activeReadout ?? (activeSceneKey === "A6_observables" ? mechanismReadout : null);
  const separateMobileMechanism = isMobile;
  const mobileMechanismHeight =
    activeSceneKey === "A1_branch"
      ? "750px"
      : activeSceneKey === "A2_pbc"
        ? "800px"
        : activeSceneKey === "A3_forcefield"
          ? "720px"
          : activeSceneKey === "A4_integrate"
            ? "670px"
            : activeSceneKey === "A5_ensemble"
              ? "650px"
              : activeSceneKey === "A6_observables"
                ? "720px"
                : "620px";

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      zoomIn: () => {
        setCameraState((current) => ({
          ...current,
          zoomIndex: Math.max(MIN_ZOOM_INDEX, current.zoomIndex - 1),
        }));
      },
      zoomOut: () => {
        setCameraState((current) => ({
          ...current,
          zoomIndex: Math.min(MAX_ZOOM_INDEX, current.zoomIndex + 1),
        }));
      },
      fit: () => {
        setCameraState({
          zoomIndex: BASE_ZOOM_INDEX,
          viewRevision: Date.now(),
        });
      },
      reset: () => {
        setCameraState({
          zoomIndex: BASE_ZOOM_INDEX,
          viewRevision: Date.now(),
        });
      },
    };

    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#050510] ${
        separateMobileMechanism ? "flex flex-col" : ""
      }`}
      data-testid="multiscale-render-surface"
    >
      <div className={`relative min-h-0 w-full ${separateMobileMechanism ? "flex-1" : "h-full"}`}>
        <MolstarAllAtomStage
          progressRef={progressRef}
          scrollState={scrollState}
          isMobile={isMobile}
          autoRotateRef={autoRotateRef}
          cameraState={cameraState}
          cameraSnapshotRef={cameraSnapshotRef}
          displayAtomsRef={displayAtomsRef}
          activeTerm={effectiveTerm}
          activeReadout={effectiveReadout}
          reducedMotion={motionReduced}
          onMeasuredDistance={onMeasuredDistance}
        />
        <AllAtomOverlayStage
          scrollState={scrollState}
          isMobile={isMobile}
          cameraState={cameraState}
          activeTerm={effectiveTerm}
          displayAtomsRef={displayAtomsRef}
          reducedMotion={motionReduced}
        />
        {!separateMobileMechanism && !hideMechanism ? (
          <AllAtomMechanism
            key={activeSceneKey}
            sceneKey={activeSceneKey}
            lang={effectiveLang}
            reducedMotion={motionReduced}
            activeTerm={effectiveTerm}
            activeReadout={effectiveReadout}
            onTermChange={setMechanismTerm}
            onReadoutChange={setMechanismReadout}
          />
        ) : null}
      </div>
      {separateMobileMechanism ? (
        <div
          className="relative w-full flex-shrink-0 border-t border-white/12 bg-[#050510]"
          style={{ height: mobileMechanismHeight }}
        >
          <AllAtomMechanism
            key={activeSceneKey}
            sceneKey={activeSceneKey}
            lang={effectiveLang}
            reducedMotion={motionReduced}
            activeTerm={effectiveTerm}
            activeReadout={effectiveReadout}
            onTermChange={setMechanismTerm}
            onReadoutChange={setMechanismReadout}
            isMobile
          />
        </div>
      ) : null}
    </div>
  );
}
