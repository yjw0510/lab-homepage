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

// targetOccupancy is the share of the frame the page's subject (the 24-atom solute) takes.
// It used to be read against the asset's own camera radius, which frames the whole solvated
// box, so both pages drew the solute at ~21% of the frame regardless of what these numbers
// said. See derivePlacementSnapshot. The readout page can sit tight because it draws the
// solute and its nearest waters; the force-field page has to leave room for the ghost of
// the second molecule, which reaches about 11 Å from the solute centre.
export const ALLATOM_PAGE_POLICY: Record<AllAtomSceneKey, AllAtomPagePolicy> = {
  A6_observables: {
    maxSupportObjects: 6,
    frameIntervalMs: 240,
    targetOccupancy: 0.68,
  },
  A3_forcefield: {
    maxSupportObjects: 4,
    frameIntervalMs: 220,
    targetOccupancy: 0.72,
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

  // The support molecules are the condensed-phase environment: they are the reason this
  // is a liquid and not one molecule in vacuum. At 0.1 they were invisible, which also
  // made the camera look wrong — it frames the whole focus set, so a reader seeing only
  // the bright fifth of it reads a small object adrift in an empty stage.
  // probe-canvas-fit measured the scene using 32-39% of the room its shape could take on
  // a phone while the camera was in fact framing correctly. Same defect as the atom-to-
  // bead morph carried at the same 0.1 value (DESIGN.md R18).
  if (sceneKey === "A3_forcefield") {
    return {
      primaryStructuralOpacity: 0.9 * systemCue,
      supportStructuralOpacity: 0.34 * supportCue,
    };
  }

  return {
    primaryStructuralOpacity: 0.9 * systemCue,
    supportStructuralOpacity: 0.3 * supportCue,
  };
}
