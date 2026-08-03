import { describe, it, expect } from "vitest";
import { scfFrameMs } from "../molstar/MolstarDftStage";
import { MULTISCALE_MOTION } from "../visualRules";

import snapshots from "../../../../public/data/multiscale/dft/density-evolution.json";

const COUNT = snapshots.snapshots.length;

describe("scfFrameMs", () => {
  it("hits both configured holds at the ends", () => {
    expect(scfFrameMs(0, COUNT)).toBe(MULTISCALE_MOTION.scfFirstFrameMs);
    expect(scfFrameMs(COUNT - 1, COUNT)).toBe(MULTISCALE_MOTION.scfLastFrameMs);
  });

  it("shortens every hold, never lengthening one", () => {
    for (let i = 1; i < COUNT; i += 1) {
      expect(scfFrameMs(i, COUNT)).toBeLessThan(scfFrameMs(i - 1, COUNT));
    }
  });

  it("shows every frame inside a loop short enough to watch twice", () => {
    let total = 0;
    for (let i = 0; i < COUNT; i += 1) total += scfFrameMs(i, COUNT);
    expect(total).toBeGreaterThan(6_000);
    expect(total).toBeLessThan(14_000);
  });
});
