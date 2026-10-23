"use client";

import { BANDS } from "./plots/AllAtomCoordinationPlot";
import { DENSITY_RAMP } from "./molstar/shared";
import type { ScrollState } from "./scrollState";

/**
 * The key to whatever the scene is colour-coding.
 *
 * Shared by both compositions on purpose. It used to be declared inside the desktop camera
 * cluster, which sits after the mobile early return, so a phone showed 68 ions coloured by
 * coordination number and a density surface coloured by departure from convergence with nothing
 * anywhere on the page saying what either colour meant.
 */
export function SceneLegend({
  scrollState,
  lang,
  className = "",
  dftOutputMode,
}: {
  scrollState: ScrollState;
  lang: string;
  className?: string;
  /** Which surface the DFT outputs page is drawing; the orbitals need a sign key, the density none. */
  dftOutputMode?: "density" | "homo" | "lumo";
}) {
  const ko = lang === "ko";
  const box = `flex flex-col gap-1 border border-border-strong bg-surface-raised px-3 py-2
               text-xs text-foreground ${className}`;

  const swatchRow = (color: string, label: string) => (
    <span key={label} className="flex items-center gap-2 whitespace-nowrap">
      <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );

  if (scrollState.level === "allatom" && scrollState.step === 0) {
    // One lithium and the oxygens holding it, drawn as PURPLE and CYAN in MolstarElectrolyteStage.
    // Without a key nothing said which sphere was the ion.
    return (
      <div className={box} data-testid="highlight-legend">
        <span className="type-mono-meta text-muted-foreground">
          {ko ? "강조한 원자" : "Highlighted atoms"}
        </span>
        {swatchRow("#8b5cf6", ko ? "리튬 이온(Li⁺)" : "Li⁺ ion")}
        {swatchRow("#06b6d4", ko ? "Li⁺ 옆 산소" : "O next to Li⁺")}
      </div>
    );
  }

  if (scrollState.level === "allatom" && scrollState.step === 1) {
    // The cell page colours 68 ions by how many carbonyl oxygens each is holding, and the panel
    // that says so is off to the side. Same bands, same source, next to the thing they describe.
    return (
      <div className={box} data-testid="coordination-legend">
        {/* The coloured spheres are the ions; the count is what colours them. Titled by the
            count alone, the swatches read as if they were oxygen atoms. */}
        <span className="type-mono-meta text-muted-foreground">
          {ko ? "주변 산소 수로 칠한 Li⁺" : "Li⁺ colored by O neighbors"}
        </span>
        {BANDS.map((band) => swatchRow(band.color, band.name))}
      </div>
    );
  }

  if (scrollState.level === "dft" && scrollState.step === 0) {
    // The SCF surface is the total density; the colour on it is this iteration against the
    // converged one. Continuous, so a strip rather than swatches. Signed: valueColor puts zero
    // difference at the ramp's middle, so a converged surface is uniformly the centre colour and
    // the ends mean less and more density than the final, not a small and a large difference.
    return (
      <div className={box} data-testid="density-legend">
        <span className="type-mono-meta text-muted-foreground">
          {ko ? "최종 전자 밀도와 비교" : "Compared with the final density"}
        </span>
        <span
          className="h-2 w-full"
          style={{ background: `linear-gradient(to right, ${DENSITY_RAMP.join(", ")})` }}
        />
        <span className="type-mono-meta grid grid-cols-3 text-muted-foreground">
          <span>{ko ? "적음" : "less"}</span>
          <span className="text-center">{ko ? "같음" : "same"}</span>
          <span className="text-right">{ko ? "많음" : "more"}</span>
        </span>
      </div>
    );
  }

  if (scrollState.level === "dft" && scrollState.step === 1 && (dftOutputMode === "homo" || dftOutputMode === "lumo")) {
    // The lobes are the orbital's two signs, RED and BLUE in molstar/shared.ts. On a page about
    // where charge sits, red and blue unlabelled read as positive and negative charge.
    return (
      <div className={box} data-testid="orbital-sign-legend">
        <span className="type-mono-meta text-muted-foreground">
          {ko ? "오비탈 부호" : "Orbital sign"}
        </span>
        {swatchRow("#fb7185", "+")}
        {swatchRow("#2f74ff", "−")}
      </div>
    );
  }

  return null;
}
