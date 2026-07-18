"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { withBasePath } from "@/lib/basePath";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { applyMolstarPlacement, computeScheduledPlacement } from "../multiscaleViewRuntime";
import { MULTISCALE_MOTION } from "../visualRules";
import {
  DftMechanism,
  DftMechanismDataProvider,
  type DftMechanismData,
  type DftOutputMode,
} from "../overlays/DftMechanism";
import {
  BLUE,
  CameraSnapshotLike,
  ELEMENT_COLORS,
  ELEMENT_RADII,
  ORANGE,
  PluginLike,
  RED,
  ResearchCameraActions,
  ResearchLayerSpec,
  SLATE,
  applySpinSetting,
  centerPoints,
  commitResearchLayers,
  mixColor,
  mountResearchPlugin,
  offsetMesh,
} from "./shared";

interface IsosurfaceMesh {
  vertices: number[][];
  faces: number[][];
  normals?: number[][];
}

interface DftScaffoldData {
  atoms: number[][];
  elements: string[];
  bonds: number[][];
  bondOrders: number[];
  scf: { totalEnergy: number; converged: boolean };
}

interface FrontierOrbitalData {
  homoIsosurface: { positive: IsosurfaceMesh; negative: IsosurfaceMesh; isovalue: number };
  lumoIsosurface: { positive: IsosurfaceMesh; negative: IsosurfaceMesh; isovalue: number };
  orbitalEnergies: { homo: number; lumo: number; homoEV: number; lumoEV: number };
  orbitalLabels: { homo: string; lumo: string };
}

