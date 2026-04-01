import {
  vec3Sub,
  vec3Dot,
  vec3Len,
  vec3Normalize,
  vec3Scale,
  vec3Add,
  vec3Cross,
} from "./allAtomLayers";
import type { AllAtomForceFieldTerm } from "./allAtomPagePolicy";

/* ── Equilibrium reference parameters (GAFF2-like for caffeine) ── */

export const FF_BOND_REF: { indices: [number, number]; r0: number }[] = [
  { indices: [26, 27], r0: 1.229 }, // C=O carbonyl
  { indices: [25, 26], r0: 1.371 }, // ring N-C
  { indices: [34, 35], r0: 1.462 }, // methyl N-C
];

export const FF_ANGLE_REF: { indices: [number, number, number]; theta0: number }[] = [
  { indices: [27, 26, 25], theta0: (125.5 * Math.PI) / 180 }, // sp2 carbonyl
  { indices: [29, 28, 32], theta0: (105.4 * Math.PI) / 180 }, // imidazole
];

export const FF_DIHEDRAL_REF = {
  indices: [12, 10, 11, 21] as [number, number, number, number],
  phi0: (-120 * Math.PI) / 180, // methyl torsion equilibrium (~-120°)
};

export const FF_VDW_REF: { indices: [number, number] }[] = [
  { indices: [27, 75] }, // caffeine O … water O
  { indices: [37, 66] },
];

export const FF_COULOMB_REF: { indices: [number, number] }[] = [
  { indices: [27, 76] }, // strong H-bond charge pairs
  { indices: [37, 65] },
];

export const VDW_RADII: Record<string, number> = {
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

export type ForceCue = BondCue | AngleCue | NonNullable<DihedralCue> | VdwCue | CoulombCue;

/* ── Compute functions ── */

export function computeBondCues(atoms: number[][]): BondCue[] {
  return FF_BOND_REF.map(({ indices: [ai, bi], r0 }) => {
    const a = atoms[ai] as [number, number, number];
    const b = atoms[bi] as [number, number, number];
    const d = vec3Sub(b, a);
    const r = vec3Len(d);
    const delta = r - r0;
    const dir: [number, number, number] =
      r > 1e-6 ? vec3Scale(d, 1 / r) : [1, 0, 0];
    const restEnd = vec3Add(a, vec3Scale(dir, r0));
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
    const ji = vec3Sub(i, j);
    const jk = vec3Sub(k, j);
    const v1 = vec3Normalize(ji);
    const v2 = vec3Normalize(jk);
    const theta = Math.acos(Math.max(-1, Math.min(1, vec3Dot(v1, v2))));
    const delta = theta - theta0;
    const strength = Math.min(Math.abs(delta) / (Math.PI / 6), 1);

    const arcRadius = 0.45 * Math.min(vec3Len(ji), vec3Len(jk));

    // Perpendicular component of v2 relative to v1
    const proj = vec3Scale(v1, vec3Dot(v2, v1));
    const perp = vec3Normalize(vec3Sub(v2, proj));

    const arcPoints: [number, number, number][] = [];
    for (let s = 0; s <= arcSegments; s++) {
      const t = (s / arcSegments) * theta;
      const dir = vec3Add(
        vec3Scale(v1, Math.cos(t)),
        vec3Scale(perp, Math.sin(t)),
      );
      arcPoints.push(vec3Add(j, vec3Scale(dir, arcRadius)));
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
  const axis = vec3Normalize(vec3Sub(pk, pj));

  // Project i-j onto plane perpendicular to axis
  const vij = vec3Sub(atoms[iIdx], pj);
  const ref1Raw = vec3Sub(vij, vec3Scale(axis, vec3Dot(vij, axis)));
  const ref1Len = vec3Len(ref1Raw);
  if (ref1Len < 1e-4) return null;
  const ref1 = vec3Scale(ref1Raw, 1 / ref1Len);

  // Project l-k onto same plane
  const vkl = vec3Sub(atoms[lIdx], pk);
  const ref2Raw = vec3Sub(vkl, vec3Scale(axis, vec3Dot(vkl, axis)));
  const ref2Len = vec3Len(ref2Raw);
  if (ref2Len < 1e-4) return null;
  const ref2 = vec3Scale(ref2Raw, 1 / ref2Len);

  const cosD = Math.max(-1, Math.min(1, vec3Dot(ref1, ref2)));
  const sinD = vec3Dot(vec3Cross(ref1, ref2), axis);
  const phi = Math.atan2(sinD, cosD);
  const delta = phi - phi0;
  const sign = (phi >= 0 ? 1 : -1) as 1 | -1;

  const planeExtent = 0.85;
  const mid = vec3Scale(vec3Add(pj, pk), 0.5) as [number, number, number];

  // Half-plane quads: from bond axis outward along each projected ref direction
  const p1a = vec3Add(pj, vec3Scale(ref1, planeExtent));
  const p1b = vec3Add(pk, vec3Scale(ref1, planeExtent));
  const plane1Quad: [number, number, number][] = [pj, pk, p1b, p1a];

  const p2a = vec3Add(pj, vec3Scale(ref2, planeExtent));
  const p2b = vec3Add(pk, vec3Scale(ref2, planeExtent));
  const plane2Quad: [number, number, number][] = [pj, pk, p2b, p2a];

  // Torsion arc around axis at midpoint
  const arcRadius = 0.55;
  const arcSegments = Math.max(4, Math.round(Math.abs(phi) / (Math.PI / 12)));
  const crossRef1 = vec3Cross(axis, ref1);
  const arcPoints: [number, number, number][] = [];
  for (let s = 0; s <= arcSegments; s++) {
    const t = (s / arcSegments) * phi;
    const dir = vec3Add(
      vec3Scale(ref1, Math.cos(t)),
      vec3Scale(crossRef1, Math.sin(t)),
    );
    arcPoints.push(vec3Add(mid, vec3Scale(dir, arcRadius)));
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
    const distance = vec3Len(vec3Sub(b, a));
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

    const bridgeCenter = vec3Scale(vec3Add(a, b), 0.5) as [number, number, number];
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
    const distance = vec3Len(vec3Sub(b, a));
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
      return vec3Scale(vec3Add(atoms[ai], atoms[bi]), 0.5) as [number, number, number];
    }
    case "Uangle": {
      const jIdx = FF_ANGLE_REF[0].indices[1];
      return atoms[jIdx] as [number, number, number];
    }
    case "Udihedral": {
      const [, jIdx, kIdx] = FF_DIHEDRAL_REF.indices;
      return vec3Scale(vec3Add(atoms[jIdx], atoms[kIdx]), 0.5) as [number, number, number];
    }
    case "UvdW": {
      const [ai, bi] = FF_VDW_REF[0].indices;
      return vec3Scale(vec3Add(atoms[ai], atoms[bi]), 0.5) as [number, number, number];
    }
    case "UCoul": {
      const [ai, bi] = FF_COULOMB_REF[0].indices;
      return vec3Scale(vec3Add(atoms[ai], atoms[bi]), 0.5) as [number, number, number];
    }
    default:
      return null;
  }
}
