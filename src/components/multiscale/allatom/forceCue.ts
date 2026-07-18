import {
  addVec3,
  crossVec3,
  dotVec3,
  lengthVec3,
  normalizeVec3,
  scaleVec3,
  subtractVec3,
} from "./vectorMath";
import type { AllAtomForceFieldTerm } from "./allAtomPagePolicy";

/* ── Equilibrium reference parameters (GAFF2-like for caffeine) ── */

const FF_BOND_REF: { indices: [number, number]; r0: number }[] = [
  { indices: [26, 27], r0: 1.229 }, // C=O carbonyl
  { indices: [25, 26], r0: 1.371 }, // ring N-C
  { indices: [34, 35], r0: 1.462 }, // methyl N-C
];

const FF_ANGLE_REF: { indices: [number, number, number]; theta0: number }[] = [
  { indices: [27, 26, 25], theta0: (125.5 * Math.PI) / 180 }, // sp2 carbonyl
  { indices: [29, 28, 32], theta0: (105.4 * Math.PI) / 180 }, // imidazole
];

const FF_DIHEDRAL_REF = {
  indices: [12, 10, 11, 21] as [number, number, number, number],
  phi0: (-120 * Math.PI) / 180, // methyl torsion equilibrium (~-120°)
};

const FF_VDW_REF: { indices: [number, number] }[] = [
  { indices: [27, 75] }, // caffeine O … water O
  { indices: [37, 66] },
];

const FF_COULOMB_REF: { indices: [number, number] }[] = [
  { indices: [27, 76] }, // strong H-bond charge pairs
  { indices: [37, 65] },
];

const VDW_RADII: Record<string, number> = {
  C: 1.7,
  N: 1.55,
  O: 1.52,
  H: 1.2,
};

/* ── Cue types ── */

export type BondCue = {
  kind: "bond";
  a: [number, number, number];
  b: [number, number, number];
  r: number;
  r0: number;
  delta: number;
  strength: number;
  restEnd: [number, number, number];
  liveColor: string;
  liveRadius: number;
};

export type AngleCue = {
  kind: "angle";
  j: [number, number, number]; // hinge atom
  theta: number;
  theta0: number;
  delta: number;
  strength: number;
  arcRadius: number;
  arcPoints: [number, number, number][];
  wedgeVertices: number[][];
  wedgeFaces: number[][];
};

export type DihedralCue = {
  kind: "dihedral";
  phi: number;
  phi0: number;
  delta: number;
  sign: -1 | 1;
  axisStart: [number, number, number];
  axisEnd: [number, number, number];
  plane1Quad: [number, number, number][];
  plane2Quad: [number, number, number][];
  arcPoints: [number, number, number][];
} | null;

export type VdwCue = {
  kind: "vdw";
  a: [number, number, number];
  b: [number, number, number];
  radiusA: number;
  radiusB: number;
  distance: number;
  sigma: number;
  gap: number;
  regime: "clash" | "contact" | "far";
  bridgeColor: string;
  bridgeCenter: [number, number, number];
  bridgeRadius: number;
};

export type CoulombCue = {
  kind: "coulomb";
  a: [number, number, number];
  b: [number, number, number];
  qA: number;
  qB: number;
  distance: number;
  interaction: number;
  sign: -1 | 1;
  strength: number;
  colorA: string;
  colorB: string;
};

/* ── Compute functions ── */

export function computeBondCues(atoms: number[][]): BondCue[] {
  return FF_BOND_REF.map(({ indices: [ai, bi], r0 }) => {
    const a = atoms[ai] as [number, number, number];
    const b = atoms[bi] as [number, number, number];
    const d = subtractVec3(b, a);
    const r = lengthVec3(d);
    const delta = r - r0;
    const dir: [number, number, number] =
      r > 1e-6 ? scaleVec3(d, 1 / r) : [1, 0, 0];
    const restEnd = addVec3(a, scaleVec3(dir, r0));
    const strength = Math.min(Math.abs(delta) / r0, 1);
    return {
      kind: "bond" as const,
      a,
      b,
      r,
      r0,
      delta,
      strength,
      restEnd,
      liveColor: delta >= 0 ? "#f59e0b" : "#22d3ee",
      liveRadius: 0.09 + Math.min(Math.abs(delta) * 0.10, 0.05),
    };
  });
}

