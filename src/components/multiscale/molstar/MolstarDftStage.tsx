"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { withBasePath } from "@/lib/basePath";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { applyMolstarPlacement, computeScheduledPlacement } from "../multiscaleViewRuntime";
import { MULTISCALE_MOTION } from "../visualRules";
import { useMultiscaleCanvasColor } from "../useMultiscaleCanvasColor";
import {
  DftMechanism,
  DftMechanismDataProvider,
  type DftMechanismData,
  type DftOutputMode,
  type DftSceneKey,
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
  applyResearchCanvasBackground,
  centerPoints,
  commitResearchLayers,
  layerBounds,
  mixColor,
  mountResearchPlugin,
  offsetMesh,
} from "./shared";
import { trimBondEndpoints } from "./geometry";

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
}

interface FrontierOrbitalData {
  homoIsosurface: { positive: IsosurfaceMesh; negative: IsosurfaceMesh };
  lumoIsosurface: { positive: IsosurfaceMesh; negative: IsosurfaceMesh };
  orbitalEnergies: { homoEV: number; lumoEV: number };
}

async function fetchJsonOrThrow<T>(path: string, label: string): Promise<T> {
  const response = await fetch(withBasePath(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${label}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

interface DensitySnapshot {
  colorT: number;
  mesh: IsosurfaceMesh;
}

interface DensityEvolutionData {
  finalDensity: { mesh: IsosurfaceMesh };
  snapshots: DensitySnapshot[];
}

interface DftStageData {
  molecule: DftScaffoldData;
  densityEvolution: DensityEvolutionData;
  frontier: FrontierOrbitalData | null;
  center: [number, number, number];
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

function resolveDftSceneKey(sceneKey: string | undefined, step: number): DftSceneKey {
  if (sceneKey === "D4_scf" || sceneKey === "D6_outputs") {
    return sceneKey;
  }
  return step === 1 ? "D4_scf" : "D6_outputs";
}

function getDftVisuals(sceneKey: DftSceneKey, outputMode: DftOutputMode): DftVisualState {
  const showDensityEvolution = sceneKey === "D4_scf";
  const showHOMO = sceneKey === "D6_outputs" && outputMode === "homo";
  const showLUMO = sceneKey === "D6_outputs" && outputMode === "lumo";
  const showFrontierOrbital = showHOMO || showLUMO;
  const showFinalDensity = sceneKey === "D6_outputs" && outputMode === "density";

  return {
    showFinalDensity,
    finalDensityOpacity: showFinalDensity ? 0.46 : 0,
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
    homoIsosurface: {
      positive: offsetMesh(frontier.homoIsosurface.positive, center),
      negative: offsetMesh(frontier.homoIsosurface.negative, center),
    },
    lumoIsosurface: {
      positive: offsetMesh(frontier.lumoIsosurface.positive, center),
      negative: offsetMesh(frontier.lumoIsosurface.negative, center),
    },
    orbitalEnergies: {
      homoEV: frontier.orbitalEnergies.homoEV,
      lumoEV: frontier.orbitalEnergies.lumoEV,
    },
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function migrateDensityEvolution(raw: any): DensityEvolutionData {
  const snapshots: DensitySnapshot[] = (raw.snapshots as any[]).map((s: any, i: number, arr: any[]) => {
    const mesh = (s.positive ?? s.negative ?? { vertices: [], faces: [] }) as IsosurfaceMesh;
    return {
      colorT:
        typeof s.colorT === "number"
          ? s.colorT
          : arr.length > 1
            ? i / (arr.length - 1)
            : 1,
      mesh: (s.mesh ?? mesh) as IsosurfaceMesh,
    };
  });
  return {
    finalDensity: { mesh: raw.finalDensity.mesh as IsosurfaceMesh },
    snapshots,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function centerDftData(
  molecule: DftScaffoldData,
  densityEvolution: DensityEvolutionData,
): DftStageData {
  const migrated = migrateDensityEvolution(densityEvolution);
  const centered = centerPoints(molecule.atoms);

  return {
    molecule: {
      atoms: centered.points,
      elements: molecule.elements,
      bonds: molecule.bonds,
      bondOrders: molecule.bondOrders,
    },
    densityEvolution: {
      finalDensity: {
        mesh: offsetMesh(migrated.finalDensity.mesh, centered.center),
      },
      snapshots: migrated.snapshots.map((snapshot) => ({
        colorT: snapshot.colorT,
        mesh: offsetMesh(snapshot.mesh, centered.center),
      })),
    },
    frontier: null,
    center: centered.center as [number, number, number],
  };
}

function buildDftLayers(
  data: DftStageData,
  sceneKey: DftSceneKey,
  activeSnapshotIndex: number,
  outputMode: DftOutputMode,
): ResearchLayerSpec[] {
  const visuals = getDftVisuals(sceneKey, outputMode);
  const activeMolecule = data.molecule;
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
        const shortened = trimBondEndpoints(activeMolecule.atoms[i], activeMolecule.atoms[j], ri, rj);
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
  activeSnapshotIndex: number,
) {
  const moleculeAtoms = data.molecule.atoms;
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
  scrollState,
  isMobile,
  actionsRef,
  manualSnapshotIndex,
  sceneKey,
  reducedMotion: reducedMotionProp,
  lang = "en",
  hideMechanism = false,
  mobileSceneHeight,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  manualSnapshotIndex?: number | null;
  sceneKey?: string;
  reducedMotion?: boolean;
  lang?: string;
  hideMechanism?: boolean;
  mobileSceneHeight?: number;
}) {
  const canvasColor = useMultiscaleCanvasColor();
  const isKorean = lang === "ko";
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion;
  const configuredSceneKey = sceneKey ?? CHOREOGRAPHY.dft.steps[scrollState.step]?.sceneKey;
  const resolvedSceneKey = resolveDftSceneKey(configuredSceneKey, scrollState.step);

  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const canvasColorRef = useRef(canvasColor);
  const dataRef = useRef<DftStageData | null>(null);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const sceneKeyRef = useRef("");
  const [isReady, setIsReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(0);
  const [outputMode, setOutputMode] = useState<DftOutputMode>("density");
  const [orbitalEnergies, setOrbitalEnergies] = useState<Pick<
    DftMechanismData,
    "homoEV" | "lumoEV"
  >>({});
  const [zoomIndex, setZoomIndex] = useState(2);
  const [viewRevision, setViewRevision] = useState(0);
  const frontierRequestedRef = useRef(false);
  const rebuildSceneRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    canvasColorRef.current = canvasColor;
  }, [canvasColor]);

  const renderKey = `${resolvedSceneKey}-${
    resolvedSceneKey === "D4_scf"
      ? activeSnapshotIndex
      : outputMode
  }`;
  const [initialBuild] = useState<{
    resolvedSceneKey: DftSceneKey;
    renderKey: string;
    activeSnapshotIndex: number;
    outputMode: DftOutputMode;
  }>(() => ({
    resolvedSceneKey,
    renderKey,
    activeSnapshotIndex,
    outputMode,
  }));

  const paintedBoundsRef = useRef<{ center: [number, number, number]; radius: number } | null>(null);
  const framedSceneRef = useRef("");

  const applyScheduledCamera = useCallback(
    (durationMs = 160, zoomLevel = zoomIndex) => {
      const plugin = pluginRef.current;
      const data = dataRef.current;
      if (!plugin || !data) return;
      const container = containerRef.current;
      const aspect = (container?.clientWidth ?? 1) / Math.max(1, container?.clientHeight ?? 1);
      const meta = buildDftCameraMeta(data, activeSnapshotIndex);
      // The asset's camera radius covers the atoms; the SCF density isosurface reaches well
      // past them, so on the second step the scene ran off all four canvas edges. Frame the
      // layers that are actually painted, the same way the all-atom stage does.
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
        boundsOverride: paintedBoundsRef.current ?? undefined,
      });
      defaultSnapshotRef.current = applyMolstarPlacement(plugin, placement, durationMs);
    },
    [
      activeSnapshotIndex,
      isMobile,
      scrollState.step,
      scrollState.stepProgress,
      zoomIndex,
    ],
  );

  // Store latest camera function in a ref so the effect below doesn't re-fire
  // on every step/snapshot change, only on level entry, zoom, or manual reset.
  const applyScheduledCameraRef = useRef(applyScheduledCamera);
  applyScheduledCameraRef.current = applyScheduledCamera;

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

      const layers = buildDftLayers(
        data,
        resolvedSceneKey,
        activeSnapshotIndex,
        outputMode,
      );
      // The SCF density grows as the field converges and the reader can scrub the iteration
      // slider either way, so frame the widest iteration rather than whichever one is on
      // screen. Framing the one on screen would either clip the converged density or make
      // the view breathe on every drag.
      paintedBoundsRef.current = layerBounds(
        resolvedSceneKey === "D4_scf"
          ? [
            ...layers,
            ...data.densityEvolution.snapshots.map((entry) => ({
              label: "scf extent",
              primitives: [{
                kind: "mesh" as const,
                vertices: entry.mesh.vertices,
                faces: entry.mesh.faces,
                color: SLATE,
              }],
            })),
          ]
          : layers,
      );
      await commitResearchLayers(plugin, layers);

      // Restore camera so iteration changes don't shift the view.
      if (snapshot) plugin.managers.camera.setSnapshot(snapshot, 0);
    } finally {
      rebuildingRef.current = false;
      if (pendingRebuildRef.current) {
        pendingRebuildRef.current = false;
        void rebuildSceneRef.current?.();
      }
    }
  }, [activeSnapshotIndex, outputMode, resolvedSceneKey]);

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
          autoRotate: false,
          backgroundColor: canvasColorRef.current,
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

        sceneKeyRef.current = initialBuild.renderKey;
        await commitResearchLayers(
          plugin,
          buildDftLayers(
            dataRef.current,
            initialBuild.resolvedSceneKey,
            initialBuild.activeSnapshotIndex,
            initialBuild.outputMode,
          ),
        );
        if (!cancelled) setIsReady(true);
      } catch (error) {
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
  }, [actionsRef, initialBuild]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !isReady) return;
    void applyResearchCanvasBackground(plugin, canvasColor);
  }, [canvasColor, isReady]);

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
    setOutputMode("density");
  }, [resolvedSceneKey]);

  // Cycle output surfaces when the explanatory panel is hidden.
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
    // Re-frame when the scene itself changes. The camera effect below only fires on level
    // entry and zoom, so stepping from the orbital scene to the SCF one kept the previous
    // framing while the density isosurface, which reaches well past the atoms, ran off all
    // four canvas edges. Scene key, not render key: the render key also changes on every
    // SCF iteration, and re-framing there would make the view breathe under the slider.
    void rebuildScene().then(() => {
      if (framedSceneRef.current === resolvedSceneKey) return;
      framedSceneRef.current = resolvedSceneKey;
      applyScheduledCameraRef.current(0);
    });
  }, [isReady, rebuildScene, renderKey, resolvedSceneKey]);

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
        setOrbitalEnergies({
          homoEV: frontier.orbitalEnergies.homoEV,
          lumoEV: frontier.orbitalEnergies.lumoEV,
        });
        sceneKeyRef.current = "";
        void rebuildSceneRef.current?.();
      })
      .catch((error) => {
        frontierRequestedRef.current = false;
        setMountError(error instanceof Error ? error.message : "Failed to load frontier orbital data.");
      });
  }, [isReady, resolvedSceneKey]);

  useEffect(() => {
    if (!isReady) return;
    applyScheduledCameraRef.current(150);
  }, [isReady, viewRevision, zoomIndex]);

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

  const mechanismData = useMemo<DftMechanismData>(
    () => ({
      ...orbitalEnergies,
      outputMode,
      onOutputModeChange: setOutputMode,
      scfSnapshot: { index: activeSnapshotIndex },
    }),
    [activeSnapshotIndex, orbitalEnergies, outputMode],
  );
  const separateMobileMechanism = isMobile;

  return (
    <div
      className={`multiscale-molstar relative w-full ${
        separateMobileMechanism ? "flex flex-col" : "h-full overflow-hidden"
      }`}
      style={{ backgroundColor: canvasColor }}
      data-testid="multiscale-render-surface"
    >
      {!isReady && <div className="absolute inset-0" style={{ backgroundColor: canvasColor }} />}
      <div
        ref={containerRef}
        className={separateMobileMechanism ? "relative min-h-0 w-full" : "relative h-full w-full"}
        style={separateMobileMechanism ? { height: mobileSceneHeight } : undefined}
      />
      {isReady && !mountError ? (
        separateMobileMechanism ? (
          <div className="relative w-full flex-shrink-0 border-t border-border bg-surface-sunken">
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
          <div className="border border-border bg-surface-raised/95 px-5 py-4">
            <p className="type-mono-meta text-xs text-foreground">
              {isKorean ? "양자 뷰 준비 중" : "Preparing quantum view"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isKorean ? "분자 구조와 전자 밀도 데이터를 불러오는 중입니다." : "Loading molecular geometry and density data."}
            </p>
          </div>
        </div>
      )}
      {mountError && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
          <div className="max-w-md border border-border bg-surface-raised/95 px-6 py-5">
            <p className="font-semibold text-foreground">
              {isKorean ? "3D 뷰를 불러올 수 없습니다." : "3D view unavailable."}
            </p>
            <p className="mt-2 leading-6 text-muted-foreground">
              {isKorean
                ? "설명과 그래프는 계속 볼 수 있습니다. 뷰를 다시 불러와 보세요."
                : "The explanation and chart remain available. Reload the viewer to try again."}
            </p>
            <button
              type="button"
              className="type-mono-meta mt-4 border border-border-strong px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted"
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
