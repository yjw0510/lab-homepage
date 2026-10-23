"use client";

import { useEffect } from "react";
import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { useDNAAssets, type DNAAssetMode } from "./useDNAAssets";
import { Page2Morph } from "./pages/Page2Morph";
import { Page6Settle, type CollectiveBounds } from "./pages/Page6Settle";

const MESO_SCENE_ASSETS: Record<string, DNAAssetMode> = {
  M5_collective: "collective",
  M2_mapping: "mapping",
};

export function DNAPageRouter({
  scrollState,
  reducedMotion = false,
  onCollectiveBounds,
  onTrajectoryPending,
}: {
  scrollState: ScrollState;
  reducedMotion?: boolean;
  /** The collective page's painted bounds, for the camera that frames it. */
  onCollectiveBounds?: (bounds: CollectiveBounds) => void;
  /** True while the collective page is still waiting for its trajectory. */
  onTrajectoryPending?: (pending: boolean) => void;
}) {
  const sceneKey = CHOREOGRAPHY.meso.steps[scrollState.step]?.sceneKey ?? "";
  const mode = MESO_SCENE_ASSETS[sceneKey] ?? null;
  const assets = useDNAAssets(mode);
  const pending = mode === "collective" && !assets.cgTrajectory && !assets.cgTrajectoryFailed;

  useEffect(() => {
    onTrajectoryPending?.(pending);
  }, [pending, onTrajectoryPending]);

  if (mode === "mapping") return <Page2Morph assets={assets} reducedMotion={reducedMotion} />;
  if (mode === "collective") {
    return <Page6Settle assets={assets} reducedMotion={reducedMotion} onBounds={onCollectiveBounds} />;
  }
  return null;
}
