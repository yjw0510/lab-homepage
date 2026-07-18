"use client";

import type { AllAtomSystemData, AllAtomBoxMode } from "../data/allatomSolvent";
import { CHOREOGRAPHY } from "../levelData";
import { getTimedValue, getViewSpec } from "../multiscaleViewSchedule";

/* ── Types ── */

export type AllAtomForceFieldTerm = "Ubond" | "Uangle" | "Udihedral" | "UvdW" | "UCoul";
export type AllAtomCueFamily = "bonded" | "nonbonded";
export type AllAtomReadoutId = "orientation" | "packing" | "motif";
export type AllAtomSceneKey =
  | "A1_branch"
  | "A2_pbc"
  | "A3_forcefield"
  | "A4_integrate"
  | "A5_ensemble"
  | "A6_observables"
  | "A7_mapping";
export type AllAtomPlaybackMode = "ping-pong" | "one-way" | "hold";

export interface AllAtomPagePolicy {
  boxAllowed: boolean;
  globalSceneRequired: boolean;
  maxSupportObjects: number;
  allowedCueFamilies: AllAtomCueFamily[];
  frameIntervalMs: number;
  targetOccupancy: number;
  playbackMode: AllAtomPlaybackMode;
}

export interface AllAtomCameraState {
  zoomIndex: number;
  viewRevision: number;
}

export interface AllAtomVisualState {
  primaryStructuralOpacity: number;
  supportStructuralOpacity: number;
  boxMode: AllAtomBoxMode;
  boxGlow: number;
  referenceBoxCue: number;
  trailCue: number;
  bondedCue: number;
  nonBondedCue: number;
}

/* ── Page Policy ── */

export const ALLATOM_SCENE_KEYS: AllAtomSceneKey[] = [
  "A1_branch",
  "A2_pbc",
  "A3_forcefield",
  "A4_integrate",
  "A5_ensemble",
  "A6_observables",
  "A7_mapping",
];

const LEGACY_SCENE_ALIASES: Record<string, AllAtomSceneKey> = {
  A1_resolution: "A2_pbc",
  A2_forcefield: "A3_forcefield",
  A3_nonuniformity: "A6_observables",
  A4_ensemble: "A5_ensemble",
  A5_readout: "A6_observables",
};

const ASSET_SNAPSHOT_BY_SCENE: Record<AllAtomSceneKey, string> = {
  A1_branch: "A1_resolution",
  A2_pbc: "A1_resolution",
  A3_forcefield: "A2_forcefield",
  A4_integrate: "A2_forcefield",
  A5_ensemble: "A4_ensemble",
  A6_observables: "A5_readout",
  A7_mapping: "A5_readout",
};

const VIEW_STEP_BY_SCENE: Record<AllAtomSceneKey, number> = {
  A1_branch: 0,
  A2_pbc: 0,
  A3_forcefield: 1,
  A4_integrate: 1,
  A5_ensemble: 3,
  A6_observables: 4,
  A7_mapping: 4,
};

export const ALLATOM_PAGE_POLICY: Record<number, AllAtomPagePolicy> = {
  0: {
    boxAllowed: false,
    globalSceneRequired: true,
    maxSupportObjects: 9999,
    allowedCueFamilies: [],
    frameIntervalMs: 320,
    targetOccupancy: 0.62,
    playbackMode: "ping-pong",
  },
  1: {
    boxAllowed: true,
    globalSceneRequired: true,
    maxSupportObjects: 9999,
    allowedCueFamilies: [],
    frameIntervalMs: 280,
    targetOccupancy: 0.68,
    playbackMode: "ping-pong",
  },
  2: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 4,
    allowedCueFamilies: ["bonded", "nonbonded"],
    frameIntervalMs: 220,
    targetOccupancy: 0.76,
    playbackMode: "ping-pong",
  },
  3: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 3,
    allowedCueFamilies: [],
    frameIntervalMs: 220,
    targetOccupancy: 0.78,
    playbackMode: "ping-pong",
  },
  4: {
    boxAllowed: true,
    globalSceneRequired: true,
    maxSupportObjects: 9999,
    allowedCueFamilies: [],
    frameIntervalMs: 360,
    targetOccupancy: 0.64,
    playbackMode: "one-way",
  },
  5: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 6,
    allowedCueFamilies: [],
    frameIntervalMs: 240,
    targetOccupancy: 0.52,
    playbackMode: "ping-pong",
  },
  6: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 4,
    allowedCueFamilies: [],
    frameIntervalMs: 260,
    targetOccupancy: 0.56,
    playbackMode: "hold",
  },
};

