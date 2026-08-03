import { describe, expect, it } from "vitest";
import { ballAndStick, shortestHeavyBond, STICK_TO_BALL, ELEMENT_HEX } from "../ballAndStick";

describe("ball and stick", () => {
  it("keeps the stick at the tier's fraction of the ball", () => {
    const r = ballAndStick(0.14, ["C", "H", "O"]);
    expect(r.stick / r.ball("C")).toBeCloseTo(STICK_TO_BALL, 6);
  });

  // The rule that was missing from the MLFF glyph: with a short bond the balls have to come
  // down, or neighbouring spheres swallow each other.
  it("caps a ball so it cannot be wider than the bond it sits on", () => {
    const tight = ballAndStick(0.10, ["C"]);
    expect(2 * tight.ball("C")).toBeLessThanOrEqual(0.8 * 0.10 + 1e-9);
    // And it is the bond that sets the size, whatever units the scene is in: the same
    // molecule drawn ten times larger gets balls ten times larger, not nanometre specks.
    const loose = ballAndStick(1.0, ["C"]);
    expect(loose.ball("C") / tight.ball("C")).toBeCloseTo(10, 6);
  });

  // One degenerate pair must not collapse the scene.
  it("takes a percentile, not the minimum", () => {
    const positions = [0, 0, 0, 0.0053, 0, 0, 0.15, 0, 0, 0.30, 0, 0, 0.45, 0, 0];
    const bonds: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4]];
    const d = shortestHeavyBond(positions, bonds, ["C", "C", "C", "C", "C"]);
    expect(d).toBeGreaterThan(0.01);
  });

  it("ignores hydrogen when measuring", () => {
    const positions = [0, 0, 0, 0.01, 0, 0, 0.15, 0, 0];
    const bonds: [number, number][] = [[0, 1], [0, 2]];
    expect(shortestHeavyBond(positions, bonds, ["C", "H", "C"])).toBeCloseTo(0.15, 6);
  });

  it("names one colour per element", () => {
    expect(ELEMENT_HEX.C).toBe("#3d4552");
    expect(ELEMENT_HEX.O).toBe("#ef4444");
  });
});
