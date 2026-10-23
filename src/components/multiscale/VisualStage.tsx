"use client";

import type { MutableRefObject } from "react";
import type { ScrollState } from "./scrollState";
import { MesoStage } from "./MesoStage";
import { AllAtomHybridStage } from "./allatom/AllAtomHybridStage";
import { MlffSchematicStage } from "./mlff/MlffSchematicStage";
import { MolstarDftStage } from "./molstar/MolstarDftStage";
import type { ResearchCameraActions } from "./molstar/shared";
import type { AllAtomForceFieldTerm } from "./allatom/allAtomPagePolicy";
import type { DftOutputMode } from "./overlays/DftMechanism";

export type { ResearchCameraActions } from "./molstar/shared";

export function VisualStage({
  scrollState,
  isMobile,
  actionsRef,
  dftManualSnapshotIndex,
  onDftStatusChange,
  dftScfPlaying,
  onDftScfIndexChange,
  dftOutputModeOverride,
  allAtomActiveTerm,
  lang = "en",
  sceneKey,
  reducedMotion = false,
  hideMechanism = false,
  mobileSceneHeight,
  onAllAtomTermChange,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  /** Definite height for the scene on a phone; the mechanism band below it flows. */
  mobileSceneHeight?: number;
  onAllAtomTermChange?: (term: AllAtomForceFieldTerm) => void;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  dftManualSnapshotIndex?: number | null;
  onDftStatusChange?: (status: string) => void;
  dftScfPlaying?: boolean;
  onDftScfIndexChange?: (index: number) => void;
  /** The surface the reader picked on the DFT outputs page; null leaves the stage cycling. */
  dftOutputModeOverride?: DftOutputMode | null;
  allAtomActiveTerm?: AllAtomForceFieldTerm | null;
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
          reducedMotion={reducedMotion}
          lang={lang}
          hideMechanism={hideMechanism}
          onTermChange={onAllAtomTermChange}
        />
      );
    case "dft":
      return (
        <MolstarDftStage
          mobileSceneHeight={mobileSceneHeight}
          {...molstarProps}
          manualSnapshotIndex={dftManualSnapshotIndex}
          onStatusChange={onDftStatusChange}
          scfPlaying={dftScfPlaying}
          onScfIndexChange={onDftScfIndexChange}
          outputModeOverride={dftOutputModeOverride ?? null}
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
