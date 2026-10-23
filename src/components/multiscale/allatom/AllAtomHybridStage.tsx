"use client";

import { useState } from "react";
import type { MutableRefObject } from "react";
import { MolstarElectrolyteStage } from "../molstar/MolstarElectrolyteStage";
import type { ResearchCameraActions } from "../molstar/shared";
import { AllAtomMechanism } from "../overlays/AllAtomMechanism";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getAllAtomSceneKey } from "./allAtomConfig";
import type { ScrollState } from "../scrollState";
import type { AllAtomForceFieldTerm } from "./allAtomPagePolicy";
import { useMultiscaleCanvasColor } from "../useMultiscaleCanvasColor";

export function AllAtomHybridStage({
  scrollState,
  isMobile,
  actionsRef,
  activeTerm,
  lang,
  reducedMotion,
  hideMechanism = false,
  mobileSceneHeight,
  onTermChange,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  lang?: string;
  reducedMotion?: boolean;
  hideMechanism?: boolean;
  mobileSceneHeight?: number;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
}) {
  const canvasColor = useMultiscaleCanvasColor();
  const [mechanismTerm, setMechanismTerm] = useState<AllAtomForceFieldTerm>("Ubond");
  const activeSceneKey = getAllAtomSceneKey(scrollState.step);
  const effectiveLang =
    lang ??
    (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en");
  const motionReduced = useReducedMotion(reducedMotion);
  // Only the force-field step has a mechanism. The observables step's measurement is the rail's
  // coordination histogram, so it gets no band.
  const hasMechanism = activeSceneKey === "A3_forcefield";
  const effectiveTerm = activeTerm ?? (hasMechanism ? mechanismTerm : null);
  const separateMobileMechanism = isMobile;
  const mechanism = (
    <AllAtomMechanism
      lang={effectiveLang}
      activeTerm={effectiveTerm}
      onTermChange={(term) => {
        setMechanismTerm(term);
        onTermChange?.(term);
      }}
      isMobile={isMobile}
    />
  );

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
        {!separateMobileMechanism && !hideMechanism && hasMechanism ? mechanism : null}
      </div>
      {separateMobileMechanism && hasMechanism ? (
        <div className="relative w-full flex-shrink-0 border-t border-border bg-surface-sunken">
          {mechanism}
        </div>
      ) : null}
    </div>
  );
}
