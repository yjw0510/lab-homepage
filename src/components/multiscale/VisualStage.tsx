"use client";

import type { MutableRefObject, RefObject } from "react";
import type { ScrollState } from "./scrollState";
import { ThreeMultiscaleStage } from "./ThreeMultiscaleStage";
import { AllAtomHybridStage } from "./allatom/AllAtomHybridStage";
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
    case "mlff":
      return <ThreeMultiscaleStage {...commonProps} rdfBinIndex={rdfBinIndex} />;
    case "allatom":
      return <AllAtomHybridStage {...commonProps} activeTerm={allAtomActiveTerm ?? null} activeReadout={allAtomActiveReadout ?? null} />;
    case "dft":
      return <MolstarDftStage {...commonProps} manualSnapshotIndex={dftManualSnapshotIndex} />;
    default:
      return <div className="h-full w-full bg-[#050510]" />;
  }
}