async function fetchJsonOrThrow<T>(path: string, label: string): Promise<T> {
  const response = await fetch(withBasePath(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${label}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

interface DensitySnapshot {
  iteration: number;
  label: string;
  isovalue: number;
  colorT: number;
  mesh: IsosurfaceMesh;
}

interface DensityEvolutionData {
  extent: number;
  gridSize: number;
  finalDensity: { isovalue: number; mesh: IsosurfaceMesh };
  snapshots: DensitySnapshot[];
}

interface GeometryOptimizationFrame {
  iteration: number;
  energyHa: number;
  energyEv: number;
  relativeEnergyKcalMol: number;
  energyDropKcalMol: number;
  maxForceEvA: number;
  rmsForceEvA: number;
  atoms: number[][];
  forcesEvA: number[][];
}

interface GeometryOptimizationData {
  system: string;
  formula: string;
  method: string;
  basis: string;
  engine: string;
  optimizer: string;
  targetMaxForceEvA: number;
  initialDistortion: {
    description: string;
    maximumDisplacementAngstrom: number;
  };
  converged: boolean;
  elements: string[];
  bonds: number[][];
  bondOrders: number[];
  frames: GeometryOptimizationFrame[];
}

interface DftStageData {
  molecule: DftScaffoldData;
  densityEvolution: DensityEvolutionData;
  geometryOptimization: GeometryOptimizationData | null;
  frontier: FrontierOrbitalData | null;
  center: [number, number, number];
}

function sampleGeometryOptimization(
  data: GeometryOptimizationData | null,
  maximumFrames = 18,
): GeometryOptimizationData | null {
  if (!data || data.frames.length <= maximumFrames) return data;
  const lastIndex = data.frames.length - 1;
  const indices = Array.from({ length: maximumFrames }, (_, index) =>
    Math.round(
      Math.pow(index / Math.max(1, maximumFrames - 1), 1.6) * lastIndex,
    ),
  );
  const uniqueIndices = Array.from(new Set([0, ...indices, lastIndex])).sort(
    (a, b) => a - b,
  );
  return {
    ...data,
    frames: uniqueIndices.map((index) => data.frames[index]),
  };
}

interface DftVisualState {
  showFinalDensity: boolean;
  finalDensityOpacity: number;
  showDensityEvolution: boolean;
  densityEvolutionOpacity: number;
  showHOMO: boolean;
  homoOpacity: number;
  showLUMO: boolean;
  lumoOpacity: number;
  atomOpacity: number;
  bondOpacity: number;
}

type DftSceneKey =
  | "D1_select"
  | "D2_pes"
  | "D3_ks"
  | "D4_scf"
  | "D5_recipe"
  | "D6_outputs"
  | "D7_labels";

const DFT_SCENE_KEYS = new Set<DftSceneKey>([
  "D1_select",
  "D2_pes",
  "D3_ks",
  "D4_scf",
  "D5_recipe",
  "D6_outputs",
  "D7_labels",
]);

const LEGACY_DFT_SCENE_MAP: Record<string, DftSceneKey> = {
  D1_transition: "D1_select",
  D2_kinetic: "D2_pes",
  D3_Vext: "D3_ks",
  D4_Hartree: "D4_scf",
  D5_Vxc: "D5_recipe",
  D6_density: "D6_outputs",
  D7_bands: "D7_labels",
  D8_dos: "D6_outputs",
  D9_settle: "D7_labels",
};

function resolveDftSceneKey(sceneKey: string | undefined, step: number): DftSceneKey {
  if (sceneKey && DFT_SCENE_KEYS.has(sceneKey as DftSceneKey)) {
    return sceneKey as DftSceneKey;
  }
  if (sceneKey && LEGACY_DFT_SCENE_MAP[sceneKey]) {
    return LEGACY_DFT_SCENE_MAP[sceneKey];
  }
  return (
    [
      "D1_select",
      "D2_pes",
      "D3_ks",
      "D4_scf",
      "D5_recipe",
      "D6_outputs",
      "D7_labels",
    ] as DftSceneKey[]
  )[Math.max(0, Math.min(step, 6))];
}

function shortenBond(
  start: number[],
  end: number[],
  radiusStart: number,
  radiusEnd: number,
): { start: [number, number, number]; end: [number, number, number] } {
  const dx = end[0] - start[0],
    dy = end[1] - start[1],
    dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6)
    return {
      start: start as [number, number, number],
      end: end as [number, number, number],
    };
  const nx = dx / len,
    ny = dy / len,
    nz = dz / len;
  return {
    start: [start[0] + nx * radiusStart, start[1] + ny * radiusStart, start[2] + nz * radiusStart],
    end: [end[0] - nx * radiusEnd, end[1] - ny * radiusEnd, end[2] - nz * radiusEnd],
  };
}

function getDftVisuals(sceneKey: DftSceneKey, outputMode: DftOutputMode): DftVisualState {
  const showDensityEvolution = sceneKey === "D4_scf";
  const showHOMO = sceneKey === "D6_outputs" && outputMode === "homo";
  const showLUMO = sceneKey === "D6_outputs" && outputMode === "lumo";
  const showFrontierOrbital = showHOMO || showLUMO;
  const showFinalDensity =
    sceneKey === "D1_select" ||
    sceneKey === "D3_ks" ||
    sceneKey === "D5_recipe" ||
    sceneKey === "D7_labels" ||
    (sceneKey === "D6_outputs" && outputMode === "density");

  return {
    showFinalDensity,
    finalDensityOpacity:
      sceneKey === "D1_select"
        ? 0.34
        : sceneKey === "D3_ks"
          ? 0.22
          : sceneKey === "D5_recipe"
            ? 0.27
            : sceneKey === "D7_labels"
              ? 0.24
              : showFinalDensity
                ? 0.46
                : 0,
    showDensityEvolution,
    densityEvolutionOpacity: showDensityEvolution ? 0.54 : 0,
    showHOMO,
    homoOpacity: showHOMO ? 0.96 : 0,
    showLUMO,
    lumoOpacity: showLUMO ? 0.94 : 0,
    atomOpacity: showFrontierOrbital ? 0.62 : showDensityEvolution || showFinalDensity ? 0.88 : 1,
    bondOpacity: showFrontierOrbital ? 0.52 : showDensityEvolution || showFinalDensity ? 0.7 : 0.9,
  };
}

function centerFrontierData(frontier: FrontierOrbitalData, center: [number, number, number]): FrontierOrbitalData {
  return {
    ...frontier,
    homoIsosurface: {
      ...frontier.homoIsosurface,
      positive: offsetMesh(frontier.homoIsosurface.positive, center),
      negative: offsetMesh(frontier.homoIsosurface.negative, center),
    },
    lumoIsosurface: {
      ...frontier.lumoIsosurface,
      positive: offsetMesh(frontier.lumoIsosurface.positive, center),
      negative: offsetMesh(frontier.lumoIsosurface.negative, center),
    },
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function migrateDensityEvolution(raw: any): DensityEvolutionData {
  const snapshots: DensitySnapshot[] = (raw.snapshots as any[]).map((s: any, i: number, arr: any[]) => {
    if (s.mesh) return s as DensitySnapshot;
    const mesh = (s.positive ?? s.negative ?? { vertices: [], faces: [] }) as IsosurfaceMesh;
    return {
      iteration: s.iteration ?? i,
      label: s.label ?? `Iter ${i}`,
      isovalue: s.isovalue ?? 0,
      colorT: arr.length > 1 ? i / (arr.length - 1) : 1,
      mesh,
    };
  });
  return { ...raw, snapshots };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function centerDftData(
  molecule: DftScaffoldData,
  densityEvolution: DensityEvolutionData,
  geometryOptimization: GeometryOptimizationData | null,
): DftStageData {
  const migrated = migrateDensityEvolution(densityEvolution);
  const centered = centerPoints(molecule.atoms);

  return {
    molecule: {
      ...molecule,
      atoms: centered.points,
    },
    densityEvolution: {
      ...migrated,
      finalDensity: {
        ...migrated.finalDensity,
        mesh: offsetMesh(migrated.finalDensity.mesh, centered.center),
      },
      snapshots: migrated.snapshots.map((snapshot) => ({
        ...snapshot,
        mesh: offsetMesh(snapshot.mesh, centered.center),
      })),
    },
    geometryOptimization: sampleGeometryOptimization(geometryOptimization),
    frontier: null,
    center: centered.center as [number, number, number],
  };
}

function buildDftLayers(
  data: DftStageData,
  sceneKey: DftSceneKey,
  activeSnapshotIndex: number,
  activeOptimizationIndex: number,
  outputMode: DftOutputMode,
): ResearchLayerSpec[] {
  const visuals = getDftVisuals(sceneKey, outputMode);
  const optimizationFrame =
    sceneKey === "D2_pes"
      ? data.geometryOptimization?.frames[activeOptimizationIndex] ??
        data.geometryOptimization?.frames[0]
      : null;
  const activeMolecule = optimizationFrame && data.geometryOptimization
    ? {
        atoms: optimizationFrame.atoms,
        elements: data.geometryOptimization.elements,
        bonds: data.geometryOptimization.bonds,
        bondOrders: data.geometryOptimization.bondOrders,
      }
    : data.molecule;
  const layers: ResearchLayerSpec[] = [
    {
      label: "DFT Atoms",
      primitives: activeMolecule.atoms.map((atom, index) => ({
        kind: "sphere" as const,
        center: atom as [number, number, number],
        radius: ELEMENT_RADII[activeMolecule.elements[index]] ?? 0.2,
        color: ELEMENT_COLORS[activeMolecule.elements[index]] ?? SLATE,
      })),
      params: {
        alpha: visuals.atomOpacity,
        quality: "high",
        material: { metalness: 0.08, roughness: 0.44, bumpiness: 0.03 },
        emissive: 0.02,
      },
    },
    {
      label: "DFT Bonds",
      primitives: activeMolecule.bonds.map(([i, j], index) => {
        const ri = ELEMENT_RADII[activeMolecule.elements[i]] ?? 0.2;
        const rj = ELEMENT_RADII[activeMolecule.elements[j]] ?? 0.2;
        const shortened = shortenBond(activeMolecule.atoms[i], activeMolecule.atoms[j], ri, rj);
        return {
          kind: "cylinder" as const,
          start: shortened.start,
          end: shortened.end,
          radiusTop: (activeMolecule.bondOrders[index] ?? 1) >= 2 ? 0.07 : 0.05,
          radiusBottom: (activeMolecule.bondOrders[index] ?? 1) >= 2 ? 0.07 : 0.05,
          radialSegments: 12,
          color: SLATE,
        };
      }),
      params: {
        alpha: visuals.bondOpacity,
        quality: "high",
        material: { metalness: 0.08, roughness: 0.44, bumpiness: 0.03 },
        emissive: 0.02,
      },
    },
  ];

  if (visuals.showDensityEvolution) {
    const snapshot = data.densityEvolution.snapshots[activeSnapshotIndex] ?? data.densityEvolution.snapshots[0];
    if (snapshot?.mesh.vertices.length) {
      const color = mixColor(ORANGE, BLUE, snapshot.colorT);
      layers.push({
        label: "SCF Total Density",
        primitives: [{ kind: "mesh" as const, vertices: snapshot.mesh.vertices, faces: snapshot.mesh.faces, color }],
        params: {
          alpha: visuals.densityEvolutionOpacity,
          quality: "high",
          material: { metalness: 0.02, roughness: 0.36, bumpiness: 0.02 },
          emissive: 0.08,
          transparentBackfaces: "off",
        },
      });
    }
  }

  if (visuals.showHOMO) {
    if (!data.frontier) return layers;
    layers.push(
      {
        label: "HOMO Positive",
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.homoIsosurface.positive.vertices, faces: data.frontier.homoIsosurface.positive.faces, color: RED }],
        params: {
          alpha: visuals.homoOpacity,
          quality: "high",
          material: { metalness: 0.06, roughness: 0.32, bumpiness: 0.02 },
          emissive: 0.14,
          transparentBackfaces: "off",
        },
      },
      {
        label: "HOMO Negative",
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.homoIsosurface.negative.vertices, faces: data.frontier.homoIsosurface.negative.faces, color: BLUE }],
        params: {
          alpha: visuals.homoOpacity,
          quality: "high",
          material: { metalness: 0.06, roughness: 0.32, bumpiness: 0.02 },
          emissive: 0.14,
          transparentBackfaces: "off",
        },
      },
    );
  }

  if (visuals.showLUMO) {
    if (!data.frontier) return layers;
    layers.push(
      {
        label: "LUMO Positive",
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.lumoIsosurface.positive.vertices, faces: data.frontier.lumoIsosurface.positive.faces, color: RED }],
        params: {
          alpha: visuals.lumoOpacity,
          quality: "high",
          material: { metalness: 0.06, roughness: 0.32, bumpiness: 0.02 },
          emissive: 0.14,
          transparentBackfaces: "off",
        },
      },
      {
        label: "LUMO Negative",
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.lumoIsosurface.negative.vertices, faces: data.frontier.lumoIsosurface.negative.faces, color: BLUE }],
        params: {
          alpha: visuals.lumoOpacity,
          quality: "high",
          material: { metalness: 0.06, roughness: 0.32, bumpiness: 0.02 },
          emissive: 0.14,
          transparentBackfaces: "off",
        },
      },
    );
  }

  if (visuals.showFinalDensity && data.densityEvolution.finalDensity.mesh.vertices.length) {
    layers.push({
      label: "Converged Electron Density",
      primitives: [
        {
          kind: "mesh" as const,
          vertices: data.densityEvolution.finalDensity.mesh.vertices,
          faces: data.densityEvolution.finalDensity.mesh.faces,
          color: BLUE,
        },
      ],
      params: {
        alpha: visuals.finalDensityOpacity,
        quality: "high",
        material: { metalness: 0.03, roughness: 0.42, bumpiness: 0.02 },
        emissive: 0.08,
        transparentBackfaces: "off",
      },
    });
  }

  return layers;
}

