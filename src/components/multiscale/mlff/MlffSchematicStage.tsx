"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { useMeasuredBox } from "../useMeasuredBox";
import { Vec3, Vec4 } from "molstar/lib/mol-math/linear-algebra.js";
import { Color } from "molstar/lib/mol-util/color/color.js";
import { ELEMENT_HEX, ballAndStick, shortestHeavyBond } from "../ballAndStick";
import { withBasePath } from "@/lib/basePath";
import type { ResearchCameraActions } from "../molstar/shared";
import { MULTISCALE_TYPE } from "../visualRules";
import { useMultiscaleCanvasColor } from "../useMultiscaleCanvasColor";
import { useTheme } from "@/providers/ThemeProvider";
import {
  AMBER,
  BLUE,
  CYAN,
  GREEN,
  ORANGE,
  PURPLE,
  SLATE,
  WHITE,
  type CameraSnapshotLike,
  type PluginLike,
  type ResearchLayerSpec,
  type ResearchPrimitive,
  applyResearchCanvasBackground,
  commitResearchLayers,
  fitScene,
  mountResearchPlugin,
  scaleSnapshot,
} from "../molstar/shared";

type Vec3Tuple = [number, number, number];
type MlffViewportVariant = "dataset" | "pes" | "local" | "forces";

interface ProjectionAnchor {
  id: string;
  point: Vec3Tuple;
  atomIndex?: number;
  distance?: number;
}

interface ProjectedAnchor extends ProjectionAnchor {
  x: number;
  y: number;
  depth: number;
}

interface ProjectedLayout {
  width: number;
  height: number;
  cutoffRadius: number | null;
  cutoffBoundary: Array<{ x: number; y: number }>;
  anchors: ProjectedAnchor[];
}

interface MoleculeData {
  atoms: number[][];
  elements: string[];
  bonds: number[][];
}

interface MlffSystemData extends MoleculeData {
  focusIndex: number;
  cutoff: number;
  lengthUnit?: "angstrom";
  forces: number[][];
  subsets?: Record<string, { indices: number[] }>;
}

interface MlffVisualData {
  molecule: MoleculeData;
  system: MlffSystemData;
}

interface MlffSchematicStageProps {
  mobileSceneHeight?: number;
  sceneKey?: string;
  lang?: string;
  isMobile: boolean;
  reducedMotion?: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
}

// One palette for every scene that draws atoms; see ballAndStick.ts. This glyph carried its
// own set, so the same water sat next to the all-atom tier in a different red.
const COLORS: Record<string, Color> = Object.fromEntries(
  Object.entries(ELEMENT_HEX).map(([element, hex]) => [element, Color.fromHexStyle(hex)]),
);

// Atom and bond radii scale with the molecule, so a configuration drawn at any `scale` keeps
// its proportions. The multiplier restores the on-screen thickness the old
// `RADII * sqrt(scale)` law happened to produce at scale 0.31, without its side effect: under
// a square root the radius fell more slowly than the positions, so every smaller
// configuration came out fatter than the last. Correcting that alone drew the dataset rows —
// solved down to scale 0.26 so they fit their frames — as specks joined by hairlines.
/**
 * Sizes come from `ballAndStick`, which caps a ball against the bond it sits on. This glyph
 * used to multiply its radii by 1.8 without touching the positions, so every ball was drawn
 * 1.8 times wider than its own spacing allowed and the atoms swallowed each other; the stick
 * beside them sat at 0.155 of a ball against the all-atom tier's 0.35. Both are derived now.
 */

// How much room to leave around a fitted scene.
const FIT_MARGIN = 1.05;

// Mol* fits the bounding sphere into the narrow side of the canvas. The force panel holds the
// 16 atoms inside the cutoff, a sparse cloud that drew at about a quarter of its tall canvas
// that way. Keep Mol*'s view direction, centre on what is drawn, and fit its projected width
// and height instead. Relative to the fitted camera, so it needs neither the fov nor Mol*'s scale.
function fitToDrawnExtent(
  fitted: CameraSnapshotLike,
  layers: ResearchLayerSpec[],
  width: number,
  height: number,
  margin: number,
): CameraSnapshotLike {
  const extents: { point: Vec3; radius: number }[] = [];
  for (const primitive of layers.flatMap((layer) => layer.primitives)) {
    if (primitive.kind === "sphere") {
      extents.push({ point: Vec3.create(...primitive.center), radius: primitive.radius });
    } else if (primitive.kind === "cylinder") {
      const radius = Math.max(primitive.radiusTop, primitive.radiusBottom);
      extents.push({ point: Vec3.create(...primitive.start), radius }, { point: Vec3.create(...primitive.end), radius });
    }
  }
  if (!extents.length || width <= 0 || height <= 0 || fitted.radius <= 0) return scaleSnapshot(fitted, margin);

  const forward = Vec3.normalize(Vec3(), Vec3.sub(Vec3(), fitted.target, fitted.position));
  // Mol*'s snapshot carries `up`; the shared type leaves it out.
  const viewUp = (fitted as CameraSnapshotLike & { up?: Vec3 }).up ?? Vec3.create(0, 1, 0);
  const right = Vec3.normalize(Vec3(), Vec3.cross(Vec3(), forward, viewUp));
  const up = Vec3.cross(Vec3(), right, forward);
  const span = (axis: Vec3) => {
    const lo = Math.min(...extents.map(({ point, radius }) => Vec3.dot(point, axis) - radius));
    const hi = Math.max(...extents.map(({ point, radius }) => Vec3.dot(point, axis) + radius));
    return { mid: (lo + hi) / 2, half: (hi - lo) / 2 };
  };
  const x = span(right);
  const y = span(up);
  const z = span(forward);
  const target = Vec3.add(
    Vec3(),
    Vec3.add(Vec3(), Vec3.scale(Vec3(), right, x.mid), Vec3.scale(Vec3(), up, y.mid)),
    Vec3.scale(Vec3(), forward, z.mid),
  );
  // At the fitted distance Mol* shows `radius` on the half of the narrow side.
  const fittedHalfWidth = fitted.radius * (width / Math.min(width, height));
  const neededHalfWidth = margin * Math.max(x.half, y.half * (width / height));
  const distance = Vec3.distance(fitted.position, fitted.target) * (neededHalfWidth / fittedHalfWidth);
  const radius = margin * Math.max(...extents.map(({ point, radius: r }) => Vec3.distance(point, target) + r));
  return {
    ...fitted,
    target,
    position: Vec3.sub(Vec3(), target, Vec3.scale(Vec3(), forward, distance)),
    radius,
    radiusMax: Math.max(fitted.radiusMax ?? 0, radius),
  };
}

function centroid(atoms: number[][], indices?: number[]): Vec3Tuple {
  const selected = indices?.length ? indices : atoms.map((_, index) => index);
  if (!selected.length) return [0, 0, 0];
  const sum = selected.reduce(
    (acc, index) => {
      const atom = atoms[index];
      acc[0] += atom[0];
      acc[1] += atom[1];
      acc[2] += atom[2];
      return acc;
    },
    [0, 0, 0] as Vec3Tuple,
  );
  return [sum[0] / selected.length, sum[1] / selected.length, sum[2] / selected.length];
}

function rotatePoint([x, y, z]: Vec3Tuple, rotate: Vec3Tuple): Vec3Tuple {
  const [rx, ry, rz] = rotate;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  const x2 = x * cy + z1 * sy;
  const z2 = -x * sy + z1 * cy;
  return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
}

interface MoleculeTransform {
  center: Vec3Tuple;
  scale: number;
  rotate?: Vec3Tuple;
  translate?: Vec3Tuple;
  perturbation?: number;
  phase?: number;
}

function transformAtom(
  point: number[],
  atomIndex: number,
  transform: MoleculeTransform,
): Vec3Tuple {
  const phase = transform.phase ?? 0;
  const perturbation = transform.perturbation ?? 0;
  const centered: Vec3Tuple = [
    (point[0] - transform.center[0]) * transform.scale,
    (point[1] - transform.center[1]) * transform.scale,
    (point[2] - transform.center[2]) * transform.scale,
  ];
  const distorted: Vec3Tuple = [
    centered[0] + Math.sin((atomIndex + 1) * 1.31 + phase) * perturbation,
    centered[1] + Math.cos((atomIndex + 1) * 0.93 + phase) * perturbation * 0.65,
    centered[2] + Math.sin((atomIndex + 1) * 0.71 + phase) * perturbation * 0.5,
  ];
  const rotated = rotatePoint(distorted, transform.rotate ?? [0, 0, 0]);
  const translate = transform.translate ?? [0, 0, 0];
  return [rotated[0] + translate[0], rotated[1] + translate[1], rotated[2] + translate[2]];
}

function moleculePrimitives(
  data: MoleculeData,
  transform: MoleculeTransform,
  indices?: number[],
  reverseAtomOrder = false,
): ResearchPrimitive[] {
  const selected = indices?.length ? indices : data.atoms.map((_, index) => index);
  const selectedSet = new Set(selected);
  // Measured on this molecule's own untransformed coordinates, so the cap holds whatever
  // `transform.scale` the layout solved for.
  const geometry = ballAndStick(
    shortestHeavyBond(
      data.atoms.flat(),
      data.bonds as [number, number][],
      data.elements,
    ),
    data.elements,
  );
  const coordinates = new Map<number, Vec3Tuple>();
  selected.forEach((index) => {
    coordinates.set(index, transformAtom(data.atoms[index], index, transform));
  });

  const primitives: ResearchPrimitive[] = [];
  data.bonds.forEach((bond) => {
    const [a, b] = bond;
    const aIn = selectedSet.has(a);
    const bIn = selectedSet.has(b);
    if (!aIn && !bIn) return;

    // A bond with one end outside the selection is drawn as a stub toward the atom that is not
    // there. A cutoff sphere cuts molecules — that is what a cutoff does, and the descriptor
    // really does read these atoms and not their partners — but with nothing drawn at all, a
    // water straddling the boundary contributed two bare hydrogens that read as free H atoms
    // floating in water. The stub says the molecule continues outside the sphere without adding
    // an atom the model does not see.
    if (aIn !== bIn) {
      const innerIndex = aIn ? a : b;
      const outerIndex = aIn ? b : a;
      const from = coordinates.get(innerIndex);
      if (!from) return;
      const to = transformAtom(data.atoms[outerIndex], outerIndex, transform);
      const stub: Vec3Tuple = [
        from[0] + (to[0] - from[0]) * 0.42,
        from[1] + (to[1] - from[1]) * 0.42,
        from[2] + (to[2] - from[2]) * 0.42,
      ];
      const stubRadius = geometry.stick * transform.scale;
      primitives.push({
        kind: "cylinder",
        start: from,
        end: stub,
        radiusTop: stubRadius,
        radiusBottom: stubRadius * 0.55,
        color: COLORS[data.elements[innerIndex]] ?? SLATE,
      });
      return;
    }

    const start = coordinates.get(a);
    const end = coordinates.get(b);
    if (!start || !end) return;
    const middle: Vec3Tuple = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ];
    const radius = geometry.stick * transform.scale;
    primitives.push(
      {
        kind: "cylinder",
        start,
        end: middle,
        radiusTop: radius,
        radiusBottom: radius,
        color: COLORS[data.elements[a]] ?? SLATE,
      },
      {
        kind: "cylinder",
        start: middle,
        end,
        radiusTop: radius,
        radiusBottom: radius,
        color: COLORS[data.elements[b]] ?? SLATE,
      },
    );
  });

  const atomOrder = reverseAtomOrder ? [...selected].reverse() : selected;
  atomOrder.forEach((index) => {
    const center = coordinates.get(index);
    if (!center) return;
    const element = data.elements[index];
    primitives.push({
      kind: "sphere",
      center,
      radius: geometry.ball(element) * transform.scale,
      color: COLORS[element] ?? SLATE,
      label: `${element} ${index + 1}`,
    });
  });
  return primitives;
}

