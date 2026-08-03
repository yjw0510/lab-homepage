"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { withBasePath } from "@/lib/basePath";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { BASE_ZOOM_INDEX, MAX_ZOOM_INDEX } from "../multiscaleViewSchedule";
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
import { ballAndStick, shortestHeavyBond } from "../ballAndStick";
import {
  ATOM_MATERIAL,
  BLUE,
  CameraSnapshotLike,
  ELEMENT_COLORS,
  PALE,
  PluginLike,
  RED,
  ResearchCameraActions,
  ResearchLayerSpec,
  SLATE,
  type ValueScale,
  applyResearchCanvasBackground,
  centerPoints,
  commitResearchLayers,
  layerBounds,
  mountResearchPlugin,
} from "./shared";
import { trimBondEndpoints } from "./geometry";

/** One mesh's slices of the accompanying .bin, in the layout scripts/generate-dft-data.py writes. */
interface MeshSlice {
  vertexCount: number;
  faceCount: number;
  vertices: number;
  faces: number;
  normals?: number;
  values?: number;
}

interface IsosurfaceMesh {
  vertices: Float32Array;
  faces: Uint32Array;
  /** Exact surface normal from the interpolated field gradient. */
  normals?: Float32Array;
  /** Per-vertex departure from the converged surface; see scripts/generate-dft-data.py. */
  values?: Float32Array;
}

/**
 * Sub-triangles per edge when the isosurfaces are rebuilt as curved PN patches.
 *
 * 3 is 9 triangles per input triangle for nothing on the wire. The curve comes from normals the
 * file already carries, so the alternative to this is shipping nine times the mesh.
 */
const SURFACE_SUBDIVISION = 3;

/**
 * Meshes arrive as one binary blob with byte offsets in the JSON beside it.
 *
 * As JSON these were 18.8 MB of decimal text for 175,575 vertices and 338,254 triangles, which
 * the browser then had to turn into hundreds of thousands of small arrays. Normals are not in
 * the file at all: this renderer has never read them, it zeroes the buffer and lets Mol* derive
 * them from the shared-vertex topology.
 */