function sampleMeshVertices(mesh: IsosurfaceMesh, stride = 96) {
  if (mesh.vertices.length <= 2000) return mesh.vertices;
  const sampled: number[][] = [];
  for (let index = 0; index < mesh.vertices.length; index += stride) {
    sampled.push(mesh.vertices[index]);
  }
  return sampled;
}

function buildDftCameraMeta(
  data: DftStageData,
  sceneKey: DftSceneKey,
  activeSnapshotIndex: number,
  activeOptimizationIndex: number,
) {
  const optimizationAtoms =
    sceneKey === "D2_pes"
      ? data.geometryOptimization?.frames[activeOptimizationIndex]?.atoms ??
        data.geometryOptimization?.frames[0]?.atoms
      : null;
  const moleculeAtoms = optimizationAtoms ?? data.molecule.atoms;
  const points = [...moleculeAtoms];
  const subsets: Record<string, { indices: number[] }> = {
    molecule: { indices: Array.from({ length: moleculeAtoms.length }, (_, index) => index) },
  };
  const anchors: Record<string, [number, number, number]> = {
    molecule_center: [0, 0, 0],
  };

  const addSubset = (id: string, meshes: IsosurfaceMesh[]) => {
    const indices: number[] = [];
    const subsetPoints: number[][] = [];
    meshes.forEach((mesh) => {
      sampleMeshVertices(mesh).forEach((vertex) => {
        indices.push(points.length);
        points.push(vertex);
        subsetPoints.push(vertex);
      });
    });
    subsets[id] = { indices: indices.length > 0 ? indices : subsets.molecule.indices };
    if (subsetPoints.length > 0) {
      const center: [number, number, number] = [0, 0, 0];
      subsetPoints.forEach(([x, y, z]) => {
        center[0] += x;
        center[1] += y;
        center[2] += z;
      });
      anchors[`${id}_center`] = [
        center[0] / subsetPoints.length,
        center[1] / subsetPoints.length,
        center[2] / subsetPoints.length,
      ];
    } else {
      anchors[`${id}_center`] = [0, 0, 0];
    }
  };

  const snapshot = data.densityEvolution.snapshots[activeSnapshotIndex] ?? data.densityEvolution.snapshots[0];
  addSubset("scf_total_density", snapshot ? [snapshot.mesh] : []);
  if (data.frontier) {
    addSubset("homo", [data.frontier.homoIsosurface.positive, data.frontier.homoIsosurface.negative]);
    addSubset("lumo", [data.frontier.lumoIsosurface.positive, data.frontier.lumoIsosurface.negative]);
  }
  addSubset("final_density", [data.densityEvolution.finalDensity.mesh]);

  return {
    points,
    subsets,
    anchors,
  };
}

