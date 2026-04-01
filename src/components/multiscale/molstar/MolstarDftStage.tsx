"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { withBasePath } from "@/lib/basePath";
import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { applyMolstarPlacement, computeScheduledPlacement } from "../multiscaleViewRuntime";
import { buildScfAnchors, mapScfProgress, selectScfSnapshotIndex } from "../scenes/dft/scfController";
import {
  AMBER,
  BLUE,
  CameraSnapshotLike,
  CYAN,
  ELEMENT_COLORS,
  ELEMENT_RADII,
  LIGHT_BLUE,
  ORANGE,
  PluginLike,
  RED,
  ResearchCameraActions,
  ResearchLayerSpec,
  SLATE,
  WHITE,
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
  const response = await fetch(withBasePath(path));
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

interface DftStageData {
  molecule: DftScaffoldData;
  densityEvolution: DensityEvolutionData;
  frontier: FrontierOrbitalData | null;
  center: [number, number, number];
}

interface DftVisualState {
  showKineticGlow: boolean;
  kineticOpacity: number;
  showHartreeExpand: boolean;
  hartreeOpacity: number;
  showVxcShell: boolean;
  vxcOpacity: number;
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

function getDftVisuals(step: number, stepProgress: number): DftVisualState {
  const showFrontierOrbitals = step === 6 || step === 7;
  const showEnvelope = step === 5 || step >= 8 || showFrontierOrbitals;

  return {
    showKineticGlow: step === 1 || (step === 2 && stepProgress < 0.5),
    kineticOpacity:
      step === 1 ? 0.08 + stepProgress * 0.08 : step === 2 ? Math.max(0, 0.16 * (1 - stepProgress * 2)) : 0,
    showHartreeExpand: step === 3,
    hartreeOpacity: step === 3 ? 0.24 : 0,
    showVxcShell: step === 4 || (step === 5 && stepProgress < 0.5),
    vxcOpacity: step === 4 ? 0.12 + stepProgress * 0.08 : step === 5 ? 0.1 * Math.max(0, 1 - stepProgress * 2) : 0,
    showFinalDensity: step >= 8,
    finalDensityOpacity: step >= 8 ? 0.42 : 0,
    showDensityEvolution: step === 5,
    densityEvolutionOpacity: step === 5 ? 0.52 : 0,
    showHOMO: step === 6,
    homoOpacity: step === 6 ? 0.96 : 0,
    showLUMO: step === 7,
    lumoOpacity: step === 7 ? 0.92 : 0,
    atomOpacity: showFrontierOrbitals ? 0.65 : showEnvelope ? 0.9 : 1,
    bondOpacity: showFrontierOrbitals ? 0.55 : showEnvelope ? 0.72 : 0.88,
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
      isovalue: s.residualLevel ?? 0,
      colorT: arr.length > 1 ? i / (arr.length - 1) : 1,
      mesh,
    };
  });
  return { ...raw, snapshots };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function centerDftData(molecule: DftScaffoldData, densityEvolution: any): DftStageData {
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
    frontier: null,
    center: centered.center as [number, number, number],
  };
}

