import { describe, expect, it } from "vitest";
import {
  ALLATOM_PAGE_POLICY,
  ALLATOM_SCENE_KEYS,
  getAllAtomAssetSnapshotId,
  getAllAtomPagePolicy,
  getAllAtomSceneKey,
  getAllAtomViewStep,
  normalizeAllAtomSceneKey,
} from "../allAtomConfig";

describe("classical all-atom scene routing", () => {
  it("declares the complete seven-scene descent in order", () => {
    expect(ALLATOM_SCENE_KEYS).toEqual([
      "A1_branch",
      "A2_pbc",
      "A3_forcefield",
      "A4_integrate",
      "A5_ensemble",
      "A6_observables",
      "A7_mapping",
    ]);
  });

  it("routes the reduced all-atom spine to the observable flagship and force-field depth", () => {
    // The spine exposes two pages: the sampling-becomes-observable flagship,
    // then the force-field mechanism. The remaining scene tables stay intact
    // so deep links and the mechanism article can still reach every scene.
    expect(getAllAtomSceneKey(0)).toBe("A6_observables");
    expect(getAllAtomSceneKey(1)).toBe("A3_forcefield");
    expect(
      ALLATOM_SCENE_KEYS.every((key) => Number.isInteger(getAllAtomViewStep(key))),
    ).toBe(true);
  });

  it("keeps legacy scene keys compatible during central integration", () => {
    expect(normalizeAllAtomSceneKey("A1_resolution")).toBe("A2_pbc");
    expect(normalizeAllAtomSceneKey("A2_forcefield")).toBe("A3_forcefield");
    expect(normalizeAllAtomSceneKey("A4_ensemble")).toBe("A5_ensemble");
    expect(normalizeAllAtomSceneKey("unknown", 6)).toBe("A7_mapping");
  });

  it("reuses genuine trajectory assets without inventing missing simulations", () => {
    expect(getAllAtomAssetSnapshotId("A1_branch")).toBe("A1_resolution");
    expect(getAllAtomAssetSnapshotId("A4_integrate")).toBe("A2_forcefield");
    expect(getAllAtomAssetSnapshotId("A5_ensemble")).toBe("A4_ensemble");
    expect(getAllAtomAssetSnapshotId("A7_mapping")).toBe("A5_readout");
  });

  it("maps the seven pages onto the established camera schedule", () => {
    expect(ALLATOM_SCENE_KEYS.map(getAllAtomViewStep)).toEqual([0, 0, 1, 1, 3, 4, 4]);
  });

  it("uses honest playback semantics for preparation and mapping", () => {
    expect(Object.keys(ALLATOM_PAGE_POLICY)).toHaveLength(7);
    expect(getAllAtomPagePolicy(4).playbackMode).toBe("one-way");
    expect(getAllAtomPagePolicy(6).playbackMode).toBe("hold");
    expect(getAllAtomPagePolicy(2).allowedCueFamilies).toEqual(["bonded", "nonbonded"]);
  });
});