export function MolstarDftStage({
  progressRef,
  scrollState,
  isMobile,
  autoRotateRef,
  actionsRef,
  manualSnapshotIndex,
  sceneKey,
  reducedMotion: reducedMotionProp,
  lang = "en",
  hideMechanism = false,
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  manualSnapshotIndex?: number | null;
  sceneKey?: string;
  reducedMotion?: boolean;
  lang?: string;
  hideMechanism?: boolean;
}) {
  void progressRef;
  const isKorean = lang === "ko";
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion;
  const configuredSceneKey = sceneKey ?? CHOREOGRAPHY.dft.steps[scrollState.step]?.sceneKey;
  const resolvedSceneKey = resolveDftSceneKey(configuredSceneKey, scrollState.step);

  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const dataRef = useRef<DftStageData | null>(null);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const sceneKeyRef = useRef("");
  const [isReady, setIsReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(0);
  const [activeOptimizationIndex, setActiveOptimizationIndex] = useState(0);
  const [outputMode, setOutputMode] = useState<DftOutputMode>("density");
  const [assetMeta, setAssetMeta] = useState<Pick<
    DftMechanismData,
    "totalEnergyHa" | "finalDensityIsovalue" | "homoEV" | "lumoEV" | "homoLabel" | "lumoLabel"
  >>({});
  const [zoomIndex, setZoomIndex] = useState(2);
  const [viewRevision, setViewRevision] = useState(0);
  const frontierRequestedRef = useRef(false);
  const rebuildSceneRef = useRef<(() => Promise<void>) | null>(null);

  const renderKey = `${resolvedSceneKey}-${
    resolvedSceneKey === "D4_scf"
      ? activeSnapshotIndex
      : resolvedSceneKey === "D2_pes"
        ? activeOptimizationIndex
        : resolvedSceneKey === "D6_outputs"
          ? outputMode
          : "static"
  }`;
  const [initialBuild] = useState<{
    resolvedSceneKey: DftSceneKey;
    renderKey: string;
    activeSnapshotIndex: number;
    activeOptimizationIndex: number;
    outputMode: DftOutputMode;
  }>(() => ({
    resolvedSceneKey,
    renderKey,
    activeSnapshotIndex,
    activeOptimizationIndex,
    outputMode,
  }));

  const applyScheduledCamera = useCallback(
    (durationMs = 160, zoomLevel = zoomIndex) => {
      const plugin = pluginRef.current;
      const data = dataRef.current;
      if (!plugin || !data) return;
      const container = containerRef.current;
      const aspect = (container?.clientWidth ?? 1) / Math.max(1, container?.clientHeight ?? 1);
      const meta = buildDftCameraMeta(
        data,
        resolvedSceneKey,
        activeSnapshotIndex,
        activeOptimizationIndex,
      );
      const placement = computeScheduledPlacement({
        level: "dft",
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount: CHOREOGRAPHY.dft.steps.length,
        meta,
        points: meta.points,
        aspect,
        isMobile,
        zoomIndex:
          resolvedSceneKey === "D2_pes"
            ? Math.min(4, zoomLevel + 1)
            : zoomLevel,
      });
      defaultSnapshotRef.current = applyMolstarPlacement(plugin, placement, durationMs);
    },
    [
      activeOptimizationIndex,
      activeSnapshotIndex,
      isMobile,
      resolvedSceneKey,
      scrollState.step,
      scrollState.stepProgress,
      zoomIndex,
    ],
  );

  const rebuildingRef = useRef(false);
  const pendingRebuildRef = useRef(false);

  const rebuildScene = useCallback(async () => {
    const plugin = pluginRef.current;
    const data = dataRef.current;
    if (!plugin || !data) return;
    if (rebuildingRef.current) {
      pendingRebuildRef.current = true;
      return;
    }
    rebuildingRef.current = true;
    try {
      // Save camera before rebuild. plugin.clear() + commit() triggers Molstar auto-fit
      // which shifts the view when density mesh geometry changes between iterations.
      const snapshot = plugin.canvas3d?.camera.getSnapshot();

      await commitResearchLayers(
        plugin,
        buildDftLayers(
          data,
          resolvedSceneKey,
          activeSnapshotIndex,
          activeOptimizationIndex,
          outputMode,
        ),
      );

      // Restore camera so iteration changes don't shift the view.
      if (snapshot) plugin.managers.camera.setSnapshot(snapshot, 0);
    } finally {
      rebuildingRef.current = false;
      if (pendingRebuildRef.current) {
        pendingRebuildRef.current = false;
        void rebuildSceneRef.current?.();
      }
    }
  }, [activeOptimizationIndex, activeSnapshotIndex, outputMode, resolvedSceneKey]);

  useEffect(() => {
    rebuildSceneRef.current = rebuildScene;
  }, [rebuildScene]);

  useEffect(() => {
    setZoomIndex(2);
    setViewRevision((value) => value + 1);
  }, [scrollState.level]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      if (!container || pluginRef.current) return;

      let mountedPlugin: PluginLike | null = null;
      try {
        setMountError(null);
        const { plugin, error } = await mountResearchPlugin({
          container,
          autoRotate: autoRotateRef.current,
          actionsRef: undefined,
          defaultSnapshotRef,
        });
        if (!plugin) {
          setMountError(error);
          return;
        }
        mountedPlugin = plugin;
        const [molecule, densityEvolution, geometryOptimization] = await Promise.all([
          fetchJsonOrThrow<DftScaffoldData>("/data/multiscale/dft/molecule.json", "DFT molecule.json"),
          fetchJsonOrThrow<DensityEvolutionData>("/data/multiscale/dft/density-evolution.json", "DFT density-evolution.json"),
          fetchJsonOrThrow<GeometryOptimizationData>(
            "/data/multiscale/dft/geometry-optimization.json",
            "DFT geometry-optimization.json",
          ).catch((error) => {
            console.error(error);
            return null;
          }),
        ]);
        if (cancelled) {
          plugin.dispose();
          return;
        }

        pluginRef.current = plugin;
        dataRef.current = centerDftData(
          molecule,
          densityEvolution,
          geometryOptimization,
        );
        setAssetMeta({
          totalEnergyHa: molecule.scf.totalEnergy,
          finalDensityIsovalue: densityEvolution.finalDensity.isovalue,
        });

        sceneKeyRef.current = initialBuild.renderKey;
        await commitResearchLayers(
          plugin,
          buildDftLayers(
            dataRef.current,
            initialBuild.resolvedSceneKey,
            initialBuild.activeSnapshotIndex,
            initialBuild.activeOptimizationIndex,
            initialBuild.outputMode,
          ),
        );
        if (!cancelled) setIsReady(true);
      } catch (error) {
        console.error(error);
        setMountError(error instanceof Error ? error.message : "Failed to initialize the Mol* viewer.");
        mountedPlugin?.dispose();
      }
    })();

    return () => {
      cancelled = true;
      if (actionsRef) actionsRef.current = null;
      const plugin = pluginRef.current;
      pluginRef.current = null;
      plugin?.dispose();
      container?.replaceChildren();
    };
  }, [actionsRef, autoRotateRef, initialBuild]);

  useEffect(() => {
    const data = dataRef.current;
    if (!data) return;

    if (resolvedSceneKey !== "D4_scf") {
      setActiveSnapshotIndex(0);
      return;
    }

    if (manualSnapshotIndex !== null && manualSnapshotIndex !== undefined) {
      setActiveSnapshotIndex(
        Math.max(0, Math.min(manualSnapshotIndex, data.densityEvolution.snapshots.length - 1)),
      );
      return;
    }

    setActiveSnapshotIndex(
      reducedMotion ? Math.max(0, data.densityEvolution.snapshots.length - 1) : 0,
    );
  }, [isReady, manualSnapshotIndex, reducedMotion, resolvedSceneKey]);

  useEffect(() => {
    const snapshots = dataRef.current?.densityEvolution.snapshots ?? [];
    if (
      resolvedSceneKey !== "D4_scf" ||
      manualSnapshotIndex !== null &&
        manualSnapshotIndex !== undefined ||
      reducedMotion ||
      !isReady ||
      snapshots.length === 0
    ) {
      return;
    }

    const isFinalSnapshot = activeSnapshotIndex >= snapshots.length - 1;
    const timeout = window.setTimeout(
      () => {
        setActiveSnapshotIndex((current) =>
          current >= snapshots.length - 1 ? 0 : current + 1,
        );
      },
      isFinalSnapshot
        ? MULTISCALE_MOTION.finalStateHoldMs
        : MULTISCALE_MOTION.scfFrameMs,
    );
    return () => window.clearTimeout(timeout);
  }, [
    activeSnapshotIndex,
    isReady,
    manualSnapshotIndex,
    reducedMotion,
    resolvedSceneKey,
  ]);

  useEffect(() => {
    const frames = dataRef.current?.geometryOptimization?.frames ?? [];
    if (resolvedSceneKey !== "D2_pes" || frames.length === 0) {
      setActiveOptimizationIndex(0);
      return;
    }
    if (reducedMotion) {
      setActiveOptimizationIndex(frames.length - 1);
      return;
    }

    const isFinalFrame = activeOptimizationIndex >= frames.length - 1;
    const timeout = window.setTimeout(
      () => {
        setActiveOptimizationIndex((current) =>
          current >= frames.length - 1 ? 0 : current + 1,
        );
      },
      isFinalFrame ? 1800 : 560,
    );
    return () => window.clearTimeout(timeout);
  }, [activeOptimizationIndex, isReady, reducedMotion, resolvedSceneKey]);

  useEffect(() => {
    setOutputMode("density");
  }, [resolvedSceneKey]);

  // With the on-canvas readout panel removed (clean stage), the density / HOMO
  // / LUMO surface auto-cycles so the "cycles through" reading still holds. The
  // mobile split keeps its own toggle, so only drive this when the panel is
  // hidden and motion is allowed.
  useEffect(() => {
    if (!hideMechanism || reducedMotion) return;
    if (resolvedSceneKey !== "D6_outputs" || !isReady) return;
    const modes: DftOutputMode[] = ["density", "homo", "lumo"];
    let index = 0;
    const id = window.setInterval(() => {
      index = (index + 1) % modes.length;
      setOutputMode(modes[index]);
    }, MULTISCALE_MOTION.outputCycleMs);
    return () => window.clearInterval(id);
  }, [hideMechanism, reducedMotion, resolvedSceneKey, isReady]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !isReady) return;
    if (sceneKeyRef.current === renderKey) return;
    sceneKeyRef.current = renderKey;
    void rebuildScene();
  }, [isReady, rebuildScene, renderKey]);

  useEffect(() => {
    const data = dataRef.current;
    const needsFrontierOrbitals = resolvedSceneKey === "D6_outputs";
    if (!isReady || !needsFrontierOrbitals || !data || data.frontier || frontierRequestedRef.current) return;

    frontierRequestedRef.current = true;
    void fetchJsonOrThrow<FrontierOrbitalData>("/data/multiscale/dft/frontier-orbitals.json", "DFT frontier-orbitals.json")
      .then((frontier) => {
        if (!dataRef.current) return;
        dataRef.current = {
          ...dataRef.current,
          frontier: centerFrontierData(frontier, dataRef.current.center),
        };
        setAssetMeta((current) => ({
          ...current,
          homoEV: frontier.orbitalEnergies.homoEV,
          lumoEV: frontier.orbitalEnergies.lumoEV,
          homoLabel: frontier.orbitalLabels.homo,
          lumoLabel: frontier.orbitalLabels.lumo,
        }));
        sceneKeyRef.current = "";
        void rebuildSceneRef.current?.();
      })
      .catch((error) => {
        console.error(error);
        frontierRequestedRef.current = false;
      });
  }, [isReady, resolvedSceneKey]);

  // Store latest camera function in a ref so the effect below doesn't re-fire
  // on every step/snapshot change, only on level entry, zoom, or manual reset.
  const applyScheduledCameraRef = useRef(applyScheduledCamera);
  applyScheduledCameraRef.current = applyScheduledCamera;

  useEffect(() => {
    if (!isReady) return;
    applyScheduledCameraRef.current(150);
  }, [isReady, viewRevision, zoomIndex]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;
    void applySpinSetting(plugin, autoRotateRef.current);
  }, [autoRotateRef]);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      zoomIn: () => setZoomIndex((current) => Math.max(0, current - 1)),
      zoomOut: () => setZoomIndex((current) => Math.min(4, current + 1)),
      fit: () => {
        setZoomIndex(2);
        setViewRevision((value) => value + 1);
      },
      reset: () => {
        setZoomIndex(2);
        setViewRevision((value) => value + 1);
      },
    };

    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef]);

  const activeScfSnapshot =
    dataRef.current?.densityEvolution.snapshots[activeSnapshotIndex] ??
    dataRef.current?.densityEvolution.snapshots[0];
  const optimizationData = dataRef.current?.geometryOptimization;
  const activeOptimizationFrame =
    optimizationData?.frames[activeOptimizationIndex] ??
    optimizationData?.frames[0];
  const mechanismData = useMemo<DftMechanismData>(
    () => ({
      ...assetMeta,
      outputMode,
      onOutputModeChange: setOutputMode,
      scfSnapshot: activeScfSnapshot
        ? {
            index: activeSnapshotIndex,
            count: dataRef.current?.densityEvolution.snapshots.length ?? 0,
            iteration: activeScfSnapshot.iteration,
            label: activeScfSnapshot.label,
            isovalue: activeScfSnapshot.isovalue,
          }
        : undefined,
      geometryOptimization:
        optimizationData && activeOptimizationFrame
          ? {
              index: activeOptimizationIndex,
              count: optimizationData.frames.length,
              iteration: activeOptimizationFrame.iteration,
              energyHa: activeOptimizationFrame.energyHa,
              energyDropKcalMol: activeOptimizationFrame.energyDropKcalMol,
              relativeEnergyKcalMol:
                activeOptimizationFrame.relativeEnergyKcalMol,
              maxForceEvA: activeOptimizationFrame.maxForceEvA,
              rmsForceEvA: activeOptimizationFrame.rmsForceEvA,
              targetMaxForceEvA: optimizationData.targetMaxForceEvA,
              maximumDisplacementAngstrom:
                optimizationData.initialDistortion.maximumDisplacementAngstrom,
              system: optimizationData.system,
              formula: optimizationData.formula,
              method: optimizationData.method,
              basis: optimizationData.basis,
              engine: optimizationData.engine,
              optimizer: optimizationData.optimizer,
              converged: optimizationData.converged,
              series: optimizationData.frames.map((frame) => ({
                iteration: frame.iteration,
                energyHa: frame.energyHa,
                energyDropKcalMol: frame.energyDropKcalMol,
                relativeEnergyKcalMol: frame.relativeEnergyKcalMol,
                maxForceEvA: frame.maxForceEvA,
              })),
            }
          : undefined,
    }),
    [
      activeOptimizationFrame,
      activeOptimizationIndex,
      activeScfSnapshot,
      activeSnapshotIndex,
      assetMeta,
      optimizationData,
      outputMode,
    ],
  );
  const separateMobileMechanism =
    isMobile &&
    (resolvedSceneKey === "D1_select" ||
      resolvedSceneKey === "D2_pes" ||
      resolvedSceneKey === "D3_ks" ||
      resolvedSceneKey === "D4_scf" ||
      resolvedSceneKey === "D5_recipe" ||
      resolvedSceneKey === "D6_outputs" ||
      resolvedSceneKey === "D7_labels");
  const mobileMechanismHeight =
    resolvedSceneKey === "D3_ks"
      ? "500px"
      : resolvedSceneKey === "D4_scf"
        ? "440px"
        : resolvedSceneKey === "D5_recipe"
          ? "550px"
          : resolvedSceneKey === "D6_outputs"
            ? "450px"
            : resolvedSceneKey === "D7_labels"
              ? "620px"
            : resolvedSceneKey === "D1_select"
              ? "350px"
              : "260px";

  return (
    <div
      className={`multiscale-molstar relative h-full w-full overflow-hidden bg-[#050510] ${
        separateMobileMechanism ? "flex flex-col" : ""
      }`}
      data-testid="multiscale-render-surface"
    >
      {!isReady && <div className="absolute inset-0 bg-[#050510]" />}
      <div
        ref={containerRef}
        className={
          separateMobileMechanism
            ? "relative min-h-0 w-full flex-1"
            : resolvedSceneKey === "D2_pes"
              ? "relative h-full w-[60%] overflow-hidden border-r border-white/10"
              : "relative h-full w-full"
        }
      />
      {isReady && !mountError ? (
        separateMobileMechanism ? (
          <div
            className="relative w-full flex-shrink-0 border-t border-white/12 bg-[#050510]"
            style={{ height: mobileMechanismHeight }}
          >
            <DftMechanismDataProvider value={mechanismData}>
              <DftMechanism
                sceneKey={resolvedSceneKey}
                lang={lang}
                reducedMotion={reducedMotion}
                isMobile
              />
            </DftMechanismDataProvider>
          </div>
        ) : hideMechanism ? null : (
          <DftMechanismDataProvider value={mechanismData}>
            <DftMechanism
              sceneKey={resolvedSceneKey}
              lang={lang}
              reducedMotion={reducedMotion}
              isMobile={false}
            />
          </DftMechanismDataProvider>
        )
      ) : null}
      {!isReady && !mountError && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center"
          role="status"
          aria-live="polite"
          data-testid="multiscale-dft-loading"
        >
          <div className="border border-white/10 bg-[#050510]/94 px-5 py-4">
            <p className="type-mono-meta text-xs text-white/90">
              {isKorean ? "양자 뷰 준비 중" : "Preparing quantum view"}
            </p>
            <p className="mt-2 text-sm text-slate-300/90">
              {isKorean ? "분자 구조와 전자 밀도 데이터를 불러오는 중입니다." : "Loading molecular geometry and density data."}
            </p>
          </div>
        </div>
      )}
      {mountError && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-slate-300">
          <div className="max-w-md border border-white/10 bg-[#050510]/94 px-6 py-5">
            <p className="font-semibold text-white/92">
              {isKorean ? "3D 뷰를 불러올 수 없습니다." : "3D view unavailable."}
            </p>
            <p className="mt-2 leading-6 text-slate-300/90">
              {isKorean
                ? "설명과 그래프는 계속 볼 수 있습니다. 뷰를 다시 불러와 보세요."
                : "The explanation and chart remain available. Reload the viewer to try again."}
            </p>
            <button
              type="button"
              className="type-mono-meta mt-4 border border-white/20 px-3 py-2 text-xs text-white transition-colors hover:bg-white/10"
              onClick={() => window.location.reload()}
            >
              {isKorean ? "3D 뷰 다시 불러오기" : "Reload 3D view"}
            </button>
            <p className="sr-only">{mountError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
