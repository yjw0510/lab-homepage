"use client";

import type { LevelId } from "./scrollState";

export type ScheduledLevelId = Exclude<LevelId, "mlff">;
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

// Rungs a quarter apart, six in and five out from rest. The seven-rung ladder this replaces
// reached 2x in and stopped, which on a molecule that already fills the frame at rest is one
// or two useful clicks before the button does nothing.
const DEFAULT_ZOOM_LADDER = [0.26, 0.33, 0.41, 0.51, 0.64, 0.8, 1, 1.25, 1.56, 1.95, 2.44, 3.05];

/**
 * Where the ladder sits at rest, and its last rung. Exported because the stages own the buttons
 * and had been carrying their own numbers: the DFT stage clamped to 0..4 around a neutral of 2
 * against a seven-rung ladder whose neutral is 3, so zooming in ran out after two clicks and
 * every click after that changed nothing.
 */
export const BASE_ZOOM_INDEX = DEFAULT_ZOOM_LADDER.indexOf(1);
export const MAX_ZOOM_INDEX = DEFAULT_ZOOM_LADDER.length - 1;

const DFT_VIEW_SPEC: MultiscaleViewSpec = {
  cameraSubsetId: "molecule",
  anchorId: "molecule_center",
  // Face-on to the molecule's own plane rather than a generic three-quarter view. Fitting a
  // plane to the 21 heavy atoms within 5.5 A of the ring-nitrogen centroid gives singular values
  // 11.5 / 11.46 / 0.26 and 0.057 A of out-of-plane scatter, so the core really is flat, and its
  // normal points along these two angles. Seen from anywhere else the rings foreshorten into
  // each other.
  azimuthDeg: -33,
  elevationDeg: -26,
  rollDeg: 0,
  targetOffset: [0, 0, 0],
  // The SCF density isosurface extends well past the atoms, and the schedule frames `molecule`,
  // so this is set against the converged surface, the largest thing either DFT page draws.
  // Measured by scripts/probe-canvas-fit.mjs: height is the binding dimension on every desktop
  // viewport and width never comes close, so the number is chosen to put the surface at about
  // 78% of canvas height, leaving room for the control panel and colour bar it sits under.
  padding: 1.09,
  nearFactor: 0.05,
  farFactor: 6,
  zoomLadder: DEFAULT_ZOOM_LADDER,
  transitionMode: "snap",
};

type LevelSchedule = Record<number, MultiscaleViewSpec>;

export const MULTISCALE_VIEW_SCHEDULE: Record<ScheduledLevelId, LevelSchedule> = {
  meso: {
    0: {
      cameraSubsetId: "bundle_overview",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 28,
      elevationDeg: 12,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1.15,
      nearFactor: 0.05,
      farFactor: 12,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
    },
    1: {
      // The melt renders `all_beads`; framing the smaller `bundle_overview` subset
      // cut the scene on all four canvas edges at every viewport and theme, measured
      // by probe-canvas-fit.mjs. Frame what is drawn.
      cameraSubsetId: "all_beads",
      renderSubsetId: "all_beads",
      anchorId: "bundle_center",
      azimuthDeg: 25,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      // The melt is a dense 8,000-bead box; framed to its own bounds at 1.35 it still
      // reached all four canvas edges at every viewport and theme. Measured clear at
      // 1.85 by probe-canvas-fit.mjs.
      padding: 1.85,
      nearFactor: 0.05,
      farFactor: 12,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        atomOpacity: [0, 0.2],
        beadOpacity: [0.85, 1],
      },
    },
  },
  allatom: {
    0: {
      cameraSubsetId: "scene_focus",
      renderSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 34,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 1,
      nearFactor: 0.05,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "snap",
      timing: {
        // No enter ramp on the solute. An `enter` window starting at 0 returns 0 at
        // stepProgress 0, so stopping a scroll on the step boundary drew the molecule at zero
        // alpha — visible only as the silhouette rings WBOIT leaves behind. The subject is
        // present whenever its step is; only the surrounding context fades in.
        supportOpacity: { enter: [0.04, 0.18] },
      },
    },
    1: {
      cameraSubsetId: "scene_focus",
      renderSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 54,
      elevationDeg: 18,
      rollDeg: 0,
      targetOffset: [0, 0, 0],
      padding: 0.96,
      nearFactor: 0.05,
      farFactor: 6,
      zoomLadder: DEFAULT_ZOOM_LADDER,
      transitionMode: "hold-then-blend",
      timing: {
        supportOpacity: { enter: [0.02, 0.18] },
      },
    },
  },
  dft: {
    0: DFT_VIEW_SPEC,
    1: DFT_VIEW_SPEC,
  },
};

export function getViewSpec(level: ScheduledLevelId, step: number) {
  const spec = MULTISCALE_VIEW_SCHEDULE[level][step];
  if (!spec) {
    throw new RangeError(`No scheduled ${level} view for step ${step}.`);
  }
  return spec;
}

export function getStepBlendT(stepProgress: number) {
  if (stepProgress <= 0.85) return 0;
  return Math.min(1, (stepProgress - 0.85) / 0.15);
}

export function lerpNumber(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

