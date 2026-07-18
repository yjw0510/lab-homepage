"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Vec3, Vec4 } from "molstar/lib/mol-math/linear-algebra.js";
import { Color } from "molstar/lib/mol-util/color/color.js";
import { withBasePath } from "@/lib/basePath";
import type { ResearchCameraActions } from "../molstar/shared";
import { MULTISCALE_TYPE } from "../visualRules";
import { useMultiscaleCanvasColor } from "../useMultiscaleCanvasColor";
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
  sceneKey?: string;
  lang?: string;
  isMobile: boolean;
  reducedMotion?: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
}

const COLORS: Record<string, Color> = {
  H: Color.fromHexStyle("#f8fafc"),
  C: Color.fromHexStyle("#64748b"),
  N: Color.fromHexStyle("#3b82f6"),
  O: Color.fromHexStyle("#f43f5e"),
  Na: Color.fromHexStyle("#8b5cf6"),
  S: Color.fromHexStyle("#fbbf24"),
};

const RADII: Record<string, number> = {
  H: 0.24,
  C: 0.38,
  N: 0.4,
  O: 0.4,
  Na: 0.58,
  S: 0.48,
};

function MathLabel({
  latex,
  display = false,
  className = "",
}: {
  latex: string;
  display?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`mlff-katex ${display ? "mlff-katex-display" : ""} ${className}`}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(latex, {
          throwOnError: false,
          displayMode: display,
          output: "htmlAndMathml",
        }),
      }}
    />
  );
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
  const coordinates = new Map<number, Vec3Tuple>();
  selected.forEach((index) => {
    coordinates.set(index, transformAtom(data.atoms[index], index, transform));
  });

  const primitives: ResearchPrimitive[] = [];
  data.bonds.forEach((bond) => {
    const [a, b] = bond;
    if (!selectedSet.has(a) || !selectedSet.has(b)) return;
    const start = coordinates.get(a);
    const end = coordinates.get(b);
    if (!start || !end) return;
    const middle: Vec3Tuple = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ];
    const radius = Math.max(0.035, 0.085 * transform.scale);
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
      radius: Math.max(0.115, (RADII[element] ?? 0.36) * Math.sqrt(transform.scale)),
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
  const headLength = Math.min(0.28, length * 0.3);
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
      radiusBottom: 0.1,
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
      primitives: [{ kind: "mesh", vertices, faces, color: Color.fromHexStyle("#111a3e"), doubleSided: true }],
      params: { alpha: 0.46, xrayShaded: true, emissive: 0.05 },
    },
    {
      label: "Isoenergy contours on the learned PES slice",
      primitives: contours,
      params: { alpha: 0.82, emissive: 0.4 },
    },
  ];
}

