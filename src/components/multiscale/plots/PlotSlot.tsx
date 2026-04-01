"use client";

import type { AllAtomForceFieldTerm, AllAtomReadoutId } from "../allatom/allAtomPagePolicy";
import { BeadRDFPlot } from "./DensityProfilePlot";
import { HarmonicPlot } from "./HarmonicPlot";
import { AnglePlot } from "./AnglePlot";
import { LJCurvePlot } from "./LJCurvePlot";
import { RDFPlot } from "./RDFPlot";
import { ParityPlot } from "./ParityPlot";
import { SCFPlot } from "./SCFPlot";
import { MOLevelPlot } from "./BandStructurePlot";
import { OrbitalGapPlot } from "./DOSPlot";
import { DensityTracePlot } from "./DensityTracePlot";
import { CoordinationTracePlot } from "./CoordinationTracePlot";
import { HydrationTracePlot } from "./HydrationTracePlot";
import { AllAtomForceFieldPlot } from "./AllAtomForceFieldPlot";
import { AllAtomResolutionPlot } from "./AllAtomResolutionPlot";
import { AllAtomNonUniformityPlot } from "./AllAtomNonUniformityPlot";
import { AllAtomEnsemblePlot } from "./AllAtomEnsemblePlot";
import { AllAtomReadoutPlot } from "./AllAtomReadoutPlot";
import { MinimizationSummaryPlot } from "./MinimizationSummaryPlot";
import { NvtStabilityPlot } from "./NvtStabilityPlot";

type PlotComponentProps = {
  progress: number;
  accentColor: string;
  rdfActiveRadius?: number;
  activeTerm?: AllAtomForceFieldTerm | null;
  onTermHover?: (term: AllAtomForceFieldTerm) => void;
  onTermLeave?: () => void;
  onTermToggle?: (term: AllAtomForceFieldTerm) => void;
  activeReadout?: AllAtomReadoutId | null;
  onReadoutHover?: (readout: AllAtomReadoutId) => void;
  onReadoutLeave?: () => void;
  onReadoutToggle?: (readout: AllAtomReadoutId) => void;
};

const PLOT_MAP: Record<string, React.ComponentType<PlotComponentProps>> = {
  beadRDF: BeadRDFPlot,
  harmonic: HarmonicPlot,
  angle: AnglePlot,
  ljCurve: LJCurvePlot,
  rdf: RDFPlot,
  parity: ParityPlot,
  moLevels: MOLevelPlot,
  orbitalGap: OrbitalGapPlot,
  densityTrace: DensityTracePlot,
  coordinationTrace: CoordinationTracePlot,
  hydrationTrace: HydrationTracePlot,
  allatomResolution: AllAtomResolutionPlot,
  allatomForceField: AllAtomForceFieldPlot,
  allatomNonUniformity: AllAtomNonUniformityPlot,
  allatomEnsemble: AllAtomEnsemblePlot,
  allatomReadout: AllAtomReadoutPlot,
  minSummary: MinimizationSummaryPlot,
  nvtStability: NvtStabilityPlot,
};

export function PlotSlot({
  plotType,
  progress,
  accentColor,
  activeIndexOverride,
  rdfActiveRadius,
  activeTerm,
  onTermHover,
  onTermLeave,
  onTermToggle,
  activeReadout,
  onReadoutHover,
  onReadoutLeave,
  onReadoutToggle,
}: {
  plotType: string;
  progress: number;
  accentColor: string;
  activeIndexOverride?: number;
  rdfActiveRadius?: number;
  activeTerm?: AllAtomForceFieldTerm | null;
  onTermHover?: (term: AllAtomForceFieldTerm) => void;
  onTermLeave?: () => void;
  onTermToggle?: (term: AllAtomForceFieldTerm) => void;
  activeReadout?: AllAtomReadoutId | null;
  onReadoutHover?: (readout: AllAtomReadoutId) => void;
  onReadoutLeave?: () => void;
  onReadoutToggle?: (readout: AllAtomReadoutId) => void;
}) {
  if (plotType === "scf") {
    return <SCFPlot progress={progress} accentColor={accentColor} activeIndexOverride={activeIndexOverride} />;
  }

  const Component = PLOT_MAP[plotType];
  if (!Component) {
    return (
      <div className="w-full aspect-[4/3] rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        <span className="text-xs text-gray-500">{plotType}</span>
      </div>
    );
  }
  return (
    <Component
      progress={progress}
      accentColor={accentColor}
      rdfActiveRadius={rdfActiveRadius}
      activeTerm={activeTerm}
      onTermHover={onTermHover}
      onTermLeave={onTermLeave}
      onTermToggle={onTermToggle}
      activeReadout={activeReadout}
      onReadoutHover={onReadoutHover}
      onReadoutLeave={onReadoutLeave}
      onReadoutToggle={onReadoutToggle}
    />
  );
}
