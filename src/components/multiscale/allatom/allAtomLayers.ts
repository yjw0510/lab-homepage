import type { AllAtomSceneSnapshot, AllAtomSystemData, AllAtomTrajectoryData, AllAtomTrajectoryFrame, AllAtomTrajectoryPage } from "../data/allatomSolvent";
import type { ScrollState } from "../scrollState";
import { getViewSpec } from "../multiscaleViewSchedule";
import { computeBounds, getSubsetIndices } from "../multiscaleViewRuntime";
import { trimBondEndpoints } from "../molstar/geometry";
import { getAllAtomVisuals, getScheduledAllAtomSnapshot } from "./allAtomConfig";
import {
  getAllAtomPagePolicy,
  getAllAtomSceneKey,
  type AllAtomForceFieldTerm,
  type AllAtomReadoutId,
} from "./allAtomConfig";
import {
  computeBondCues,
  computeAngleCues,
  computeDihedralCue,
  computeVdwCues,
  computeCoulombCues,
} from "./forceCue";
import {
  AMBER,
  CARBON,
  CYAN,
  ELEMENT_COLORS,
  ELEMENT_RADII,
  GREEN,
  LIGHT_BLUE,
  NITROGEN,
  ORANGE,
  OXYGEN,
  PURPLE,
  SLATE,
  WHITE,
  mixColor,
  type ColorValue,
  type ResearchLayerSpec,
  type ResearchPrimitive,
} from "../molstar/shared";

export interface AllAtomStageData {
  system: AllAtomSystemData;
  trajectory: AllAtomTrajectoryData | null;
}