export function computeAngleCues(atoms: number[][]): AngleCue[] {
  const arcSegments = 20;
  return FF_ANGLE_REF.map(({ indices: [iIdx, jIdx, kIdx], theta0 }) => {
    const i = atoms[iIdx];
    const j = atoms[jIdx] as [number, number, number]; // hinge
    const k = atoms[kIdx];
    const ji = subtractVec3(i, j);
    const jk = subtractVec3(k, j);
    const v1 = normalizeVec3(ji);
    const v2 = normalizeVec3(jk);
    const theta = Math.acos(Math.max(-1, Math.min(1, dotVec3(v1, v2))));
    const delta = theta - theta0;
    const strength = Math.min(Math.abs(delta) / (Math.PI / 6), 1);

    const arcRadius = 0.45 * Math.min(lengthVec3(ji), lengthVec3(jk));

    // Perpendicular component of v2 relative to v1
    const proj = scaleVec3(v1, dotVec3(v2, v1));
    const perp = normalizeVec3(subtractVec3(v2, proj));

    const arcPoints: [number, number, number][] = [];
    for (let s = 0; s <= arcSegments; s++) {
      const t = (s / arcSegments) * theta;
      const dir = addVec3(
        scaleVec3(v1, Math.cos(t)),
        scaleVec3(perp, Math.sin(t)),
      );
      arcPoints.push(addVec3(j, scaleVec3(dir, arcRadius)));
    }

    // Filled wedge fan from hinge center
    const wedgeVertices: number[][] = [j as number[]];
    for (const p of arcPoints) wedgeVertices.push(p);
    const wedgeFaces: number[][] = [];
    for (let s = 0; s < arcPoints.length - 1; s++) {
      wedgeFaces.push([0, s + 1, s + 2]);
    }

    return {
      kind: "angle" as const,
      j,
      theta,
      theta0,
      delta,
      strength,
      arcRadius,
      arcPoints,
      wedgeVertices,
      wedgeFaces,
    };
  });
}

export function computeDihedralCue(atoms: number[][]): DihedralCue {
  const {
    indices: [iIdx, jIdx, kIdx, lIdx],
    phi0,
  } = FF_DIHEDRAL_REF;
  const pj = atoms[jIdx] as [number, number, number];
  const pk = atoms[kIdx] as [number, number, number];
  const axis = normalizeVec3(subtractVec3(pk, pj));

  // Project i-j onto plane perpendicular to axis
  const vij = subtractVec3(atoms[iIdx], pj);
  const ref1Raw = subtractVec3(vij, scaleVec3(axis, dotVec3(vij, axis)));
  const ref1Len = lengthVec3(ref1Raw);
  if (ref1Len < 1e-4) return null;
  const ref1 = scaleVec3(ref1Raw, 1 / ref1Len);

  // Project l-k onto same plane
  const vkl = subtractVec3(atoms[lIdx], pk);
  const ref2Raw = subtractVec3(vkl, scaleVec3(axis, dotVec3(vkl, axis)));
  const ref2Len = lengthVec3(ref2Raw);
  if (ref2Len < 1e-4) return null;
  const ref2 = scaleVec3(ref2Raw, 1 / ref2Len);

  const cosD = Math.max(-1, Math.min(1, dotVec3(ref1, ref2)));
  const sinD = dotVec3(crossVec3(ref1, ref2), axis);
  const phi = Math.atan2(sinD, cosD);
  const delta = phi - phi0;
  const sign = (phi >= 0 ? 1 : -1) as 1 | -1;

  const planeExtent = 0.85;
  const mid = scaleVec3(addVec3(pj, pk), 0.5);

  // Half-plane quads: from bond axis outward along each projected ref direction
  const p1a = addVec3(pj, scaleVec3(ref1, planeExtent));
  const p1b = addVec3(pk, scaleVec3(ref1, planeExtent));
  const plane1Quad: [number, number, number][] = [pj, pk, p1b, p1a];

  const p2a = addVec3(pj, scaleVec3(ref2, planeExtent));
  const p2b = addVec3(pk, scaleVec3(ref2, planeExtent));
  const plane2Quad: [number, number, number][] = [pj, pk, p2b, p2a];

  // Torsion arc around axis at midpoint
  const arcRadius = 0.55;
  const arcSegments = Math.max(4, Math.round(Math.abs(phi) / (Math.PI / 12)));
  const crossRef1 = crossVec3(axis, ref1);
  const arcPoints: [number, number, number][] = [];
  for (let s = 0; s <= arcSegments; s++) {
    const t = (s / arcSegments) * phi;
    const dir = addVec3(
      scaleVec3(ref1, Math.cos(t)),
      scaleVec3(crossRef1, Math.sin(t)),
    );
    arcPoints.push(addVec3(mid, scaleVec3(dir, arcRadius)));
  }

  return {
    kind: "dihedral",
    phi,
    phi0,
    delta,
    sign,
    axisStart: pj,
    axisEnd: pk,
    plane1Quad,
    plane2Quad,
    arcPoints,
  };
}

