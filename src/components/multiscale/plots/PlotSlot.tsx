"use client";

import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "../allatom/allAtomPagePolicy";
import type { PlotType } from "../levelData";
import { SCFPlot } from "./SCFPlot";
import { AllAtomForceFieldPlot } from "./AllAtomForceFieldPlot";
import { AllAtomReadoutPlot } from "./AllAtomReadoutPlot";

export function PlotSlot({
  plotType,
  progress,
  accentColor,
  lang,
  activeIndexOverride,
  activeTerm,
  selectedTerm,
  onTermHover,
  onTermLeave,
  onTermToggle,
  activeReadout,
  selectedReadout,
  onReadoutHover,
  onReadoutLeave,
  onReadoutToggle,
}: {
  plotType: PlotType;
  progress: number;
  accentColor: string;
  lang?: string;
  activeIndexOverride?: number;
  activeTerm?: AllAtomForceFieldTerm | null;
  selectedTerm?: AllAtomForceFieldTerm | null;
  onTermHover?: (term: AllAtomForceFieldTerm) => void;
  onTermLeave?: () => void;
  onTermToggle?: (term: AllAtomForceFieldTerm) => void;
  activeReadout?: AllAtomReadoutId | null;
  selectedReadout?: AllAtomReadoutId | null;
  onReadoutHover?: (readout: AllAtomReadoutId) => void;
  onReadoutLeave?: () => void;
  onReadoutToggle?: (readout: AllAtomReadoutId) => void;
}) {
  if (plotType === "scf") {
    return <SCFPlot progress={progress} accentColor={accentColor} activeIndexOverride={activeIndexOverride} />;
  }

  if (plotType === "allatomForceField") {
    return (
      <AllAtomForceFieldPlot
        accentColor={accentColor}
        lang={lang}
        activeTerm={activeTerm}
        selectedTerm={selectedTerm}
        onTermHover={onTermHover}
        onTermLeave={onTermLeave}
        onTermToggle={onTermToggle}
      />
    );
  }

  return (
    <AllAtomReadoutPlot
      progress={progress}
      accentColor={accentColor}
      lang={lang}
      activeReadout={activeReadout}
      selectedReadout={selectedReadout}
      onReadoutHover={onReadoutHover}
      onReadoutLeave={onReadoutLeave}
      onReadoutToggle={onReadoutToggle}
    />
  );
}
