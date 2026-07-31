"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { AtomLayer } from "../layers/AtomLayer";
import { BondLayer } from "../layers/BondLayer";
import { BeadLayer } from "../layers/BeadLayer";
import { decodeFloat32 } from "../binaryLoader";
import type { DNAAssets } from "../useDNAAssets";

function centerOf(positions: Float32Array | null): [number, number, number] {
  if (!positions || positions.length < 3) return [0, 0, 0];
  const n = positions.length / 3;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < n; i++) {
    x += positions[i * 3];
    y += positions[i * 3 + 1];
    z += positions[i * 3 + 2];
  }
  return [x / n, y / n, z / n];
}

/**
 * M2 mapping motif: atomistic-derived teaching chain fades into its 36
 * representative beads. This is intentionally separate from the generic
 * 8,000-bead melt used by M3-M6.
 */
export function Page2Morph({
  assets,
  reducedMotion = false,
}: {
  assets: DNAAssets;
  reducedMotion?: boolean;
}) {
  const [bpBeads, setBpBeads] = useState<Float32Array | null>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    fetch(withBasePath("/data/dna/cg/bp_beads.bin"))
      .then((response) => response.arrayBuffer())
      .then((buffer) => setBpBeads(decodeFloat32(buffer)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 2600);
      const eased = 1 - Math.pow(1 - t, 3);
      setPhase(eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const atomCenter = useMemo(() => centerOf(assets.aaPositions), [assets.aaPositions]);
  const beadCenter = useMemo(() => centerOf(bpBeads), [bpBeads]);

  if (!assets.aaPositions || !assets.aaTopology || !bpBeads) return null;

  const displayPhase = reducedMotion ? 1 : phase;
  // The atom half is the context the bead half is measured against: it has to survive a
  // near-white background without reading as a second foreground. 0.1 vanished in light
  // mode (probe-canvas-fit measured 2.7% painted canvas against 4.6% in dark for the same
  // scene); 0.32 came back too present. 0.22 sits between them.
  const atomOpacity = 1 - displayPhase * 0.78;
  const beadOpacity = Math.min(0.96, 0.08 + displayPhase * 0.88);

  return (
    <group>
      <AtomLayer
        positions={assets.aaPositions}
        elements={assets.aaTopology.elements}
        opacity={atomOpacity}
        center={atomCenter}
      />
      <BondLayer
        positions={assets.aaPositions}
        bonds={assets.aaTopology.bonds}
        radius={0.006}
        color="#94a3b8"
        opacity={atomOpacity * 0.75}
        trim={0.038}
        center={atomCenter}
      />
      <group position={[-beadCenter[0], -beadCenter[1], -beadCenter[2]]}>
        <BeadLayer
          positions={bpBeads}
          radius={0.05 + displayPhase * 0.08}
          opacity={beadOpacity}
        />
      </group>
    </group>
  );
}
