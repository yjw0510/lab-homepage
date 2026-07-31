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

const DEFAULT_ZOOM_LADDER = [0.5, 0.65, 0.8, 1, 1.25, 1.6, 2.0];

const DFT_VIEW_SPEC: MultiscaleViewSpec = {
  cameraSubsetId: "molecule",
  anchorId: "molecule_center",
  azimuthDeg: 10,
  elevationDeg: 14,
  rollDeg: 0,
  targetOffset: [0, 0, 0],
  // The SCF density isosurface extends well past the atoms, and the schedule frames
  // `molecule`, so at 1.22 the surface reached all four canvas edges on every desktop
  // viewport. Measured clear at 1.55 by probe-canvas-fit.mjs.
  padding: 1.55,
  nearFactor: 0.05,
  farFactor: 6,
  zoomLadder: DEFAULT_ZOOM_LADDER,
  transitionMode: "snap",
};

type LevelSchedule = Record<number, MultiscaleViewSpec>;

export const MULTISCALE_VIEW_SCHEDULE: Record<ScheduledLevelId, LevelSchedule> = {
  meso: {
    0: {
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
    1: {
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

export function getTimedValue(
  timing: MultiscaleTimingSpec | undefined,
  key: string,
  stepProgress: number,
  fallback = 0,
) {
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
