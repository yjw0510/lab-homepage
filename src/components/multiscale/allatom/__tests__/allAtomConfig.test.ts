import { describe, expect, it } from "vitest";
import { getViewSpec } from "../../multiscaleViewSchedule";
import {
  ALLATOM_PAGE_POLICY,
  ALLATOM_SCENE_KEYS,
  getAllAtomAssetSnapshotId,
  getAllAtomPagePolicy,
  getAllAtomSceneKey,
} from "../allAtomConfig";

describe("classical all-atom scene routing", () => {
  it("declares only the scenes exposed by the current choreography", () => {
    expect(ALLATOM_SCENE_KEYS).toEqual(["A6_observables", "A3_forcefield"]);
    expect(getAllAtomSceneKey(0)).toBe("A6_observables");
    expect(getAllAtomSceneKey(1)).toBe("A3_forcefield");
    expect(getAllAtomSceneKey(99)).toBe("A6_observables");
  });

  it("maps live scenes to their existing trajectory snapshots", () => {
    expect(getAllAtomAssetSnapshotId("A6_observables")).toBe("A5_readout");
    expect(getAllAtomAssetSnapshotId("A3_forcefield")).toBe("A2_forcefield");
  });

  it("keeps playback and framing policies aligned with the two live scenes", () => {
    expect(Object.keys(ALLATOM_PAGE_POLICY)).toEqual(["A6_observables", "A3_forcefield"]);
    expect(getAllAtomPagePolicy(0)).toEqual({
      maxSupportObjects: 6,
      frameIntervalMs: 240,
      targetOccupancy: 0.52,
    });
    expect(getAllAtomPagePolicy(1)).toEqual({
      maxSupportObjects: 4,
      frameIntervalMs: 220,
      targetOccupancy: 0.76,
    });
  });

  it("reindexes the retained camera views without changing their framing", () => {
    expect(getViewSpec("allatom", 0)).toMatchObject({
      cameraSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 34,
      elevationDeg: 18,
      padding: 1,
      transitionMode: "snap",
    });
    expect(getViewSpec("allatom", 1)).toMatchObject({
      cameraSubsetId: "scene_focus",
      anchorId: "focus_center",
      azimuthDeg: 54,
      elevationDeg: 18,
      padding: 0.96,
    });
  });

  it("rejects schedule steps that have no live scene", () => {
    expect(() => getViewSpec("allatom", 2)).toThrow(RangeError);
  });
});
