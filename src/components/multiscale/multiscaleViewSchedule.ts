"use client";

import type { LevelId } from "./scrollState";

export type TransitionMode = "hold-then-blend" | "snap";
export type RangeWindow = [number, number];

export interface StagedTimingSpec {
  enter?: RangeWindow;
  exit?: RangeWindow;
  hold?: RangeWindow;
}

export interface MultiscaleTimingSpec {
  [key: string]: RangeWindow | number | StagedTimingSpec | undefined;
}

export interface MultiscaleViewSpec {
  cameraSubsetId: string;
  renderSubsetId?: string;
  anchorId: string;
  azimuthDeg: number;
  elevationDeg: number;
  rollDeg: number;
  targetOffset: [number, number, number];
  padding: number;
  nearFactor: number;
  farFactor: number;
  zoomLadder: number[];
  transitionMode: TransitionMode;
  timing?: MultiscaleTimingSpec;
}

export interface MultiscaleSubsetSpec {
  id: string;
  indices: number[];
}

export interface MultiscaleAnchorSpec {
  id: string;
  point: [number, number, number];
}

const DEFAULT_ZOOM_LADDER = [0.5, 0.65, 0.8, 1, 1.25, 1.6, 2.0];

type LevelSchedule = Record<number, MultiscaleViewSpec>;