function addVector(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVector(vector: Vec3Tuple, scale: number): Vec3Tuple {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function subtractVector(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function crossVector(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalizeVector(vector: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length > 1e-12 ? scaleVector(vector, 1 / length) : [0, 0, 0];
}

function arrowPrimitives(start: Vec3Tuple, vector: Vec3Tuple, color: Color): ResearchPrimitive[] {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < 0.001) return [];
  const unit = scaleVector(vector, 1 / length);
  const end = addVector(start, vector);
  // The head scales down with a short arrow. At a fixed 0.1 radius on a 0.07 head, the
  // shortest force arrows rendered as flat discs rather than arrows.
  const headLength = Math.min(0.28, length * 0.4);
  const headRadius = Math.min(0.1, headLength * 0.6);
  const headBase = addVector(end, scaleVector(unit, -headLength));
  return [
    {
      kind: "cylinder",
      start,
      end: headBase,
      radiusTop: 0.028,
      radiusBottom: 0.028,
      radialSegments: 12,
      color,
    },
    // Cone head. Tapered cylinders render via addSimpleCylinder (see shared.ts),
    // where radiusTop is the radius at `end` and radiusBottom at `start`. The tip
    // sits at `end`, so it is the zero-radius side; the base at `headBase`
    // (=`start`) is the wide side.
    {
      kind: "cylinder",
      start: headBase,
      end,
      radiusTop: 0,
      radiusBottom: headRadius,
      radialSegments: 16,
      color,
    },
  ];
}

function pesHeight(x: number, y: number) {
  const wellA = Math.exp(-((x - 1.1) ** 2 + (y + 0.25) ** 2) / 2.1);
  const wellB = Math.exp(-((x + 2.4) ** 2 + (y - 1.15) ** 2) / 1.35);
  return -0.55 - 0.9 * wellA - 0.55 * wellB + 0.16 * Math.sin(x * 1.05) * Math.cos(y * 1.25);
}

function surfacePoint(x: number, y: number, height = pesHeight(x, y)): Vec3Tuple {
  return rotatePoint([x, y, height], [0.92, 0, 0]);
}

// Energy colormap for the PES slice: deep basin (low) reads cool, ridges (high)
// read warm, so contour color alone encodes the energy height.
const PES_RAMP = [PURPLE, BLUE, CYAN, GREEN, AMBER, ORANGE];

function energyColor(height: number): Color {
  const t = Math.max(0, Math.min(1, (height + 1.32) / 0.92));
  return PES_RAMP[Math.min(PES_RAMP.length - 1, Math.round(t * (PES_RAMP.length - 1)))];
}

// Numerical gradient of the learned surface. The trajectory follows -∇E and the
// force arrows point along the same -∇E, so the path and the forces stay
// physically consistent instead of being decorative.
function pesGradient(x: number, y: number): [number, number] {
  const eps = 0.012;
  return [
    (pesHeight(x + eps, y) - pesHeight(x - eps, y)) / (2 * eps),
    (pesHeight(x, y + eps) - pesHeight(x, y - eps)) / (2 * eps),
  ];
}

// Integrate real dynamics on the learned surface with velocity Verlet (mass 1,
// F = -∇E, light damping). Unlike gradient descent, the configuration carries
// kinetic energy: it climbs over a barrier and overshoots the minimum instead of
// settling, so the path reads as finite-temperature MD rather than a geometry
// optimization. Verified numerically to cross from the shallow well into the
// deep well and continue past the minimum.
function mdTrajectory(
  startX: number,
  startY: number,
  velocityX: number,
  velocityY: number,
  steps: number,
): { path: Array<[number, number]>; velocities: Array<[number, number]> } {
  const dt = 0.12;
  const damping = 0.992;
  let x = startX;
  let y = startY;
  let vx = velocityX;
  let vy = velocityY;
  let [gx, gy] = pesGradient(x, y);
  let fx = -gx;
  let fy = -gy;
  const path: Array<[number, number]> = [[x, y]];
  const velocities: Array<[number, number]> = [[vx, vy]];
  for (let index = 0; index < steps; index += 1) {
    x += vx * dt + 0.5 * fx * dt * dt;
    y += vy * dt + 0.5 * fy * dt * dt;
    [gx, gy] = pesGradient(x, y);
    const nextFx = -gx;
    const nextFy = -gy;
    vx = (vx + 0.5 * (fx + nextFx) * dt) * damping;
    vy = (vy + 0.5 * (fy + nextFy) * dt) * damping;
    fx = nextFx;
    fy = nextFy;
    path.push([x, y]);
    velocities.push([vx, vy]);
  }
  return { path, velocities };
}

interface ContourSample {
  x: number;
  y: number;
  value: number;
}

function contourIntersection(a: ContourSample, b: ContourSample, level: number) {
  const denominator = b.value - a.value;
  const t = Math.abs(denominator) < 1e-12 ? 0.5 : (level - a.value) / denominator;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function buildIsoenergyContours(levels: number[]): ResearchPrimitive[] {
  const columns = 38;
  const rows = 28;
  const samples = Array.from({ length: rows }, (_, row) => {
    const y = -3.2 + (row / (rows - 1)) * 6.4;
    return Array.from({ length: columns }, (_, column) => {
      const x = -5 + (column / (columns - 1)) * 10;
      return { x, y, value: pesHeight(x, y) };
    });
  });
  const contours: ResearchPrimitive[] = [];

  levels.forEach((level, levelIndex) => {
    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const corners = [
          samples[row][column],
          samples[row][column + 1],
          samples[row + 1][column + 1],
          samples[row + 1][column],
        ];
        const edgePairs = [[0, 1], [1, 2], [2, 3], [3, 0]] as const;
        const intersections = edgePairs.flatMap(([from, to]) => {
          const a = corners[from];
          const b = corners[to];
          const crosses = (a.value < level && b.value >= level) || (b.value < level && a.value >= level);
          return crosses ? [contourIntersection(a, b, level)] : [];
        });
        if (intersections.length !== 2 && intersections.length !== 4) continue;
        const pairs = intersections.length === 2
          ? [[intersections[0], intersections[1]]]
          : ((corners.reduce((sum, corner) => sum + corner.value, 0) / 4) < level
              ? [[intersections[0], intersections[1]], [intersections[2], intersections[3]]]
              : [[intersections[0], intersections[3]], [intersections[1], intersections[2]]]);
        pairs.forEach(([from, to]) => {
          contours.push({
            kind: "cylinder",
            start: surfacePoint(from.x, from.y, level + 0.026),
            end: surfacePoint(to.x, to.y, level + 0.026),
            radiusTop: 0.023,
            radiusBottom: 0.023,
            color: PES_RAMP[levelIndex] ?? energyColor(level),
          });
        });
      }
    }
  });
  return contours;
}

function buildSurfaceLayers(): ResearchLayerSpec[] {
  const columns = 24;
  const rows = 18;
  const vertices: number[][] = [];
  const faces: number[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const y = -3.2 + (row / (rows - 1)) * 6.4;
    for (let column = 0; column < columns; column += 1) {
      const x = -5 + (column / (columns - 1)) * 10;
      vertices.push(surfacePoint(x, y));
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      faces.push([a, c, b], [b, c, d]);
    }
  }
  const contours = buildIsoenergyContours([-1.22, -1.06, -0.9, -0.74, -0.58, -0.46]);

  return [
    {
      label: "Learned potential energy surface",
      primitives: [{ kind: "mesh", vertices: new Float32Array(vertices.flat()),
                     faces: new Uint32Array(faces.flat()),
                     color: Color.fromHexStyle("#111a3e"), doubleSided: true }],
      params: { alpha: 0.46, xrayShaded: true, emissive: 0.05 },
    },
    {
      label: "Isoenergy contours on the learned PES slice",
      primitives: contours,
      params: { alpha: 0.82, emissive: 0.4 },
    },
  ];
}

// Vertical distance between two neighbouring configurations, and the fraction of the
// half-gap a molecule is allowed to fill. The panel draws five equal frames over this
// scene, so these numbers are the frames' geometry expressed in scene units.
const DATASET_ROW_SPACING = 2.55;
const DATASET_ROW_FILL = 0.86;

/** Distance from the centroid to the furthest atom. */
function boundingRadius(atoms: number[][], center: Vec3Tuple): number {
  let max = 0;
  for (const atom of atoms) {
    const d = Math.hypot(atom[0] - center[0], atom[1] - center[1], atom[2] - center[2]);
    if (d > max) max = d;
  }
  return max || 1;
}

function buildDatasetLayers(data: MlffVisualData): ResearchLayerSpec[] {
  const center = centroid(data.molecule.atoms);
  // One orientation for all five. Each row used to be turned to its own angle, so the eye
  // compared rotations, which the next scene teaches leave the energy unchanged: the five
  // rows read as one example drawn five times. Held at one angle, only the distortion
  // differs. At the solved scale (about 0.18) the existing perturbation already moves atoms
  // 0.4 to 0.6 Å, so it is not raised.
  const rotate: Vec3Tuple = [0.34, -0.22, -0.08];
  const configs = [
    { y: 5.1, phase: 0.2 },
    { y: 2.55, phase: 1.1 },
    { y: 0, phase: 2.2 },
    { y: -2.55, phase: 3.1 },
    { y: -5.1, phase: 4.4 },
  ];
  // The fit has to hold for any orientation, so what has to fit inside a frame is
  // the bounding SPHERE, not the vertical extent, and the radius has to be derived
  // from the molecule rather than assumed. With the scale fixed at 0.31 the rendered
  // radius exceeded the half-row, so atoms crossed the frame borders at every camera
  // setting and every viewport; the frames promised a containment the scene could not
  // deliver. Solving for the scale instead makes the promise structural.
  const maxPerturbation = 0.07 + (configs.length - 1) * 0.012;
  const sphereAllowance = 0.2; // the largest atom sphere at these scales
  const budget = (DATASET_ROW_SPACING / 2) * DATASET_ROW_FILL - maxPerturbation - sphereAllowance;
  const scale = Math.min(0.31, budget / boundingRadius(data.molecule.atoms, center));
  const primitives = configs.flatMap((config, index) =>
    moleculePrimitives(data.molecule, {
      center,
      scale,
      rotate,
      // Right of centre, clear of the "example N" tag in each frame's top-left corner, which
      // sat on the molecule at 1024. All five at one x, so the shapes line up for comparison.
      translate: [1.05, config.y, 0],
      perturbation: 0.07 + index * 0.012,
      phase: config.phase,
    }),
  );
  return [
    {
      label: "Five DFT reference configurations",
      primitives,
      params: { emissive: 0.04, material: { metalness: 0.06, roughness: 0.42, bumpiness: 0 } },
    },
  ];
}

function buildPesLayers(data: MlffVisualData): ResearchLayerSpec[] {
  const layers = buildSurfaceLayers();
  const lift = 0.14;

  // Trajectory: a real MD path integrated from the forces. It starts in the
  // shallow well, climbs over the barrier, and overshoots the deep minimum — the
  // uphill climb and the overshoot are finite-temperature dynamics, which a
  // geometry optimization never does. Each segment is colored by the energy it
  // passes through.
  const { path: mdPath, velocities } = mdTrajectory(-2.3, 1.2, 1.5, -0.55, 24);
  const nodeWorld = mdPath.map(([x, y]) => surfacePoint(x, y, pesHeight(x, y) + lift));
  const trajectory: ResearchPrimitive[] = [];
  mdPath.forEach(([x, y], index) => {
    if (index < mdPath.length - 1) {
      // White step-markers make the path read as a sequence of MD timesteps and
      // stand out above the fine colored contours.
      trajectory.push({ kind: "sphere", center: nodeWorld[index], radius: 0.07, color: WHITE });
    }
    if (index > 0) {
      const prev = mdPath[index - 1];
      const midHeight = (pesHeight(x, y) + pesHeight(prev[0], prev[1])) / 2;
      trajectory.push({
        kind: "cylinder",
        start: nodeWorld[index - 1],
        end: nodeWorld[index],
        radiusTop: 0.055,
        radiusBottom: 0.055,
        color: energyColor(midHeight),
      });
    }
  });

  // Current configuration R(t): the latest MD point. It sits on the far wall of
  // the deep well, past the minimum, so it reads as moving rather than settled.
  // A velocity arrow shows the direction it carries forward by inertia.
  const currentIndex = mdPath.length - 1;
  const [mx, my] = mdPath[currentIndex];
  const markerWorld = surfacePoint(mx, my, pesHeight(mx, my) + lift);
  const [vx, vy] = velocities[currentIndex];
  const vLength = Math.hypot(vx, vy) || 1;
  const velReach = 0.95;
  const velTipX = mx + (vx / vLength) * velReach;
  const velTipY = my + (vy / vLength) * velReach;
  const velBase = surfacePoint(mx, my, pesHeight(mx, my) + lift + 0.05);
  const velTip = surfacePoint(velTipX, velTipY, pesHeight(velTipX, velTipY) + lift + 0.05);
  const velocityArrow = arrowPrimitives(velBase, subtractVector(velTip, velBase), AMBER);

  // The current configuration is drawn as the actual molecule sitting at the
  // trajectory's leading point, so the energy landscape reads as a molecular PES
  // (a point on the surface is a molecular structure R). It sits at the marker
  // with no elevated tether, so it cannot spill outside the panel.
  const molecule = moleculePrimitives(data.molecule, {
    center: centroid(data.molecule.atoms),
    scale: 0.32,
    rotate: [0.34, -0.22, -0.08],
    translate: [markerWorld[0], markerWorld[1] + 0.12, markerWorld[2] + 0.1],
  });

  // Soft glows at the two basins the trajectory travels between.
  const deepBasin = surfacePoint(1.1, -0.25, pesHeight(1.1, -0.25) + 0.02);
  const shallowBasin = surfacePoint(-2.4, 1.15, pesHeight(-2.4, 1.15) + 0.02);

  return [
    ...layers,
    {
      label: "Basins the trajectory travels between",
      primitives: [
        { kind: "sphere", center: deepBasin, radius: 0.82, color: CYAN },
        { kind: "sphere", center: shallowBasin, radius: 0.6, color: BLUE },
      ],
      params: { alpha: 0.08, xrayShaded: true, emissive: 0.28 },
    },
    {
      label: "MD trajectory on the learned surface",
      primitives: trajectory,
      params: { emissive: 0.86 },
    },
    {
      label: "Current configuration halo",
      primitives: [{ kind: "sphere", center: markerWorld, radius: 0.34, color: CYAN }],
      params: { alpha: 0.14, xrayShaded: true, emissive: 0.42 },
    },
    {
      label: "Molecule at the current configuration",
      primitives: molecule,
      params: { emissive: 0.08, material: { metalness: 0.08, roughness: 0.36, bumpiness: 0 } },
    },
    {
      label: "Velocity of the current configuration",
      primitives: velocityArrow,
      params: { emissive: 0.85 },
    },
  ];
}

function localIndices(system: MlffSystemData) {
  const fromSubset = system.subsets?.local_core?.indices;
  const candidates = fromSubset?.length
    ? fromSubset
    : system.atoms.map((_, index) => index);
  const focus = system.atoms[system.focusIndex];
  return candidates
    .map((index) => {
      const point = system.atoms[index];
      return {
        index,
        distance: Math.hypot(point[0] - focus[0], point[1] - focus[1], point[2] - focus[2]),
      };
    })
    .filter(({ distance }) => distance <= system.cutoff + 1e-9)
    .map(({ index }) => index);
}

const LOCAL_GRAPH_TRANSFORM: MoleculeTransform = {
  center: [0, 0, 0],
  scale: 0.76,
  rotate: [0.22, -0.25, 0.05],
  translate: [0, 0, 0],
};

interface LocalMessageNeighbor {
  index: number;
  distance: number;
  point: Vec3Tuple;
}

interface LocalGraphGeometry {
  selected: number[];
  center: Vec3Tuple;
  cutoffDistance: number;
  cutoffRadius: number;
  lengthUnit: "angstrom" | "unspecified";
  neighborCount: number;
  highlightedNeighbors: LocalMessageNeighbor[];
  transform: MoleculeTransform;
}

function getLocalGraphGeometry(system: MlffSystemData): LocalGraphGeometry {
  const selected = localIndices(system);
  const focus = system.atoms[system.focusIndex] as Vec3Tuple;
  const transform: MoleculeTransform = {
    ...LOCAL_GRAPH_TRANSFORM,
    center: focus,
  };
  const neighbors = selected
    .filter((index) => index !== system.focusIndex)
    .map((index) => ({
      index,
      distance: Math.hypot(
        system.atoms[index][0] - focus[0],
        system.atoms[index][1] - focus[1],
        system.atoms[index][2] - focus[2],
      ),
      point: transformAtom(system.atoms[index], index, transform),
    }))
    .sort((a, b) => a.distance - b.distance);
  const nearestOxygen = neighbors.filter(({ index }) => system.elements[index] === "O");
  const highlightedIds = new Set(nearestOxygen.slice(0, 6).map(({ index }) => index));
  const highlightedNeighbors = [
    ...nearestOxygen.slice(0, 6),
    ...neighbors.filter(({ index }) => !highlightedIds.has(index)),
  ].slice(0, 6);

  return {
    selected,
    center: transformAtom(system.atoms[system.focusIndex], system.focusIndex, transform),
    cutoffDistance: system.cutoff,
    cutoffRadius: system.cutoff * transform.scale,
    lengthUnit: system.lengthUnit ?? "unspecified",
    neighborCount: neighbors.length,
    highlightedNeighbors,
    transform,
  };
}

function buildLocalLayers(data: MlffVisualData): ResearchLayerSpec[] {
  const { system } = data;
  const geometry = getLocalGraphGeometry(system);
  const main = moleculePrimitives(system, geometry.transform, geometry.selected);
  return [
    {
      label: "Local cutoff shell",
      primitives: [{ kind: "sphere", center: geometry.center, radius: geometry.cutoffRadius, color: CYAN }],
      params: { alpha: 0.065, xrayShaded: true, emissive: 0.06 },
    },
    {
      label: "Atom-centered neighbor distribution",
      primitives: main,
      params: { emissive: 0.08, material: { metalness: 0.06, roughness: 0.38, bumpiness: 0 } },
    },
    {
      label: "Central atom i",
      primitives: [{ kind: "sphere", center: geometry.center, radius: 0.72, color: PURPLE }],
      params: { alpha: 0.13, xrayShaded: true, emissive: 0.38 },
    },
  ];
}

// CYAN (#06b6d4) on the light canvas (#ededed) measures about 2:1, and the shortest arrows
// beside the white hydrogens disappeared. Cyan-700 keeps the hue and holds about 4.6:1, but
// only with the emissive turned down: at the dark theme's 0.72 it renders saturated to
// (40,248,248), the same glow as plain CYAN.
interface ForceArrowStyle {
  color: Color;
  emissive: number;
}
const FORCE_ARROWS_DARK: ForceArrowStyle = { color: CYAN, emissive: 0.72 };
const FORCE_ARROWS_LIGHT: ForceArrowStyle = { color: Color.fromHexStyle("#0e7490"), emissive: 0.12 };

function buildForceLayers(data: MlffVisualData, arrowStyle: ForceArrowStyle): ResearchLayerSpec[] {
  // The same atoms, in the same orientation, as the neighbor-range panel two columns to
  // the left. This panel used to switch to caffeine, so following the arrows across the
  // scene a water shell turned into a different molecule.
  const { system } = data;
  const { selected, transform } = getLocalGraphGeometry(system);
  const molecule = moleculePrimitives(system, transform, selected);
  const balls = ballAndStick(
    shortestHeavyBond(system.atoms.flat(), system.bonds as [number, number][], system.elements),
    system.elements,
  );
  // A force acts on every atom, so draw an arrow on every atom, along that atom's force in
  // system.json. These used to be an outward unit vector with a wobble and a constant z tilt:
  // one length, all radial, adding up to a net push along z. Length follows
  // sqrt(|F| / max|F|) on 0.3 to 1 Å, so the spread stays readable when one force is 70
  // times another, and each arrow leaves its ball's surface so the shortest still shows.
  const magnitude = (index: number) => Math.hypot(...(system.forces[index] as Vec3Tuple));
  const maxForce = Math.max(...selected.map(magnitude)) || 1;
  const arrows = selected.flatMap((index) => {
    const force = magnitude(index);
    if (force <= 0) return [];
    const direction = rotatePoint(
      scaleVector(system.forces[index] as Vec3Tuple, 1 / force),
      transform.rotate ?? [0, 0, 0],
    );
    const length = (0.3 + 0.7 * Math.sqrt(force / maxForce)) * transform.scale;
    const surface = balls.ball(system.elements[index]) * transform.scale;
    const start = addVector(
      transformAtom(system.atoms[index], index, transform),
      scaleVector(direction, surface),
    );
    return arrowPrimitives(start, scaleVector(direction, length), arrowStyle.color);
  });
  return [
    {
      label: "Atoms inside the neighbor range",
      primitives: molecule,
      params: { emissive: 0.08, material: { metalness: 0.08, roughness: 0.36, bumpiness: 0 } },
    },
    {
      label: "Energy-consistent forces on every atom",
      primitives: arrows,
      params: { emissive: arrowStyle.emissive },
    },
  ];
}

function buildLayers(variant: MlffViewportVariant, data: MlffVisualData, forceArrows: ForceArrowStyle) {
  if (variant === "dataset") return buildDatasetLayers(data);
  if (variant === "pes") return buildPesLayers(data);
  if (variant === "local") return buildLocalLayers(data);
  return buildForceLayers(data, forceArrows);
}

function MlffMolstarViewport({
  variant,
  data,
  label,
  ko,
  actionsRef,
  rowLock,
  projectionAnchors,
  projectionCenterId,
  projectionRadius,
  renderProjectionOverlay,
}: {
  variant: MlffViewportVariant;
  data: MlffVisualData | null;
  ko: boolean;
  label: string;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  // Lock the camera so `rows` world rows of `pitch` land exactly on `rows` CSS grid rows.
  rowLock?: { rows: number; pitch: number; gapPx: number };
  projectionAnchors?: ProjectionAnchor[];
  projectionCenterId?: string;
  projectionRadius?: number;
  renderProjectionOverlay?: (layout: ProjectedLayout | null) => ReactNode;
}) {
  const canvasColor = useMultiscaleCanvasColor();
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const canvasColorRef = useRef(canvasColor);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectedLayout, setProjectedLayout] = useState<ProjectedLayout | null>(null);
  const { theme } = useTheme();
  // Only the force panel depends on the theme, so only it rebuilds when the theme changes.
  const forceArrows = variant === "forces" && theme === "light" ? FORCE_ARROWS_LIGHT : FORCE_ARROWS_DARK;
  const layers = useMemo(
    () => (data ? buildLayers(variant, data, forceArrows) : null),
    [data, variant, forceArrows],
  );

  useEffect(() => {
    canvasColorRef.current = canvasColor;
  }, [canvasColor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !layers || pluginRef.current) return;
    let cancelled = false;
    let mountedPlugin: PluginLike | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      try {
        setError(null);
        const mounted = await mountResearchPlugin({
          container,
          autoRotate: false,
          backgroundColor: canvasColorRef.current,
          actionsRef,
          defaultSnapshotRef,
        });
        if (!mounted.plugin) {
          setError(mounted.error);
          return;
        }
        mountedPlugin = mounted.plugin;
        pluginRef.current = mounted.plugin;
        await commitResearchLayers(mounted.plugin, layers);
        // Shape representations acquire their final bounding spheres on the
        // next canvas frames. Fitting before those frames leaves Mol* focused
        // on the first primitive instead of the complete schematic montage.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;
        // The configurations sit on a fixed world pitch and the bordered rows behind them are
        // CSS grid rows, so the mapping from world y to canvas y has to be exact. A
        // bounding-sphere fit cannot promise that — it depends on the scene's own extent, so
        // merely widening the atom radii re-scaled the stack and every molecule drifted onto a
        // frame border. Solve for the distance instead.
        //
        // `grid-rows-N gap-g` over height H gives each row (H-(N-1)g)/N, so consecutive row
        // centres are (H+g)/N apart and the middle one is at exactly H/2. Matching one world
        // pitch to that spacing, with world y=0 on the centre line, lines the rows up by
        // construction and leaves the framing independent of what the atoms look like.
        const applyRowLock = () => {
          if (!rowLock || !mounted.plugin) return;
          const camera = mounted.plugin.canvas3d?.camera;
          const current = camera?.getSnapshot() as (CameraSnapshotLike & { fov?: number }) | undefined;
          if (!current) return;
          const h = container.clientHeight;
          if (h < 1) return;
          // Read the field of view rather than assuming one: Mol* defaults to 45 degrees, and
          // computing against 50 put the stack 12.6% oversized and pushed the last row out.
          const halfFov = (current.fov ?? Math.PI / 4) / 2;
          const distance = (h / 2) * rowLock.rows * rowLock.pitch
            / (Math.max(1, h + rowLock.gapPx) * Math.tan(halfFov));
          const halfHeight = (rowLock.rows * rowLock.pitch) / 2;
          const snapshot = {
            ...current,
            target: Vec3.create(0, 0, 0),
            position: Vec3.create(0, 0, distance),
            up: Vec3.create(0, 1, 0),
            radius: halfHeight,
            radiusMax: halfHeight * 3,
          };
          defaultSnapshotRef.current = snapshot as CameraSnapshotLike;
          mounted.plugin.managers.camera.setSnapshot(snapshot, 0);
        };
        applyRowLock();
        const fitted = rowLock ? null : await fitScene(mounted.plugin, 0);
        if (fitted) {
          // Margin around a correct fit, nothing more. Each variant used to carry its own
          // number (2.2, 1.9, 1.12, 1.02) because fitScene returned the camera from before
          // its own reset had been applied, so every panel was tuned against a different
          // wrong baseline.
          const snapshot = variant === "forces"
            ? fitToDrawnExtent(fitted, layers, container.clientWidth, container.clientHeight, FIT_MARGIN)
            : scaleSnapshot(fitted, FIT_MARGIN);
          defaultSnapshotRef.current = snapshot;
          mounted.plugin.managers.camera.setSnapshot(snapshot, 0);
        }
        const updateProjection = () => {
          if (cancelled || !projectionAnchors?.length) return;
          const camera = mounted.plugin?.canvas3d?.camera;
          const viewport = camera?.viewport;
          if (!camera || !viewport || viewport.width <= 0 || viewport.height <= 0) return;
          camera.update();
          const width = container.clientWidth;
          const height = container.clientHeight;
          if (width <= 0 || height <= 0) return;
          const projectPoint = (point: Vec3Tuple) => {
            const projected = camera.project(
              Vec4(),
              Vec3.create(point[0], point[1], point[2]),
            );
            return {
              x: ((projected[0] - viewport.x) / viewport.width) * width,
              y: (1 - (projected[1] - viewport.y) / viewport.height) * height,
              depth: projected[2],
            };
          };
          const anchors = projectionAnchors.map((anchor) => {
            return { ...anchor, ...projectPoint(anchor.point) };
          });
          const centerAnchor = projectionCenterId
            ? projectionAnchors.find(({ id }) => id === projectionCenterId)
            : undefined;
          let cutoffBoundary: Array<{ x: number; y: number }> = [];
          let cutoffRadius: number | null = null;
          if (centerAnchor && projectionRadius) {
            const snapshot = camera.getSnapshot();
            const cameraPosition: Vec3Tuple = [snapshot.position[0], snapshot.position[1], snapshot.position[2]];
            const cameraUp: Vec3Tuple = [snapshot.up[0], snapshot.up[1], snapshot.up[2]];
            const cameraToCenter = subtractVector(centerAnchor.point, cameraPosition);
            const distance = Math.hypot(cameraToCenter[0], cameraToCenter[1], cameraToCenter[2]);
            const viewDirection = normalizeVector(cameraToCenter);
            let right = normalizeVector(crossVector(viewDirection, cameraUp));
            if (Math.hypot(right[0], right[1], right[2]) < 1e-8) right = [1, 0, 0];
            const screenUp = normalizeVector(crossVector(right, viewDirection));
            const perspective = snapshot.mode !== "orthographic" && distance > projectionRadius;
            const axialOffset = perspective ? -(projectionRadius ** 2) / distance : 0;
            const tangentRadius = perspective
              ? projectionRadius * Math.sqrt(1 - (projectionRadius / distance) ** 2)
              : projectionRadius;
            const tangentCenter = addVector(centerAnchor.point, scaleVector(viewDirection, axialOffset));
            cutoffBoundary = Array.from({ length: 192 }, (_, index) => {
              const angle = (index / 192) * Math.PI * 2;
              const point = addVector(
                tangentCenter,
                addVector(
                  scaleVector(right, Math.cos(angle) * tangentRadius),
                  scaleVector(screenUp, Math.sin(angle) * tangentRadius),
                ),
              );
              const projected = projectPoint(point);
              return { x: projected.x, y: projected.y };
            });
            const projectedCenter = projectPoint(centerAnchor.point);
            cutoffRadius = Math.max(
              ...cutoffBoundary.map((point) => Math.hypot(point.x - projectedCenter.x, point.y - projectedCenter.y)),
            );
          }
          setProjectedLayout({ width, height, cutoffRadius, cutoffBoundary, anchors });
        };
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        updateProjection();
        resizeObserver = new ResizeObserver(() => {
          // The row lock is solved against the container height, so it has to be re-solved
          // whenever that height changes or the rows stop lining up.
          applyRowLock();
          requestAnimationFrame(() => requestAnimationFrame(updateProjection));
        });
        resizeObserver.observe(container);
        if (!cancelled) setReady(true);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Mol* failed to initialize.");
        mountedPlugin?.dispose();
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      setReady(false);
      setProjectedLayout(null);
      if (actionsRef) actionsRef.current = null;
      const plugin = pluginRef.current;
      pluginRef.current = null;
      plugin?.dispose();
      container.replaceChildren();
    };
  }, [actionsRef, layers, projectionAnchors, projectionCenterId, projectionRadius, rowLock, variant]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !ready) return;
    void applyResearchCanvasBackground(plugin, canvasColor);
  }, [canvasColor, ready]);

  return (
    <div
      className="multiscale-molstar pointer-events-none relative h-full w-full select-none overflow-hidden"
      style={{ backgroundColor: canvasColor }}
      data-testid={`mlff-molstar-${variant}`}
      data-mlff-viewport={variant}
      data-auto-rotate="false"
      data-interactive="false"
      data-ready={ready ? "true" : "false"}
      data-error={error ? "true" : "false"}
      aria-label={label}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {renderProjectionOverlay ? renderProjectionOverlay(projectedLayout) : null}
      {!ready && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ backgroundColor: canvasColor }}>
          <span className="type-mono-meta text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {ko ? "분자 구조 준비 중" : "Preparing molecular view"}
          </span>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center px-5 text-center text-xs leading-5 text-muted-foreground" style={{ backgroundColor: canvasColor }}>
          {/* The raw exception used to be the reader-facing copy. It stays for assistive
              tech and debugging; what a reader sees is what still works. */}
          {ko
            ? "MLFF 3D 뷰를 불러오지 못했습니다. 도식과 설명은 계속 볼 수 있습니다."
            : "The MLFF 3D view could not load. The schematic and the explanation remain available."}
          <span className="sr-only">{ko ? "분자 구조 렌더링 오류" : "Molecular view rendering error"}</span>
        </div>
      ) : null}
    </div>
  );
}

