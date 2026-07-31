"use client";

import type { MutableRefObject } from "react";
import type { ScrollState } from "./scrollState";
import { MesoStage } from "./MesoStage";
import { AllAtomHybridStage } from "./allatom/AllAtomHybridStage";
import { MlffSchematicStage } from "./mlff/MlffSchematicStage";
import { MolstarDftStage } from "./molstar/MolstarDftStage";
import type { ResearchCameraActions } from "./molstar/shared";
import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "./allatom/allAtomPagePolicy";

export type { ResearchCameraActions } from "./molstar/shared";

export function VisualStage({
  scrollState,
  isMobile,
  actionsRef,
  dftManualSnapshotIndex,
  allAtomActiveTerm,
  allAtomActiveReadout,
  lang = "en",
  sceneKey,
  reducedMotion = false,
  hideMechanism = false,
  mobileSceneHeight,
  onAllAtomTermChange,
  onAllAtomReadoutChange,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  /** Definite height for the scene on a phone; the mechanism band below it flows. */
  mobileSceneHeight?: number;
  onAllAtomTermChange?: (term: AllAtomForceFieldTerm) => void;
  onAllAtomReadoutChange?: (readout: AllAtomReadoutId) => void;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  dftManualSnapshotIndex?: number | null;
  allAtomActiveTerm?: AllAtomForceFieldTerm | null;
  allAtomActiveReadout?: AllAtomReadoutId | null;
  lang?: string;
  sceneKey?: string;
  reducedMotion?: boolean;
  hideMechanism?: boolean;
}) {
  const molstarProps = {
    scrollState,
    isMobile,
    actionsRef,
  };

  switch (scrollState.level) {
    case "meso":
      return (
        <MesoStage
          mobileSceneHeight={mobileSceneHeight}
          scrollState={scrollState}
          isMobile={isMobile}
          actionsRef={actionsRef}
          sceneKey={sceneKey}
          reducedMotion={reducedMotion}
          lang={lang}
          hideMechanism={hideMechanism}
        />
      );
    case "mlff":
      return (
        <MlffSchematicStage
          mobileSceneHeight={mobileSceneHeight}
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
          mobileSceneHeight={mobileSceneHeight}
          {...molstarProps}
          activeTerm={allAtomActiveTerm ?? null}
          activeReadout={allAtomActiveReadout ?? null}
          reducedMotion={reducedMotion}
          lang={lang}
          hideMechanism={hideMechanism}
          onTermChange={onAllAtomTermChange}
          onReadoutChange={onAllAtomReadoutChange}
        />
      );
    case "dft":
      return (
        <MolstarDftStage
          mobileSceneHeight={mobileSceneHeight}
          {...molstarProps}
          manualSnapshotIndex={dftManualSnapshotIndex}
          lang={lang}
          sceneKey={sceneKey}
          reducedMotion={reducedMotion}
          hideMechanism={hideMechanism}
        />
      );
    default:
      return <div className="h-full w-full bg-surface-sunken" />;
  }
}
