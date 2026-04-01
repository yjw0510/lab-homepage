"use client";

import type { ScrollState } from "../scrollState";
import { useDNAAssets } from "./useDNAAssets";
import { Page1AllAtom } from "./pages/Page1AllAtom";
import { Page2Morph } from "./pages/Page2Morph";
import { Page3CGBath } from "./pages/Page3CGBath";
import { Page4Playback } from "./pages/Page4Playback";
import { Page5RDF } from "./pages/Page5RDF";
import { Page6Settle } from "./pages/Page6Settle";

export function DNAPageRouter({
  progressRef,
  scrollState,
  isMobile,
  transitionIn,
  transitionOut,
  autoRotateRef,
  rdfBinIndex,
}: {
  progressRef: React.RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  transitionIn: number;
  transitionOut: number;
  autoRotateRef: React.RefObject<boolean>;
  rdfBinIndex?: number;
}) {
  void progressRef;
  void isMobile;
  void transitionIn;
  void transitionOut;
  void autoRotateRef;

  const assets = useDNAAssets(scrollState.step);
  const progress = scrollState.stepProgress;

  switch (scrollState.step) {
    case 0:
      return <Page1AllAtom assets={assets} />;
    case 1:
      return <Page2Morph assets={assets} progress={progress} />;
    case 2:
      return <Page3CGBath assets={assets} progress={progress} />;
    case 3:
      return <Page4Playback assets={assets} progress={progress} />;
    case 4:
      return <Page5RDF assets={assets} progress={progress} rdfBinIndex={rdfBinIndex} />;
    case 5:
      return <Page6Settle assets={assets} progress={progress} />;
    default:
      return null;
  }
}
