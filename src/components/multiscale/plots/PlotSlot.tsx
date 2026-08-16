"use client";

import type { AllAtomForceFieldTerm } from "../allatom/allAtomPagePolicy";
import type { PlotType } from "../levelData";
import { SCFPlot } from "./SCFPlot";
import { AllAtomForceFieldPlot } from "./AllAtomForceFieldPlot";
import { AllAtomCoordinationPlot } from "./AllAtomCoordinationPlot";

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
}) {
  if (plotType === "scf") {
    return <SCFPlot progress={progress} accentColor={accentColor} activeIndexOverride={activeIndexOverride} lang={lang} />;
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

  return <AllAtomCoordinationPlot accentColor={accentColor} lang={lang} />;
}
