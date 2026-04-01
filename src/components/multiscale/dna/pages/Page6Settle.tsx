"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BeadLayer, type BeadLayerHandle } from "../layers/BeadLayer";
import { BondLayer, type BondLayerHandle } from "../layers/BondLayer";
import { useTrajectorySampler } from "../layers/TrajectoryPlayer";
import type { DNAAssets } from "../useDNAAssets";

/** Page 6: Full CG trajectory settle — all terms active. */
export function Page6Settle({ assets }: { assets: DNAAssets; progress: number }) {
  const { cgTrajectory, cgPositions, cgTopology, manifest } = assets;
  const nBeads = cgTopology?.nBeads ?? 0;
  const nFrames = manifest?.assets?.cg_trajectory?.shape?.[0] ?? 0;
  const hasTrajectory = !!cgTrajectory && nFrames > 0;
  const bonds = cgTopology?.beadBonds;
  const box = manifest?.system?.box_dimensions;

  const beadRef = useRef<BeadLayerHandle>(null);
  const bondRef = useRef<BondLayerHandle>(null);

  const { sampleCurrentFrame } = useTrajectorySampler(
    cgTrajectory, nBeads, nFrames, bonds, box, 15,
  );

  useFrame(() => {
    if (!hasTrajectory) return;
    const positions = sampleCurrentFrame();
    if (!positions) return;
    beadRef.current?.update(positions);
    bondRef.current?.update(positions);
  });

  if (!cgTopology) return null;

  const staticPositions = !hasTrajectory ? cgPositions ?? undefined : undefined;

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
