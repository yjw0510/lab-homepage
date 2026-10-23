import { describe, it, expect } from "vitest";
import density from "../../../../public/data/multiscale/dft/density-evolution.json";
import scf from "../../../../public/data/multiscale/dft/scf.json";

// The slider prints `iteration` and the scene caption prints `label`. They are written from the
// same list in scripts/generate-dft-data.py and once disagreed by one, so every number the page
// showed sat one below the calculation it came from.
describe("SCF snapshot numbering", () => {
  it("labels each snapshot with the iteration it reports", () => {
    for (const snapshot of density.snapshots) {
      expect(snapshot.label).toBe(`Iter ${snapshot.iteration}`);
    }
  });

  it("covers ORCA's iterations from the first, with none dropped", () => {
    const iterations = density.snapshots.map((s) => s.iteration);
    expect(iterations).toEqual(iterations.map((_, i) => i + 1));
    expect(iterations.length).toBe(scf.energies.length);
  });

  it("agrees with scf.json, which drives the energy trace beside the slider", () => {
    expect(scf.snapshots.map((s) => s.iteration)).toEqual(density.snapshots.map((s) => s.iteration));
    expect(scf.trajectory.map((t) => t.iteration)).toEqual(density.snapshots.map((s) => s.iteration));
  });

  it("stops at ORCA's energy tolerance, which only the final update meets", () => {
    expect(scf.threshold).toBe(1e-8);
    const firstBelow = scf.trajectory.findIndex(
      (t) => typeof t.deltaE === "number" && t.deltaE < scf.threshold,
    );
    expect(firstBelow).toBe(scf.trajectory.length - 1);
  });

  it("has no energy change for iteration 1, which has no prior energy", () => {
    expect(scf.trajectory[0].deltaE).toBeNull();
    expect(scf.trajectory.slice(1).every((t) => typeof t.deltaE === "number")).toBe(true);
  });
});
