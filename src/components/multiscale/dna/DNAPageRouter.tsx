"use client";

import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { useDNAAssets } from "./useDNAAssets";
import { Page1AllAtom } from "./pages/Page1AllAtom";
import { Page2Morph } from "./pages/Page2Morph";
import { Page3CGBath } from "./pages/Page3CGBath";
import { Page5RDF } from "./pages/Page5RDF";
import { Page6Settle } from "./pages/Page6Settle";

// The reduced meso spine is two flagship scenes, but the DNA pages and the
// asset loader are keyed by the original page index. Map each live scene to the
// page index that renders (and loads) its intended asset: the 8,000-bead melt
// and the PBC RDF, not the all-atom DNA / morph placeholders.
const MESO_SCENE_TO_PAGE: Record<string, number> = {
  M5_collective: 4, // Page6Settle — 8,000-bead collective melt trajectory
  M6_characterize: 5, // Page5RDF — PBC radial distribution function
};

export function DNAPageRouter({
  progressRef,
  scrollState,
  isMobile,
  transitionIn,
  transitionOut,
  autoRotateRef,
  rdfBinIndex,
  reducedMotion = false,
}: {
  progressRef: React.RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  transitionIn: number;
  transitionOut: number;
  autoRotateRef: React.RefObject<boolean>;
  rdfBinIndex?: number;
  reducedMotion?: boolean;
}) {
  void progressRef;
  void isMobile;
  void transitionIn;
  void transitionOut;
  void autoRotateRef;

  const sceneKey = CHOREOGRAPHY.meso.steps[scrollState.step]?.sceneKey ?? "";
  const page = MESO_SCENE_TO_PAGE[sceneKey] ?? scrollState.step;
  const assets = useDNAAssets(page);
  const progress = scrollState.stepProgress;

  switch (page) {
    case 0:
      return <Page1AllAtom assets={assets} />;
    case 1:
      return <Page2Morph assets={assets} progress={progress} reducedMotion={reducedMotion} />;
    case 2:
      return <Page3CGBath assets={assets} progress={progress} />;
    case 3:
      // The stochastic force balance is taught by the HTML/SVG mechanism
      // overlay. Keep the molecule itself static rather than using the old
      // deterministic sine-wave "temperature" motion.
      return <Page3CGBath assets={assets} progress={progress} />;
    case 4:
      return <Page6Settle assets={assets} progress={progress} reducedMotion={reducedMotion} />;
    case 5:
      return <Page5RDF assets={assets} progress={progress} rdfBinIndex={rdfBinIndex} />;
    default:
      return null;
  }
}