function buildDatasetLayers(data: MlffVisualData): ResearchLayerSpec[] {
  const center = centroid(data.molecule.atoms);
  const configs = [
    { y: 5.1, rotate: [0.18, -0.42, -0.5] as Vec3Tuple, phase: 0.2 },
    { y: 2.55, rotate: [-0.35, 0.28, 0.18] as Vec3Tuple, phase: 1.1 },
    { y: 0, rotate: [0.48, -0.16, -0.08] as Vec3Tuple, phase: 2.2 },
    { y: -2.55, rotate: [-0.22, -0.38, 0.46] as Vec3Tuple, phase: 3.1 },
    { y: -5.1, rotate: [0.36, 0.32, -0.3] as Vec3Tuple, phase: 4.4 },
  ];
  const primitives = configs.flatMap((config, index) =>
    moleculePrimitives(data.molecule, {
      center,
      scale: 0.31,
      rotate: config.rotate,
      translate: [index % 2 === 0 ? -0.18 : 0.18, config.y, 0],
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

function buildForceLayers(data: MlffVisualData): ResearchLayerSpec[] {
  const center = centroid(data.molecule.atoms);
  const transform: MoleculeTransform = {
    center,
    scale: 0.8,
    rotate: [0.38, -0.25, 0.06],
  };
  const molecule = moleculePrimitives(data.molecule, transform);
  // A force acts on every atom, so draw an arrow on every atom. Drawing only a
  // subset would imply the model predicts forces for some atoms and not others.
  const arrows = data.molecule.atoms.flatMap((_, index) => {
    const start = transformAtom(data.molecule.atoms[index], index, transform);
    const outward = [start[0], start[1], start[2]] as Vec3Tuple;
    const length = Math.hypot(...outward) || 1;
    const tangent: Vec3Tuple = [
      outward[0] / length + Math.cos(index * 1.3) * 0.22,
      outward[1] / length + Math.sin(index * 1.3) * 0.22,
      outward[2] / length + 0.18,
    ];
    // Each force starts exactly at its atom center (same transform as the
    // rendered atom).
    return arrowPrimitives(start, scaleVector(tangent, 1.05), CYAN);
  });
  return [
    {
      label: "Molecular structure",
      primitives: molecule,
      params: { emissive: 0.08, material: { metalness: 0.08, roughness: 0.36, bumpiness: 0 } },
    },
    {
      label: "Energy-consistent forces on every atom",
      primitives: arrows,
      params: { emissive: 0.72 },
    },
  ];
}

function buildLayers(variant: MlffViewportVariant, data: MlffVisualData) {
  if (variant === "dataset") return buildDatasetLayers(data);
  if (variant === "pes") return buildPesLayers(data);
  if (variant === "local") return buildLocalLayers(data);
  return buildForceLayers(data);
}

function MlffMolstarViewport({
  variant,
  data,
  label,
  actionsRef,
  framingScale,
  projectionAnchors,
  projectionCenterId,
  projectionRadius,
  renderProjectionOverlay,
}: {
  variant: MlffViewportVariant;
  data: MlffVisualData | null;
  label: string;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  framingScale?: number;
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
  const layers = useMemo(() => (data ? buildLayers(variant, data) : null), [data, variant]);

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
        const fitted = await fitScene(mounted.plugin, 0);
        if (fitted) {
          const cameraScale = framingScale ?? (
            variant === "local"
              ? 2.2
              : variant === "forces"
                ? 1.55
                : variant === "dataset"
                  ? 1.02
                  : 1.08
          );
          const snapshot = scaleSnapshot(fitted, cameraScale);
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
  }, [actionsRef, framingScale, layers, projectionAnchors, projectionCenterId, projectionRadius, variant]);

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
            Mol* / preparing view
          </span>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center px-5 text-center text-xs leading-5 text-muted-foreground" style={{ backgroundColor: canvasColor }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

const PANEL_TITLE_TONE = {
  dft: "text-sm font-semibold leading-5 text-lv-dft",
  mlff: "text-sm font-semibold leading-5 text-lv-mlff",
  aa: "text-sm font-semibold leading-5 text-lv-aa",
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
    <div className={`pointer-events-none absolute left-0 right-0 top-0 z-10 p-3.5 ${align === "center" ? "text-center" : ""}`}>
      <h4 className={tone ? PANEL_TITLE_TONE[tone] : MULTISCALE_TYPE.schematicTitle}>{title}</h4>
      {detail ? <p className={`mt-1 ${MULTISCALE_TYPE.schematicCaption}`}>{detail}</p> : null}
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
}: {
  layout: ProjectedLayout | null;
  geometry: LocalGraphGeometry;
}) {
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
  const centerLabelLeft = Math.min(layout.width - 54, Math.max(8, center.x + 12));
  const centerLabelTop = Math.min(layout.height - 46, Math.max(8, center.y + 12));
  const cutoffLabelLeft = Math.min(layout.width - 62, Math.max(8, cutoffEnd.x - 56));
  const cutoffLabelTop = Math.min(layout.height - 40, Math.max(8, cutoffEnd.y - 38));

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
      <span
        data-mlff-center-atom-label
        className="absolute border border-violet-700/45 bg-surface-raised/95 px-2 py-1 text-2xl font-semibold leading-none text-violet-900 shadow-[0_0_22px_rgba(167,139,250,.32)] backdrop-blur-sm dark:border-violet-300/45 dark:bg-violet-950/94 dark:text-violet-50"
        style={{ left: centerLabelLeft, top: centerLabelTop }}
      >
        <MathLabel latex={String.raw`i`} />
      </span>
      <span
        data-mlff-cutoff-label
        className="absolute border border-cyan-700/40 bg-surface-raised/95 px-2 py-1 text-lg font-semibold leading-none text-cyan-900 shadow-[0_0_16px_rgba(34,211,238,.22)] backdrop-blur-sm dark:border-cyan-300/38 dark:text-cyan-50"
        style={{ left: cutoffLabelLeft, top: cutoffLabelTop }}
      >
        <MathLabel latex={String.raw`r_{\mathrm{cut}}`} />
      </span>
    </div>
  );
}

function LocalGraphGlyph() {
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
    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`Central atom referencing ${neighbors.length} neighbors inside the cutoff of a dense environment`}>
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
    <div className="flex h-full flex-col items-center justify-center gap-1 px-3">
      <div className={`w-full max-w-[15rem] border border-border bg-muted/30 px-3 py-2.5 text-center text-foreground ${stageClass}`} style={animate ? stageDelayStyle(0) : undefined}>
        <MathLabel
          latex={String.raw`\{\mathbf r_{ij}\}_{j\in\mathcal N(i)}`}
          className={MULTISCALE_TYPE.formulaCompact}
        />
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>
          {ko ? "차단 반경 안 이웃의 상대 배치" : "relative arrangement of neighbors in the cutoff"}
        </p>
      </div>

      <FlowConnector animate={animate} delay={0.35} />

      <div className={`relative w-full max-w-[15rem] pt-2 ${stageClass}`} style={animate ? stageDelayStyle(1.2) : undefined}>
        <span className="absolute inset-x-3 -top-0 h-full border border-border" />
        <span className="absolute inset-x-1 top-1 h-full border border-border" />
        <div className="relative border border-border-strong bg-card p-3">
          <p className={MULTISCALE_TYPE.schematicTitle}>{ko ? "대칭 보존 표현" : "symmetry-preserving representation"}</p>
          <div className="mt-3 border-t border-border pt-3 text-center text-foreground">
            <MathLabel
              latex={String.raw`D_i=D\!\left(\{\mathbf r_{ij}\}_{j\in\mathcal N(i)}\right)`}
              className={MULTISCALE_TYPE.formulaCompact}
            />
            <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>
              {ko ? "이동·회전·동일 원자 치환에 불변" : "invariant to translation, rotation, permutation"}
            </p>
          </div>
          <div className="mt-3 grid gap-1 border-t border-border pt-3 text-left">
            <p className={`${MULTISCALE_TYPE.schematicMeta} text-cyan-800 dark:text-cyan-100`}>
              {ko ? "불변 descriptor · SOAP · ACSF · DeePMD" : "invariant descriptors · SOAP · ACSF · DeePMD"}
            </p>
            <p className={`${MULTISCALE_TYPE.schematicMeta} text-violet-800 dark:text-violet-100`}>
              {ko ? "등변 특징 · NequIP · MACE" : "equivariant features · NequIP · MACE"}
            </p>
          </div>
        </div>
      </div>

      <FlowConnector animate={animate} delay={1.55} />
      <div className={`w-full max-w-[15rem] border border-border-strong bg-card px-3 py-2.5 text-center text-foreground ${stageClass}`} style={animate ? stageDelayStyle(2.4) : undefined}>
        <MathLabel
          latex={String.raw`\varepsilon_i=f_\theta(D_i),\ \ E=\textstyle\sum_i\varepsilon_i`}
          className={MULTISCALE_TYPE.formulaCompact}
        />
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "원자별 에너지의 합" : "sum of atomic energies"}</p>
      </div>
    </div>
  );
}