export const MULTISCALE_VIEW_SCHEDULE: Record<LevelId, LevelSchedule> = {
  meso: {
    // Camera geometry computed from pipeline data:
    //   AA atoms: center=(14.72, 20.98, 8.82), bounding_r=22.79 Å
    //   CG beads: center=(4.49, -0.75, 2.36), bounding_r=109.87 Å
    //   bundle_center anchor (raw): (4.49, -0.75, 2.36) ≈ CG centroid
    //   After centerMesoScheduleData with atoms=[]: no shift, bundle_center stays as-is
    //   Page1 renders AA atoms centered at origin → targetOffset compensates the 5 Å gap
    //   FOV=50°, tan(25°)=0.4663 → distance = radius × padding / 0.4663
    //
    //   All positions now in nm (÷10 from Å). System radii: AA=6.1 nm, CG=26.5 nm.
    //   Page 1-2 (AA): padding=0.28 → dist ≈ 16 nm (frames 7.3 nm)
    //   Pages 3-6 (CG): padding=1.3 → dist ≈ 74 nm (frames 34.5 nm)

    0: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 0,
      elevationDeg: 5,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 0.24,
      nearFactor: 0.02,
      farFactor: 8,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        atomOpacity: [0.0, 0.2],
        beadOpacity: [0.85, 1.0],
      },
    },
    1: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 0,
      elevationDeg: 5,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 0.24,
      nearFactor: 0.02,
      farFactor: 8,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        atomOpacity: [0.0, 0.55],
        beadOpacity: [0.2, 0.9],
        hullOpacity: [0.25, 0.75],
        mappingOpacity: [0.25, 0.95],
      },
    },
    // Steps 2-3: Same single-polymer view as step 1.
    2: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 0,
      elevationDeg: 5,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 0.24,
      nearFactor: 0.02,
      farFactor: 8,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        beadOpacity: [0.0, 0.3],
        bondGlowOpacity: [0.25, 0.95],
      },
    },
    3: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 0,
      elevationDeg: 5,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 0.24,
      nearFactor: 0.02,
      farFactor: 8,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        thermalAmplitude: [0.1, 0.95],
      },
    },
    4: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 36,
      elevationDeg: 20,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.6,
      nearFactor: 0.05,
      farFactor: 12,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        shellRadius: [0.05, 0.95],
        neighborReveal: [0.1, 0.95],
      },
    },
    5: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 35,
      elevationDeg: 32,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.7,
      nearFactor: 0.05,
      farFactor: 12,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        bundleOpacity: [0.0, 1.0],
      },
    },
  },
  allatom: {
    0: {
      cameraSubsetId: "scene_all",
      renderSubsetId: "scene_all",
      anchorId: "scene_center",
      azimuthDeg: 34,
      elevationDeg: 16,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.18,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: {
        systemOpacity: { enter: [0.0, 0.18] },
        supportOpacity: { enter: [0.08, 0.26] },
      },
    },
    1: {
      cameraSubsetId: "scene_focus",
      renderSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 54,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0.0, 0.0, 0.0],
      padding: 0.96,
      nearFactor: 0.05,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: {
        systemOpacity: { enter: [0.0, 0.16] },
        supportOpacity: { enter: [0.02, 0.18] },
        bondedCue: { enter: [0.18, 0.34], exit: [0.46, 0.62] },
        nonBondedCue: { enter: [0.5, 0.72] },
      },
    },
    2: {
      cameraSubsetId: "scene_focus",
      renderSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 58,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0.0, 0.0, 0.0],
      padding: 0.98,
      nearFactor: 0.05,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: {
        systemOpacity: { enter: [0.0, 0.16] },
        supportOpacity: { enter: [0.04, 0.2] },
      },
    },
    3: {
      cameraSubsetId: "scene_all",
      renderSubsetId: "scene_all",
      anchorId: "scene_center",
      azimuthDeg: 34,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0.0, 0.0, 0.0],
      padding: 1.28,
      nearFactor: 0.05,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: {
        systemOpacity: { enter: [0.0, 0.18] },
        supportOpacity: { enter: [0.08, 0.24] },
        referenceBoxCue: { enter: [0.0, 0.22], exit: [0.52, 0.68] },
        trailCue: { enter: [0.12, 0.28], exit: [0.52, 0.68] },
      },
    },
    4: {
      cameraSubsetId: "scene_focus",
      renderSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 34,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0.0, 0.0, 0.0],
      padding: 1.0,
      nearFactor: 0.05,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: {
        systemOpacity: { enter: [0.0, 0.16] },
        supportOpacity: { enter: [0.04, 0.18] },
      },
    },
  },
  mlff: {
    0: {
      cameraSubsetId: "expanded_local",
      anchorId: "focus_center",
      azimuthDeg: 32,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.24,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: { atomOpacity: [0.0, 1.0] },
    },
    1: {
      cameraSubsetId: "expanded_local",
      anchorId: "focus_center",
      azimuthDeg: 46,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.18,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: { cutoffRadius: [0.1, 0.95] },
    },
    2: {
      cameraSubsetId: "local_core",
      anchorId: "focus_center",
      azimuthDeg: 56,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.22,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: { edgeOpacity: [0.2, 0.9] },
    },
    3: {
      cameraSubsetId: "local_core",
      anchorId: "focus_center",
      azimuthDeg: 96,
      elevationDeg: 12,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.12,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: { messageOpacity: [0.15, 0.9] },
    },
    4: {
      cameraSubsetId: "local_core",
      anchorId: "focus_center",
      azimuthDeg: 48,
      elevationDeg: 24,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.14,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: { energyIntensity: [0.15, 0.9] },
    },
    5: {
      cameraSubsetId: "local_core",
      anchorId: "focus_center",
      azimuthDeg: 20,
      elevationDeg: 26,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.14,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: { forceOpacity: [0.15, 0.9] },
    },
    6: {
      cameraSubsetId: "expanded_local",
      anchorId: "focus_center",
      azimuthDeg: 32,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.2,
      nearFactor: 0.06,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: { atomOpacity: [0.0, 1.0] },
    },
  },
  dft: {
    // All DFT steps share the same molecule-based camera: fixed atom framing, face-on orientation.
    // Overlays (density, orbitals) change per step but camera stays anchored to molecule atoms.
    0: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    1: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    2: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    3: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    4: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    5: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    6: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    7: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
    8: { cameraSubsetId: "molecule", anchorId: "molecule_center", azimuthDeg: 10, elevationDeg: 14, rollDeg: 0, targetOffset: [0, 0, 0], padding: 1.22, nearFactor: 0.05, farFactor: 6, zoomLadder: DEFAULT_ZOOM_LADDER, transitionMode: "snap" },
  },
};

export function getViewSpec(level: LevelId, step: number) {
  return MULTISCALE_VIEW_SCHEDULE[level][step];
}

export function getStepBlendT(stepProgress: number) {
  if (stepProgress <= 0.85) return 0;
  return Math.min(1, (stepProgress - 0.85) / 0.15);
}

export function lerpNumber(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function getTimedValue(timing: MultiscaleTimingSpec | undefined, key: string, stepProgress: number, fallback = 0) {
  const value = timing?.[key];
  if (typeof value === "number") return value;
  if (!value) return fallback;
  if (!Array.isArray(value)) {
    const enter = value.enter;
    const exit = value.exit;
    if (enter) {
      const [start, end] = enter;
      if (stepProgress <= start) return 0;
      if (stepProgress < end) return (stepProgress - start) / Math.max(1e-6, end - start);
    }
    if (exit) {
      const [start, end] = exit;
      if (stepProgress <= start) return 1;
      if (stepProgress < end) return 1 - (stepProgress - start) / Math.max(1e-6, end - start);
      return 0;
    }
    return 1;
  }
  const [start, end] = value;
  if (stepProgress <= start) return 0;
  if (stepProgress >= end) return 1;
  return (stepProgress - start) / Math.max(1e-6, end - start);
}