function buildDftLayers(
  data: DftStageData,
  scrollState: ScrollState,
  phase: number,
  activeSnapshotIndex: number,
): ResearchLayerSpec[] {
  const step = scrollState.step;
  const visuals = getDftVisuals(step, scrollState.stepProgress);
  const layers: ResearchLayerSpec[] = [
    {
      label: "DFT Atoms",
      primitives: data.molecule.atoms.map((atom, index) => ({
        kind: "sphere" as const,
        center: atom as [number, number, number],
        radius: ELEMENT_RADII[data.molecule.elements[index]] ?? 0.2,
        color: ELEMENT_COLORS[data.molecule.elements[index]] ?? SLATE,
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
      primitives: data.molecule.bonds.map(([i, j], index) => {
        const ri = ELEMENT_RADII[data.molecule.elements[i]] ?? 0.2;
        const rj = ELEMENT_RADII[data.molecule.elements[j]] ?? 0.2;
        const shortened = shortenBond(data.molecule.atoms[i], data.molecule.atoms[j], ri, rj);
        return {
          kind: "cylinder" as const,
          start: shortened.start,
          end: shortened.end,
          radiusTop: (data.molecule.bondOrders[index] ?? 1) >= 2 ? 0.07 : 0.05,
          radiusBottom: (data.molecule.bondOrders[index] ?? 1) >= 2 ? 0.07 : 0.05,
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

  if (visuals.showKineticGlow) {
    layers.push({
      label: "Kinetic Glow",
      primitives: data.molecule.atoms.map((atom, index) => ({
        kind: "sphere" as const,
        center: atom as [number, number, number],
        radius: (ELEMENT_RADII[data.molecule.elements[index]] ?? 0.2) + 0.12 + phase * 0.16,
        color: WHITE,
      })),
      params: {
        alpha: visuals.kineticOpacity,
        quality: "high",
        material: { metalness: 0, roughness: 0.86, bumpiness: 0 },
        doubleSided: true,
      },
    });
  }

      if (visuals.showHartreeExpand) {
    layers.push({
      label: "Hartree Shells",
      primitives: data.molecule.atoms.map((atom, index) => ({
        kind: "sphere" as const,
        center: atom as [number, number, number],
        radius: (ELEMENT_RADII[data.molecule.elements[index]] ?? 0.2) + 0.32 + phase * 0.25,
        color: CYAN,
      })),
      params: {
        alpha: visuals.hartreeOpacity,
        quality: "high",
        material: { metalness: 0.02, roughness: 0.76, bumpiness: 0 },
        emissive: 0.1,
        doubleSided: true,
      },
    });
  }

  if (visuals.showVxcShell) {
    layers.push({
      label: "Exchange-Correlation Shells",
      primitives: data.molecule.atoms.map((atom, index) => ({
        kind: "sphere" as const,
        center: atom as [number, number, number],
        radius: (ELEMENT_RADII[data.molecule.elements[index]] ?? 0.2) + 0.22,
        color: AMBER,
      })),
      params: {
        alpha: visuals.vxcOpacity,
        quality: "high",
        material: { metalness: 0.02, roughness: 0.74, bumpiness: 0 },
        emissive: 0.14,
        doubleSided: true,
      },
    });
  }

  if (visuals.showDensityEvolution) {
    const snapshot = data.densityEvolution.snapshots[activeSnapshotIndex] ?? data.densityEvolution.snapshots[0];
    if (snapshot?.mesh.vertices.length) {
      const color = mixColor(ORANGE, BLUE, snapshot.colorT);
      layers.push({
        label: "SCF Density Evolution",
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
      label: "Final Density",
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

function buildDftCameraMeta(data: DftStageData, activeSnapshotIndex: number) {
  const points = [...data.molecule.atoms];
  const subsets: Record<string, { indices: number[] }> = {
    molecule: { indices: Array.from({ length: data.molecule.atoms.length }, (_, index) => index) },
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
  addSubset("residual_density", snapshot ? [snapshot.mesh] : []);
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
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  manualSnapshotIndex?: number | null;
}) {
  void progressRef;
  void isMobile;

  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const dataRef = useRef<DftStageData | null>(null);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const sceneKeyRef = useRef("");
  const [isReady, setIsReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [viewRevision, setViewRevision] = useState(0);
  const frontierRequestedRef = useRef(false);
  const rebuildSceneRef = useRef<(() => Promise<void>) | null>(null);

  const phase = useMemo(() => Math.round(scrollState.stepProgress * 6) / 6, [scrollState.stepProgress]);
  const sceneKey = `${scrollState.step}-${Math.round(phase * 6)}-${scrollState.step === 5 ? activeSnapshotIndex : "static"}`;
  const [initialBuild] = useState<{
    scrollState: ScrollState;
    phase: number;
    sceneKey: string;
    activeSnapshotIndex: number;
  }>(() => ({ scrollState, phase, sceneKey, activeSnapshotIndex }));

  const applyScheduledCamera = useCallback(
    (durationMs = 160, zoomLevel = zoomIndex) => {
      const plugin = pluginRef.current;
      const data = dataRef.current;
      if (!plugin || !data) return;
      const container = containerRef.current;
      const aspect = (container?.clientWidth ?? 1) / Math.max(1, container?.clientHeight ?? 1);
      const meta = buildDftCameraMeta(data, activeSnapshotIndex);
      const placement = computeScheduledPlacement({
        level: "dft",
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount: CHOREOGRAPHY.dft.steps.length,
        meta,
        points: meta.points,
        aspect,
        isMobile,
        zoomIndex: zoomLevel,
      });
      defaultSnapshotRef.current = applyMolstarPlacement(plugin, placement, durationMs);
    },
    [activeSnapshotIndex, isMobile, scrollState.step, scrollState.stepProgress, zoomIndex],
  );

  const rebuildingRef = useRef(false);

  const rebuildScene = useCallback(async () => {
    const plugin = pluginRef.current;
    const data = dataRef.current;
    if (!plugin || !data) return;
    if (rebuildingRef.current) return;
    rebuildingRef.current = true;
    try {
      // Save camera before rebuild — plugin.clear() + commit() triggers Molstar auto-fit
      // which shifts the view when density mesh geometry changes between iterations.
      const snapshot = plugin.canvas3d?.camera.getSnapshot();

      await commitResearchLayers(plugin, buildDftLayers(data, scrollState, phase, activeSnapshotIndex));

      // Restore camera so iteration changes don't shift the view.
      if (snapshot) plugin.managers.camera.setSnapshot(snapshot, 0);
    } finally {
      rebuildingRef.current = false;
    }
  }, [activeSnapshotIndex, phase, scrollState]);

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
        const [molecule, densityEvolution] = await Promise.all([
          fetchJsonOrThrow<DftScaffoldData>("/data/multiscale/dft/molecule.json", "DFT molecule.json"),
          fetchJsonOrThrow<DensityEvolutionData>("/data/multiscale/dft/density-evolution.json", "DFT density-evolution.json"),
        ]);
        if (cancelled) {
          plugin.dispose();
          return;
        }

        pluginRef.current = plugin;
        dataRef.current = centerDftData(molecule, densityEvolution);

        sceneKeyRef.current = initialBuild.sceneKey;
        await commitResearchLayers(
          plugin,
          buildDftLayers(
            dataRef.current,
            initialBuild.scrollState,
            initialBuild.phase,
            initialBuild.activeSnapshotIndex,
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

    if (manualSnapshotIndex !== null && manualSnapshotIndex !== undefined && scrollState.step === 5) {
      setActiveSnapshotIndex(Math.max(0, Math.min(manualSnapshotIndex, data.densityEvolution.snapshots.length - 1)));
      return;
    }

    if (scrollState.step >= 8) {
      setActiveSnapshotIndex(data.densityEvolution.snapshots.length - 1);
      return;
    }

    if (scrollState.step !== 5) {
      setActiveSnapshotIndex(0);
      return;
    }

    const anchors = buildScfAnchors(data.densityEvolution.snapshots);
    const mappedProgress = mapScfProgress(scrollState.stepProgress);
    setActiveSnapshotIndex((currentIndex) =>
      selectScfSnapshotIndex({
        currentIndex,
        mappedProgress,
        anchors,
        hysteresis: 0.052,
      }),
    );
  }, [manualSnapshotIndex, scrollState.step, scrollState.stepProgress]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !isReady) return;
    if (sceneKeyRef.current === sceneKey) return;
    sceneKeyRef.current = sceneKey;
    void rebuildScene();
  }, [isReady, rebuildScene, sceneKey]);

  useEffect(() => {
    const data = dataRef.current;
    if (!data || data.frontier || frontierRequestedRef.current) return;

    frontierRequestedRef.current = true;
    let cancelled = false;
    void fetchJsonOrThrow<FrontierOrbitalData>("/data/multiscale/dft/frontier-orbitals.json", "DFT frontier-orbitals.json")
      .then((frontier) => {
        if (cancelled || !dataRef.current) return;
        dataRef.current = {
          ...dataRef.current,
          frontier: centerFrontierData(frontier, dataRef.current.center),
        };
        sceneKeyRef.current = "";
        void rebuildSceneRef.current?.();
      })
      .catch((error) => {
        console.error(error);
        frontierRequestedRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  // Store latest camera function in a ref so the effect below doesn't re-fire
  // on every step/snapshot change — only on level entry, zoom, or manual reset.
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

  return (
    <div className="multiscale-molstar relative h-full w-full overflow-hidden bg-[#050510]" data-testid="multiscale-render-surface">
      {!isReady && <div className="absolute inset-0 bg-[#050510]" />}
      <div ref={containerRef} className="h-full w-full" />
      {mountError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-slate-300">
          <div className="max-w-md rounded-3xl border border-white/10 bg-slate-950/72 px-6 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <p className="font-semibold text-white/92">Mol* could not start WebGL.</p>
            <p className="mt-2 leading-6 text-slate-300/90">{mountError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