function sliceMesh(buffer: ArrayBuffer, slice: MeshSlice): IsosurfaceMesh {
  return {
    vertices: new Float32Array(buffer, slice.vertices, slice.vertexCount * 3),
    faces: new Uint32Array(buffer, slice.faces, slice.faceCount * 3),
    normals: slice.normals === undefined
      ? undefined
      : new Float32Array(buffer, slice.normals, slice.vertexCount * 3),
    values: slice.values === undefined
      ? undefined
      : new Float32Array(buffer, slice.values, slice.vertexCount),
  };
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

async function fetchOrThrow(path: string, label: string): Promise<Response> {
  const response = await fetch(withBasePath(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${label}: ${response.status} ${response.statusText}`);
  }
  return response;
}

async function fetchJsonOrThrow<T>(path: string, label: string): Promise<T> {
  return (await fetchOrThrow(path, label)).json() as Promise<T>;
}

async function fetchBufferOrThrow(path: string, label: string): Promise<ArrayBuffer> {
  return (await fetchOrThrow(path, label)).arrayBuffer();
}

/** Move a mesh onto the molecule's centre, in place. Each view owns its own bytes. */
function shiftMesh(mesh: IsosurfaceMesh, centre: number[]): IsosurfaceMesh {
  for (let at = 0; at < mesh.vertices.length; at += 3) {
    mesh.vertices[at] -= centre[0];
    mesh.vertices[at + 1] -= centre[1];
    mesh.vertices[at + 2] -= centre[2];
  }
  return mesh;
}

interface DensitySnapshot {
  colorT: number;
  /** "Iter N", ORCA's own iteration number, written by scripts/generate-dft-data.py. */
  label: string;
  /** How this frame's departures map onto the ramp; see `frameScales`. */
  valueScale: ValueScale;
  mesh: IsosurfaceMesh;
}

/** |values| at `q`, from a copy so the mesh's own buffer keeps its vertex order. */
function percentileAbs(values: ArrayLike<number> | undefined, q: number) {
  if (!values || values.length === 0) return 0;
  const sorted = Float32Array.from(values, Math.abs).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

// The colour transfer's tuning, all measured against the run's own vertex distributions
// (scratchpad transfer-adaptive.mjs holds the measurement harness).
//
// Within a frame: knee = p95/SHAPE_SPREAD, saturating at p99. The departure spans 3 down to
// 8e-5 across the run, and any transfer fixed for the whole run leaves the early frames as two
// ramp-end colours with a thin seam between - at a knee low enough for the late frames, |v|=0.1
// is already t = 0.75. Keyed to each frame's own p95 instead, frames 2-8 go from 2-3 occupied
// colour bands to 6-10 with the mass in the interior.
//
// Across frames: only `amp` moves, on one run-wide signed-log envelope (knee ENVELOPE_KNEE with
// a coarse second term at 0.3 for the top decades), so a frame's loudness still says how far
// from convergence it is: 1.0 at iteration 2, 0.69 at 12, 0.32 at 30. AMP_FLOOR keeps the last
// dozen frames two bands wide instead of collapsing onto the zero colour - their p95 is 8e-5
// and on the raw envelope they'd paint at 0.10. Frames 2-3 keep a pile at the low end and 59 is
// exactly zero; both are the data (40% of early vertices really sit in 0.15 decade of "far
// below", and 59 is the reference itself).
const SHAPE_SPREAD = 20;
/** Decades below the run's largest departure where the envelope's fine knee sits. */
const ENVELOPE_DECADES = 5;
const AMP_FLOOR = 0.2;
const ENVELOPE_COARSE_KNEE = 0.3;
const ENVELOPE_COARSE_WEIGHT = 2;
/** Departures are clipped here by scripts/isosurface_remesh.py; the envelope tops out at it. */
const DEPARTURE_CLIP = 3;

function frameScales(snapshots: { mesh: IsosurfaceMesh }[]): ValueScale[] {
  const pooled = percentileAbs(
    Float32Array.from(snapshots.flatMap((entry) => Array.from(entry.mesh.values ?? []))), 0.98);
  const envelopeKnee = Math.max(pooled, 1e-6) * 10 ** -ENVELOPE_DECADES;
  const envelope = (v: number) =>
    Math.asinh(v / envelopeKnee) + ENVELOPE_COARSE_WEIGHT * Math.asinh(v / ENVELOPE_COARSE_KNEE);
  return snapshots.map((entry) => {
    const p95 = percentileAbs(entry.mesh.values, 0.95);
    const p99 = percentileAbs(entry.mesh.values, 0.99);
    if (p95 <= 0) return { knee: 0, norm: 1, amp: 0 };
    const knee = p95 / SHAPE_SPREAD;
    return {
      knee,
      norm: Math.asinh(p99 / knee),
      amp: Math.max(AMP_FLOOR, Math.min(1, envelope(p95) / envelope(DEPARTURE_CLIP))),
    };
  });
}

function withScales(snapshots: Omit<DensitySnapshot, "valueScale">[]): DensitySnapshot[] {
  const scales = frameScales(snapshots);
  return snapshots.map((entry, index) => ({ ...entry, valueScale: scales[index] }));
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

/**
 * How long iteration `index` of `count` stays on screen.
 *
 * Geometric between the two holds in MULTISCALE_MOTION, so the ratio between one frame's hold and
 * the next is constant. That matches the sequence: the 98th-percentile density change falls by
 * about a decade and a half from the first third of the run to the last, so a constant hold spent
 * most of the loop on frames that differ from their neighbour by 1e-5.
 */
export function scfFrameMs(index: number, count: number) {
  const { scfFirstFrameMs: first, scfLastFrameMs: last } = MULTISCALE_MOTION;
  if (count < 2) return first;
  const t = Math.max(0, Math.min(1, index / (count - 1)));
  return Math.round(first * (last / first) ** t);
}

function resolveDftSceneKey(sceneKey: string | undefined, step: number): DftSceneKey {
  if (sceneKey === "D4_scf" || sceneKey === "D6_outputs") {
    return sceneKey;
  }
  // The SCF loop is the first DFT page and the outputs the second; see CHOREOGRAPHY.dft.
  return step === 0 ? "D4_scf" : "D6_outputs";
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
    densityEvolutionOpacity: showDensityEvolution ? 0.7 : 0,
    showHOMO,
    homoOpacity: showHOMO ? 0.96 : 0,
    showLUMO,
    lumoOpacity: showLUMO ? 0.94 : 0,
    atomOpacity: showFrontierOrbital ? 0.62 : showDensityEvolution || showFinalDensity ? 0.88 : 1,
    bondOpacity: showFrontierOrbital ? 0.52 : showDensityEvolution || showFinalDensity ? 0.7 : 0.9,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function centerFrontierData(raw: any, buffer: ArrayBuffer, center: number[]): FrontierOrbitalData {
  const at = (slice: MeshSlice) => shiftMesh(sliceMesh(buffer, slice), center);
  return {
    homoIsosurface: { positive: at(raw.homoIsosurface.positive),
                      negative: at(raw.homoIsosurface.negative) },
    lumoIsosurface: { positive: at(raw.lumoIsosurface.positive),
                      negative: at(raw.lumoIsosurface.negative) },
    orbitalEnergies: raw.orbitalEnergies ?? {},
  };
}

function centerDftData(
  molecule: DftScaffoldData,
  evolution: any,
  buffer: ArrayBuffer,
): DftStageData {
  const centered = centerPoints(molecule.atoms);
  const at = (slice: MeshSlice) => shiftMesh(sliceMesh(buffer, slice), centered.center);

  return {
    molecule: {
      atoms: centered.points,
      elements: molecule.elements,
      bonds: molecule.bonds,
      bondOrders: molecule.bondOrders,
    },
    densityEvolution: {
      finalDensity: { mesh: at(evolution.finalDensity.mesh) },
      // Every frame indexes the same triangle list: the surface is extracted once from the
      // converged density and tracked back through the iterations, so only the vertices move.
      // Shifting is per frame because each frame owns its own vertex bytes.
      snapshots: withScales((evolution.snapshots as any[]).map((snapshot: any) => ({
        colorT: snapshot.colorT,
        label: snapshot.label,
        mesh: at(snapshot.mesh),
      }))),
    },
    frontier: null,
    center: centered.center as [number, number, number],
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function buildDftLayers(
  data: DftStageData,
  sceneKey: DftSceneKey,
  activeSnapshotIndex: number,
  outputMode: DftOutputMode,
): ResearchLayerSpec[] {
  const visuals = getDftVisuals(sceneKey, outputMode);
  const activeMolecule = data.molecule;
  // Sizes from the shared rule, measured on this molecule's own bonds. The radii used to come
  // from a fixed table and the sticks from a fixed 0.05, which put the stick at 0.098 of a
  // carbon against the 0.35 every other scene draws. That is what read as fat atoms: the balls
  // are barely changed by this, the sticks are nearly four times thicker.
  const geometry = ballAndStick(
    shortestHeavyBond(activeMolecule.atoms.flat(), activeMolecule.bonds as [number, number][], activeMolecule.elements),
    activeMolecule.elements,
  );
  const layers: ResearchLayerSpec[] = [
    {
      label: "DFT Atoms",
      primitives: activeMolecule.atoms.map((atom, index) => ({
        kind: "sphere" as const,
        center: atom as [number, number, number],
        radius: geometry.ball(activeMolecule.elements[index]),
        color: ELEMENT_COLORS[activeMolecule.elements[index]] ?? SLATE,
      })),
      params: {
        alpha: visuals.atomOpacity,
        quality: "high",
        material: ATOM_MATERIAL,
      },
    },
    {
      label: "DFT Bonds",
      primitives: activeMolecule.bonds.map(([i, j]) => {
        const shortened = trimBondEndpoints(
          activeMolecule.atoms[i],
          activeMolecule.atoms[j],
          geometry.trim(activeMolecule.elements[i]),
          geometry.trim(activeMolecule.elements[j]),
        );
        return {
          kind: "cylinder" as const,
          start: shortened.start,
          end: shortened.end,
          radiusTop: geometry.stick,
          radiusBottom: geometry.stick,
          radialSegments: 12,
          color: SLATE,
        };
      }),
      params: {
        alpha: visuals.bondOpacity,
        quality: "high",
        material: ATOM_MATERIAL,
      },
    },
  ];

  if (visuals.showDensityEvolution) {
    const snapshot = data.densityEvolution.snapshots[activeSnapshotIndex] ?? data.densityEvolution.snapshots[0];
    if (snapshot?.mesh.vertices.length) {
      // A pale neutral rather than a per-frame hue. Measured on the first iteration, 35% of the
      // vertices sit inside a quarter of the ramp and so are painted at or near this colour; a
      // dark base there put a third of the surface below the black background and the frame read
      // as density existing only where the departure was large. The frame is already named in
      // the panel and shown by how much colour the surface carries, so the base does not have to
      // carry it too.
      const color = PALE;
      // The surface is the total density and stays that. What is painted on it is how far this
      // iteration sits from the converged density, because the surface alone overlaps the
      // converged one closely enough that the frames read as the same picture. The mapping was
      // settled once at load; see `frameScales`.
      const valueScale = snapshot.valueScale;
      layers.push({
        label: "SCF Total Density",
        primitives: [{
          kind: "mesh" as const,
          vertices: snapshot.mesh.vertices,
          faces: snapshot.mesh.faces,
          normals: snapshot.mesh.normals,
          subdivide: SURFACE_SUBDIVISION,
          color,
          values: snapshot.mesh.values,
          valueScale,
        }],
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
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.homoIsosurface.positive.vertices,
                     faces: data.frontier.homoIsosurface.positive.faces, normals: data.frontier.homoIsosurface.positive.normals,
                     subdivide: SURFACE_SUBDIVISION, color: RED }],
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
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.homoIsosurface.negative.vertices,
                     faces: data.frontier.homoIsosurface.negative.faces, normals: data.frontier.homoIsosurface.negative.normals,
                     subdivide: SURFACE_SUBDIVISION, color: BLUE }],
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
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.lumoIsosurface.positive.vertices,
                     faces: data.frontier.lumoIsosurface.positive.faces, normals: data.frontier.lumoIsosurface.positive.normals,
                     subdivide: SURFACE_SUBDIVISION, color: RED }],
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
        primitives: [{ kind: "mesh" as const, vertices: data.frontier.lumoIsosurface.negative.vertices,
                     faces: data.frontier.lumoIsosurface.negative.faces, normals: data.frontier.lumoIsosurface.negative.normals,
                     subdivide: SURFACE_SUBDIVISION, color: BLUE }],
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
          normals: data.densityEvolution.finalDensity.mesh.normals,
          subdivide: SURFACE_SUBDIVISION,
          // The same colour the SCF surface one page earlier settles on. That surface is painted by
          // departure from the converged density, so at convergence it reads the middle of the ramp;
          // this is that density, and arriving on a different hue would read as a different quantity.
          color: PALE,
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

/** Every mesh vertex as an xyz triple, thinned when there are more than the camera solve needs. */
function sampleMeshVertices(mesh: IsosurfaceMesh, stride = 96) {
  const count = mesh.vertices.length / 3;
  const step = count <= 2000 ? 1 : stride;
  const sampled: number[][] = [];
  for (let index = 0; index < count; index += step) {
    sampled.push([mesh.vertices[index * 3], mesh.vertices[index * 3 + 1],
                  mesh.vertices[index * 3 + 2]]);
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
  onStatusChange,
  onScfIndexChange,
  cyclePaused = false,
  scfPlaying = true,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  manualSnapshotIndex?: number | null;
  /** What the scene is currently showing, for the caption under the camera controls. */
  onStatusChange?: (status: string) => void;
  /** Which SCF iteration is on screen, including the ones playback advanced to by itself. */
  onScfIndexChange?: (index: number) => void;
  /** Hold the outputs page on whichever surface is up instead of cycling through the three. */
  cyclePaused?: boolean;
  /** Run the SCF sequence. False holds it wherever it is, including where the reader dropped it. */
  scfPlaying?: boolean;
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
  const [zoomIndex, setZoomIndex] = useState(BASE_ZOOM_INDEX);
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
    setZoomIndex(BASE_ZOOM_INDEX);
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
        const [molecule, densityEvolution, densityBuffer] = await Promise.all([
          fetchJsonOrThrow<DftScaffoldData>("/data/multiscale/dft/molecule.json", "DFT molecule.json"),
          fetchJsonOrThrow<Record<string, unknown>>("/data/multiscale/dft/density-evolution.json", "DFT density-evolution.json"),
          fetchBufferOrThrow("/data/multiscale/dft/density-evolution.bin", "DFT density-evolution.bin"),
        ]);
        if (cancelled) {
          plugin.dispose();
          return;
        }

        pluginRef.current = plugin;
        dataRef.current = centerDftData(molecule, densityEvolution, densityBuffer);

        // Deliberately left empty rather than set to initialBuild.renderKey. Marking the scene
        // as already drawn makes the effect below return early, so `rebuildScene` never runs on
        // mount and `paintedBoundsRef` stays null: the camera then frames the atom subset alone
        // and the density surface, which reaches past it, runs off the canvas. Measured on the
        // first DFT page the scene filled 0.93 x 1.00 of the frame against 0.45 x 0.69 on the
        // second, which reaches this path because its SCF index changes the render key.
        sceneKeyRef.current = "";
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

    // Where the reader last dropped the slider. Playback carries on from here rather than
    // restarting, so this only has to fire when the number itself changes.
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
      !scfPlaying ||
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
        : scfFrameMs(activeSnapshotIndex, snapshots.length),
    );
    return () => window.clearTimeout(timeout);
  }, [
    activeSnapshotIndex,
    isReady,
    scfPlaying,
    reducedMotion,
    resolvedSceneKey,
  ]);

  // The slider outside this component shows where the sequence is, so it has to hear every step
  // the sequence takes on its own, not only the ones the reader asked for.
  useEffect(() => {
    if (resolvedSceneKey === "D4_scf") onScfIndexChange?.(activeSnapshotIndex);
  }, [activeSnapshotIndex, onScfIndexChange, resolvedSceneKey]);

  useEffect(() => {
    setOutputMode("density");
  }, [resolvedSceneKey]);

  // Cycle output surfaces when the explanatory panel is hidden.
  useEffect(() => {
    if (!hideMechanism || reducedMotion || cyclePaused) return;
    if (resolvedSceneKey !== "D6_outputs" || !isReady) return;
    const modes: DftOutputMode[] = ["density", "homo", "lumo"];
    let index = 0;
    const id = window.setInterval(() => {
      index = (index + 1) % modes.length;
      setOutputMode(modes[index]);
    }, MULTISCALE_MOTION.outputCycleMs);
    return () => window.clearInterval(id);
  }, [cyclePaused, hideMechanism, reducedMotion, resolvedSceneKey, isReady]);

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
    void Promise.all([
      fetchJsonOrThrow<Record<string, unknown>>("/data/multiscale/dft/frontier-orbitals.json", "DFT frontier-orbitals.json"),
      fetchBufferOrThrow("/data/multiscale/dft/frontier-orbitals.bin", "DFT frontier-orbitals.bin"),
    ])
      .then(([raw, buffer]) => {
        if (!dataRef.current) return;
        const frontier = centerFrontierData(raw, buffer, dataRef.current.center);
        dataRef.current = { ...dataRef.current, frontier };
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
      zoomOut: () => setZoomIndex((current) => Math.min(MAX_ZOOM_INDEX, current + 1)),
      fit: () => {
        setZoomIndex(BASE_ZOOM_INDEX);
        setViewRevision((value) => value + 1);
      },
      reset: () => {
        setZoomIndex(BASE_ZOOM_INDEX);
        setViewRevision((value) => value + 1);
      },
    };

    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef]);

  // The SCF page names the iteration it is on; the outputs page names which field is drawn,
  // because the surface alone does not say whether it is the density or a frontier orbital.
  useEffect(() => {
    if (resolvedSceneKey === "D4_scf") {
      const snapshotLabel =
        dataRef.current?.densityEvolution.snapshots[activeSnapshotIndex]?.label ?? "";
      onStatusChange?.(
        isKorean ? snapshotLabel.replace("Iter ", "반복 ") : snapshotLabel,
      );
      return;
    }
    onStatusChange?.(
      outputMode === "homo" ? "HOMO"
        : outputMode === "lumo" ? "LUMO"
        : isKorean ? "전자밀도" : "Electron density",
    );
  }, [activeSnapshotIndex, isKorean, isReady, onStatusChange, outputMode, resolvedSceneKey]);

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
