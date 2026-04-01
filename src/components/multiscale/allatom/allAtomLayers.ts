import type { AllAtomSceneSnapshot, AllAtomSystemData, AllAtomTrajectoryData, AllAtomTrajectoryFrame, AllAtomTrajectoryPage } from "../data/allatomSolvent";
import type { ScrollState } from "../scrollState";
import { getViewSpec } from "../multiscaleViewSchedule";
import { getSubsetIndices } from "../multiscaleViewRuntime";
import { getAllAtomVisuals, getScheduledAllAtomSnapshot } from "./allAtomConfig";
import { forceFieldTermFamily, getAllAtomPagePolicy, type AllAtomForceFieldTerm, type AllAtomReadoutId } from "./allAtomConfig";
import { computeCueAnchorPoint } from "./forceCue";
import {
  AMBER,
  CARBON,
  CYAN,
  ELEMENT_COLORS,
  ELEMENT_RADII,
  LIGHT_BLUE,
  NITROGEN,
  ORANGE,
  OXYGEN,
  SLATE,
  WHITE,
  mixColor,
  type ColorValue,
  type ResearchLayerSpec,
} from "../molstar/shared";

export interface AllAtomStageData {
  system: AllAtomSystemData;
  trajectory: AllAtomTrajectoryData | null;
}

export function shortenBond(
  start: number[],
  end: number[],
  radiusStart: number,
  radiusEnd: number,
): { start: [number, number, number]; end: [number, number, number] } {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6) {
    return {
      start: start as [number, number, number],
      end: end as [number, number, number],
    };
  }
  const nx = dx / len;
  const ny = dy / len;
  const nz = dz / len;
  return {
    start: [start[0] + nx * radiusStart, start[1] + ny * radiusStart, start[2] + nz * radiusStart],
    end: [end[0] - nx * radiusEnd, end[1] - ny * radiusEnd, end[2] - nz * radiusEnd],
  };
}