export function computeVdwCues(
  atoms: number[][],
  elements: string[],
): VdwCue[] {
  return FF_VDW_REF.map(({ indices: [ai, bi] }) => {
    const a = atoms[ai] as [number, number, number];
    const b = atoms[bi] as [number, number, number];
    const distance = lengthVec3(subtractVec3(b, a));
    const radiusA = VDW_RADII[elements[ai]] ?? 1.52;
    const radiusB = VDW_RADII[elements[bi]] ?? 1.52;
    const sigma = radiusA + radiusB;
    const gap = distance - sigma;

    let regime: "clash" | "contact" | "far";
    let bridgeColor: string;
    if (gap < -0.15) {
      regime = "clash";
      bridgeColor = "#ef4444";
    } else if (gap < 0.35) {
      regime = "contact";
      bridgeColor = "#8b5cf6";
    } else {
      regime = "far";
      bridgeColor = "#64748b";
    }

    const bridgeCenter = scaleVec3(addVec3(a, b), 0.5);
    const bridgeRadius = regime === "clash" ? 0.28 : regime === "contact" ? 0.22 : 0.12;

    return {
      kind: "vdw" as const,
      a,
      b,
      radiusA,
      radiusB,
      distance,
      sigma,
      gap,
      regime,
      bridgeColor,
      bridgeCenter,
      bridgeRadius,
    };
  });
}

export function computeCoulombCues(
  atoms: number[][],
  charges: number[],
): CoulombCue[] {
  return FF_COULOMB_REF.map(({ indices: [ai, bi] }) => {
    const a = atoms[ai] as [number, number, number];
    const b = atoms[bi] as [number, number, number];
    const qA = charges[ai] ?? 0;
    const qB = charges[bi] ?? 0;
    const distance = lengthVec3(subtractVec3(b, a));
    const interaction = (qA * qB) / Math.max(distance, 1e-4);
    const sign = (interaction >= 0 ? 1 : -1) as 1 | -1;
    const strength = Math.min(Math.abs(interaction) * 3, 1);

    return {
      kind: "coulomb" as const,
      a,
      b,
      qA,
      qB,
      distance,
      interaction,
      sign,
      strength,
      colorA: qA < 0 ? "#ef4444" : "#60a5fa",
      colorB: qB < 0 ? "#ef4444" : "#60a5fa",
    };
  });
}

/* ── Camera anchor ── */

export function computeCueAnchorPoint(
  activeTerm: AllAtomForceFieldTerm | null,
  atoms: number[][],
): [number, number, number] | null {
  if (!activeTerm) return null;
  switch (activeTerm) {
    case "Ubond": {
      const [ai, bi] = FF_BOND_REF[0].indices;
      return scaleVec3(addVec3(atoms[ai], atoms[bi]), 0.5);
    }
    case "Uangle": {
      const jIdx = FF_ANGLE_REF[0].indices[1];
      return atoms[jIdx] as [number, number, number];
    }
    case "Udihedral": {
      const [, jIdx, kIdx] = FF_DIHEDRAL_REF.indices;
      return scaleVec3(addVec3(atoms[jIdx], atoms[kIdx]), 0.5);
    }
    case "UvdW": {
      // Anchor between the two solute (caffeine) atoms of the pairs, not the
      // solute-solvent midpoint, so the molecule stays centered while each cue
      // reaches out to its solvent partner.
      const a0 = FF_VDW_REF[0].indices[0];
      const a1 = FF_VDW_REF[1]?.indices[0] ?? a0;
      return scaleVec3(addVec3(atoms[a0], atoms[a1]), 0.5);
    }
    case "UCoul": {
      const a0 = FF_COULOMB_REF[0].indices[0];
      const a1 = FF_COULOMB_REF[1]?.indices[0] ?? a0;
      return scaleVec3(addVec3(atoms[a0], atoms[a1]), 0.5);
    }
    default:
      return null;
  }
}
