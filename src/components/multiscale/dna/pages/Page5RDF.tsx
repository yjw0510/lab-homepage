"use client";

import { useMemo } from "react";
import { RDFNeighborhoodLayer } from "../layers/RDFNeighborhoodLayer";
import { RDFProbeLayer } from "../layers/RDFProbeLayer";
import type { DNAAssets } from "../useDNAAssets";

function parseRdfBins(rdfData: Float32Array | null) {
  if (!rdfData || rdfData.length < 2) return [];
  const bins: Array<{ r: number; g: number }> = [];
  for (let i = 0; i < rdfData.length; i += 2) {
    bins.push({ r: rdfData[i], g: rdfData[i + 1] });
  }
  return bins;
}

/**
 * Page 5 / Step 4: Pair correlation g(r).
 *
 * Bin-driven: rdfBinIndex selects the current RDF bin.
 * Beads are classified into inside / shell / outside relative to the
 * reference bead at the selected radius.
 */
export function Page5RDF({
  assets,
  rdfBinIndex = 0,
}: {
  assets: DNAAssets;
  progress: number;
  rdfBinIndex?: number;
}) {
  const { cgPositions, cgTopology, rdfData, rdfMeta } = assets;

  const bins = useMemo(() => parseRdfBins(rdfData), [rdfData]);
  const clampedIndex = Math.max(0, Math.min(rdfBinIndex, bins.length - 1));
  const bin = bins[clampedIndex];

  const refIdx = rdfMeta?.referenceIndex ?? 0;

  const refCenter = useMemo<[number, number, number]>(() => {
    if (!cgPositions || refIdx * 3 + 2 >= cgPositions.length) return [0, 0, 0];
    return [cgPositions[3 * refIdx], cgPositions[3 * refIdx + 1], cgPositions[3 * refIdx + 2]];
  }, [cgPositions, refIdx]);

  // Derive shell width (Δr) from bin spacing
  const dr = useMemo(() => {
    if (bins.length <= 1) {
      return rdfMeta?.maxRadius ? rdfMeta.maxRadius / Math.max(rdfMeta.nBins, 1) : 0.2;
    }
    return bins[1].r - bins[0].r;
  }, [bins, rdfMeta]);

  if (!cgPositions || !cgTopology || !bin) return null;

  return (
    <group>
      <RDFNeighborhoodLayer
        positions={cgPositions}
        duplexIds={cgTopology.duplexIds}
        referenceIndex={refIdx}
        center={refCenter}
        radius={bin.r}
        shellWidth={dr}
      />
      <RDFProbeLayer
        center={refCenter}
        radius={bin.r}
        shellWidth={dr}
      />
    </group>
  );
}
