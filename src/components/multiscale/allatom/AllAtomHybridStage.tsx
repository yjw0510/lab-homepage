"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { MolstarAllAtomStage } from "../molstar/MolstarAllAtomStage";
import type { CameraSnapshotLike, ResearchCameraActions } from "../molstar/shared";
import { AllAtomOverlayStage } from "./AllAtomOverlayStage";
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
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  activeReadout: AllAtomReadoutId | null;
}) {
  const [cameraState, setCameraState] = useState<AllAtomCameraState>({
    zoomIndex: BASE_ZOOM_INDEX,
    viewRevision: 0,
  });
  const cameraSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const displayAtomsRef = useRef<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);

  useEffect(() => {
    setCameraState({
      zoomIndex: BASE_ZOOM_INDEX,
      viewRevision: 0,
    });
  }, [scrollState.level]);

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
    <div className="relative h-full w-full">
      <MolstarAllAtomStage
        progressRef={progressRef}
        scrollState={scrollState}
        isMobile={isMobile}
        autoRotateRef={autoRotateRef}
        cameraState={cameraState}
        cameraSnapshotRef={cameraSnapshotRef}
        displayAtomsRef={displayAtomsRef}
        activeTerm={activeTerm}
        activeReadout={activeReadout}
      />
      <AllAtomOverlayStage
        scrollState={scrollState}
        isMobile={isMobile}
        cameraState={cameraState}
        cameraSnapshotRef={cameraSnapshotRef}
        activeTerm={activeTerm}
        displayAtomsRef={displayAtomsRef}
      />
    </div>
  );
}
