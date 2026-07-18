"use client";

import type { MutableRefObject, RefObject } from "react";
import type { ScrollState } from "./scrollState";
import { ThreeMultiscaleStage } from "./ThreeMultiscaleStage";
import { AllAtomHybridStage } from "./allatom/AllAtomHybridStage";
import { MlffSchematicStage } from "./mlff/MlffSchematicStage";
import { MolstarDftStage } from "./molstar/MolstarDftStage";
import type { ResearchCameraActions } from "./molstar/shared";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allatom/allAtomPagePolicy";

export type { ResearchCameraActions } from "./molstar/shared";

export function VisualStage({
  progressRef,
  scrollState,
  isMobile,
  autoRotateRef,
  actionsRef,
  dftManualSnapshotIndex,
  rdfBinIndex,
  allAtomActiveTerm,
  allAtomActiveReadout,
  lang = "en",
  sceneKey,
  reducedMotion = false,
  hideMechanism = false,
  onMeasuredDistance,
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  dftManualSnapshotIndex?: number | null;
  rdfBinIndex?: number;
  allAtomActiveTerm?: AllAtomForceFieldTerm | null;
  allAtomActiveReadout?: AllAtomReadoutId | null;
  lang?: string;
  sceneKey?: string;
  reducedMotion?: boolean;
  // When true, the on-canvas HTML mechanism panel is not rendered; its content
  // lives in the right rail instead so the 3D stage is never occluded.
  hideMechanism?: boolean;
  onMeasuredDistance?: (nm: number | null) => void;
}) {
  const commonProps = {
    progressRef,
    scrollState,
    isMobile,
    autoRotateRef,
    actionsRef,
  };

  switch (scrollState.level) {
    case "meso":
      return (
        <ThreeMultiscaleStage
          {...commonProps}
          rdfBinIndex={rdfBinIndex}
          sceneKey={sceneKey}
          reducedMotion={reducedMotion}
          lang={lang}
          hideMechanism={hideMechanism}
        />
      );
    case "mlff":
      return (
        <MlffSchematicStage
          sceneKey={sceneKey}
          lang={lang}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
          actionsRef={actionsRef}
        />
      );
    case "allatom":
      return (
        <AllAtomHybridStage
          {...commonProps}
          activeTerm={allAtomActiveTerm ?? null}
          activeReadout={allAtomActiveReadout ?? null}
          sceneKey={sceneKey}
          reducedMotion={reducedMotion}
          lang={lang}
          hideMechanism={hideMechanism}
          onMeasuredDistance={onMeasuredDistance}
        />
      );
    case "dft":
      return (
        <MolstarDftStage
          {...commonProps}
          manualSnapshotIndex={dftManualSnapshotIndex}
          lang={lang}
          sceneKey={sceneKey}
          reducedMotion={reducedMotion}
          hideMechanism={hideMechanism}
        />
      );
    default:
      return <div className="h-full w-full bg-[#050510]" />;
  }
}