// 14px is not WCAG "large text" (that starts at 18.66px bold), so these need the 4.5:1 floor.
// The MLFF mark measures 4.42:1 on the dark ground, which is why the text-grade sibling exists.
const PANEL_TITLE_TONE = {
  dft: "type-heading text-sm leading-5 text-lv-dft-text",
  mlff: "type-heading text-sm leading-5 text-lv-mlff-text",
  aa: "type-heading text-sm leading-5 text-lv-aa",
} as const;

function PanelHeader({
  title,
  detail,
  align = "left",
  tone,
}: {
  title: string;
  detail?: string;
  align?: "left" | "center";
  tone?: keyof typeof PANEL_TITLE_TONE;
}) {
  return (
    // In flow, not absolute. Every panel below used to reserve a guessed `top-[Xrem]` for
    // this block; the guesses were 3.2, 4.5, 4.6 and 4.8rem and each was right for exactly
    // one string. At 1024 in English this header wraps to five lines and printed straight
    // through the first card of the panel under it, with neither readable.
    <div className={`pointer-events-none relative z-10 shrink-0 p-3.5 ${align === "center" ? "text-center" : ""}`}>
      <h4 className={tone ? PANEL_TITLE_TONE[tone] : MULTISCALE_TYPE.schematicTitle}>{title}</h4>
      {detail ? <p className={`mt-1 text-balance ${MULTISCALE_TYPE.schematicCaption}`}>{detail}</p> : null}
    </div>
  );
}

