"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { AtomLayer } from "../layers/AtomLayer";
import { BondLayer } from "../layers/BondLayer";
import { BeadLayer } from "../layers/BeadLayer";
import { decodeFloat32 } from "../binaryLoader";
import type { DNAAssets } from "../useDNAAssets";
import { ballAndStick, shortestHeavyBond } from "../../ballAndStick";

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

const MORPH_MS = 3800;

/** Cubic ease-out over one act of the sequence, 0 before it starts and 1 after it ends. */
const act = (t: number, from: number, to: number) => {
  const u = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return 1 - Math.pow(1 - u, 3);
};



/**
 * The bead chain is one strand of 36, and consecutive beads are the bonded pair: measured on
 * `bp_beads.bin`, the next bead is the nearest bead for all 36, at a median 0.3552 apart, which
 * is the B-DNA rise. So the connectivity is the index order and needs no file of its own.
 */
const BEAD_BONDS: [number, number][] =
  Array.from({ length: 35 }, (_, i) => [i, i + 1]);

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
      const t = Math.min(1, (now - started) / MORPH_MS);
      setPhase(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  // The one place that knows this scene's bond lengths, so the one place the ball-and-stick
  // rule can be measured. Sticks used to be handed in at 0.006 against a 0.050 ball, a twelfth
  // of the tier's ratio, which is why the chain read as having no bonds at all.
  const geometry = useMemo(() => {
    const p = assets.aaPositions;
    const t = assets.aaTopology;
    if (!p || !t) return null;
    return ballAndStick(shortestHeavyBond(p, t.bonds, t.elements), t.elements);
  }, [assets.aaPositions, assets.aaTopology]);

  const atomCenter = useMemo(() => centerOf(assets.aaPositions), [assets.aaPositions]);
  const beadCenter = useMemo(() => centerOf(bpBeads), [bpBeads]);

  if (!assets.aaPositions || !assets.aaTopology || !bpBeads || !geometry) return null;

  const t = reducedMotion ? 1 : phase;

  // Three acts rather than one crossfade. Run together, the two layers dissolve into each
  // other and the picture reads as two models sharing a box; separated, it reads as one
  // model being replaced by its mapping. The atoms are held first so there is something to
  // be replaced, and the beads finish last so the eye ends on them. Nothing moves before
  // 0.18; that gap is the hold.
  const handover = act(t, 0.18, 0.72); // atoms recede, beads rise
  const settle = act(t, 0.62, 1);      // beads take their final size

  // Atoms go much fainter than they used to. The floor was 0.22, set when the bonds were
  // effectively invisible and the spheres were the only thing carrying the chain, so it could
  // not go lower without the scene reading as empty in light mode. Drawn sticks hold the
  // shape at an opacity the spheres cannot, so the spheres can drop out of the way.
  const atomOpacity = 1 - handover * 0.88;
  // What actually thins the scene. At full size the spheres composite to solid however low
  // their opacity is; at 0.38 of their radius they cover a seventh of the area and the chain
  // reads as a ghost the beads sit inside.
  const atomScale = 1 - handover * 0.74;
  // The skeleton outlives the spheres. It is what makes the beads legible as a mapping of
  // something rather than as a new object, so it fades later and stops higher.
  const bondOpacity = (1 - act(t, 0.3, 0.86) * 0.62) * 0.8;
  const beadOpacity = Math.min(0.96, handover * 0.96);
  // Consecutive beads sit a median 0.3552 apart, so at this 0.15 the pair fills 84% of the run
  // between them and the connector is a short thick joint rather than a rod.
  const beadRadius = 0.075 + settle * 0.075;

  return (
    <group>
      <AtomLayer
        positions={assets.aaPositions}
        elements={assets.aaTopology.elements}
        opacity={atomOpacity}
        scale={atomScale}
        ball={geometry.ball}
        center={atomCenter}
      />
      <BondLayer
        positions={assets.aaPositions}
        bonds={assets.aaTopology.bonds}
        radius={geometry.stick * atomScale}
        color="#94a3b8"
        opacity={bondOpacity}
        trim={geometry.ball('C') * atomScale}
        center={atomCenter}
      />
      <group position={[-beadCenter[0], -beadCenter[1], -beadCenter[2]]}>
        <BeadLayer
          positions={bpBeads}
          radius={beadRadius}
          opacity={beadOpacity}
        />
        {/* The beads are a chain, not a scatter. Without the connector the mapping reads as
            36 loose markers laid over a molecule. Trimmed to the bead surface, which is why
            the trim tracks the radius while it grows. */}
        <BondLayer
          positions={bpBeads}
          bonds={BEAD_BONDS}
          radius={beadRadius * 0.34}
          color="#94a3b8"
          opacity={beadOpacity}
          trim={beadRadius}
        />
      </group>
    </group>
  );
}