function buildDiscMesh(center: number[], normal: number[], radius: number, segments = 20) {
  const norm = Math.hypot(normal[0], normal[1], normal[2]) || 1;
  const n: [number, number, number] = [normal[0] / norm, normal[1] / norm, normal[2] / norm];
  const fallback = Math.abs(n[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
  const uRaw: [number, number, number] = [
    n[1] * fallback[2] - n[2] * fallback[1],
    n[2] * fallback[0] - n[0] * fallback[2],
    n[0] * fallback[1] - n[1] * fallback[0],
  ];
  const uNorm = Math.hypot(uRaw[0], uRaw[1], uRaw[2]) || 1;
  const u: [number, number, number] = [uRaw[0] / uNorm, uRaw[1] / uNorm, uRaw[2] / uNorm];
  const v: [number, number, number] = [
    n[1] * u[2] - n[2] * u[1],
    n[2] * u[0] - n[0] * u[2],
    n[0] * u[1] - n[1] * u[0],
  ];

  const vertices: number[][] = [[center[0], center[1], center[2]]];
  for (let index = 0; index < segments; index++) {
    const theta = (index / segments) * Math.PI * 2;
    const c = Math.cos(theta) * radius;
    const s = Math.sin(theta) * radius;
    vertices.push([
      center[0] + u[0] * c + v[0] * s,
      center[1] + u[1] * c + v[1] * s,
      center[2] + u[2] * c + v[2] * s,
    ]);
  }

  const faces: number[][] = [];
  for (let index = 1; index <= segments; index++) {
    faces.push([0, index, index === segments ? 1 : index + 1]);
  }
  return { vertices, faces };
}

/**
 * Recompute each aromatic-stacking ring plane from the CURRENT frame's atoms,
 * so the discs and their connector track the rings as the trajectory plays
 * instead of sitting frozen at the base-snapshot geometry (the same class of bug
 * as the measured contact). For each stacking residue: centroid + best-fit plane
 * normal (largest two covariance eigenvectors via power iteration, crossed) +
 * in-plane radius, from the residue's heavy atoms. Falls back to the static
 * planes when residue membership is unavailable.
 */
function bestFitPlaneNormal(pts: number[][], c: number[]): [number, number, number] {
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of pts) {
    const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2];
    xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz;
  }
  const C = [[xx, xy, xz], [xy, yy, yz], [xz, yz, zz]];
  const mul = (m: number[][], v: number[]) => [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
  const nrm = (v: number[]): [number, number, number] => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  let v1 = nrm([1, 0.31, 0.11]);
  for (let i = 0; i < 24; i++) v1 = nrm(mul(C, v1));
  const Cv1 = mul(C, v1);
  const l1 = v1[0] * Cv1[0] + v1[1] * Cv1[1] + v1[2] * Cv1[2];
  const C2 = C.map((row, r) => row.map((val, col) => val - l1 * v1[r] * v1[col]));
  let v2 = nrm([0.13, 1, 0.19]);
  for (let i = 0; i < 24; i++) v2 = nrm(mul(C2, v2));
  return nrm([
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ]);
}

function computeFrameStackGeometry(
  snapshot: AllAtomSceneSnapshot,
): { planes: { center: number[]; normal: number[]; radius: number }[]; pairs: { start: number[]; end: number[] }[] } | null {
  const residueIds = snapshot.stackResidueIds ?? snapshot.stackPlanes?.map((p) => p.residueId);
  if (!residueIds?.length || !snapshot.residueIds || !snapshot.elements) return null;
  const planes: { center: number[]; normal: number[]; radius: number }[] = [];
  for (const rid of residueIds) {
    const pts: number[][] = [];
    for (let i = 0; i < snapshot.atoms.length; i++) {
      if ((snapshot.residueIds[i] ?? -1) !== rid) continue;
      if ((snapshot.elements[i] ?? "H") === "H") continue;
      pts.push(snapshot.atoms[i]);
    }
    if (pts.length < 3) return null;
    const center = [0, 0, 0];
    for (const p of pts) { center[0] += p[0]; center[1] += p[1]; center[2] += p[2]; }
    center[0] /= pts.length; center[1] /= pts.length; center[2] /= pts.length;
    const normal = bestFitPlaneNormal(pts, center);
    let radius = 0;
    for (const p of pts) radius = Math.max(radius, distance3(p, center));
    planes.push({ center, normal, radius: Math.min(Math.max(radius, 1.2), 2.0) });
  }
  const pairs: { start: number[]; end: number[] }[] = [];
  for (let i = 0; i + 1 < planes.length; i++) {
    pairs.push({ start: planes[i].center, end: planes[i + 1].center });
  }
  return { planes, pairs };
}

function buildRingLayers(snapshot: AllAtomSceneSnapshot, phase: number): ResearchLayerSpec[] {
  const frame = computeFrameStackGeometry(snapshot);
  const stackPlanes = frame?.planes ?? snapshot.stackPlanes;
  const stackPairs = frame?.pairs ?? snapshot.stackPairs;
  if (!stackPlanes?.length) return [];
  const planeColors = [CYAN, AMBER, ORANGE];
  const planes = stackPlanes.map((plane, index) => {
    const mesh = buildDiscMesh(plane.center, plane.normal, plane.radius);
    return {
      kind: "mesh" as const,
      vertices: mesh.vertices,
      faces: mesh.faces,
      color: planeColors[index] ?? LIGHT_BLUE,
    };
  });

  const connectors = stackPairs?.map((pair) => ({
    kind: "dashed-cylinder" as const,
    start: pair.start as [number, number, number],
    end: pair.end as [number, number, number],
    radius: 0.05,
    dashCount: 10,
    color: AMBER,
  })) ?? [];

  return [
    {
      label: "Aromatic Stacking",
      primitives: planes,
      params: {
        alpha: 0.16 + phase * 0.16,
        quality: "high",
        material: { metalness: 0, roughness: 0.78, bumpiness: 0 },
        emissive: 0.12,
        doubleSided: true,
      },
    },
    {
      label: "Stack Connectors",
      primitives: connectors,
      params: {
        alpha: 0.82,
        quality: "high",
        material: { metalness: 0, roughness: 0.42, bumpiness: 0 },
        emissive: 0.24,
      },
    },
  ];
}

/**
 * Observable page (A6): one clearly-measured contact instead of a spray of
 * amber dashes to invisible partners. Renders the partner water molecule at
 * full opacity so BOTH ends of the measurement are visible atoms, marks the
 * solute contact site, and draws a clean cyan caliper between them. The numeric
 * distance and its building distribution are shown in the rail.
 */
function distance3(a: number[], b: number[]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Recompute the measured contact from the CURRENT displayed frame's atom
 * positions, not the static base-snapshot contact list. This is what makes the
 * water, caliper, and rail number move with the trajectory instead of sitting
 * frozen while the caffeine animates past them. Picks the water hydrogen
 * nearest a solute carbonyl oxygen each frame, so the measurement is continuous
 * (no flicker) and always exact for the frame on screen.
 */
function computeFrameContact(snapshot: AllAtomSceneSnapshot): {
  acceptor: number[];
  hydrogen: number[];
  waterOxygen: number[] | null;
  waterHydrogens: number[][];
  distance: number;
} | null {
  const { atoms, elements, residueNames, residueIds } = snapshot;
  if (!atoms?.length) return null;
  const focus = new Set(snapshot.focusAtomIndices ?? []);
  const hasFocus = focus.size > 0;

  const acceptorIdxs: number[] = [];
  for (let i = 0; i < atoms.length; i++) {
    const rn = residueNames[i] ?? "";
    if (rn === "HOH" || rn === "WAT") continue;
    if (elements[i] === "O" && (!hasFocus || focus.has(i))) acceptorIdxs.push(i);
  }
  if (!acceptorIdxs.length) return null;

  let best: { ai: number; hi: number; resid: number; d: number } | null = null;
  for (const ai of acceptorIdxs) {
    const ap = atoms[ai];
    for (let i = 0; i < atoms.length; i++) {
      const rn = residueNames[i] ?? "";
      if ((rn !== "HOH" && rn !== "WAT") || elements[i] !== "H") continue;
      const d = distance3(ap, atoms[i]);
      if (!best || d < best.d) best = { ai, hi: i, resid: residueIds[i] ?? -1, d };
    }
  }
  if (!best) return null;

  let waterOxygen: number[] | null = null;
  const waterHydrogens: number[][] = [];
  for (let i = 0; i < atoms.length; i++) {
    const rn = residueNames[i] ?? "";
    if ((rn !== "HOH" && rn !== "WAT") || (residueIds[i] ?? -2) !== best.resid) continue;
    if (elements[i] === "O") waterOxygen = atoms[i];
    else if (elements[i] === "H") waterHydrogens.push(atoms[i]);
  }

  return {
    acceptor: atoms[best.ai],
    hydrogen: atoms[best.hi],
    waterOxygen,
    waterHydrogens,
    distance: best.d,
  };
}

/**
 * The O-H distance of the contact drawn on A6, derived from the SAME displayed
 * frame as the geometry so the rail number never drifts from the caliper.
 */
export function getMeasuredContactDistance(
  data: AllAtomStageData,
  scrollState: ScrollState,
  frameIndex: number,
): number | null {
  const step = scrollState.step;
  const snapshot = getScheduledAllAtomSnapshot(data.system, step);
  if (!snapshot) return null;
  const trajectoryPage = getTrajectoryPage(data.trajectory, snapshot.id);
  const displaySnapshot = getDisplaySnapshot(snapshot, trajectoryPage, frameIndex);
  return computeFrameContact(displaySnapshot)?.distance ?? null;
}

function buildMeasuredContact(snapshot: AllAtomSceneSnapshot): ResearchLayerSpec[] {
  const contact = computeFrameContact(snapshot);
  if (!contact) return [];
  const acceptor = contact.acceptor as [number, number, number];
  const hydrogen = contact.hydrogen as [number, number, number];

  const oRadius = (ELEMENT_RADII.O ?? 0.3) * 0.62;
  const hRadius = (ELEMENT_RADII.H ?? 0.16) * 0.62;

  const primitives: ResearchLayerSpec["primitives"] = [
    // Caliper between the two measured atoms.
    {
      kind: "dashed-cylinder" as const,
      start: acceptor,
      end: hydrogen,
      radius: 0.03,
      dashCount: 6,
      color: CYAN,
    },
    // Solute contact site marker.
    { kind: "sphere" as const, center: acceptor, radius: 0.17, color: CYAN },
  ];

  if (contact.waterOxygen) {
    const o = contact.waterOxygen as [number, number, number];
    primitives.push({ kind: "sphere" as const, center: o, radius: oRadius, color: OXYGEN });
    for (const h of contact.waterHydrogens) {
      const hp = h as [number, number, number];
      primitives.push({ kind: "sphere" as const, center: hp, radius: hRadius, color: WHITE });
      primitives.push({
        kind: "cylinder" as const,
        start: o,
        end: hp,
        radiusTop: 0.05,
        radiusBottom: 0.05,
        radialSegments: 12,
        color: WHITE,
      });
    }
  } else {
    // No matched water oxygen: still make the partner end a visible hydrogen.
    primitives.push({ kind: "sphere" as const, center: hydrogen, radius: hRadius, color: WHITE });
  }

  return [
    {
      label: "Measured Contact",
      primitives,
      params: {
        alpha: 0.96,
        quality: "high",
        material: { metalness: 0, roughness: 0.42, bumpiness: 0 },
        emissive: 0.12,
      },
    },
  ];
}

const isWater = (residueName: string) => residueName === "HOH" || residueName === "WAT";

/**
 * The support waters stand in for the first solvation shell, so they have to be the nearest
 * ones. Taking the first `maxWaters` in index order put them wherever the asset happened to
 * list them: probe-canvas-fit caught faint waters in the far corner of the stage with none
 * against the solute, which widened the measured scene to a spread of unrelated dots and
 * left the molecule looking adrift in it.
 */
function nearestWaterResidues(snapshot: AllAtomSceneSnapshot, visibleAtomIndices: number[]) {
  const focusCenter = computeBounds(
    (snapshot.focusAtomIndices ?? []).map((index) => snapshot.atoms[index]).filter(Boolean),
  ).center;
  const candidates: Array<{ residueId: number; oxygenIndex: number; distance: number }> = [];
  const seen = new Set<number>();
  for (const index of visibleAtomIndices) {
    const residueId = snapshot.residueIds[index];
    if (!isWater(snapshot.residueNames[index] ?? "")) continue;
    if (typeof residueId !== "number" || seen.has(residueId)) continue;
    if ((snapshot.elements[index] ?? "") !== "O") continue;
    seen.add(residueId);
    const [x, y, z] = snapshot.atoms[index] ?? [0, 0, 0];
    candidates.push({
      residueId,
      oxygenIndex: index,
      distance: Math.hypot(x - focusCenter[0], y - focusCenter[1], z - focusCenter[2]),
    });
  }
  return candidates.sort((a, b) => a.distance - b.distance);
}

function buildSelectedWaterPrimitives(
  snapshot: AllAtomSceneSnapshot,
  visibleAtomIndices: number[],
  maxWaters: number,
) {
  const selectedResidues = nearestWaterResidues(snapshot, visibleAtomIndices)
    .slice(0, maxWaters)
    .map((candidate) => candidate.residueId);
  const waters = selectedResidues
    .map((residueId) => {
      const oxygenIndex = snapshot.residueIds.findIndex(
        (id, index) => id === residueId && (snapshot.elements[index] ?? "") === "O",
      );
      const hydrogenIndices = snapshot.residueIds
        .map((id, index) => ({ id, index }))
        .filter(({ id, index }) => id === residueId && (snapshot.elements[index] ?? "") === "H")
        .slice(0, 2)
        .map(({ index }) => index);
      if (oxygenIndex < 0 || hydrogenIndices.length < 2) return null;
      return {
        oxygen: snapshot.atoms[oxygenIndex],
        hydrogens: hydrogenIndices.map((index) => snapshot.atoms[index]),
      };
    })
    .filter(Boolean) as Array<{ oxygen: number[]; hydrogens: number[][] }>;
  return {
    atoms: waters.flatMap((water) => [
      {
        kind: "sphere" as const,
        center: water.oxygen as [number, number, number],
        radius: 0.3,
        color: LIGHT_BLUE,
      },
      ...water.hydrogens.map((hydrogen) => ({
        kind: "sphere" as const,
        center: hydrogen as [number, number, number],
        radius: 0.18,
        color: WHITE,
      })),
    ]),
    bonds: [] as Array<{ kind: "cylinder"; start: [number, number, number]; end: [number, number, number]; radiusTop: number; radiusBottom: number; radialSegments: number; color: ColorValue }>,
  };
}

export function getTrajectoryPage(trajectory: AllAtomTrajectoryData | null, snapshotId: string) {
  return trajectory?.pages.find((page) => page.id === snapshotId) ?? null;
}

/** PBC-aware linear interpolation between two sets of atom positions. */
function interpolateAtoms(
  posA: number[][],
  posB: number[][],
  frac: number,
  boxLengths: number[] | undefined,
): number[][] {
  return posA.map((a, i) => {
    const b = posB[i];
    if (!b) return a;
    return a.map((val, dim) => {
      let delta = b[dim] - val;
      if (boxLengths && boxLengths[dim] > 0) {
        const L = boxLengths[dim];
        if (delta > L / 2) delta -= L;
        if (delta < -L / 2) delta += L;
      }
      return val + frac * delta;
    });
  });
}

/**
 * Get a display snapshot for a (possibly fractional) frame index.
 * Integer frames use the trajectory directly; fractional frames interpolate
 * atom positions between floor and ceil frames with PBC-aware blending.
 */
export function getDisplaySnapshot(
  snapshot: AllAtomSceneSnapshot,
  page: AllAtomTrajectoryPage | null,
  frameIndex: number,
): AllAtomSceneSnapshot {
  if (!page?.frames?.length) return snapshot;
  const frameCount = page.frames.length;
  const floor = Math.floor(frameIndex) % frameCount;
  const ceil = (floor + 1) % frameCount;
  const frac = frameIndex - Math.floor(frameIndex);

  const frameA = page.frames[floor] as AllAtomTrajectoryFrame | undefined;
  if (!frameA) return snapshot;

  // No interpolation needed for exact integer frames or very small fractions
  if (frac < 0.001 || floor === ceil) {
    return {
      ...snapshot,
      atoms: frameA.atoms,
      anchors: frameA.anchors ?? snapshot.anchors,
      phase: frameA.phase,
      frame: frameA.frame,
      timePs: frameA.timePs,
      box: frameA.box ?? snapshot.box,
    };
  }

  const frameB = page.frames[ceil] as AllAtomTrajectoryFrame | undefined;
  if (!frameB) {
    return {
      ...snapshot,
      atoms: frameA.atoms,
      anchors: frameA.anchors ?? snapshot.anchors,
      phase: frameA.phase,
      frame: frameA.frame,
      timePs: frameA.timePs,
      box: frameA.box ?? snapshot.box,
    };
  }

  const boxLengths = frameA.box?.lengths;
  const interpolatedAtoms = interpolateAtoms(frameA.atoms, frameB.atoms, frac, boxLengths);

  return {
    ...snapshot,
    atoms: interpolatedAtoms,
    anchors: frameA.anchors ?? snapshot.anchors,
    phase: frameA.phase,
    frame: frameA.frame,
    timePs: frameA.timePs + frac * ((frameB.timePs ?? 0) - (frameA.timePs ?? 0)),
    box: frameA.box ?? snapshot.box,
  };
}

export function derivePlacementSnapshot(snapshot: AllAtomSceneSnapshot, step: number) {
  // Only the padding. Target and radius come from the scene Mol* actually painted, read back
  // in MolstarAllAtomStage: the asset's camera describes the whole solvated box (10.4 A for
  // A5_readout, 10.7 A for A2_forcefield) while the readout page paints the 24-atom solute
  // and six waters and the force-field page adds a ghost of the second solute molecule.
  // Framed against the box, the scene rendered at 30% utilisation on every viewport.
  return {
    ...snapshot,
    camera: {
      ...(snapshot.camera ?? {} as Record<string, unknown>),
      padding: 1 / getAllAtomPagePolicy(step).targetOccupancy,
    } as AllAtomSceneSnapshot["camera"],
  };
}

/**
 * Force-field term cues, drawn as Molstar Shape primitives in the SAME scene as
 * the molecule (using the live per-frame atoms). Registered and coordinate-exact
 * — no parallel overlay canvas, no floating quantitative labels. Each selected
 * term shows WHERE it acts on the real atoms; the rail equation panel carries the
 * math. Mirrors the A6 measured-contact asset.
 */
function quadTriangles(
  quad: [number, number, number][],
  color: ColorValue,
): ResearchPrimitive[] {
  return [
    { kind: "triangle", a: quad[0], b: quad[1], c: quad[2], color, doubleSided: true },
    { kind: "triangle", a: quad[0], b: quad[2], c: quad[3], color, doubleSided: true },
  ];
}

function buildForceTermLayers(
  snapshot: AllAtomSceneSnapshot,
  activeTerm: AllAtomForceFieldTerm,
): ResearchLayerSpec[] {
  const atoms = snapshot.atoms;
  if (!atoms?.length) return [];
  const solid: ResearchPrimitive[] = [];
  const faint: ResearchPrimitive[] = [];

  switch (activeTerm) {
    case "Ubond": {
      for (const cue of computeBondCues(atoms)) {
        const color = cue.delta >= 0 ? AMBER : CYAN; // stretched vs compressed
        solid.push({
          kind: "cylinder", start: cue.a, end: cue.b,
          radiusTop: cue.liveRadius, radiusBottom: cue.liveRadius, radialSegments: 14, color,
        });
        solid.push({ kind: "sphere", center: cue.a, radius: 0.17, color });
        solid.push({ kind: "sphere", center: cue.b, radius: 0.17, color });
        // Equilibrium (rest) length ghost — the spring's natural length r0.
        faint.push({ kind: "dashed-cylinder", start: cue.a, end: cue.restEnd, radius: 0.032, dashCount: 6, color: SLATE });
      }
      break;
    }
    case "Uangle": {
      for (const cue of computeAngleCues(atoms)) {
        solid.push({ kind: "sphere", center: cue.j, radius: 0.2, color: GREEN });
        faint.push({ kind: "mesh", vertices: cue.wedgeVertices, faces: cue.wedgeFaces, color: GREEN, doubleSided: true });
      }
      break;
    }
    case "Udihedral": {
      const cue = computeDihedralCue(atoms);
      if (cue) {
        solid.push({
          kind: "cylinder", start: cue.axisStart, end: cue.axisEnd,
          radiusTop: 0.055, radiusBottom: 0.055, radialSegments: 12, color: AMBER,
        });
        solid.push({ kind: "sphere", center: cue.axisStart, radius: 0.15, color: AMBER });
        solid.push({ kind: "sphere", center: cue.axisEnd, radius: 0.15, color: AMBER });
        faint.push(...quadTriangles(cue.plane1Quad, PURPLE));
        faint.push(...quadTriangles(cue.plane2Quad, LIGHT_BLUE));
      }
      break;
    }
    case "UvdW": {
      for (const cue of computeVdwCues(atoms, snapshot.elements)) {
        const bridge = cue.regime === "clash" ? OXYGEN : cue.regime === "contact" ? PURPLE : SLATE;
        faint.push({ kind: "sphere", center: cue.a, radius: cue.radiusA * 0.5, color: PURPLE });
        faint.push({ kind: "sphere", center: cue.b, radius: cue.radiusB * 0.5, color: PURPLE });
        solid.push({ kind: "dashed-cylinder", start: cue.a, end: cue.b, radius: 0.05, dashCount: 7, color: bridge });
        solid.push({ kind: "sphere", center: cue.a, radius: 0.16, color: bridge });
        solid.push({ kind: "sphere", center: cue.b, radius: 0.16, color: bridge });
      }
      break;
    }
    case "UCoul": {
      for (const cue of computeCoulombCues(atoms, snapshot.charges ?? [])) {
        const cA = cue.qA < 0 ? OXYGEN : LIGHT_BLUE; // red = negative, blue = positive
        const cB = cue.qB < 0 ? OXYGEN : LIGHT_BLUE;
        const connector = cue.sign < 0 ? LIGHT_BLUE : OXYGEN; // attractive vs repulsive
        solid.push({ kind: "sphere", center: cue.a, radius: 0.2, color: cA });
        solid.push({ kind: "sphere", center: cue.b, radius: 0.2, color: cB });
        solid.push({ kind: "dashed-cylinder", start: cue.a, end: cue.b, radius: 0.045, dashCount: 8, color: connector });
      }
      break;
    }
  }

  const layers: ResearchLayerSpec[] = [];
  if (faint.length) {
    layers.push({
      label: "Force Term Context",
      primitives: faint,
      params: { alpha: 0.42, quality: "high", material: { metalness: 0, roughness: 0.66, bumpiness: 0 }, emissive: 0.12 },
    });
  }
  if (solid.length) {
    layers.push({
      label: "Force Term",
      primitives: solid,
      params: { alpha: 1, quality: "high", material: { metalness: 0.05, roughness: 0.5, bumpiness: 0.02 }, emissive: 0.22 },
    });
  }
  return layers;
}

export function buildAllAtomLayers(
  data: AllAtomStageData,
  scrollState: ScrollState,
  activeTerm: AllAtomForceFieldTerm | null,
  activeReadout: AllAtomReadoutId | null,
  frameIndex: number,
): ResearchLayerSpec[] {
  const step = scrollState.step;
  const sceneKey = getAllAtomSceneKey(step);
  const snapshot = getScheduledAllAtomSnapshot(data.system, step);
  if (!snapshot) return [];
  const pagePolicy = getAllAtomPagePolicy(step);
  const trajectoryPage = getTrajectoryPage(data.trajectory, snapshot.id);
  const displaySnapshot = getDisplaySnapshot(snapshot, trajectoryPage, frameIndex);

  const visuals = getAllAtomVisuals(step, scrollState.stepProgress);
  const viewSpec = getViewSpec("allatom", step);
  const renderSubsetId = viewSpec.renderSubsetId ?? viewSpec.cameraSubsetId;
  const visibleAtomIndices = getSubsetIndices(displaySnapshot, renderSubsetId, displaySnapshot.atoms.length);
  const visibleSet = new Set(visibleAtomIndices);
  const focusSet = new Set(displaySnapshot.focusAtomIndices ?? []);
  const stackResidues = new Set(displaySnapshot.stackResidueIds ?? []);
  const focusOnlySolute = sceneKey === "A6_observables";
  const ghostScaffold = sceneKey === "A3_forcefield";
  const localWaterLimit = pagePolicy.maxSupportObjects;

  // For ghost scaffold (step 1): compute 1-bond neighbors of focus atoms
  const focusNeighborSet = new Set<number>();
  if (ghostScaffold) {
    for (const [a, b] of displaySnapshot.bonds) {
      if (focusSet.has(a) && !focusSet.has(b)) focusNeighborSet.add(b);
      if (focusSet.has(b) && !focusSet.has(a)) focusNeighborSet.add(a);
    }
  }

  type AtomPrimitive = { kind: "sphere"; center: [number, number, number]; radius: number; color: ColorValue };
  const focusAtomPrimitives: AtomPrimitive[] = [];
  const neighborAtomPrimitives: AtomPrimitive[] = [];
  const scaffoldAtomPrimitives: AtomPrimitive[] = [];

  for (const index of visibleAtomIndices) {
    const element = displaySnapshot.elements[index] ?? "C";
    const residueName = displaySnapshot.residueNames[index] ?? "";
    if (residueName === "HOH" || residueName === "WAT") continue;
    const isFocus = focusSet.has(index);
    if (focusOnlySolute && !isFocus) continue;
    const isNeighbor = ghostScaffold && !isFocus && focusNeighborSet.has(index);
    const isScaffold = ghostScaffold && !isFocus && !isNeighbor;
    if (isScaffold) {
      // Skip water-neighboring scaffolds that add no context
      const residueName2 = displaySnapshot.residueNames[index] ?? "";
      if (residueName2 === "HOH" || residueName2 === "WAT") continue;
    }
    const residueId = displaySnapshot.residueIds[index] ?? -1;
    const isStack = stackResidues.has(residueId) && !isFocus;

    const baseColor = element === "O"
      ? OXYGEN
      : element === "N"
        ? NITROGEN
        : ELEMENT_COLORS[element] ?? CARBON;

    let color = baseColor;
    if (isFocus) {
      color = mixColor(baseColor, CYAN, element === "H" ? 0.25 : 0.7);
    } else if (isNeighbor) {
      color = mixColor(baseColor, SLATE, 0.4);
    } else if (isScaffold) {
      color = mixColor(baseColor, SLATE, 0.65);
    } else if (isStack) {
      const stackMix = sceneKey === "A6_observables"
        ? (activeReadout === "motif" ? (element === "H" ? 0.25 : 0.72) : (element === "H" ? 0.12 : 0.36))
        : (element === "H" ? 0.18 : 0.5);
      color = mixColor(baseColor, AMBER, stackMix);
    }

    const prim: AtomPrimitive = {
      kind: "sphere" as const,
      center: displaySnapshot.atoms[index] as [number, number, number],
      radius: element === "H" ? 0.22 : (ELEMENT_RADII[element] ?? 0.42),
      color,
    };

    if (isFocus) focusAtomPrimitives.push(prim);
    else if (isNeighbor) neighborAtomPrimitives.push(prim);
    else if (isScaffold) scaffoldAtomPrimitives.push(prim);
    else focusAtomPrimitives.push(prim); // non-ghost steps: all go into primary
  }
  const soluteAtomPrimitives = ghostScaffold ? focusAtomPrimitives : [...focusAtomPrimitives, ...neighborAtomPrimitives, ...scaffoldAtomPrimitives];

  const selectedWaters =
    localWaterLimit > 0 ? buildSelectedWaterPrimitives(displaySnapshot, visibleAtomIndices, localWaterLimit) : null;
  const waterAtomPrimitives = selectedWaters
    ? selectedWaters.atoms
    : visibleAtomIndices.flatMap((index) => {
        const residueName = displaySnapshot.residueNames[index] ?? "";
        if (residueName !== "HOH" && residueName !== "WAT") return [];
        const element = displaySnapshot.elements[index] ?? "H";
        return [
          {
            kind: "sphere" as const,
            center: displaySnapshot.atoms[index] as [number, number, number],
            radius: element === "O" ? 0.28 : 0.16,
            color: element === "O" ? LIGHT_BLUE : WHITE,
          },
        ];
      });

  type BondPrimitive = { kind: "cylinder"; start: [number, number, number]; end: [number, number, number]; radiusTop: number; radiusBottom: number; radialSegments: number; color: ColorValue };
  const focusBondPrimitives: BondPrimitive[] = [];
  const neighborBondPrimitives: BondPrimitive[] = [];
  const scaffoldBondPrimitives: BondPrimitive[] = [];

  for (const [left, right] of displaySnapshot.bonds) {
    if (!visibleSet.has(left) || !visibleSet.has(right)) continue;
    const leftElement = displaySnapshot.elements[left] ?? "C";
    const rightElement = displaySnapshot.elements[right] ?? "C";
    const leftResidue = displaySnapshot.residueNames[left] ?? "";
    const rightResidue = displaySnapshot.residueNames[right] ?? "";
    const isWaterBond = (leftResidue === "HOH" || leftResidue === "WAT") && (rightResidue === "HOH" || rightResidue === "WAT");
    if (isWaterBond) continue;
    const leftFocus = focusSet.has(left);
    const rightFocus = focusSet.has(right);
    if (focusOnlySolute && !(leftFocus && rightFocus)) continue;

    // Ghost scaffold: classify bond by lowest-tier atom
    if (ghostScaffold && !leftFocus && !rightFocus && !focusNeighborSet.has(left) && !focusNeighborSet.has(right)) {
      // Both atoms are scaffold — scaffold bond
    } else if (ghostScaffold && !(leftFocus && rightFocus) && !((leftFocus || focusNeighborSet.has(left)) && (rightFocus || focusNeighborSet.has(right)))) {
      // At least one atom is scaffold — scaffold bond
    }

    const leftRadius = ELEMENT_RADII[leftElement] ?? 0.42;
    const rightRadius = ELEMENT_RADII[rightElement] ?? 0.42;
    const shortened = trimBondEndpoints(
      displaySnapshot.atoms[left],
      displaySnapshot.atoms[right],
      leftRadius,
      rightRadius,
    );
    const sameFocus = leftFocus && rightFocus;
    const sameStack = stackResidues.has(displaySnapshot.residueIds[left] ?? -1) && stackResidues.has(displaySnapshot.residueIds[right] ?? -1);
    const color = sameFocus ? CYAN : sameStack ? AMBER : SLATE;

    const prim: BondPrimitive = {
      kind: "cylinder" as const,
      start: shortened.start,
      end: shortened.end,
      radiusTop: 0.034,
      radiusBottom: 0.034,
      radialSegments: 10,
      color,
    };

    if (ghostScaffold) {
      // Tier by the lowest-tier atom in the pair
      const leftIsNeighbor = focusNeighborSet.has(left);
      const rightIsNeighbor = focusNeighborSet.has(right);
      if (leftFocus && rightFocus) {
        focusBondPrimitives.push(prim);
      } else if ((leftFocus || leftIsNeighbor) && (rightFocus || rightIsNeighbor)) {
        neighborBondPrimitives.push(prim);
      } else {
        scaffoldBondPrimitives.push(prim);
      }
    } else {
      focusBondPrimitives.push(prim);
    }
  }
  const soluteBondPrimitives = ghostScaffold ? focusBondPrimitives : [...focusBondPrimitives, ...neighborBondPrimitives, ...scaffoldBondPrimitives];

  // Water bonds omitted: at low support opacity (10-22%) bonds penetrate
  // semi-transparent spheres and look unprofessional. Atoms alone convey
  // the water geometry.
  const waterBondPrimitives: typeof waterAtomPrimitives = [];

  const layers: ResearchLayerSpec[] = [
    {
      label: "Solute Snapshot",
      primitives: [...soluteAtomPrimitives, ...soluteBondPrimitives],
      params: {
        alpha: visuals.primaryStructuralOpacity,
        quality: "high",
        material: { metalness: 0.06, roughness: 0.44, bumpiness: 0.03 },
        emissive: sceneKey === "A6_observables" && activeReadout === "motif" ? 0.14 : 0.03,
      },
    },
  ];

  // Ghost scaffold layers for step 1: neighbor (~40%) and scaffold (~12%)
  if (ghostScaffold && neighborAtomPrimitives.length + neighborBondPrimitives.length > 0) {
    layers.push({
      label: "Solute Neighbors",
      primitives: [...neighborAtomPrimitives, ...neighborBondPrimitives],
      params: {
        alpha: 0.25 * visuals.primaryStructuralOpacity,
        quality: "high",
        material: { metalness: 0.02, roughness: 0.6, bumpiness: 0 },
        emissive: 0.01,
      },
    });
  }
  if (ghostScaffold && scaffoldAtomPrimitives.length + scaffoldBondPrimitives.length > 0) {
    layers.push({
      label: "Solute Scaffold",
      primitives: [...scaffoldAtomPrimitives, ...scaffoldBondPrimitives],
      params: {
        alpha: 0.06 * visuals.primaryStructuralOpacity,
        quality: "high",
        material: { metalness: 0, roughness: 0.7, bumpiness: 0 },
        emissive: 0,
      },
    });
  }

  layers.push({
    label: "Explicit Water",
    primitives: [...waterAtomPrimitives, ...waterBondPrimitives],
    params: {
      alpha: visuals.supportStructuralOpacity,
      quality: "high",
      material: { metalness: 0.02, roughness: 0.58, bumpiness: 0.01 },
      emissive: 0.01,
    },
  });

  if (sceneKey === "A3_forcefield" && activeTerm) {
    layers.push(...buildForceTermLayers(displaySnapshot, activeTerm));
  }

  if (sceneKey === "A6_observables" && activeReadout === "packing" && displaySnapshot.stackPlanes) {
    layers.push(
      ...buildRingLayers(displaySnapshot, 0.9).map((layer) => ({
        ...layer,
        params: {
          ...(layer.params ?? {}),
          alpha: Number(layer.params?.alpha ?? 0.18),
          emissive: Number(layer.params?.emissive ?? 0.12),
        },
      })),
    );
  }

  if (
    sceneKey === "A6_observables" &&
    activeReadout === "orientation" &&
    displaySnapshot.polarContacts?.length
  ) {
    layers.push(...buildMeasuredContact(displaySnapshot));
  }

  return layers;
}

/**
 * Compute alpha/emissive for each layer label without rebuilding geometry.
 * Used for emphasis-only updates (activeTerm/activeReadout changes).
 */
export function computeLayerEmphasis(
  step: number,
  stepProgress: number,
  activeReadout: AllAtomReadoutId | null,
): Array<{ label: string; alpha: number; emissive: number }> {
  const sceneKey = getAllAtomSceneKey(step);
  const visuals = getAllAtomVisuals(step, stepProgress);

  const result: Array<{ label: string; alpha: number; emissive: number }> = [
    {
      label: "Solute Snapshot",
      alpha: visuals.primaryStructuralOpacity,
      emissive: sceneKey === "A6_observables" && activeReadout === "motif" ? 0.14 : 0.03,
    },
    {
      label: "Explicit Water",
      alpha: visuals.supportStructuralOpacity,
      emissive: 0.01,
    },
  ];

  const ringAlpha = sceneKey === "A6_observables" && activeReadout === "packing" ? 1 : 0;
  result.push(
    { label: "Aromatic Stacking", alpha: 0.18 * ringAlpha, emissive: 0.12 * ringAlpha },
    { label: "Stack Connectors", alpha: 0.82 * ringAlpha, emissive: 0.24 * ringAlpha },
  );

  const contactAlpha = sceneKey === "A6_observables" && activeReadout === "orientation" ? 1 : 0;
  result.push({
    label: "Measured Contact",
    alpha: 0.96 * contactAlpha,
    emissive: 0.12 * contactAlpha,
  });

  if (sceneKey === "A3_forcefield") {
    result.push(
      { label: "Solute Neighbors", alpha: 0.25 * visuals.primaryStructuralOpacity, emissive: 0.01 },
      { label: "Solute Scaffold", alpha: 0.06 * visuals.primaryStructuralOpacity, emissive: 0 },
    );
  }

  return result;
}
