"use client";

import { CHOREOGRAPHY } from "../levelData";

export type AllAtomForceFieldTerm = "Ubond" | "Uangle" | "Udihedral" | "UvdW" | "UCoul";
export type AllAtomCueFamily = "bonded" | "nonbonded";
export type AllAtomReadoutId = "orientation" | "packing" | "motif";
export type AllAtomSceneKey = "A6_observables" | "A3_forcefield";


export interface AllAtomCameraState {
  zoomIndex: number;
  viewRevision: number;
}


// Step order, and it has to match the sceneKey the same step declares in levelData.ts. The two
// lists disagreed: step 0 is "Fixing the Chemistry to Buy Steps", a force-field subject, and it
// was resolving to A6_observables, so the mobile mechanism band rendered the observables copy
// and readout tabs under force-field prose while step 1 got the force-field term tabs under
// observable prose. The Mol* scene keys off `step` directly and was always right, which is why
// only the surrounding copy was wrong.
export const ALLATOM_SCENE_KEYS: AllAtomSceneKey[] = ["A3_forcefield", "A6_observables"];


export function getAllAtomSceneKey(step: number): AllAtomSceneKey {
  const sceneKey = CHOREOGRAPHY.allatom.steps[step]?.sceneKey;
  return ALLATOM_SCENE_KEYS.includes(sceneKey as AllAtomSceneKey)
    ? (sceneKey as AllAtomSceneKey)
    : ALLATOM_SCENE_KEYS[0];
}

export function forceFieldTermFamily(term: AllAtomForceFieldTerm): AllAtomCueFamily {
  return term === "UvdW" || term === "UCoul" ? "nonbonded" : "bonded";
}
