"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BeadLayer, type BeadLayerHandle } from "../layers/BeadLayer";
import { BondLayer, type BondLayerHandle } from "../layers/BondLayer";
import { useTrajectorySampler } from "../layers/useTrajectorySampler";
import { buildAdjacency, recenterInto, unwrapFrame } from "../pbcUnwrap";
import type { DNAAssets } from "../useDNAAssets";

/** Where the painted cloud sits: the midpoint of its extremes and the farthest bead from it. */
export interface CollectiveBounds {
  center: [number, number, number];
  radius: number;
}

/** Page 6: Full CG trajectory settle — all terms active. */
export function Page6Settle({
  assets,
  reducedMotion = false,
  onBounds,
}: {
  assets: DNAAssets;
  reducedMotion?: boolean;
  onBounds?: (bounds: CollectiveBounds) => void;
}) {
  const { cgTrajectory, cgPositions, cgTopology, manifest } = assets;
  const nBeads = cgTopology?.nBeads ?? 0;
  const nFrames = manifest?.assets?.cg_trajectory?.shape?.[0] ?? 0;
  const hasTrajectory = !!cgTrajectory && nFrames > 0;
  const bonds = cgTopology?.beadBonds;
  const box = manifest?.system?.box_dimensions;

  const beadRef = useRef<BeadLayerHandle>(null);
  const bondRef = useRef<BondLayerHandle>(null);

  const { sampleCurrentFrame } = useTrajectorySampler(
    cgTrajectory, nBeads, nFrames, bonds, box, 15, "pingpong", reducedMotion,
  );

  // The still frame shown while the trajectory loads, unwrapped and recentred exactly as the
  // sampler treats every trajectory frame. Drawn wrapped, the hand-off jumped from a cube cut
  // at the box faces to the unwrapped cloud. positions.bin is trajectory frame 0, so the
  // hand-off is to the same configuration.
  const still = useMemo(() => {
    if (!cgPositions || !bonds || !box || nBeads === 0) return null;
    const out = new Float32Array(nBeads * 3);
    unwrapFrame(cgPositions, buildAdjacency(bonds, nBeads), box, nBeads, out);
    recenterInto(out, out, nBeads);
    return out;
  }, [cgPositions, bonds, box, nBeads]);

  useEffect(() => {
    if (!still || !onBounds) return;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < nBeads; i++) {
      for (let d = 0; d < 3; d++) {
        lo[d] = Math.min(lo[d], still[3 * i + d]);
        hi[d] = Math.max(hi[d], still[3 * i + d]);
      }
    }
    const center: [number, number, number] = [
      (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2,
    ];
    let radius = 0;
    for (let i = 0; i < nBeads; i++) {
      radius = Math.max(radius, Math.hypot(
        still[3 * i] - center[0], still[3 * i + 1] - center[1], still[3 * i + 2] - center[2],
      ));
    }
    onBounds({ center, radius });
  }, [still, nBeads, onBounds]);

  useFrame(() => {
    if (!hasTrajectory) return;
    const positions = sampleCurrentFrame();
    if (!positions) return;
    beadRef.current?.update(positions);
    bondRef.current?.update(positions);
  });

  if (!cgTopology || !still) return null;

  const staticPositions = !hasTrajectory ? still : undefined;

  return (
    <group>
      <BeadLayer
        ref={beadRef}
        count={nBeads}
        positions={staticPositions}
        duplexIds={cgTopology.duplexIds}
        radius={0.17}
        opacity={0.92}
      />
      <BondLayer
        ref={bondRef}
        positions={staticPositions}
        bonds={cgTopology.beadBonds}
        radius={0.08}
        color="#f59e0b"
        opacity={0.55}
      />
    </group>
  );
}