export function buildDiscMesh(center: number[], normal: number[], radius: number, segments = 20) {
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

export function buildBoxLayer(lengths: number[] | undefined, color = CYAN, label = "Periodic Box"): ResearchLayerSpec[] {
  if (!lengths || lengths.length < 3) return [];
  const [lx, ly, lz] = lengths;
  const hx = lx / 2;
  const hy = ly / 2;
  const hz = lz / 2;
  const corners: [number, number, number][] = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  return [
    {
      label,
      primitives: [
        ...edges.map(([left, right]) => ({
          kind: "cylinder" as const,
          start: corners[left],
          end: corners[right],
          radiusTop: 0.06,
          radiusBottom: 0.06,
          radialSegments: 10,
          color,
        })),
        ...corners.map((corner) => ({
          kind: "sphere" as const,
          center: corner,
          radius: 0.11,
          color,
        })),
      ],
      params: {
        alpha: 0.5,
        quality: "high",
        material: { metalness: 0.04, roughness: 0.24, bumpiness: 0 },
        emissive: 0.28,
      },
    },
  ];
}

export function buildTrailLayer(snapshot: AllAtomSceneSnapshot, color = AMBER, alpha = 0.68): ResearchLayerSpec[] {
  if (!snapshot.trails?.length) return [];
  return [
    {
      label: "Trajectory Trails",
      primitives: snapshot.trails.flatMap((trail) => [
        ...trail.points.map((point, index) => ({
          kind: "sphere" as const,
          center: point as [number, number, number],
          radius: Math.max(0.12, 0.19 - index * 0.01),
          color,
        })),
        ...trail.points.slice(0, -1).map((point, index) => ({
          kind: "cylinder" as const,
          start: point as [number, number, number],
          end: trail.points[index + 1] as [number, number, number],
          radiusTop: 0.05,
          radiusBottom: 0.05,
          radialSegments: 10,
          color,
        })),
      ]),
      params: {
        alpha,
        quality: "high",
        material: { metalness: 0, roughness: 0.4, bumpiness: 0 },
        emissive: 0.22,
      },
    },
  ];
}

export function buildRingLayers(snapshot: AllAtomSceneSnapshot, phase: number): ResearchLayerSpec[] {
  if (!snapshot.stackPlanes?.length) return [];
  const planeColors = [CYAN, AMBER, ORANGE];
  const planes = snapshot.stackPlanes.map((plane, index) => {
    const mesh = buildDiscMesh(plane.center, plane.normal, plane.radius);
    return {
      kind: "mesh" as const,
      vertices: mesh.vertices,
      faces: mesh.faces,
      color: planeColors[index] ?? LIGHT_BLUE,
    };
  });

  const connectors = snapshot.stackPairs?.map((pair) => ({
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

export function buildPolarContacts(snapshot: AllAtomSceneSnapshot): ResearchLayerSpec[] {
  if (!snapshot.polarContacts?.length) return [];
  return [
    {
      label: "Hydrogen Bond Contacts",
      primitives: snapshot.polarContacts.flatMap((contact) => [
        {
          kind: "dashed-cylinder" as const,
          start: contact.acceptor as [number, number, number],
          end: contact.hydrogen as [number, number, number],
          radius: 0.045,
          dashCount: 7,
          color: AMBER,
        },
        {
          kind: "sphere" as const,
          center: contact.acceptor as [number, number, number],
          radius: 0.14,
          color: AMBER,
        },
      ]),
      params: {
        alpha: 0.86,
        quality: "high",
        material: { metalness: 0, roughness: 0.44, bumpiness: 0 },
        emissive: 0.3,
      },
    },
  ];
}

export function buildSelectedWaterPrimitives(
  snapshot: AllAtomSceneSnapshot,
  visibleAtomIndices: number[],
  maxWaters: number,
) {
  const selectedResidues: number[] = [];
  for (const index of visibleAtomIndices) {
    const residueName = snapshot.residueNames[index] ?? "";
    const residueId = snapshot.residueIds[index];
    if ((residueName === "HOH" || residueName === "WAT") && typeof residueId === "number" && !selectedResidues.includes(residueId)) {
      selectedResidues.push(residueId);
      if (selectedResidues.length >= maxWaters) break;
    }
  }
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
    bonds: waters.flatMap((water) =>
      water.hydrogens.map((hydrogen) => ({
        kind: "cylinder" as const,
        start: water.oxygen as [number, number, number],
        end: hydrogen as [number, number, number],
        radiusTop: 0.022,
        radiusBottom: 0.022,
        radialSegments: 8,
        color: WHITE,
      })),
    ),
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

export function derivePlacementSnapshot(
  snapshot: AllAtomSceneSnapshot,
  step: number,
  activeTerm?: AllAtomForceFieldTerm | null,
) {
  const pagePolicy = getAllAtomPagePolicy(step);
  const derivedCamera = {
    ...(snapshot.camera ?? {} as Record<string, unknown>),
    padding: 1 / pagePolicy.targetOccupancy,
  } as AllAtomSceneSnapshot["camera"];

  // Cue-aware camera targeting for step 1
  if (step === 1 && activeTerm && snapshot.atoms?.length) {
    const cueTarget = computeCueAnchorPoint(activeTerm, snapshot.atoms);
    if (cueTarget && derivedCamera) {
      derivedCamera.target = cueTarget;
    }
  }

  if (pagePolicy.boxAllowed && pagePolicy.globalSceneRequired && snapshot.box?.lengths?.length === 3) {
    const [lx, ly, lz] = snapshot.box.lengths;
    const radius = Math.hypot(lx, ly, lz) * 0.5;
    return {
      ...snapshot,
      camera: {
        ...derivedCamera,
        radius,
      },
    };
  }

  return {
    ...snapshot,
    camera: derivedCamera,
  };
}

/* ── Vec3 utilities ── */

export function vec3Sub(a: number[], b: number[]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function vec3Dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function vec3Len(a: number[]): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}
export function vec3Normalize(a: number[]): [number, number, number] {
  const len = vec3Len(a) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}
export function vec3Scale(a: number[], s: number): [number, number, number] {
  return [a[0] * s, a[1] * s, a[2] * s];
}
export function vec3Add(a: number[], b: number[]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function vec3Cross(a: number[], b: number[]): [number, number, number] {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}

export function buildAllAtomLayers(
  data: AllAtomStageData,
  scrollState: ScrollState,
  phase: number,
  activeTerm: AllAtomForceFieldTerm | null,
  activeReadout: AllAtomReadoutId | null,
  frameIndex: number,
): ResearchLayerSpec[] {
  const step = scrollState.step;
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
  const focusOnlySolute = step === 2 || step === 4; // step 1 uses ghost scaffold instead
  const ghostScaffold = step === 1; // 3-tier rendering: focus / neighbor / scaffold
  const localWaterLimit = pagePolicy.globalSceneRequired ? 0 : pagePolicy.maxSupportObjects;
  const activeFamily = activeTerm ? forceFieldTermFamily(activeTerm) : null;

  // For ghost scaffold (step 1): compute 1-bond neighbors of focus atoms
  let focusNeighborSet = new Set<number>();
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
      const stackMix = step === 4 ? (activeReadout === "motif" ? (element === "H" ? 0.25 : 0.72) : (element === "H" ? 0.12 : 0.36)) : (element === "H" ? 0.18 : 0.5);
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
    const shortened = shortenBond(displaySnapshot.atoms[left], displaySnapshot.atoms[right], leftRadius, rightRadius);
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

  const waterBondPrimitives = selectedWaters
    ? selectedWaters.bonds
    : displaySnapshot.bonds.flatMap(([left, right]) => {
        if (!visibleSet.has(left) || !visibleSet.has(right)) return [];
        const leftResidue = displaySnapshot.residueNames[left] ?? "";
        const rightResidue = displaySnapshot.residueNames[right] ?? "";
        const isWaterBond = (leftResidue === "HOH" || leftResidue === "WAT") && (rightResidue === "HOH" || rightResidue === "WAT");
        if (!isWaterBond) return [];
        const shortened = shortenBond(displaySnapshot.atoms[left], displaySnapshot.atoms[right], 0.18, 0.18);
        return [
          {
            kind: "cylinder" as const,
            start: shortened.start,
            end: shortened.end,
            radiusTop: 0.022,
            radiusBottom: 0.022,
            radialSegments: 8,
            color: WHITE,
          },
        ];
      });

  const layers: ResearchLayerSpec[] = [
    {
      label: "Solute Snapshot",
      primitives: [...soluteAtomPrimitives, ...soluteBondPrimitives],
      params: {
        alpha: visuals.primaryStructuralOpacity,
        quality: "high",
        material: { metalness: 0.06, roughness: 0.44, bumpiness: 0.03 },
        emissive: step === 4 && activeReadout === "motif" ? 0.14 : 0.03,
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

  if (pagePolicy.boxAllowed && displaySnapshot.box?.lengths && visuals.boxMode !== "none") {
    layers.push(...buildBoxLayer(displaySnapshot.box.lengths, CYAN, "Periodic Box").map((layer) => ({
      ...layer,
      params: {
        ...(layer.params ?? {}),
        alpha: 0.06 + visuals.boxGlow * 0.06,
        emissive: 0.06 + visuals.boxGlow * 0.1,
      },
    })));
  }

  // Ring layers: step 4 (readout page) or non-FF steps with bonded cue. NOT on step 1 — FF term layers handle it.
  if (step !== 1 && displaySnapshot.stackPlanes && (activeFamily === "bonded" || visuals.bondedCue > 0.02 || (step === 4 && (activeReadout === "packing" || activeReadout === null)))) {
    layers.push(
      ...buildRingLayers(displaySnapshot, activeFamily === "bonded" ? 1 : step === 4 && activeReadout === "packing" ? 0.9 : step === 4 && activeReadout === null ? 0.38 : visuals.bondedCue).map((layer) => ({
        ...layer,
        params: {
          ...(layer.params ?? {}),
          alpha: Number(layer.params?.alpha ?? 0.18) * (activeFamily === "bonded" ? 1 : step === 4 && activeReadout === "packing" ? 1.0 : step === 4 && activeReadout === null ? 0.48 : visuals.bondedCue),
          emissive: Number(layer.params?.emissive ?? 0.12) * (activeFamily === "bonded" ? 1 : step === 4 && activeReadout === "packing" ? 1.0 : step === 4 && activeReadout === null ? 0.46 : 0.6 + visuals.bondedCue * 0.4),
        },
      })),
    );
  }

  // Polar contacts: step 4 (readout page) or non-FF steps with nonbonded cue. NOT on step 1 — FF term layers handle it.
  if (step !== 1 && displaySnapshot.polarContacts && (activeFamily === "nonbonded" || visuals.nonBondedCue > 0.02 || (step === 4 && (activeReadout === "orientation" || activeReadout === null)))) {
    layers.push(
      ...buildPolarContacts(displaySnapshot).map((layer) => ({
        ...layer,
        params: {
          ...(layer.params ?? {}),
          alpha: Number(layer.params?.alpha ?? 0.86) * (activeFamily === "nonbonded" ? 1 : step === 4 && activeReadout === "orientation" ? 1.0 : step === 4 && activeReadout === null ? 0.44 : visuals.nonBondedCue),
          emissive: Number(layer.params?.emissive ?? 0.3) * (activeFamily === "nonbonded" ? 1 : step === 4 && activeReadout === "orientation" ? 1.0 : step === 4 && activeReadout === null ? 0.42 : 0.55 + visuals.nonBondedCue * 0.45),
        },
      })),
    );
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
  activeTerm: AllAtomForceFieldTerm | null,
  activeReadout: AllAtomReadoutId | null,
): Array<{ label: string; alpha: number; emissive: number }> {
  const visuals = getAllAtomVisuals(step, stepProgress);
  const activeFamily = activeTerm ? forceFieldTermFamily(activeTerm) : null;

  const result: Array<{ label: string; alpha: number; emissive: number }> = [
    {
      label: "Solute Snapshot",
      alpha: visuals.primaryStructuralOpacity,
      emissive: step === 4 && activeReadout === "motif" ? 0.14 : 0.03,
    },
    {
      label: "Explicit Water",
      alpha: visuals.supportStructuralOpacity,
      emissive: 0.01,
    },
  ];

  if (visuals.boxMode !== "none") {
    result.push({
      label: "Periodic Box",
      alpha: 0.06 + visuals.boxGlow * 0.06,
      emissive: 0.06 + visuals.boxGlow * 0.1,
    });
  }

  // Aromatic stacking layers
  const ringAlpha = activeFamily === "bonded" ? 1 : step === 4 && activeReadout === "packing" ? 1.0 : step === 4 && activeReadout === null ? 0.48 : visuals.bondedCue;
  const ringEmissive = activeFamily === "bonded" ? 1 : step === 4 && activeReadout === "packing" ? 1.0 : step === 4 && activeReadout === null ? 0.46 : 0.6 + visuals.bondedCue * 0.4;
  result.push(
    { label: "Aromatic Stacking", alpha: 0.18 * ringAlpha, emissive: 0.12 * ringEmissive },
    { label: "Stack Connectors", alpha: 0.82 * ringAlpha, emissive: 0.24 * ringEmissive },
  );

  // Polar contacts
  const hbAlpha = activeFamily === "nonbonded" ? 1 : step === 4 && activeReadout === "orientation" ? 1.0 : step === 4 && activeReadout === null ? 0.44 : visuals.nonBondedCue;
  const hbEmissive = activeFamily === "nonbonded" ? 1 : step === 4 && activeReadout === "orientation" ? 1.0 : step === 4 && activeReadout === null ? 0.42 : 0.55 + visuals.nonBondedCue * 0.45;
  result.push({
    label: "Hydrogen Bond Contacts",
    alpha: 0.86 * hbAlpha,
    emissive: 0.3 * hbEmissive,
  });

  // Ghost scaffold layers (step 1)
  if (step === 1) {
    result.push(
      { label: "Solute Neighbors", alpha: 0.25 * visuals.primaryStructuralOpacity, emissive: 0.01 },
      { label: "Solute Scaffold", alpha: 0.06 * visuals.primaryStructuralOpacity, emissive: 0 },
    );
  }

  return result;
}
