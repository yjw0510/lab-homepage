"use client";

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { MolstarAllAtomStage } from "../molstar/MolstarAllAtomStage";
import type { ResearchCameraActions } from "../molstar/shared";
import { AllAtomMechanism } from "../overlays/AllAtomMechanism";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getAllAtomSceneKey, type AllAtomCameraState } from "./allAtomConfig";
import type { ScrollState } from "../scrollState";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allAtomPagePolicy";
import { useMultiscaleCanvasColor } from "../useMultiscaleCanvasColor";

const BASE_ZOOM_INDEX = 2;
const MIN_ZOOM_INDEX = 0;
const MAX_ZOOM_INDEX = 4;

export function AllAtomHybridStage({
  scrollState,
  isMobile,
  actionsRef,
  activeTerm,
  activeReadout,
  lang,
  reducedMotion,
  hideMechanism = false,
  onMeasuredDistance,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  activeReadout: AllAtomReadoutId | null;
  lang?: string;
  reducedMotion?: boolean;
  hideMechanism?: boolean;
  onMeasuredDistance?: (nm: number | null) => void;
}) {
  const canvasColor = useMultiscaleCanvasColor();
  const [cameraState, setCameraState] = useState<AllAtomCameraState>({
    zoomIndex: BASE_ZOOM_INDEX,
    viewRevision: 0,
  });
  const [mechanismTerm, setMechanismTerm] = useState<AllAtomForceFieldTerm>("Ubond");
  const [mechanismReadout, setMechanismReadout] = useState<AllAtomReadoutId>("orientation");
  const activeSceneKey = getAllAtomSceneKey(scrollState.step);
  const effectiveLang =
    lang ??
    (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en");
  const motionReduced = useReducedMotion(reducedMotion);
  const effectiveTerm =
    activeTerm ?? (activeSceneKey === "A3_forcefield" ? mechanismTerm : null);
  const effectiveReadout =
    activeReadout ?? (activeSceneKey === "A6_observables" ? mechanismReadout : null);
  const separateMobileMechanism = isMobile;
  const mobileMechanismHeight = "720px";

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
      className={`relative h-full w-full overflow-hidden bg-surface-sunken ${
        separateMobileMechanism ? "flex flex-col" : ""
      }`}
      data-testid="multiscale-render-surface"
    >
      <div className={`relative min-h-0 w-full ${separateMobileMechanism ? "flex-1" : "h-full"}`}>
        <MolstarAllAtomStage
          scrollState={scrollState}
          isMobile={isMobile}
          cameraState={cameraState}
          activeTerm={effectiveTerm}
          activeReadout={effectiveReadout}
          reducedMotion={motionReduced}
          onMeasuredDistance={onMeasuredDistance}
          canvasColor={canvasColor}
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
          className="relative w-full flex-shrink-0 border-t border-border bg-surface-sunken"
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
