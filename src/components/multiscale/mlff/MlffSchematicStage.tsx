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
import {
  BLUE,
  CYAN,
  PURPLE,
  SLATE,
  WHITE,
  type CameraSnapshotLike,
  type PluginLike,
  type ResearchLayerSpec,
  type ResearchPrimitive,
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
  const headBase = addVector(end, scaleVector(unit, -Math.min(0.34, length * 0.32)));
  return [
    {
      kind: "cylinder",
      start,
      end: headBase,
      radiusTop: 0.045,
      radiusBottom: 0.045,
      radialSegments: 14,
      color,
    },
    {
      kind: "cylinder",
      start: headBase,
      end,
      radiusTop: 0,
      radiusBottom: 0.14,
      radialSegments: 18,
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
  const colors = [PURPLE, PURPLE, BLUE, BLUE, CYAN, CYAN];
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
            radiusTop: 0.024,
            radiusBottom: 0.024,
            color: colors[levelIndex] ?? CYAN,
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
      primitives: [{ kind: "mesh", vertices, faces, color: PURPLE, doubleSided: true }],
      params: { alpha: 0.36, xrayShaded: true, emissive: 0.14 },
    },
    {
      label: "Isoenergy contours on the learned PES slice",
      primitives: contours,
      params: { alpha: 0.82, emissive: 0.48 },
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
  const center = centroid(data.molecule.atoms);
  const anchor = surfacePoint(1.1, -0.05, pesHeight(1.1, -0.05) + 1.35);
  const transform: MoleculeTransform = {
    center,
    scale: 0.64,
    rotate: [0.32, -0.2, -0.1],
    translate: anchor,
  };
  const molecule = moleculePrimitives(data.molecule, transform);
  const selected = [0, 2, 4, 7, 10, 14, 18, 21].filter((index) => index < data.molecule.atoms.length);
  const forceArrows = selected.flatMap((index, order) => {
    const start = transformAtom(data.molecule.atoms[index], index, transform);
    const angle = order * 1.67 + 0.35;
    const vector: Vec3Tuple = [Math.cos(angle) * 0.62, Math.sin(angle) * 0.52, 0.32 + (order % 2) * 0.14];
    return arrowPrimitives(start, vector, CYAN);
  });
  const trajectoryCoordinates = [
    [-4.25, 1.65],
    [-3.4, 0.95],
    [-2.45, 0.35],
    [-1.35, -0.32],
    [-0.15, -0.45],
    [1.05, -0.08],
  ].map(([x, y]) => surfacePoint(x, y, pesHeight(x, y) + 0.12));
  const trajectory: ResearchPrimitive[] = [];
  trajectoryCoordinates.forEach((point, index) => {
    trajectory.push({ kind: "sphere", center: point, radius: index === trajectoryCoordinates.length - 1 ? 0.095 : 0.065, color: WHITE });
    if (index > 0) {
      trajectory.push({
        kind: "cylinder",
        start: trajectoryCoordinates[index - 1],
        end: point,
        radiusTop: 0.035,
        radiusBottom: 0.035,
        color: CYAN,
      });
    }
  });
  return [
    ...layers,
    {
      label: "Molecular trajectory on the learned surface",
      primitives: trajectory,
      params: { emissive: 0.56 },
    },
    {
      label: "Molecule evaluated by the ML force field",
      primitives: molecule,
      params: { emissive: 0.08, material: { metalness: 0.08, roughness: 0.36, bumpiness: 0 } },
    },
    {
      label: "Predicted atomic forces",
      primitives: forceArrows,
      params: { emissive: 0.68 },
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
  const indices = [0, 2, 4, 6, 9, 12, 16, 20, 23].filter((index) => index < data.molecule.atoms.length);
  const arrows = indices.flatMap((index, order) => {
    const start = transformAtom(data.molecule.atoms[index], index, transform);
    const outward = [start[0], start[1], start[2]] as Vec3Tuple;
    const length = Math.hypot(...outward) || 1;
    const tangent: Vec3Tuple = [
      outward[0] / length + Math.cos(order * 1.3) * 0.22,
      outward[1] / length + Math.sin(order * 1.3) * 0.22,
      outward[2] / length + 0.18,
    ];
    return arrowPrimitives(start, scaleVector(tangent, 0.72), CYAN);
  });
  const highlighted = indices.slice(0, 4).map((index) => ({
    kind: "sphere" as const,
    center: transformAtom(data.molecule.atoms[index], index, transform),
    radius: 0.58,
    color: BLUE,
  }));
  return [
    {
      label: "Atomic energy sites",
      primitives: highlighted,
      params: { alpha: 0.095, xrayShaded: true, emissive: 0.28 },
    },
    {
      label: "Molecular structure",
      primitives: molecule,
      params: { emissive: 0.08, material: { metalness: 0.08, roughness: 0.36, bumpiness: 0 } },
    },
    {
      label: "Energy-consistent forces",
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
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectedLayout, setProjectedLayout] = useState<ProjectedLayout | null>(null);
  const layers = useMemo(() => (data ? buildLayers(variant, data) : null), [data, variant]);

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
                ? 2.15
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
        console.error(cause);
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

  return (
    <div
      className="multiscale-molstar pointer-events-none relative h-full w-full select-none overflow-hidden bg-[#070914]"
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
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#070914]">
          <span className="type-mono-meta text-xs uppercase tracking-[0.12em] text-cyan-100/58">
            Mol* / preparing view
          </span>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-[#070914] px-5 text-center text-xs leading-5 text-slate-400">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function PanelHeader({
  title,
  detail,
  align = "left",
}: {
  title: string;
  detail?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`pointer-events-none absolute left-0 right-0 top-0 z-10 p-3.5 ${align === "center" ? "text-center" : ""}`}>
      <h4 className={MULTISCALE_TYPE.schematicTitle}>{title}</h4>
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
          stroke="rgba(103,232,249,.72)"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label ? (
        <span className={`${MULTISCALE_TYPE.schematicMeta} absolute text-cyan-100/58 ${vertical ? "left-[calc(50%+1.5rem)] top-3" : "left-1/2 top-[calc(50%+1.25rem)] -translate-x-1/2 whitespace-nowrap"}`}>
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
        className="absolute border border-violet-300/45 bg-violet-950/94 px-2 py-1 text-2xl font-semibold leading-none text-violet-50 shadow-[0_0_22px_rgba(167,139,250,.58)] backdrop-blur-sm"
        style={{ left: centerLabelLeft, top: centerLabelTop }}
      >
        <MathLabel latex={String.raw`i`} />
      </span>
      <span
        data-mlff-cutoff-label
        className="absolute border border-cyan-300/38 bg-[#050510]/94 px-2 py-1 text-lg font-semibold leading-none text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,.32)] backdrop-blur-sm"
        style={{ left: cutoffLabelLeft, top: cutoffLabelTop }}
      >
        <MathLabel latex={String.raw`r_{\mathrm{cut}}`} />
      </span>
    </div>
  );
}

function LocalGraphGlyph() {
  const nodes = [
    { x: 60, y: 58, r: 9, fill: "#8b5cf6" },
    { x: 28, y: 31, r: 5, fill: "#f43f5e" },
    { x: 91, y: 29, r: 5, fill: "#64748b" },
    { x: 102, y: 72, r: 5, fill: "#f8fafc" },
    { x: 43, y: 92, r: 5, fill: "#64748b" },
    { x: 20, y: 66, r: 4, fill: "#f8fafc" },
  ];
  return (
    <svg viewBox="0 0 120 118" className="h-full w-full" role="img" aria-label="Atom-centered local graph">
      <circle cx="60" cy="58" r="48" fill="rgba(34,211,238,.025)" stroke="rgba(103,232,249,.3)" strokeDasharray="3 4" />
      {nodes.slice(1).map((node, index) => (
        <line key={`edge-${index}`} x1="60" y1="58" x2={node.x} y2={node.y} stroke="rgba(103,232,249,.34)" strokeWidth="1.2" />
      ))}
      {nodes.map((node, index) => (
        <g key={index}>
          <circle cx={node.x} cy={node.y} r={node.r + 3} fill={node.fill} opacity=".12" />
          <circle cx={node.x} cy={node.y} r={node.r} fill={node.fill} stroke="rgba(255,255,255,.38)" strokeWidth=".8" />
        </g>
      ))}
    </svg>
  );
}

function EquivariantInteractionCore({ ko }: { ko: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-3">
      <div className="w-full max-w-[15rem] border border-white/10 bg-white/[0.025] px-3 py-2.5 text-center text-cyan-100">
        <MathLabel
          latex={String.raw`h_i^{(\ell)},\ \{h_j^{(\ell)},\mathbf r_{ij}\}_{j\in\mathcal N(i)}`}
          className={MULTISCALE_TYPE.formulaCompact}
        />
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>
          {ko ? "중심 원자와 이웃의 상대 기하" : "center atom and relative neighbor geometry"}
        </p>
      </div>

      <span className="text-lg leading-none text-cyan-200/72" aria-hidden="true">↓</span>

      <div className="relative w-full max-w-[15rem] pt-2">
        <span className="absolute inset-x-3 -top-0 h-full border border-violet-300/10 bg-violet-300/[0.018]" />
        <span className="absolute inset-x-1 top-1 h-full border border-cyan-300/12 bg-cyan-300/[0.018]" />
        <div className="relative border border-cyan-300/28 bg-[#080b18] p-3 shadow-[inset_0_0_28px_rgba(34,211,238,.035)]">
          <div className="flex items-center justify-between gap-3">
            <p className={MULTISCALE_TYPE.schematicTitle}>{ko ? "등변 상호작용" : "equivariant interaction"}</p>
            <MathLabel latex={String.raw`\times L`} className="shrink-0 text-xs text-violet-200" />
          </div>
          <div className="mt-3 border-t border-white/8 pt-3 text-center text-slate-100">
            <MathLabel
              latex={String.raw`m_i^{(\ell)}=\Phi_\ell\!\left(\{h_j^{(\ell)},\mathbf r_{ij}\}\right)`}
              className={MULTISCALE_TYPE.formulaCompact}
            />
          </div>
          <div className="mt-3 grid gap-2 border-t border-white/8 pt-3">
            <div className="grid grid-cols-[4.6rem_1fr] items-center gap-2">
              <span className={`${MULTISCALE_TYPE.schematicMeta} text-cyan-100`}>
                <MathLabel latex={String.raw`s_i^{(\ell)}`} /> {ko ? "스칼라" : "scalar"}
              </span>
              <div className="flex items-center gap-1.5" aria-label={ko ? "회전 불변 스칼라 특징" : "rotation-invariant scalar features"}>
                {[0, 1, 2, 3, 4].map((index) => <span key={index} className="h-2.5 w-2.5 rounded-full border border-cyan-200/55 bg-cyan-300/16" />)}
              </div>
            </div>
            <div className="grid grid-cols-[4.6rem_1fr] items-center gap-2 border-t border-white/8 pt-2">
              <span className={`${MULTISCALE_TYPE.schematicMeta} text-violet-100`}>
                <MathLabel latex={String.raw`\mathbf v_i^{(\ell)}`} /> {ko ? "벡터" : "vector"}
              </span>
              <div className="flex items-center gap-2 text-sm leading-none text-violet-200" aria-label={ko ? "구조와 함께 회전하는 벡터 특징" : "vector features that co-rotate with the structure"}>
                <span>↗</span><span>↑</span><span>←</span><span>↘</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <span className="text-lg leading-none text-cyan-200/72" aria-hidden="true">↓</span>
      <div className="w-full max-w-[15rem] border border-violet-300/24 bg-violet-300/[0.04] px-3 py-2.5 text-center text-violet-100">
        <MathLabel
          latex={String.raw`\{\varepsilon_1,\varepsilon_2,\ldots,\varepsilon_N\}`}
          className={MULTISCALE_TYPE.formulaCompact}
        />
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "원자별 에너지" : "atomic energies"}</p>
      </div>
    </div>
  );
}

function DatasetPanel({ data, ko, className = "" }: { data: MlffVisualData | null; ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="dataset" className={`relative min-h-0 overflow-hidden border border-white/12 bg-[#070914] ${className}`} aria-label={ko ? "DFT 학습 데이터" : "DFT training data"}>
      <PanelHeader title={ko ? "DFT 참조 데이터" : "DFT reference data"} detail={ko ? "배치마다 총에너지와 원자별 힘을 계산" : "each configuration carries energy and force labels"} />
      <div className="absolute inset-x-0 bottom-0 top-[4.5rem]">
        <MlffMolstarViewport variant="dataset" data={data} label={ko ? "다섯 DFT 원자 배치의 Mol* 렌더" : "Mol* render of five DFT configurations"} />
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 top-[4.8rem] z-10 grid grid-rows-5 gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="relative border border-white/[0.075] bg-white/[0.012]">
            <span className="absolute left-1.5 top-1 bg-[#050510]/76 px-1.5 py-0.5 text-xs text-slate-500 backdrop-blur-sm">
              <MathLabel latex={`k=${index + 1}`} />
            </span>
            <span className="absolute bottom-1 right-1.5 bg-[#050510]/84 px-1.5 py-0.5 text-xs text-slate-300/90 backdrop-blur-sm">
              <MathLabel latex={`(\\mathbf R^{(${index + 1})},E_{\\mathrm{DFT}}^{(${index + 1})},\\mathbf F_{i,\\mathrm{DFT}}^{(${index + 1})})`} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactPotentialModel({ ko }: { ko: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-3">
      <div className="h-24 w-28">
        <LocalGraphGlyph />
      </div>
      <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>
        {ko ? "국소 기하" : "local geometry"}
      </p>
      <span className="my-2 text-lg leading-none text-cyan-200/72" aria-hidden="true">↓</span>

      <div className="relative w-full max-w-[11rem] pt-2">
        <span className="absolute inset-x-3 top-0 h-full border border-violet-300/10 bg-violet-300/[0.018]" />
        <span className="absolute inset-x-1 top-1 h-full border border-cyan-300/12 bg-cyan-300/[0.018]" />
        <div className="relative border border-cyan-300/30 bg-[#080b18] p-3 shadow-[inset_0_0_28px_rgba(34,211,238,.035)]">
          <div className="flex items-start justify-between gap-2">
            <p className={MULTISCALE_TYPE.schematicTitle}>
              {ko ? "등변 상호작용" : "equivariant interaction"}
            </p>
            <MathLabel latex={String.raw`\times L`} className="shrink-0 text-xs text-violet-200" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3">
            <div className="border border-cyan-300/18 bg-cyan-300/[0.035] px-2 py-2 text-center text-cyan-100">
              <MathLabel latex={String.raw`s_i`} className="text-base" />
              <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "스칼라" : "scalar"}</p>
            </div>
            <div className="border border-violet-300/18 bg-violet-300/[0.035] px-2 py-2 text-center text-violet-100">
              <MathLabel latex={String.raw`\mathbf v_i`} className="text-base" />
              <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "벡터" : "vector"}</p>
            </div>
          </div>
        </div>
      </div>

      <span className="my-2 text-lg leading-none text-cyan-200/72" aria-hidden="true">↓</span>
      <div className="w-full max-w-[11rem] border border-violet-300/22 bg-violet-300/[0.035] px-3 py-3 text-center">
        <MathLabel latex={String.raw`E_\theta(\mathbf R)`} className={MULTISCALE_TYPE.formulaCompact} />
        <p className={`mt-1 ${MULTISCALE_TYPE.schematicCaption}`}>
          {ko ? "미분 가능한 학습 퍼텐셜" : "differentiable potential"}
        </p>
      </div>
    </div>
  );
}

function ModelPanel({ ko, className = "" }: { ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="model" className={`relative min-h-0 overflow-hidden border border-white/12 bg-white/[0.018] ${className}`} aria-label={ko ? "머신러닝 역장" : "machine learning force field"}>
      <PanelHeader title={ko ? "등변 머신러닝 역장" : "equivariant ML force field"} align="center" />
      <div className="absolute inset-x-1 bottom-3 top-[3.2rem]">
        <CompactPotentialModel ko={ko} />
      </div>
    </section>
  );
}

function PesPanel({
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
    <section data-mlff-panel="pes" className={`relative min-h-0 overflow-hidden border border-white/12 bg-[#070914] ${className}`} aria-label={ko ? "학습된 퍼텐셜 에너지면과 예측 힘" : "learned potential energy surface and predicted forces"}>
      <PanelHeader
        title={ko ? "학습 PES의 2차원 절단면" : "2D slice of the learned PES"}
        detail={ko ? "등고선은 같은 에너지, 청록 경로는 MD 궤적" : "contours mark equal energy; the cyan path is the MD trajectory"}
      />
      <div className="absolute inset-x-0 bottom-[7.4rem] top-[4.4rem]">
        <MlffMolstarViewport variant="pes" data={data} label={ko ? "Mol*로 렌더한 퍼텐셜 에너지면 위 분자와 힘" : "Mol* render of a molecule and forces on a potential energy surface"} actionsRef={actionsRef} />
        <div data-mlff-pes-key className="pointer-events-none absolute left-3 top-3 z-10 border border-violet-300/22 bg-[#050510]/88 px-3 py-2.5 text-left backdrop-blur-sm">
          <p className={`${MULTISCALE_TYPE.schematicMeta} text-violet-100/74`}>
            {ko ? "배치 공간의 도식적 절단면" : "SCHEMATIC CONFIGURATION-SPACE SLICE"}
          </p>
          <MathLabel
            latex={String.raw`\widetilde E_\theta(q_1,q_2)=E_\theta(\mathbf R_0+q_1\mathbf u_1+q_2\mathbf u_2)`}
            className={`${MULTISCALE_TYPE.formulaCompact} mt-1 block text-violet-50`}
          />
          <div className={`mt-2 flex items-center gap-3 ${MULTISCALE_TYPE.schematicMeta}`}>
            <span className="flex items-center gap-1.5"><span className="h-px w-5 bg-cyan-300" />{ko ? "등에너지선" : "isoenergy"}</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white" />{ko ? "궤적" : "trajectory"}</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 border-t border-cyan-300/18 bg-[#070914]/88 pt-2.5 text-center backdrop-blur-sm">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-1.5">
          <div>
            <MathLabel latex={String.raw`E_\theta(\mathbf R)`} className={`${MULTISCALE_TYPE.formulaCompact} text-violet-100`} />
            <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "PES 절단면" : "PES slice"}</p>
          </div>
          <span className="pt-0.5 text-base text-cyan-200/70" aria-hidden="true">→</span>
          <div>
            <MathLabel latex={String.raw`\mathbf F_i`} className={`${MULTISCALE_TYPE.formulaCompact} text-cyan-50`} />
            <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "힘" : "forces"}</p>
          </div>
          <span className="pt-0.5 text-base text-cyan-200/70" aria-hidden="true">→</span>
          <div>
            <MathLabel latex={String.raw`\mathbf R(t+\Delta t)`} className={`${MULTISCALE_TYPE.formulaCompact} text-slate-100`} />
            <p className={`mt-1 ${MULTISCALE_TYPE.schematicMeta}`}>{ko ? "궤적" : "trajectory"}</p>
          </div>
        </div>
        <div className="mt-2 border-t border-white/8 pt-2 text-cyan-50">
          <MathLabel latex={String.raw`\mathbf F_i=-\nabla_{\mathbf R_i}E_\theta(\mathbf R)`} className={MULTISCALE_TYPE.formulaCompact} />
        </div>
      </div>
    </section>
  );
}

function OverviewPage({
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
    <div className={isMobile ? "mlff-mobile-overview flex min-h-full flex-col gap-2" : "grid h-full min-h-0 grid-cols-[minmax(0,.98fr)_2rem_minmax(0,.66fr)_2rem_minmax(0,1.18fr)] gap-2"}>
      <DatasetPanel data={data} ko={ko} className={isMobile ? "h-[350px] flex-none" : ""} />
      <FlowArrow vertical={isMobile} reducedMotion={reducedMotion} label={ko ? "학습" : "learn"} />
      <ModelPanel ko={ko} className={isMobile ? "h-[470px] flex-none" : ""} />
      <FlowArrow vertical={isMobile} reducedMotion={reducedMotion} label={ko ? "평가" : "evaluate"} />
      <PesPanel data={data} ko={ko} actionsRef={actionsRef} className={isMobile ? "h-[430px] flex-none" : ""} />
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
    <section data-mlff-panel="local-graph" className={`relative min-h-0 overflow-hidden border border-white/12 bg-[#070914] ${className}`} aria-label={ko ? "차단 반경 안의 국소 원자 그래프" : "local atomic graph inside the cutoff"}>
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
      <div className="absolute inset-x-3 bottom-3 border-t border-cyan-300/16 pt-3 text-center">
        <div className="grid gap-0.5 text-cyan-50">
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

function InteractionPanel({ ko, className = "" }: { ko: boolean; className?: string }) {
  return (
    <section data-mlff-panel="interaction" className={`relative min-h-0 overflow-hidden border border-white/12 bg-white/[0.018] ${className}`} aria-label={ko ? "등변 메시지 전달과 원자별 에너지" : "equivariant message passing and atomic energies"}>
      <PanelHeader title={ko ? "등변 상호작용 블록" : "equivariant interaction block"} detail={ko ? "이웃 메시지로 스칼라·벡터 특징 갱신" : "neighbor messages update scalar and vector features"} />
      <div className="absolute inset-x-1 bottom-3 top-[5rem]">
        <EquivariantInteractionCore ko={ko} />
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
    <section data-mlff-panel="energy-force" className={`relative min-h-0 overflow-hidden border border-white/12 bg-[#070914] ${className}`} aria-label={ko ? "원자별 에너지 합과 에너지 기울기에서 얻는 힘" : "atomic energy sum and forces from the energy gradient"}>
      <PanelHeader
        title={ko ? "총에너지와 힘" : "total energy and forces"}
        detail={ko ? "원자별 기여의 합과 같은 에너지의 기울기" : "sum atomic contributions, then differentiate the same energy"}
      />
      <div className="absolute inset-x-0 bottom-[8rem] top-[4.8rem]">
        <MlffMolstarViewport variant="forces" data={data} label={ko ? "Mol*로 렌더한 분자와 예측 힘" : "Mol* render of a molecule and predicted forces"} actionsRef={actionsRef} />
      </div>
      <div className="absolute inset-x-3 bottom-3 border-t border-cyan-300/18 bg-[#070914]/88 pt-2.5 text-center backdrop-blur-sm">
        <div className="border border-cyan-300/18 bg-cyan-300/[0.025] px-2 py-2.5 text-slate-100">
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
      <InteractionPanel ko={ko} className={isMobile ? "h-[515px] flex-none" : ""} />
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
        console.error(cause);
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "MLFF visual data failed to load.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="mlff-schematic-stage relative h-full w-full overflow-hidden bg-[#050510]"
      data-testid="multiscale-render-surface"
      data-scene={inside ? "inside" : "overview"}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(103,232,249,.024) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.024) 1px, transparent 1px), radial-gradient(circle at 78% 28%, rgba(59,130,246,.11), transparent 34%), radial-gradient(circle at 24% 82%, rgba(139,92,246,.075), transparent 31%)",
          backgroundSize: "32px 32px, 32px 32px, 100% 100%, 100% 100%",
        }}
      />
      <div className={`relative h-full ${isMobile ? "px-3 pb-4 pt-[8.6rem]" : "px-5 pb-5 pt-[10rem]"}`}>
        {loadError ? (
          <div className="grid h-full place-items-center border border-rose-300/18 bg-rose-300/[0.025] px-8 text-center text-sm text-slate-300">
            {ko ? "MLFF 도식 데이터를 불러오지 못했습니다." : "The MLFF schematic data could not be loaded."}
          </div>
        ) : inside ? (
          <InsidePage data={data} ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} actionsRef={actionsRef} />
        ) : (
          <OverviewPage data={data} ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} actionsRef={actionsRef} />
        )}
      </div>
    </div>
  );
}
