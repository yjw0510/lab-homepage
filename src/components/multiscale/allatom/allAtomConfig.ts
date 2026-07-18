"use client";

import type { AllAtomSystemData } from "../data/allatomSolvent";
import { CHOREOGRAPHY } from "../levelData";
import { getTimedValue, getViewSpec } from "../multiscaleViewSchedule";

export type AllAtomForceFieldTerm = "Ubond" | "Uangle" | "Udihedral" | "UvdW" | "UCoul";
export type AllAtomCueFamily = "bonded" | "nonbonded";
export type AllAtomReadoutId = "orientation" | "packing" | "motif";
export type AllAtomSceneKey = "A6_observables" | "A3_forcefield";

export interface AllAtomPagePolicy {
  maxSupportObjects: number;
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
}

export const ALLATOM_SCENE_KEYS: AllAtomSceneKey[] = ["A6_observables", "A3_forcefield"];

const ASSET_SNAPSHOT_BY_SCENE: Record<AllAtomSceneKey, string> = {
  A6_observables: "A5_readout",
  A3_forcefield: "A2_forcefield",
};

export const ALLATOM_PAGE_POLICY: Record<AllAtomSceneKey, AllAtomPagePolicy> = {
  A6_observables: {
    maxSupportObjects: 6,
    frameIntervalMs: 240,
    targetOccupancy: 0.52,
  },
  A3_forcefield: {
    maxSupportObjects: 4,
    frameIntervalMs: 220,
    targetOccupancy: 0.76,
  },
};

export function getAllAtomSceneKey(step: number): AllAtomSceneKey {
  const sceneKey = CHOREOGRAPHY.allatom.steps[step]?.sceneKey;
  return ALLATOM_SCENE_KEYS.includes(sceneKey as AllAtomSceneKey)
    ? (sceneKey as AllAtomSceneKey)
    : "A6_observables";
}

export function getAllAtomPagePolicy(step: number) {
  return ALLATOM_PAGE_POLICY[getAllAtomSceneKey(step)];
}

export function getAllAtomAssetSnapshotId(sceneKey: AllAtomSceneKey) {
  return ASSET_SNAPSHOT_BY_SCENE[sceneKey];
}

export function forceFieldTermFamily(term: AllAtomForceFieldTerm): AllAtomCueFamily {
  return term === "UvdW" || term === "UCoul" ? "nonbonded" : "bonded";
}

export function getScheduledAllAtomSnapshot(system: AllAtomSystemData, step: number) {
  const snapshotId = getAllAtomAssetSnapshotId(getAllAtomSceneKey(step));
  return system.snapshots.find((snapshot) => snapshot.id === snapshotId) ?? system.snapshots[0];
}

export function getAllAtomVisuals(step: number, stepProgress: number): AllAtomVisualState {
  const sceneKey = getAllAtomSceneKey(step);
  const timing = getViewSpec("allatom", step).timing;
  const systemCue = getTimedValue(timing, "systemOpacity", stepProgress, 1);
  const supportCue = getTimedValue(timing, "supportOpacity", stepProgress, 1);

  if (sceneKey === "A3_forcefield") {
    return {
      primaryStructuralOpacity: 0.9 * systemCue,
      supportStructuralOpacity: 0.16 * supportCue,
    };
  }

  return {
    primaryStructuralOpacity: 0.9 * systemCue,
    supportStructuralOpacity: 0.1 * supportCue,
  };
}
