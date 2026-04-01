"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { BeadLayer } from "../layers/BeadLayer";
import { PairEdgeLayer } from "../layers/PairEdgeLayer";
import { decodeFloat32 } from "../binaryLoader";
import type { DNAAssets } from "../useDNAAssets";

/**
 * Page 2 / Step 1: Pair Potential.
 *
 * Single 36-bead CG polymer with all N(N-1)/2 pairwise edges.
 * Light-emitting wavepackets travel along each edge.
 */
export function Page2Morph({ assets: _a, progress: _p }: { assets: DNAAssets; progress: number }) {
  const [bpBeads, setBpBeads] = useState<Float32Array | null>(null);

  useEffect(() => {
    fetch(withBasePath("/data/dna/cg/bp_beads.bin"))
      .then((r) => r.arrayBuffer())
      .then((buf) => setBpBeads(decodeFloat32(buf)))
      .catch(() => {});
  }, []);

  if (!bpBeads) return null;

  return (
    <group>
      <BeadLayer positions={bpBeads} radius={0.12} opacity={0.95} />
      <PairEdgeLayer positions={bpBeads} />
    </group>
  );
}