function DatasetPanel({ data, ko, className = "" }: { data: MlffVisualData | null; ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="dataset" className={`relative min-h-0 overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "DFT 학습 데이터" : "DFT training data"}>
      <PanelHeader title={ko ? "DFT 참조 데이터" : "DFT reference data"} detail={ko ? "배치마다 총에너지와 원자별 힘을 계산" : "each configuration carries energy and force labels"} tone="dft" />
      <div className="absolute inset-x-0 bottom-0 top-[4.5rem]">
        <MlffMolstarViewport variant="dataset" data={data} label={ko ? "다섯 DFT 원자 배치의 Mol* 렌더" : "Mol* render of five DFT configurations"} />
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 top-[4.8rem] z-10 grid grid-rows-5 gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="relative border border-border bg-card/70">
            <span className="absolute left-1.5 top-1 bg-surface-raised/80 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
              <MathLabel latex={`k=${index + 1}`} />
            </span>
            <span className="absolute bottom-1 right-1.5 bg-surface-raised/85 px-1.5 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
              <MathLabel latex={`(\\mathbf R^{(${index + 1})},E_{\\mathrm{DFT}}^{(${index + 1})},\\mathbf F_{i,\\mathrm{DFT}}^{(${index + 1})})`} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactPotentialModel({ ko, reducedMotion }: { ko: boolean; reducedMotion: boolean }) {
  const animate = !reducedMotion;
  const stageClass = animate ? "mlff-flow-stage" : "";
  return (
    <div className="flex h-full flex-col items-center justify-center px-3">
      <div className={`h-24 w-28 ${stageClass}`} style={animate ? stageDelayStyle(0) : undefined}>
        <LocalGraphGlyph />
      </div>
      <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>
        {ko ? "국소 기하" : "local geometry"}
      </p>

      <FlowConnector animate={animate} delay={0.35} />

      <div className={`relative w-full max-w-[11rem] pt-2 ${stageClass}`} style={animate ? stageDelayStyle(1.2) : undefined}>
        <span className="absolute inset-x-3 top-0 h-full border border-border" />
        <span className="absolute inset-x-1 top-1 h-full border border-border" />
        <div className="relative border border-border-strong bg-card p-3 text-center">
          <p className={MULTISCALE_TYPE.schematicTitle}>
            {ko ? "대칭 보존 표현" : "symmetry-preserving representation"}
          </p>
          <div className="mt-2 border-t border-border pt-2 text-foreground">
            <MathLabel latex={String.raw`D_i`} className="text-base" />
            <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>
              {ko ? "이동·회전·치환 불변" : "T / R / permutation invariant"}
            </p>
          </div>
        </div>
      </div>

      <FlowConnector animate={animate} delay={1.55} />
      <div className={`w-full max-w-[11rem] border border-border-strong bg-card px-3 py-3 text-center ${stageClass}`} style={animate ? stageDelayStyle(2.4) : undefined}>
        <MathLabel latex={String.raw`E_\theta=\textstyle\sum_i\varepsilon_i`} className={MULTISCALE_TYPE.formulaCompact} />
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicCaption}`}>
          {ko ? "미분 가능한 학습 퍼텐셜" : "differentiable potential"}
        </p>
      </div>
      <p className={`mt-2 text-center ${MULTISCALE_TYPE.schematicMeta} text-muted-foreground`}>
        GAP · DeePMD · NequIP · MACE
      </p>
    </div>
  );
}

