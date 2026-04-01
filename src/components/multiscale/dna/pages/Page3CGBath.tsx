"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { BeadLayer } from "../layers/BeadLayer";
import { GlowBondLayer } from "../layers/GlowBondLayer";
import { decodeFloat32 } from "../binaryLoader";
import type { DNAAssets } from "../useDNAAssets";

/**
 * Page 3 / Step 2: Bond Potential.
 *
 * Single 36-bead CG polymer with N-1 backbone bonds.
 * A glow wave sweeps along the chain.
 */
export function Page3CGBath({ assets: _a, progress: _p }: { assets: DNAAssets; progress: number }) {
  const [bpBeads, setBpBeads] = useState<Float32Array | null>(null);

  useEffect(() => {
    fetch(withBasePath("/data/dna/cg/bp_beads.bin"))
      .then((r) => r.arrayBuffer())
      .then((buf) => setBpBeads(decodeFloat32(buf)))
      .catch(() => {});
  }, []);

  const cgBonds = useMemo<[number, number][]>(() => {
    if (!bpBeads) return [];
    const n = bpBeads.length / 3;
    const bonds: [number, number][] = [];
    for (let k = 0; k < n - 1; k++) bonds.push([k, k + 1]);
    return bonds;
  }, [bpBeads]);

  if (!bpBeads) return null;

  return (
    <group>
      <BeadLayer positions={bpBeads} radius={0.12} opacity={0.95} />
      <GlowBondLayer positions={bpBeads} bonds={cgBonds} />
    </group>
  );
}
