import { describe, expect, it } from "vitest";
import {
  ALLATOM_SCENE_KEYS,
  forceFieldTermFamily,
  getAllAtomSceneKey,
} from "../allAtomConfig";
import { getViewSpec } from "../../multiscaleViewSchedule";

describe("classical all-atom scene routing", () => {
  // Step 0 is "Fixing the Chemistry to Buy Steps", a force-field subject; step 1 is
  // "How a Trajectory Yields an Observable". These used to be crossed against the sceneKey each
  // step declares in levelData.ts, so the mobile mechanism band rendered each step's copy under
  // the other step's prose.
  it("routes each step to the scene its own copy is about", () => {
    expect(ALLATOM_SCENE_KEYS).toEqual(["A3_forcefield", "A6_observables"]);
    expect(getAllAtomSceneKey(0)).toBe("A3_forcefield");
    expect(getAllAtomSceneKey(1)).toBe("A6_observables");
    expect(getAllAtomSceneKey(99)).toBe("A3_forcefield");
  });

  it("splits force-field terms into the two cue families", () => {
    expect(forceFieldTermFamily("Ubond")).toBe("bonded");
    expect(forceFieldTermFamily("Uangle")).toBe("bonded");
    expect(forceFieldTermFamily("Udihedral")).toBe("bonded");
    expect(forceFieldTermFamily("UvdW")).toBe("nonbonded");
    expect(forceFieldTermFamily("UCoul")).toBe("nonbonded");
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
