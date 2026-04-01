"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { withBasePath } from "@/lib/basePath";
import { BeadLayer, type BeadLayerHandle } from "../layers/BeadLayer";
import { BondLayer, type BondLayerHandle } from "../layers/BondLayer";
import { decodeFloat32 } from "../binaryLoader";
import type { DNAAssets } from "../useDNAAssets";

/** Deterministic per-bead, per-axis parameter via hash. */
function hashParam(i: number, d: number, seed: number): number {
  return ((i * 73 + d * 31 + seed * 17) % 1000) / 1000;
}

/**
 * Page 4 / Step 3: Temperature Control.
 *
 * Single 36-bead CG polymer whose beads shake randomly.
 * Each bead has a different displacement amplitude (multi-harmonic).
 * Progress scales overall amplitude (turning up the thermostat).
 */
export function Page4Playback({ assets: _a, progress }: { assets: DNAAssets; progress: number }) {
  const [bpBeads, setBpBeads] = useState<Float32Array | null>(null);

  useEffect(() => {
    fetch(withBasePath("/data/dna/cg/bp_beads.bin"))
      .then((r) => r.arrayBuffer())
      .then((buf) => setBpBeads(decodeFloat32(buf)))
      .catch(() => {});
  }, []);

  const nBeads = bpBeads ? bpBeads.length / 3 : 0;

  const cgBonds = useMemo<[number, number][]>(() => {
    if (!bpBeads) return [];
    const n = bpBeads.length / 3;
    const bonds: [number, number][] = [];
    for (let k = 0; k < n - 1; k++) bonds.push([k, k + 1]);
    return bonds;
  }, [bpBeads]);

  // Per-bead shake parameters: amplitude, freq, phase × 3 axes × 2 harmonics
  const shakeParams = useMemo(() => {
    if (nBeads === 0) return null;
    // [nBeads][3 axes][2 harmonics][amp, freq, phase] = nBeads * 18
    const p = new Float32Array(nBeads * 18);
    for (let i = 0; i < nBeads; i++) {
      for (let d = 0; d < 3; d++) {
        // Harmonic 0 (slow)
        const b0 = (i * 18) + (d * 6);
        p[b0]     = 0.03 + hashParam(i, d, 1) * 0.07;  // amplitude 0.03..0.10
        p[b0 + 1] = 1.5 + hashParam(i, d, 2) * 3.0;    // freq 1.5..4.5 Hz
        p[b0 + 2] = hashParam(i, d, 3) * Math.PI * 2;   // phase
        // Harmonic 1 (fast)
        p[b0 + 3] = 0.01 + hashParam(i, d, 4) * 0.04;  // amplitude 0.01..0.05
        p[b0 + 4] = 4.0 + hashParam(i, d, 5) * 5.0;    // freq 4..9 Hz
        p[b0 + 5] = hashParam(i, d, 6) * Math.PI * 2;   // phase
      }
    }
    return p;
  }, [nBeads]);

  const beadRef = useRef<BeadLayerHandle>(null);
  const bondRef = useRef<BondLayerHandle>(null);
  const displaced = useRef<Float32Array | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  if (!displaced.current || displaced.current.length !== nBeads * 3) {
    displaced.current = nBeads > 0 ? new Float32Array(nBeads * 3) : null;
  }

  const timeRef = useRef(0);
  useFrame((_, delta) => {
    if (!bpBeads || !shakeParams || !displaced.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const scale = Math.min(1, progressRef.current * 3);

    for (let i = 0; i < nBeads; i++) {
      for (let d = 0; d < 3; d++) {
        const b0 = (i * 18) + (d * 6);
        const v0 = shakeParams[b0] * Math.sin(t * shakeParams[b0 + 1] + shakeParams[b0 + 2]);
        const v1 = shakeParams[b0 + 3] * Math.sin(t * shakeParams[b0 + 4] + shakeParams[b0 + 5]);
        displaced.current[3 * i + d] = bpBeads[3 * i + d] + (v0 + v1) * scale;
      }
    }

    beadRef.current?.update(displaced.current);
    bondRef.current?.update(displaced.current);
  });

  if (!bpBeads) return null;

  return (
    <group>
      <BeadLayer ref={beadRef} positions={bpBeads} count={nBeads} radius={0.12} opacity={0.95} />
      <BondLayer
        ref={bondRef}
        positions={bpBeads}
        bonds={cgBonds}
        radius={0.02}
        color="#f59e0b"
        opacity={0.7}
      />
    </group>
  );
}
