"use client";

import { useMemo } from "react";
import { AtomLayer } from "../layers/AtomLayer";
import { BondLayer } from "../layers/BondLayer";
import type { DNAAssets } from "../useDNAAssets";

/**
 * Page 1: All-atom DNA from 1bna.pdb crystal structure.
 *
 * Centers the atoms at origin so the camera (which frames CG beads
 * centered relative to the bundle center) can see them.
 */
export function Page1AllAtom({ assets }: { assets: DNAAssets }) {
  const { aaPositions, aaTopology } = assets;

  // Center at the geometric mean of the AA atoms
  const center = useMemo<[number, number, number]>(() => {
    if (!aaPositions) return [0, 0, 0];
    const n = aaPositions.length / 3;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += aaPositions[3 * i];
      cy += aaPositions[3 * i + 1];
      cz += aaPositions[3 * i + 2];
    }
    return [cx / n, cy / n, cz / n];
  }, [aaPositions]);

  if (!aaPositions || !aaTopology) return null;

  return (
    <group>
      <AtomLayer
        positions={aaPositions}
        elements={aaTopology.elements}
        opacity={1}
        center={center}
      />
      <BondLayer
        positions={aaPositions}
        bonds={aaTopology.bonds}
        radius={0.008}
        color="#b0b0b0"
        opacity={1}
        center={center}
      />
    </group>
  );
}
