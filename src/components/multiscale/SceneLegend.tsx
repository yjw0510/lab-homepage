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
}: {
  scrollState: ScrollState;
  lang: string;
  className?: string;
}) {
  const ko = lang === "ko";
  const box = `flex flex-col gap-1 border border-border-strong bg-surface-raised px-3 py-2
               text-xs text-foreground ${className}`;

  if (scrollState.level === "allatom" && scrollState.step === 1) {
    // The cell page colours 68 ions by how many carbonyl oxygens each is holding, and the panel
    // that says so is off to the side. Same bands, same source, next to the thing they describe.
    return (
      <div className={box} data-testid="coordination-legend">
        <span className="type-mono-meta text-muted-foreground">
          {ko ? "리튬 배위수" : "Li⁺ coordination"}
        </span>
        {BANDS.map((band) => (
          <span key={band.label} className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: band.color }} />
            {band.name}
          </span>
        ))}
      </div>
    );
  }

  if (scrollState.level === "dft" && scrollState.step === 0) {
    // The SCF surface is the total density; the colour on it is this iteration against the
    // converged one. Continuous, so a strip rather than swatches.
    return (
      <div className={box} data-testid="density-legend">
        <span className="type-mono-meta text-muted-foreground">
          {ko ? "수렴 대비 밀도" : "vs converged"}
        </span>
        <span
          className="h-2 w-full"
          style={{ background: `linear-gradient(to right, ${DENSITY_RAMP.join(", ")})` }}
        />
        <span className="type-mono-meta flex justify-between text-muted-foreground">
          <span>{ko ? "낮음" : "lower"}</span>
          <span>{ko ? "높음" : "higher"}</span>
        </span>
      </div>
    );
  }

  return null;
}
