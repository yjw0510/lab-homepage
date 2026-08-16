"use client";

import { useState } from "react";
import type { MutableRefObject } from "react";
import { MolstarElectrolyteStage } from "../molstar/MolstarElectrolyteStage";
import type { ResearchCameraActions } from "../molstar/shared";
import { AllAtomMechanism } from "../overlays/AllAtomMechanism";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getAllAtomSceneKey } from "./allAtomConfig";
import type { ScrollState } from "../scrollState";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allAtomPagePolicy";
import { useMultiscaleCanvasColor } from "../useMultiscaleCanvasColor";

export function AllAtomHybridStage({
  scrollState,
  isMobile,
  actionsRef,
  activeTerm,
  activeReadout,
  lang,
  reducedMotion,
  hideMechanism = false,
  mobileSceneHeight,
  onTermChange,
  onReadoutChange,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  activeReadout: AllAtomReadoutId | null;
  lang?: string;
  reducedMotion?: boolean;
  hideMechanism?: boolean;
  mobileSceneHeight?: number;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
  onReadoutChange?: (readout: AllAtomReadoutId) => void;
}) {
  const canvasColor = useMultiscaleCanvasColor();
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

  return (
    <div
      className={`relative w-full bg-surface-sunken ${
        separateMobileMechanism ? "flex flex-col" : "h-full overflow-hidden"
      }`}
      data-testid="multiscale-render-surface"
    >
      <div
        className={`relative min-h-0 w-full ${separateMobileMechanism ? "" : "h-full"}`}
        style={separateMobileMechanism ? { height: mobileSceneHeight } : undefined}
      >
        <MolstarElectrolyteStage
          step={scrollState.step}
          reducedMotion={motionReduced}
          canvasColor={canvasColor}
          actionsRef={actionsRef}
          lang={effectiveLang}
        />
        {!separateMobileMechanism && !hideMechanism ? (
          <AllAtomMechanism
            key={activeSceneKey}
            sceneKey={activeSceneKey}
            lang={effectiveLang}
            reducedMotion={motionReduced}
            activeTerm={effectiveTerm}
            activeReadout={effectiveReadout}
            onTermChange={(term) => {
              setMechanismTerm(term);
              onTermChange?.(term);
            }}
            onReadoutChange={(readout) => {
              setMechanismReadout(readout);
              onReadoutChange?.(readout);
            }}
          />
        ) : null}
      </div>
      {separateMobileMechanism ? (
        <div className="relative w-full flex-shrink-0 border-t border-border bg-surface-sunken">
          <AllAtomMechanism
            key={activeSceneKey}
            sceneKey={activeSceneKey}
            lang={effectiveLang}
            reducedMotion={motionReduced}
            activeTerm={effectiveTerm}
            activeReadout={effectiveReadout}
            onTermChange={(term) => {
              setMechanismTerm(term);
              onTermChange?.(term);
            }}
            onReadoutChange={(readout) => {
              setMechanismReadout(readout);
              onReadoutChange?.(readout);
            }}
            isMobile
          />
        </div>
      ) : null}
    </div>
  );
}
