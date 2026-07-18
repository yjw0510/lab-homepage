"use client";

import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { useDNAAssets, type DNAAssetMode } from "./useDNAAssets";
import { Page2Morph } from "./pages/Page2Morph";
import { Page6Settle } from "./pages/Page6Settle";

const MESO_SCENE_ASSETS: Record<string, DNAAssetMode> = {
  M5_collective: "collective",
  M2_mapping: "mapping",
};

export function DNAPageRouter({
  scrollState,
  reducedMotion = false,
}: {
  scrollState: ScrollState;
  reducedMotion?: boolean;
}) {
  const sceneKey = CHOREOGRAPHY.meso.steps[scrollState.step]?.sceneKey ?? "";
  const mode = MESO_SCENE_ASSETS[sceneKey] ?? null;
  const assets = useDNAAssets(mode);

  if (mode === "mapping") return <Page2Morph assets={assets} reducedMotion={reducedMotion} />;
  if (mode === "collective") return <Page6Settle assets={assets} reducedMotion={reducedMotion} />;
  return null;
}