export function getAllAtomPagePolicy(step: number) {
  const sceneKey = getAllAtomSceneKey(step);
  const sceneIndex = ALLATOM_SCENE_KEYS.indexOf(sceneKey);
  return ALLATOM_PAGE_POLICY[sceneIndex] ?? ALLATOM_PAGE_POLICY[0];
}

export function normalizeAllAtomSceneKey(sceneKey: string | undefined, step?: number): AllAtomSceneKey {
  if (sceneKey && ALLATOM_SCENE_KEYS.includes(sceneKey as AllAtomSceneKey)) {
    return sceneKey as AllAtomSceneKey;
  }
  if (sceneKey && LEGACY_SCENE_ALIASES[sceneKey]) {
    return LEGACY_SCENE_ALIASES[sceneKey];
  }
  if (typeof step === "number" && ALLATOM_SCENE_KEYS[step]) {
    return ALLATOM_SCENE_KEYS[step];
  }
  return "A1_branch";
}

export function getAllAtomSceneKey(step: number): AllAtomSceneKey {
  return normalizeAllAtomSceneKey(CHOREOGRAPHY.allatom.steps[step]?.sceneKey, step);
}

export function getAllAtomAssetSnapshotId(sceneKey: AllAtomSceneKey) {
  return ASSET_SNAPSHOT_BY_SCENE[sceneKey];
}

export function getAllAtomViewStep(sceneKey: AllAtomSceneKey) {
  return VIEW_STEP_BY_SCENE[sceneKey];
}

export function forceFieldTermFamily(term: AllAtomForceFieldTerm): AllAtomCueFamily {
  return term === "UvdW" || term === "UCoul" ? "nonbonded" : "bonded";
}

/* ── Visual State ── */

export function getScheduledAllAtomSnapshot(system: AllAtomSystemData, step: number) {
  const sceneKey = getAllAtomSceneKey(step);
  const snapshotId = getAllAtomAssetSnapshotId(sceneKey);
  return system.snapshots.find((snapshot) => snapshot.id === snapshotId) ?? system.snapshots[0];
}

export function getAllAtomVisuals(step: number, stepProgress: number): AllAtomVisualState {
  const sceneKey = getAllAtomSceneKey(step);
  const timing = getViewSpec("allatom", getAllAtomViewStep(sceneKey)).timing;
  const systemCue = getTimedValue(timing, "systemOpacity", stepProgress, 1);
  const supportCue = getTimedValue(timing, "supportOpacity", stepProgress, 1);

  switch (sceneKey) {
    case "A1_branch":
      return {
        primaryStructuralOpacity: 0.52 * systemCue,
        supportStructuralOpacity: 0.08 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case "A2_pbc":
      return {
        primaryStructuralOpacity: 0.9 * systemCue,
        supportStructuralOpacity: 0.2 * supportCue,
        boxMode: "current",
        boxGlow: 0.28,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case "A3_forcefield":
      return {
        primaryStructuralOpacity: 0.9 * systemCue,
        supportStructuralOpacity: 0.16 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case "A4_integrate":
      return {
        primaryStructuralOpacity: 0.84 * systemCue,
        supportStructuralOpacity: 0.08 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case "A5_ensemble":
      return {
        primaryStructuralOpacity: 0.86 * systemCue,
        supportStructuralOpacity: 0.16 * supportCue,
        boxMode: "current+reference",
        boxGlow: 0.62,
        referenceBoxCue: 0.62,
        trailCue: 0.34,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case "A6_observables":
      return {
        primaryStructuralOpacity: 0.9 * systemCue,
        supportStructuralOpacity: 0.1 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case "A7_mapping":
    default:
      return {
        primaryStructuralOpacity: 0.72 * systemCue,
        supportStructuralOpacity: 0.05 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
  }
}
