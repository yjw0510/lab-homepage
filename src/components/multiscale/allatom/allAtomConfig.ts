"use client";

import type { AllAtomSystemData, AllAtomBoxMode } from "../data/allatomSolvent";
import { CHOREOGRAPHY } from "../levelData";
import { getTimedValue, getViewSpec } from "../multiscaleViewSchedule";

/* ── Types ── */

export type AllAtomForceFieldTerm = "Ubond" | "Uangle" | "Udihedral" | "UvdW" | "UCoul";
export type AllAtomCueFamily = "bonded" | "nonbonded";
export type AllAtomReadoutId = "orientation" | "packing" | "motif";

export interface AllAtomPagePolicy {
  boxAllowed: boolean;
  globalSceneRequired: boolean;
  maxSupportObjects: number;
  allowedCueFamilies: AllAtomCueFamily[];
  frameIntervalMs: number;
  targetOccupancy: number;
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

export const ALLATOM_PAGE_POLICY: Record<number, AllAtomPagePolicy> = {
  0: {
    boxAllowed: true,
    globalSceneRequired: true,
    maxSupportObjects: 9999,
    allowedCueFamilies: [],
    frameIntervalMs: 280,
    targetOccupancy: 0.68,
  },
  1: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 4,
    allowedCueFamilies: ["bonded", "nonbonded"],
    frameIntervalMs: 220,
    targetOccupancy: 0.76,
  },
  2: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 6,
    allowedCueFamilies: [],
    frameIntervalMs: 260,
    targetOccupancy: 0.5,
  },
  3: {
    boxAllowed: true,
    globalSceneRequired: true,
    maxSupportObjects: 9999,
    allowedCueFamilies: [],
    frameIntervalMs: 160,
    targetOccupancy: 0.64,
  },
  4: {
    boxAllowed: false,
    globalSceneRequired: false,
    maxSupportObjects: 6,
    allowedCueFamilies: [],
    frameIntervalMs: 240,
    targetOccupancy: 0.48,
  },
};

export function getAllAtomPagePolicy(step: number) {
  return ALLATOM_PAGE_POLICY[step] ?? ALLATOM_PAGE_POLICY[0];
}

export function forceFieldTermFamily(term: AllAtomForceFieldTerm): AllAtomCueFamily {
  return term === "UvdW" || term === "UCoul" ? "nonbonded" : "bonded";
}

/* ── Visual State ── */

export function getScheduledAllAtomSnapshot(system: AllAtomSystemData, step: number) {
  const snapshotId = CHOREOGRAPHY.allatom.steps[step]?.sceneKey;
  return system.snapshots.find((snapshot) => snapshot.id === snapshotId) ?? system.snapshots[step];
}

export function getAllAtomVisuals(step: number, stepProgress: number): AllAtomVisualState {
  const timing = getViewSpec("allatom", step).timing;
  const bondedCue = step === 1 ? getTimedValue(timing, "bondedCue", stepProgress, 0) : 0;
  const nonBondedCue = step === 1 ? getTimedValue(timing, "nonBondedCue", stepProgress, 0) : 0;
  const trailCue = step === 3 ? getTimedValue(timing, "trailCue", stepProgress, 0) : 0;
  const referenceBoxCue = step === 3 ? getTimedValue(timing, "referenceBoxCue", stepProgress, 0) : 0;
  const systemCue = getTimedValue(timing, "systemOpacity", stepProgress, 1);
  const supportCue = getTimedValue(timing, "supportOpacity", stepProgress, 1);

  switch (step) {
    case 0:
      return {
        primaryStructuralOpacity: 0.9 * systemCue,
        supportStructuralOpacity: 0.22 * supportCue,
        boxMode: "current",
        boxGlow: 0.18,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case 1:
      return {
        primaryStructuralOpacity: 0.88 * systemCue,
        supportStructuralOpacity: 0.16 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue,
        nonBondedCue,
      };
    case 2:
      return {
        primaryStructuralOpacity: 0.92 * systemCue,
        supportStructuralOpacity: 0.14 * supportCue,
        boxMode: "none",
        boxGlow: 0,
        referenceBoxCue: 0,
        trailCue: 0,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case 3:
      return {
        primaryStructuralOpacity: 0.86 * systemCue,
        supportStructuralOpacity: 0.16 * supportCue,
        boxMode: "current+reference",
        boxGlow: 0.68,
        referenceBoxCue,
        trailCue,
        bondedCue: 0,
        nonBondedCue: 0,
      };
    case 4:
    default:
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
  }
}