function FlowArrow({ vertical, reducedMotion, label }: { vertical: boolean; reducedMotion: boolean; label?: ReactNode }) {
  void reducedMotion;
  return (
    <div className={`relative flex items-center justify-center ${vertical ? "h-9 w-full" : "h-full min-h-10 w-full"}`} aria-hidden="true">
      <svg className={vertical ? "h-9 w-8" : "h-12 w-full"} viewBox={vertical ? "0 0 32 42" : "0 0 52 32"} fill="none">
        <path
          d={vertical ? "M16 2V34M10 28L16 35L22 28" : "M2 16H44M38 10L45 16L38 22"}
          stroke="var(--sch-stretch)"
          strokeOpacity="0.72"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label ? (
        <span className={`${MULTISCALE_TYPE.schematicMeta} absolute text-muted-foreground ${vertical ? "left-[calc(50%+1.5rem)] top-3" : "left-1/2 top-[calc(50%+1.25rem)] -translate-x-1/2 whitespace-nowrap"}`}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

function rayPolygonIntersection(
  center: { x: number; y: number },
  direction: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>,
) {
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const edge = { x: end.x - start.x, y: end.y - start.y };
    const offset = { x: start.x - center.x, y: start.y - center.y };
    const denominator = direction.x * edge.y - direction.y * edge.x;
    if (Math.abs(denominator) < 1e-10) continue;
    const distance = (offset.x * edge.y - offset.y * edge.x) / denominator;
    const edgeFraction = (offset.x * direction.y - offset.y * direction.x) / denominator;
    if (distance >= 0 && edgeFraction >= 0 && edgeFraction <= 1) {
      nearestDistance = Math.min(nearestDistance, distance);
    }
  }
  return Number.isFinite(nearestDistance)
    ? {
        x: center.x + direction.x * nearestDistance,
        y: center.y + direction.y * nearestDistance,
      }
    : center;
}

function ExactNeighborMessageOverlay({
  layout,
  geometry,
  ko,
}: {
  layout: ProjectedLayout | null;
  geometry: LocalGraphGeometry;
  ko: boolean;
}) {
  // The clearance search below used to run on assumed chip boxes (52x40 and 62x36) while the
  // rendered chips measured about 152x34 and up to 140x46, so it cleared boxes nobody drew
  // and the "center atom" chip landed on the atom it names. Search with the real sizes.
  const centerLabelRef = useRef<HTMLSpanElement>(null);
  const cutoffLabelRef = useRef<HTMLSpanElement>(null);
  const [chips, setChips] = useState({ center: { w: 96, h: 24 }, cutoff: { w: 112, h: 24 } });
  useLayoutEffect(() => {
    const centerChip = centerLabelRef.current;
    const cutoffChip = cutoffLabelRef.current;
    if (!centerChip || !cutoffChip) return;
    const measure = () =>
      setChips((previous) => {
        const next = {
          center: { w: centerChip.offsetWidth, h: centerChip.offsetHeight },
          cutoff: { w: cutoffChip.offsetWidth, h: cutoffChip.offsetHeight },
        };
        return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(centerChip);
    observer.observe(cutoffChip);
    return () => observer.disconnect();
  }, [layout, ko]);

  if (!layout || !layout.cutoffRadius || layout.cutoffBoundary.length < 3) return null;
  const center = layout.anchors.find(({ id }) => id === "center");
  if (!center) return null;
  const neighbors = geometry.highlightedNeighbors.flatMap((neighbor) => {
    const anchor = layout.anchors.find(({ id }) => id === `neighbor-${neighbor.index}`);
    return anchor ? [{ ...neighbor, anchor }] : [];
  });
  const cutoffAngle = -Math.PI / 9;
  const cutoffEnd = rayPolygonIntersection(
    center,
    { x: Math.cos(cutoffAngle), y: Math.sin(cutoffAngle) },
    layout.cutoffBoundary,
  );
  const cutoffPath = `${layout.cutoffBoundary
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(3)},${point.y.toFixed(3)}`)
    .join(" ")} Z`;
  // Both labels used to be placed by a constant offset from the thing they name. A
  // constant offset knows nothing about what is drawn underneath it, which is how the
  // i chip came to sit on a neighbouring atom and how r_cut came to erase the arc it
  // labels. Place them by looking for room instead.
  const CENTER_LABEL = chips.center;
  const CUTOFF_LABEL = chips.cutoff;
  type Box = { left: number; top: number; right: number; bottom: number };
  const boxAround = (x: number, y: number, size: { w: number; h: number }): Box => ({
    left: x - size.w / 2,
    top: y - size.h / 2,
    right: x + size.w / 2,
    bottom: y + size.h / 2,
  });
  const pointToBox = (x: number, y: number, box: Box) =>
    Math.hypot(Math.max(box.left - x, 0, x - box.right), Math.max(box.top - y, 0, y - box.bottom));
  const boxesOverlap = (a: Box, b: Box) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  // Candidates are scored where they will actually be drawn. Scoring the ideal box and
  // clamping it afterwards let the two chips land on each other at 1024, where the cutoff
  // circle fills the viewport and no spot outside it fits.
  const clampBox = (box: Box): Box => {
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const left = Math.min(layout.width - w - 4, Math.max(4, box.left));
    const top = Math.min(layout.height - h - 4, Math.max(4, box.top));
    return { left, top, right: left + w, bottom: top + h };
  };
  const shiftOf = (a: Box, b: Box) => Math.hypot(a.left - b.left, a.top - b.top);

  // Distance from the chip's box, not its centre, to the nearest highlighted neighbour: a
  // 100px chip whose centre is clear can still sit on an atom with its end. Capped, because
  // past the anchor ring more room changes nothing.
  const neighborClearance = (box: Box) =>
    neighbors.reduce(
      (worst, neighbor) => Math.min(worst, pointToBox(neighbor.anchor.x, neighbor.anchor.y, box)),
      14,
    );

  // The centre atom itself is an obstacle: its halo (r=24) plus a hair. In each direction the
  // chip goes out exactly as far as it must to clear that circle, so it reads as attached to
  // the atom without covering it, and among the directions the one that keeps the
  // highlighted neighbours visible and stays closest wins.
  const CENTER_CLEARANCE = 26;
  let centerBox = boxAround(center.x, center.y - CENTER_CLEARANCE - CENTER_LABEL.h / 2, CENTER_LABEL);
  let centerScore = -Infinity;
  for (let step = 0; step < 24; step++) {
    const angle = (step / 24) * Math.PI * 2;
    let reach = CENTER_CLEARANCE;
    let box = boxAround(center.x + Math.cos(angle) * reach, center.y + Math.sin(angle) * reach, CENTER_LABEL);
    while (pointToBox(center.x, center.y, box) < CENTER_CLEARANCE) {
      reach += 1;
      box = boxAround(center.x + Math.cos(angle) * reach, center.y + Math.sin(angle) * reach, CENTER_LABEL);
    }
    const drawn = clampBox(box);
    const score =
      (pointToBox(center.x, center.y, drawn) < CENTER_CLEARANCE ? -1000 : 0) +
      neighborClearance(drawn) * 10 - reach - shiftOf(drawn, box) * 2;
    if (score > centerScore) {
      centerScore = score;
      centerBox = drawn;
    }
  }

  // "neighbor range" names the dashed outline, so it rests on that outline from outside:
  // for each direction, the chip sits just past the boundary point, pushed out by its own
  // extent along that direction so no corner reaches back inside. Prefer the direction of
  // the radius line, and never the centre chip's spot.
  const radiusAngle = Math.atan2(cutoffEnd.y - center.y, cutoffEnd.x - center.x);
  let cutoffBox = boxAround(cutoffEnd.x, cutoffEnd.y, CUTOFF_LABEL);
  let cutoffScore = -Infinity;
  for (let step = 0; step < 36; step++) {
    const angle = (step / 36) * Math.PI * 2;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const edge = rayPolygonIntersection(center, direction, layout.cutoffBoundary);
    const push =
      Math.abs(direction.x) * (CUTOFF_LABEL.w / 2) + Math.abs(direction.y) * (CUTOFF_LABEL.h / 2) + 4;
    const box = boxAround(edge.x + direction.x * push, edge.y + direction.y * push, CUTOFF_LABEL);
    const drawn = clampBox(box);
    const turn = Math.abs(Math.atan2(Math.sin(angle - radiusAngle), Math.cos(angle - radiusAngle)));
    // Every pixel the canvas edge pushes the chip back is a pixel it no longer rests on the
    // outline, so a small push beats a large one; when none fits outside, the chip still
    // keeps off the centre chip, the centre atom and the highlighted neighbours.
    const score =
      (boxesOverlap(drawn, centerBox) ? -500 : 0) +
      (pointToBox(center.x, center.y, drawn) < CENTER_CLEARANCE ? -300 : 0) +
      neighborClearance(drawn) * 5 -
      shiftOf(drawn, box) * 3 -
      turn * 10;
    if (score > cutoffScore) {
      cutoffScore = score;
      cutoffBox = drawn;
    }
  }

  const centerLabelLeft = centerBox.left;
  const centerLabelTop = centerBox.top;
  const cutoffLabelLeft = cutoffBox.left;
  const cutoffLabelTop = cutoffBox.top;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      data-mlff-message-overlay
      data-cutoff-angstrom={geometry.cutoffDistance.toFixed(6)}
      data-length-unit={geometry.lengthUnit}
      data-neighbor-count={geometry.neighborCount}
      data-highlighted-neighbor-count={neighbors.length}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        data-mlff-projected-graph
      >
        <defs>
          <clipPath id="mlff-exact-cutoff-clip">
            <path d={cutoffPath} />
          </clipPath>
        </defs>
        <path
          d={cutoffPath}
          className="mlff-exact-cutoff-shell"
          data-mlff-cutoff-shell
        />
        <line
          x1={center.x}
          y1={center.y}
          x2={cutoffEnd.x}
          y2={cutoffEnd.y}
          className="mlff-exact-cutoff-radius"
          data-mlff-cutoff-radius
        />
        <g clipPath="url(#mlff-exact-cutoff-clip)" data-mlff-cutoff-clipped-signals>
          {neighbors.map((neighbor, order) => {
          const delay = order * 0.48;
          const dx = center.x - neighbor.anchor.x;
          const dy = center.y - neighbor.anchor.y;
          const pulseStyle = {
            "--message-dx": `${dx}px`,
            "--message-dy": `${dy}px`,
            "--message-mid-x": `${dx * 0.52}px`,
            "--message-mid-y": `${dy * 0.52}px`,
            "--message-delay": `${delay}s`,
          } as CSSProperties;
          const delayStyle = { "--message-delay": `${delay}s` } as CSSProperties;
            return (
              <g key={neighbor.index} data-neighbor-index={neighbor.index} data-distance-angstrom={neighbor.distance.toFixed(6)}>
              <line
                x1={neighbor.anchor.x}
                y1={neighbor.anchor.y}
                x2={center.x}
                y2={center.y}
                className="mlff-exact-message-edge"
                data-mlff-message-edge
                data-neighbor-index={neighbor.index}
              />
              <circle
                cx={neighbor.anchor.x}
                cy={neighbor.anchor.y}
                r="5.5"
                className="mlff-exact-neighbor-anchor"
                data-mlff-neighbor-anchor
                data-neighbor-index={neighbor.index}
              />
              <circle
                cx={neighbor.anchor.x}
                cy={neighbor.anchor.y}
                r="9"
                className="mlff-exact-message-source"
                style={delayStyle}
              />
              <circle
                cx={neighbor.anchor.x}
                cy={neighbor.anchor.y}
                r="5"
                className="mlff-exact-message-pulse"
                style={pulseStyle}
              />
              <circle
                cx={center.x}
                cy={center.y}
                r="20"
                className="mlff-exact-center-flash"
                style={delayStyle}
              />
              </g>
            );
          })}
          <circle cx={center.x} cy={center.y} r="24" className="mlff-exact-center-halo" />
          <circle
            cx={center.x}
            cy={center.y}
            r="5.5"
            className="mlff-exact-center-anchor"
            data-mlff-center-anchor
          />
        </g>
      </svg>
      {/* Panel-title register. At text-2xl and text-lg the two annotations outranked the
          14px heading of the panel they sit in. */}
      <span
        ref={centerLabelRef}
        data-mlff-center-atom-label
        className="absolute whitespace-nowrap border border-violet-700/45 bg-surface-raised/95 px-2 py-1 text-sm font-semibold leading-none text-violet-900 dark:border-violet-300/45 dark:bg-violet-950/94 dark:text-violet-50"
        style={{ left: centerLabelLeft, top: centerLabelTop }}
      >
        {ko ? "중심 원자" : "center atom"}
      </span>
      <span
        ref={cutoffLabelRef}
        data-mlff-cutoff-label
        className="absolute whitespace-nowrap border border-cyan-700/40 bg-surface-raised/95 px-2 py-1 text-sm font-semibold leading-none text-cyan-900 dark:border-cyan-300/38 dark:text-cyan-50"
        style={{ left: cutoffLabelLeft, top: cutoffLabelTop }}
      >
        {ko ? "이웃 범위" : "neighbor range"}
      </span>
    </div>
  );
}

function LocalGraphGlyph({ ko }: { ko: boolean }) {
  const cx = 60;
  const cy = 60;
  const cutoff = 32;
  // A dense condensed-phase environment (~27 atoms) laid out on a golden-angle
  // spiral, not a sparse handful that reads as gas phase. The central atom
  // references only the neighbors that fall inside the cutoff shell.
  const elements = [
    { fill: "#64748b", r: 5.4 }, // C
    { fill: "#3b82f6", r: 5.6 }, // N
    { fill: "#f43f5e", r: 5.6 }, // O
    { fill: "#e2e8f0", r: 4.3 }, // H
    { fill: "#64748b", r: 5.4 }, // C
    { fill: "#e2e8f0", r: 4.3 }, // H
  ];
  const atoms = Array.from({ length: 27 }, (_, index) => {
    const radius = 11 * Math.sqrt(index);
    const angle = index * 2.399963;
    const element = elements[index % elements.length];
    return {
      index,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      fill: element.fill,
      r: element.r,
      inside: index > 0 && radius <= cutoff,
    };
  });
  const neighbors = atoms.filter((atom) => atom.inside);
  const bulk = atoms.filter((atom) => atom.index > 0 && !atom.inside);
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={ko ? "중심 원자와 모형이 사용하는 가까운 원자" : "Central atom and the nearby atoms used by the model"}>
      {bulk.map((atom) => (
        <circle key={`bulk-${atom.index}`} cx={atom.x} cy={atom.y} r={atom.r * 0.92} fill={atom.fill} opacity="0.32" />
      ))}
      <circle cx={cx} cy={cy} r={cutoff} fill="var(--sch-stretch)" fillOpacity="0.03" stroke="var(--sch-stretch)" strokeOpacity="0.34" strokeWidth="1" strokeDasharray="3 4" />
      {neighbors.map((atom) => (
        <line key={`edge-${atom.index}`} x1={cx} y1={cy} x2={atom.x} y2={atom.y} stroke="var(--sch-stretch)" strokeOpacity="0.42" strokeWidth="1.1" />
      ))}
      {neighbors.map((atom) => (
        <g key={`nbr-${atom.index}`}>
          <circle cx={atom.x} cy={atom.y} r={atom.r + 2.4} fill={atom.fill} opacity="0.16" />
          <circle cx={atom.x} cy={atom.y} r={atom.r} fill={atom.fill} stroke="var(--sch-ink)" strokeOpacity="0.5" strokeWidth=".7" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r="13.5" fill="#8b5cf6" opacity="0.14" />
      <circle cx={cx} cy={cy} r="7.6" fill="#8b5cf6" stroke="var(--sch-ink)" strokeOpacity="0.92" strokeWidth="1" />
    </svg>
  );
}

function stageDelayStyle(delay: number): CSSProperties {
  return { "--stage-delay": `${delay}s` } as CSSProperties;
}

// Vertical connector with a glowing packet that falls from one stage to the
// next, so the schematic reads as a workflow flowing top→bottom rather than a
// static stack. The packet is dropped when reduced motion is requested.
function FlowConnector({ animate, delay = 0 }: { animate: boolean; delay?: number }) {
  return (
    <div className="mlff-flow-conn" aria-hidden="true">
      <span className="mlff-flow-line" />
      {animate ? <span className="mlff-flow-dot" style={{ animationDelay: `${delay}s` }} /> : null}
      <span className="mlff-flow-arrowhead" />
    </div>
  );
}

function EquivariantInteractionCore({ ko, reducedMotion }: { ko: boolean; reducedMotion: boolean }) {
  const animate = !reducedMotion;
  const stageClass = animate ? "mlff-flow-stage" : "";
  return (
    // `safe center` keeps the stack centred while it fits and falls back to top-aligned
    // the moment it does not. Plain `center` pushed the overflow out of both ends, so at
    // 1024 the first box printed straight over the panel's own header.
    <div className="flex h-full flex-col items-center gap-1 px-1.5 [justify-content:safe_center]">
      <div className={`w-full max-w-[15rem] border border-border bg-muted/30 px-2 py-2 text-center text-foreground ${stageClass}`} style={animate ? stageDelayStyle(0) : undefined}>
        <p className={MULTISCALE_TYPE.schematicTitle}>{ko ? "원자 위치와 원소" : "Positions and elements"}</p>
        <p className={`mt-1 text-balance ${MULTISCALE_TYPE.schematicMeta}`}>
          {ko ? "이웃 범위 안의 모든 원자" : "of every atom inside the neighbor range"}
        </p>
      </div>

      <FlowConnector animate={animate} delay={0.35} />

      <div className={`relative w-full max-w-[15rem] pt-2 ${stageClass}`} style={animate ? stageDelayStyle(1.2) : undefined}>
        <span className="absolute inset-x-3 -top-0 h-full border border-border" />
        <span className="absolute inset-x-1 top-1 h-full border border-border" />
        <div className="relative border border-border-strong bg-card p-2.5">
          {/* No title here: the panel header directly above already reads
              "symmetry-preserving representation", and printing it twice cost three
              wrapped lines in the narrowest column on the page. */}
          <div className="text-center text-foreground">
            <p className={MULTISCALE_TYPE.schematicTitle}>{ko ? "일관된 주변 환경 표현" : "Consistent description of the neighborhood"}</p>
          </div>
          {/* Two descriptor families, told apart by colour alone. On the retired
              `cyan-800 dark:cyan-100` / `violet-800 dark:violet-100` pair the dark values were
              both near-white: dE between the families fell from 85.1 in light to 18.4 in dark,
              closer to each other than either was to plain body text at 21.0 and 19.5. The
              declared --sch-* pairs hold hue across modes, which is the rule the ramp classes
              broke (DESIGN.md: "dark raises lightness one step"; 800 to 100 is seven).
              The meta preset is spelled out without its text-muted-foreground: carrying both
              colour classes, the grey won and both lines rendered as plain meta text. */}
          <div className="mt-2.5 grid gap-1 border-t border-border pt-2.5 text-left">
            <p className="type-mono-meta text-balance text-xs leading-4 tracking-[0.06em] text-[var(--sch-descriptor-invariant)]">
              {ko ? "계를 옮기거나 돌리거나 같은 원소끼리 바꿔도 에너지는 같음" : "energy stays the same after moving, rotating, or swapping identical atoms"}
            </p>
            <p className="type-mono-meta text-balance text-xs leading-4 tracking-[0.06em] text-[var(--sch-descriptor-equivariant)]">
              {ko ? "계를 돌리면 힘의 방향도 함께 회전" : "force directions rotate with the system"}
            </p>
          </div>
        </div>
      </div>

      <FlowConnector animate={animate} delay={1.55} />
      <div className={`w-full max-w-[15rem] border border-border-strong bg-card px-2 py-2 text-center text-foreground ${stageClass}`} style={animate ? stageDelayStyle(2.4) : undefined}>
        <p className={`text-balance ${MULTISCALE_TYPE.schematicCaption}`}>
          {ko ? "중심 원자의 에너지 기여" : "Energy contribution of the center atom"}
        </p>
      </div>
    </div>
  );
}

function DatasetPanel({ data, ko, className = "" }: { data: MlffVisualData | null; ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="dataset" className={`relative flex min-h-0 flex-col overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "양자 계산으로 만든 학습 자료" : "training data from quantum calculations"}>
      <PanelHeader title={ko ? "양자 참조 자료" : "quantum reference data"} detail={ko ? "원자 배치마다 양자 계산으로 얻은 에너지와 원자별 힘" : "each arrangement with its quantum energy and per-atom forces"} tone="dft" />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <MlffMolstarViewport
            ko={ko}
            variant="dataset"
            data={data}
            label={ko ? "양자 계산값이 붙은 원자 배치" : "atomic arrangements with quantum energy and force labels"}
            rowLock={{ rows: 5, pitch: DATASET_ROW_SPACING, gapPx: 6 }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-3 inset-y-0 z-10 grid grid-rows-5 gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          // data-frame marks a box that claims to contain what a canvas paints under
          // it. probe-frame-fit.mjs reads the composited pixels in the gaps between
          // these boxes and fails if scene content crosses a frame edge, which is a
          // defect no DOM geometry check can see.
          <div key={index} data-frame="dataset-row" data-frame-index={index} className="relative border border-border">
            <span className="absolute left-1.5 top-1 bg-surface-raised/80 px-1.5 py-0.5 text-xs text-muted-foreground">
              {ko ? `예시 ${index + 1}` : `example ${index + 1}`}
            </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompactPotentialModel({ ko, reducedMotion }: { ko: boolean; reducedMotion: boolean }) {
  const animate = !reducedMotion;
  const stageClass = animate ? "mlff-flow-stage" : "";
  return (
    <div className="flex h-full flex-col items-center px-1.5 [justify-content:safe_center]">
      <div className={`h-[5.25rem] w-24 ${stageClass}`} style={animate ? stageDelayStyle(0) : undefined}>
        <LocalGraphGlyph ko={ko} />
      </div>
      <p className={`mt-1 text-center text-balance ${MULTISCALE_TYPE.schematicMeta}`}>
        {ko ? "원자 하나의 주변" : "atoms around one atom"}
      </p>

      <FlowConnector animate={animate} delay={0.35} />

      <div className={`relative w-full max-w-[11rem] pt-2 ${stageClass}`} style={animate ? stageDelayStyle(1.2) : undefined}>
        <span className="absolute inset-x-3 top-0 h-full border border-border" />
        <span className="absolute inset-x-1 top-1 h-full border border-border" />
        <div className="relative border border-border-strong bg-card p-2.5 text-center">
          <p className={MULTISCALE_TYPE.schematicTitle}>
            {ko ? "일관된 주변 환경 표현" : "consistent local description"}
          </p>
          <div className="mt-2 border-t border-border pt-2 text-foreground">
            <p className={MULTISCALE_TYPE.schematicCaption}>{ko ? "계를 옮기거나 돌려도 같은 에너지" : "gives the same energy after moving or rotating the system"}</p>
          </div>
        </div>
      </div>

      <FlowConnector animate={animate} delay={1.55} />
      <div className={`w-full max-w-[11rem] border border-border-strong bg-card px-3 py-3 text-center ${stageClass}`} style={animate ? stageDelayStyle(2.4) : undefined}>
        <p className={MULTISCALE_TYPE.schematicCaption}>{ko ? "원자별 에너지를 더해 총에너지를 계산" : "adds atomic energies into one total energy"}</p>
      </div>
    </div>
  );
}

function ModelPanel({ ko, reducedMotion, className = "" }: { ko: boolean; reducedMotion: boolean; className?: string }) {
  return (
    <section data-mlff-panel="model" className={`relative flex min-h-0 flex-col overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "머신러닝 역장" : "machine learning force field"}>
      <PanelHeader title={ko ? "머신러닝 역장" : "machine-learning force field"} align="center" tone="mlff" />
      <div className="relative mx-1 mb-2 min-h-0 flex-1">
        <CompactPotentialModel ko={ko} reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

const VALUE_VIEWBOX = { x: 38, y: 12, width: 292, height: 240 };

function MlffValueSchematic({ ko }: { ko: boolean }) {
  // Accuracy (y) vs accessible time & scale (x). DFT/AIMD is accurate but short
  // and small; classical force fields reach long times and large systems but at
  // low accuracy; the learned force field reaches the long, large side near the
  // top. DFT is the ceiling: the MLFF is trained on it, so its box never rises
  // above DFT's, and it reaches further down because its accuracy depends on how
  // well the training data covers the chemistry.
  // The MLFF box ends left of the classical one: each MLFF step costs more than evaluating
  // fixed-form classical terms, so the same effort reaches shorter times and smaller systems.
  // It starts inside DFT's range because it also runs at DFT-checkable sizes. Qualitative
  // order only.
  //
  // At 1024 the panel renders about 0.7px per unit, so every label that only restated
  // a box's position on the axes was cut: those were the words printing past the boxes.
  //
  // Every label is asked for in CSS pixels and converted to user units here. A font-size
  // inside a viewBox is in user units, so it is multiplied by whatever ratio the svg happens
  // to be rendered at, and one declared value cannot satisfy the type scale at more than a
  // single container width: 13.5 units measured 15.1px at 1440, 9.4px at 1024 and 15.7px on
  // a phone. Dividing by the measured ratio pins the absolute size instead, which is what
  // the type scale is written in.
  const [wrapRef, box] = useMeasuredBox<HTMLDivElement>({
    width: VALUE_VIEWBOX.width,
    height: VALUE_VIEWBOX.height,
  });
  // preserveAspectRatio defaults to "meet", so one user unit renders at the smaller ratio.
  const unit = Math.min(box.width / VALUE_VIEWBOX.width, box.height / VALUE_VIEWBOX.height) || 1;
  const fs = (px: number) => +(px / unit).toFixed(2);
  // Metadata register for ticks and descriptor lines, block-title register for the three
  // regime names. DESIGN.md section 3.
  const META = fs(12);
  const TITLE = fs(15);
  const LEAD = fs(17);
  const clusterFills = ["#64748b", "#3b82f6", "#f43f5e", "#e2e8f0", "#64748b", "#94a3b8"];
  return (
    <div ref={wrapRef} className="h-full w-full">
    <svg
      viewBox="38 12 292 240"
      className="h-full w-full"
      role="img"
      aria-label={ko
        ? "양자 참조 자료와의 연결 정도와 계산 범위를 비교한 도식"
        : "Comparison of connection to quantum reference data and computational reach"}
    >
      <defs>
        <clipPath id="mlff-val-clip">
          <rect x="160" y="104" width="138" height="30" />
        </clipPath>
      </defs>

      <line x1="48" y1="142" x2="322" y2="142" stroke="var(--plot-axis)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="4 5" />
      <line x1="176" y1="30" x2="176" y2="210" stroke="var(--plot-axis)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="4 5" />

      <path d="M48 210 H322 M316 205 L322 210 L316 215" fill="none" stroke="var(--plot-axis)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 210 V30 M43 36 L48 30 L53 36" fill="none" stroke="var(--plot-axis)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />

      <text x="42" y="24" fill="var(--plot-label)" fontSize={META} fontWeight="600">{ko ? "양자 자료와 일치 ↑" : "match to quantum data ↑"}</text>
      <text x="112" y="228" fill="var(--plot-text)" fontSize={META} textAnchor="middle">{ko ? "짧은 시간 · 작은 계" : "short, small"}</text>
      <text x="253" y="228" fill="var(--plot-text)" fontSize={META} textAnchor="middle">{ko ? "긴 시간 · 큰 계" : "long, large"}</text>
      <text x="185" y="247" fill="var(--plot-label)" fontSize={META} fontWeight="600" textAnchor="middle">{ko ? "시간 · 규모 →" : "time · scale →"}</text>

      <g>
        <rect x="56" y="32" width="96" height="58" fill="var(--lv-dft-wash)" stroke="var(--lv-dft-line)" strokeWidth="1.2" />
        <text x="104" y="56" fill="var(--lv-dft)" fontSize={TITLE} fontWeight="700" textAnchor="middle">DFT</text>
        <text x="104" y="76" fill="var(--sch-muted)" fontSize={META} textAnchor="middle">{ko ? "기준" : "reference"}</text>
      </g>

      <g>
        <rect x="184" y="150" width="138" height="58" fill="var(--lv-aa-wash)" stroke="var(--lv-aa-line)" strokeWidth="1.2" />
        <text x="253" y="174" fill="var(--muted-foreground)" fontSize={TITLE} fontWeight="700" textAnchor="middle">{ko ? "고전 역장" : "classical"}</text>
        <text x="253" y="194" fill="var(--sch-muted)" fontSize={META} textAnchor="middle">{ko ? "고정 규칙" : "fixed rules"}</text>
      </g>

      <g style={{ filter: "drop-shadow(0 0 9px var(--lv-mlff-line))" }}>
        <rect x="160" y="44" width="138" height="90" fill="var(--lv-mlff-wash)" stroke="var(--lv-mlff-line)" strokeWidth="1.6" />
        <text x="229" y="68" fill="var(--lv-mlff)" fontSize={LEAD} fontWeight="800" textAnchor="middle">MLFF</text>
        <text x="229" y="88" fill="var(--sch-muted)" fontSize={META} textAnchor="middle">{ko ? "양자 자료로 학습" : "quantum-trained"}</text>
        {/* A dense atom slab clipped by the box reads as a large system continuing
            beyond the frame; the long weaving path is dynamics longer than DFT reaches,
            shorter than classical. */}
        <g clipPath="url(#mlff-val-clip)">
          {Array.from({ length: 156 }, (_, index) => {
            const col = index % 26;
            const row = Math.floor(index / 26);
            const cx = 160 + col * 5.6 + (row % 2) * 2.8;
            const cy = 108 + row * 5.3 + Math.sin(col * 1.3) * 0.7;
            return <circle key={index} cx={cx} cy={cy} r="1.4" fill={clusterFills[(col + row) % clusterFills.length]} opacity="0.9" />;
          })}
          <path d="M158 118 q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0" fill="none" stroke="var(--sch-stretch)" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
        </g>
      </g>
    </svg>
    </div>
  );
}

function PesPanel({ ko, className = "" }: { ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="pes" className={`relative flex min-h-0 flex-col overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "양자 참조 자료와의 연결과 계산 범위를 비교한 도식" : "comparison of connection to quantum reference data and accessible molecular motion"}>
      <PanelHeader
        title={ko ? "양자 참조와 계산 범위" : "quantum reference and computational reach"}
        detail={ko ? "양자 참조 자료를 더 긴 원자 궤적으로 확장" : "extend quantum reference data into longer atom-level trajectories"}
        tone="mlff"
      />
      <div className="relative mx-3 min-h-0 flex-1">
        <MlffValueSchematic ko={ko} />
      </div>
      <div className="shrink-0 mx-3 mb-3 mt-2 border-t border-border pt-2 text-center">
        <p className={MULTISCALE_TYPE.schematicMeta}>
          {ko ? "결과: 구조 · 움직임 · 측정 가능한 물성" : "outputs: structures · motion · measurable properties"}
        </p>
      </div>
    </section>
  );
}

function OverviewPage({
  data,
  ko,
  isMobile,
  reducedMotion,
}: {
  data: MlffVisualData | null;
  ko: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div className={isMobile ? "mlff-mobile-overview flex min-h-full flex-col gap-2" : "mlff-overview-grid gap-2"}>
      <DatasetPanel data={data} ko={ko} className={isMobile ? "h-[350px] flex-none" : ""} />
      <FlowArrow vertical={isMobile} reducedMotion={reducedMotion} label={ko ? "학습" : "learn"} />
      <ModelPanel ko={ko} reducedMotion={reducedMotion} className={isMobile ? "h-[470px] flex-none" : ""} />
      <FlowArrow vertical={isMobile} reducedMotion={reducedMotion} label={ko ? "활용" : "use"} />
      <PesPanel ko={ko} className={isMobile ? "h-[430px] flex-none" : ""} />
    </div>
  );
}

function LocalGraphPanel({
  data,
  ko,
  className = "",
}: {
  data: MlffVisualData | null;
  ko: boolean;
  className?: string;
}) {
  const geometry = useMemo(
    () => (data ? getLocalGraphGeometry(data.system) : null),
    [data],
  );
  const projectionAnchors = useMemo<ProjectionAnchor[] | undefined>(() => {
    if (!geometry) return undefined;
    return [
      { id: "center", point: geometry.center, atomIndex: data?.system.focusIndex },
      ...geometry.highlightedNeighbors.map((neighbor) => ({
        id: `neighbor-${neighbor.index}`,
        point: neighbor.point,
        atomIndex: neighbor.index,
        distance: neighbor.distance,
      })),
    ];
  }, [data?.system.focusIndex, geometry]);

  return (
    <section data-mlff-panel="local-graph" className={`relative flex min-h-0 flex-col overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "원자 하나를 예측할 때 사용하는 가까운 원자들" : "nearby atoms used to make one atomic prediction"}>
      <PanelHeader
        title={ko ? "원자 하나와 가까운 환경" : "one atom and its nearby environment"}
        tone="mlff"
        detail={ko ? "가까운 원자가 중심 원자의 예측에 함께 기여" : "nearby atoms contribute to the center atom's prediction"}
      />
      <div className="relative min-h-0 flex-1">
        <MlffMolstarViewport
          ko={ko}
          variant="local"
          data={data}
          label={ko ? "중심 원자와 예측에 쓰는 가까운 이웃" : "center atom and the nearby atoms used for its prediction"}
          projectionAnchors={projectionAnchors}
          projectionCenterId="center"
          projectionRadius={geometry?.cutoffRadius}
          renderProjectionOverlay={(layout) => geometry
            ? <ExactNeighborMessageOverlay layout={layout} geometry={geometry} ko={ko} />
            : null}
        />
      </div>
      <div className="mx-3 mb-3 mt-2 shrink-0 border-t border-border pt-3 text-center">
        <p className={`${MULTISCALE_TYPE.schematicTitle} text-balance text-foreground`}>
          {ko ? "모형은 이웃 범위 안의 원자만 읽는다" : "The model reads only atoms inside the neighbor range"}
        </p>
        <p className={`mt-1 text-balance ${MULTISCALE_TYPE.schematicCaption}`}>
          {ko
            ? "계가 커져도 원자 하나에 드는 계산량은 같다"
            : "so the cost per atom stays the same as the system grows"}
        </p>
      </div>
    </section>
  );
}

function InteractionPanel({ ko, reducedMotion, className = "" }: { ko: boolean; reducedMotion: boolean; className?: string }) {
  return (
    <section data-mlff-panel="interaction" className={`relative flex min-h-0 flex-col overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "원자 주변 환경을 일관된 에너지 표현으로 바꾸는 과정" : "turning an atomic neighborhood into a consistent energy description"}>
      <PanelHeader title={ko ? "주변 환경을 읽는 법" : "reading the nearby environment"} detail={ko ? "이웃 원자의 위치를 에너지 계산의 입력값으로 바꿈" : "turns neighbor positions into inputs for the energy"} tone="mlff" />
      <div className="relative mx-1 mb-2 min-h-0 flex-1">
        <EquivariantInteractionCore ko={ko} reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

function EnergyForcePanel({
  data,
  ko,
  actionsRef,
  className = "",
}: {
  data: MlffVisualData | null;
  ko: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  className?: string;
}) {
  return (
    <section data-mlff-panel="energy-force" className={`relative flex min-h-0 flex-col overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "원자별 기여를 합쳐 총에너지와 힘을 얻는 과정" : "combining atomic contributions to obtain total energy and forces"}>
      <PanelHeader
        title={ko ? "총에너지와 힘" : "total energy and forces"}
        tone="mlff"
        detail={ko ? "모든 원자의 기여를 더한 총에너지" : "add every atom's contribution into one total energy"}
      />
      <div className="relative min-h-0 flex-1">
        <MlffMolstarViewport ko={ko} variant="forces" data={data} label={ko ? "이웃 범위 안의 원자와 각 원자에 작용하는 힘" : "the atoms inside the neighbor range and the force on each atom"} actionsRef={actionsRef} />
      </div>
      <div className="mx-1 mb-2 mt-2 shrink-0 border-t border-border bg-surface-sunken/90 pt-2.5 text-center">
        <div className="border border-lv-mlff-line bg-lv-mlff-wash px-1 py-2.5 text-foreground">
          <p className={MULTISCALE_TYPE.schematicCaption}>
            {ko ? "각 원자에 작용하는 힘은 그 원자가 움직일 때 총에너지가 변하는 정도로 정해진다." : "The force on each atom comes from how the total energy changes when that atom moves."}
          </p>
        </div>
      </div>
    </section>
  );
}

function InsidePage({
  data,
  ko,
  isMobile,
  reducedMotion,
  actionsRef,
}: {
  data: MlffVisualData | null;
  ko: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
}) {
  return (
    // The middle column carries the most text of the three and had the least room for
    // it: at 1024 it was 164px and its English content ran 104px past the panel. Weight
    // shifted from the energy-force column, whose content is a Mol* viewport that scales
    // and one equation, rather than from the value schematic, whose type is already at
    // the legibility floor at this width (DESIGN.md R11).
    <div className={isMobile ? "mlff-mobile-inside flex min-h-full flex-col gap-2" : "grid h-full min-h-0 grid-cols-[minmax(0,.86fr)_2rem_minmax(0,1.24fr)_2rem_minmax(0,1.04fr)] gap-2"}>
      <LocalGraphPanel data={data} ko={ko} className={isMobile ? "h-[430px] flex-none" : ""} />
      {/* At 52px, "encode" and "combine" printed across both borders of a 32px gutter. The
          first arrow needs no word; the second names the step it draws. */}
      <FlowArrow vertical={isMobile} reducedMotion={reducedMotion} />
      <InteractionPanel ko={ko} reducedMotion={reducedMotion} className={isMobile ? "h-[515px] flex-none" : ""} />
      <FlowArrow
        vertical={isMobile}
        reducedMotion={reducedMotion}
        label={ko ? "합산" : "sum"}
      />
      <EnergyForcePanel data={data} ko={ko} actionsRef={actionsRef} className={isMobile ? "h-[420px] flex-none" : ""} />
    </div>
  );
}

export function MlffSchematicStage({
  sceneKey,
  lang = "en",
  isMobile,
  reducedMotion = false,
  actionsRef,
  mobileSceneHeight,
}: MlffSchematicStageProps) {
  const [data, setData] = useState<MlffVisualData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasColor = useMultiscaleCanvasColor();
  const ko = lang === "ko";
  const inside = sceneKey === "L5_energy_force";
  const stageRef = useRef<HTMLDivElement>(null);
  const [titleReach, setTitleReach] = useState<number | null>(null);

  // On desktop the scene title card is drawn over the top-left of this stage, and its height
  // follows the title: the English overview title wraps to three lines and the card ended
  // 190px down, against a guessed 10rem reservation that hid the first panel's heading at
  // every width (DESIGN.md R19). Measure how far the card reaches into the stage instead;
  // a card laid out above the stage reaches 0.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (isMobile || !stage) return;
    const title = stage
      .closest('[data-testid="multiscale-stage-shell"]')
      ?.querySelector('[data-testid="multiscale-scene-title"]');
    const measure = () =>
      setTitleReach(
        title ? Math.max(0, title.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) : 0,
      );
    measure();
    const observer = new ResizeObserver(measure);
    if (title) observer.observe(title);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [isMobile]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch(withBasePath("/data/multiscale/allatom/molecule.json"), { cache: "force-cache" }).then((response) => {
        if (!response.ok) throw new Error(`molecule.json ${response.status}`);
        return response.json() as Promise<MoleculeData>;
      }),
      fetch(withBasePath("/data/multiscale/mlff/system.json"), { cache: "force-cache" }).then((response) => {
        if (!response.ok) throw new Error(`system.json ${response.status}`);
        return response.json() as Promise<MlffSystemData>;
      }),
    ])
      .then(([molecule, system]) => {
        if (!cancelled) setData({ molecule, system });
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "MLFF visual data failed to load.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={`mlff-schematic-stage relative w-full overflow-hidden ${isMobile ? "" : "h-full"}`}
      style={{ backgroundColor: canvasColor, ...(isMobile ? { height: mobileSceneHeight } : {}) }}
      data-testid="multiscale-render-surface"
      data-scene={inside ? "inside" : "overview"}
    >
      <div className="mlff-stage-backdrop pointer-events-none absolute inset-0 opacity-45" />
      {/* Phone: no title card is drawn over the stage there, and the status row above it
          clears the stage once the shell carries pt-16 (MultiscalePinned). */}
      <div
        className={`relative h-full ${isMobile ? "px-3 pb-4 pt-3" : "px-5 pb-5 pt-[10rem]"}`}
        style={!isMobile && titleReach !== null ? { paddingTop: Math.max(16, titleReach + 14) } : undefined}
      >
        {loadError ? (
          <div className="grid h-full place-items-center border border-primary/30 bg-accent/30 px-8 text-center text-sm text-muted-foreground">
            {ko ? "MLFF 도식 데이터를 불러오지 못했습니다." : "The MLFF schematic data could not be loaded."}
          </div>
        ) : inside ? (
          <InsidePage data={data} ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} actionsRef={actionsRef} />
        ) : (
          <OverviewPage data={data} ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} />
        )}
      </div>
    </div>
  );
}