function ModelPanel({ ko, reducedMotion, className = "" }: { ko: boolean; reducedMotion: boolean; className?: string }) {
  return (
    <section data-mlff-panel="model" className={`relative min-h-0 overflow-hidden border border-border bg-card ${className}`} aria-label={ko ? "머신러닝 역장" : "machine learning force field"}>
      <PanelHeader title={ko ? "머신러닝 역장" : "machine-learned force field"} align="center" tone="mlff" />
      <div className="absolute inset-x-1 bottom-3 top-[3.2rem]">
        <CompactPotentialModel ko={ko} reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

function MlffValueSchematic({ ko }: { ko: boolean }) {
  // Accuracy (y) vs accessible time & scale (x). DFT/AIMD is accurate but short
  // and small; classical force fields reach long times and large systems but at
  // low accuracy; the learned force field occupies the corner neither can — DFT
  // accuracy together with beyond-nanosecond, large-scale sampling.
  const clusterFills = ["#64748b", "#3b82f6", "#f43f5e", "#e2e8f0", "#64748b", "#94a3b8"];
  return (
    <svg
      viewBox="0 0 340 250"
      className="h-full w-full"
      role="img"
      aria-label={ko
        ? "정확도와 접근 시간의 트레이드오프에서 학습된 역장은 DFT 정확도로 나노초를 넘는 대규모 샘플링에 도달한다"
        : "on the accuracy versus timescale tradeoff, the learned force field reaches DFT accuracy with beyond-nanosecond, large-scale sampling"}
    >
      <defs>
        <clipPath id="mlff-val-clip">
          <rect x="184" y="34" width="138" height="88" rx="9" />
        </clipPath>
      </defs>

      <line x1="48" y1="126" x2="322" y2="126" stroke="var(--plot-grid)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 5" />
      <line x1="176" y1="30" x2="176" y2="210" stroke="var(--plot-grid)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 5" />

      <path d="M48 210 H322 M316 205 L322 210 L316 215" fill="none" stroke="var(--plot-axis)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 210 V30 M43 36 L48 30 L53 36" fill="none" stroke="var(--plot-axis)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />

      <text x="42" y="24" fill="var(--plot-label)" fontSize="10" fontWeight="600">{ko ? "정확도 ↑" : "accuracy ↑"}</text>
      <text x="92" y="226" fill="var(--plot-text)" fontSize="9" textAnchor="middle">ps</text>
      <text x="200" y="226" fill="var(--plot-text)" fontSize="9" textAnchor="middle">ns</text>
      <text x="296" y="226" fill="var(--plot-text)" fontSize="9" textAnchor="middle">µs</text>
      <text x="185" y="244" fill="var(--plot-label)" fontSize="10" fontWeight="600" textAnchor="middle">{ko ? "시간 · 규모 →" : "time · scale →"}</text>

      <g>
        <rect x="62" y="54" width="94" height="52" rx="7" fill="var(--lv-dft-wash)" stroke="var(--lv-dft-line)" strokeWidth="1.2" />
        <text x="109" y="78" fill="var(--lv-dft)" fontSize="12" fontWeight="700" textAnchor="middle">DFT · AIMD</text>
        <text x="109" y="94" fill="var(--sch-muted)" fontSize="9" textAnchor="middle">{ko ? "~10² 원자 · ps" : "~10² atoms · ps"}</text>
      </g>

      <g>
        <rect x="184" y="150" width="138" height="48" rx="7" fill="var(--lv-meso-wash)" stroke="var(--lv-meso-line)" strokeWidth="1.2" />
        <text x="253" y="170" fill="var(--muted-foreground)" fontSize="12" fontWeight="700" textAnchor="middle">{ko ? "고전 역장" : "classical force field"}</text>
        <text x="253" y="186" fill="var(--sch-muted)" fontSize="9" textAnchor="middle">{ko ? "대규모·장시간, 정확도 낮음" : "large · long, low accuracy"}</text>
      </g>

      <g style={{ filter: "drop-shadow(0 0 9px var(--lv-mlff-line))" }}>
        <rect x="184" y="34" width="138" height="88" rx="9" fill="var(--lv-mlff-wash)" stroke="var(--lv-mlff-line)" strokeWidth="1.6" />
        <text x="253" y="52" fill="var(--lv-mlff)" fontSize="14" fontWeight="800" textAnchor="middle">MLFF</text>
        <text x="253" y="66" fill="var(--sch-muted)" fontSize="8.5" textAnchor="middle">{ko ? "ab-initio 정확도" : "ab-initio accuracy"}</text>
        <text x="253" y="77" fill="var(--sch-stretch)" fontSize="8.5" fontWeight="700" textAnchor="middle">{ko ? "~10³–10⁴ 원자 · ns–µs" : "~10³–10⁴ atoms · ns–µs"}</text>
        {/* A dense atom slab clipped by the box reads as a large system continuing
            beyond the frame; the long weaving path is beyond-ns dynamics. */}
        <g clipPath="url(#mlff-val-clip)">
          {Array.from({ length: 208 }, (_, index) => {
            const col = index % 26;
            const row = Math.floor(index / 26);
            const cx = 184 + col * 5.6 + (row % 2) * 2.8;
            const cy = 85 + row * 5.3 + Math.sin(col * 1.3) * 0.7;
            return <circle key={index} cx={cx} cy={cy} r="1.4" fill={clusterFills[(col + row) % clusterFills.length]} opacity="0.9" />;
          })}
          <path d="M182 89 q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0" fill="none" stroke="var(--sch-stretch)" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}

function PesPanel({ ko, className = "" }: { ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="pes" className={`relative min-h-0 overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "정확도와 규모를 동시에 확보하는 머신러닝 역장의 가치" : "the value of a machine-learned force field: accuracy and scale together"}>
      <PanelHeader
        title={ko ? "정확도와 규모를 한 번에" : "accuracy and scale, together"}
        detail={ko ? "DFT의 정확도와 고전 역장의 규모·시간을 한 모델에서" : "DFT accuracy with the scale and time of a classical force field"}
        tone="aa"
      />
      <div className="absolute inset-x-3 bottom-[3.4rem] top-[4.8rem]">
        <MlffValueSchematic ko={ko} />
      </div>
      <div className="absolute inset-x-3 bottom-3 border-t border-border pt-2 text-center">
        <p className={MULTISCALE_TYPE.schematicMeta}>
          {ko ? "샘플링 결과: 평형 구조 · 동적 거동 · 열역학·수송 물성" : "sampled: equilibrium structure · dynamics · thermodynamic and transport properties"}
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
    <div className={isMobile ? "mlff-mobile-overview flex min-h-full flex-col gap-2" : "grid h-full min-h-0 grid-cols-[minmax(0,.98fr)_2rem_minmax(0,.66fr)_2rem_minmax(0,1.18fr)] gap-2"}>
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
  isMobile,
  className = "",
}: {
  data: MlffVisualData | null;
  ko: boolean;
  isMobile: boolean;
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
    <section data-mlff-panel="local-graph" className={`relative min-h-0 overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "차단 반경 안의 국소 원자 그래프" : "local atomic graph inside the cutoff"}>
      <PanelHeader
        title={ko ? "국소 원자 그래프" : "local atomic graph"}
        detail={ko ? "실제 원자 좌표로 투영한 이웃 → 중심 메시지" : "neighbor-to-center messages projected from the actual atom coordinates"}
      />
      <div className="absolute inset-x-0 bottom-[6.4rem] top-[4.8rem]">
        <MlffMolstarViewport
          variant="local"
          data={data}
          label={ko ? "Mol*로 렌더한 중심 원자와 국소 이웃" : "Mol* render of an atom-centered local neighborhood"}
          framingScale={isMobile ? 1.12 : 2.2}
          projectionAnchors={projectionAnchors}
          projectionCenterId="center"
          projectionRadius={geometry?.cutoffRadius}
          renderProjectionOverlay={(layout) => geometry
            ? <ExactNeighborMessageOverlay layout={layout} geometry={geometry} />
            : null}
        />
      </div>
      <div className="absolute inset-x-3 bottom-3 border-t border-border pt-3 text-center">
        <div className="grid gap-0.5 text-foreground">
          <MathLabel
            latex={String.raw`j\in\mathcal N(i)\iff r_{ij}<r_{\mathrm{cut}}`}
            className={MULTISCALE_TYPE.formulaCompact}
          />
          <MathLabel
            latex={geometry
              ? `r_{\\mathrm{cut}}=${geometry.cutoffDistance.toFixed(2)}\\,\\text{\\AA}`
              : String.raw`r_{\mathrm{cut}}=\text{cutoff}`}
            className="text-base"
          />
        </div>
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicCaption}`}>
          {geometry
            ? ko
              ? `${geometry.neighborCount}개 이웃 모두가 기여하며, 가장 가까운 O 6개의 경로를 강조`
              : `all ${geometry.neighborCount} neighbors contribute; paths from the six nearest O atoms are highlighted`
            : ko
              ? "차단 반경 안의 이웃 메시지가 중심 원자로 모임"
              : "messages inside the cutoff converge on the center atom"}
        </p>
      </div>
    </section>
  );
}

function InteractionPanel({ ko, reducedMotion, className = "" }: { ko: boolean; reducedMotion: boolean; className?: string }) {
  return (
    <section data-mlff-panel="interaction" className={`relative min-h-0 overflow-hidden border border-border bg-card ${className}`} aria-label={ko ? "대칭 보존 표현과 원자별 에너지" : "symmetry-preserving representation and atomic energies"}>
      <PanelHeader title={ko ? "대칭 보존 표현" : "symmetry-preserving representation"} detail={ko ? "국소 이웃을 대칭 불변 표현으로 인코딩" : "encode the local neighborhood into a symmetry-invariant representation"} />
      <div className="absolute inset-x-1 bottom-3 top-[5rem]">
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
    <section data-mlff-panel="energy-force" className={`relative min-h-0 overflow-hidden border border-border bg-surface-sunken ${className}`} aria-label={ko ? "원자별 에너지 합과 에너지 기울기에서 얻는 힘" : "atomic energy sum and forces from the energy gradient"}>
      <PanelHeader
        title={ko ? "총에너지와 힘" : "total energy and forces"}
        detail={ko ? "원자별 기여의 합과 같은 에너지의 기울기" : "sum atomic contributions, then differentiate the same energy"}
      />
      <div className="absolute inset-x-0 bottom-[8rem] top-[4.8rem]">
        <MlffMolstarViewport variant="forces" data={data} label={ko ? "Mol*로 렌더한 분자와 예측 힘" : "Mol* render of a molecule and predicted forces"} actionsRef={actionsRef} />
      </div>
      <div className="absolute inset-x-3 bottom-3 border-t border-border bg-surface-sunken/90 pt-2.5 text-center backdrop-blur-sm">
        <div className="border border-lv-mlff-line bg-lv-mlff-wash px-2 py-2.5 text-foreground">
          <MathLabel
            display
            latex={String.raw`\begin{aligned} E_\theta(\mathbf R) &= \sum_i \varepsilon_i \\[0.45em] \mathbf F_i &= -\nabla_{\mathbf R_i}E_\theta(\mathbf R) \end{aligned}`}
            className={MULTISCALE_TYPE.formulaCompact}
          />
        </div>
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicCaption}`}>
          {ko ? "원자별 기여를 합하고 같은 에너지를 미분" : "sum atomic contributions, then differentiate the same energy"}
        </p>
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
    <div className={isMobile ? "mlff-mobile-inside flex min-h-full flex-col gap-2" : "grid h-full min-h-0 grid-cols-[minmax(0,.92fr)_2rem_minmax(0,.94fr)_2rem_minmax(0,1.28fr)] gap-2"}>
      <LocalGraphPanel data={data} ko={ko} isMobile={isMobile} className={isMobile ? "h-[430px] flex-none" : ""} />
      <FlowArrow vertical={isMobile} reducedMotion={reducedMotion} label={ko ? "인코딩" : "encode"} />
      <InteractionPanel ko={ko} reducedMotion={reducedMotion} className={isMobile ? "h-[515px] flex-none" : ""} />
      <FlowArrow
        vertical={isMobile}
        reducedMotion={reducedMotion}
        label={<MathLabel latex={String.raw`\sum,\ -\nabla`} />}
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
}: MlffSchematicStageProps) {
  const [data, setData] = useState<MlffVisualData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasColor = useMultiscaleCanvasColor();
  const ko = lang === "ko";
  const inside = sceneKey === "L5_energy_force";

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
      className="mlff-schematic-stage relative h-full w-full overflow-hidden"
      style={{ backgroundColor: canvasColor }}
      data-testid="multiscale-render-surface"
      data-scene={inside ? "inside" : "overview"}
    >
      <div className="mlff-stage-backdrop pointer-events-none absolute inset-0 opacity-45" />
      <div className={`relative h-full ${isMobile ? "px-3 pb-4 pt-[8.6rem]" : "px-5 pb-5 pt-[10rem]"}`}>
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
