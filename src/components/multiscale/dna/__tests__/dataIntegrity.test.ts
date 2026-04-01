import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../../../../../public/data/dna");

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(resolve(DATA_DIR, relativePath), "utf-8"));
}

function fileSize(relativePath: string): number {
  return readFileSync(resolve(DATA_DIR, relativePath)).byteLength;
}

describe("manifest.json", () => {
  const manifest = readJson("manifest.json");

  it("is valid JSON with version field", () => {
    expect(manifest.version).toBe(1);
  });

  it("declares AA positions with correct byte length", () => {
    const asset = manifest.assets.aa_positions;
    expect(asset.byteLength).toBe(asset.shape[0] * asset.shape[1] * 4);
  });

  it("declares CG positions with correct byte length", () => {
    const asset = manifest.assets.cg_positions;
    expect(asset.byteLength).toBe(asset.shape[0] * asset.shape[1] * 4);
  });

  it("declares CG trajectory with correct byte length", () => {
    const asset = manifest.assets.cg_trajectory;
    expect(asset.byteLength).toBe(asset.shape[0] * asset.shape[1] * asset.shape[2] * 4);
  });

  it("declares RDF with correct byte length", () => {
    const asset = manifest.assets.rdf;
    expect(asset.byteLength).toBe(asset.shape[0] * asset.shape[1] * 4);
  });

  it("has camera data with bead positions matching CG count", () => {
    const nBeads = manifest.assets.cg_positions.shape[0];
    expect(manifest.camera.beadPositions).toHaveLength(nBeads);
  });

  it("has required subsets", () => {
    const keys = Object.keys(manifest.subsets);
    expect(keys).toContain("all_beads");
    expect(keys).toContain("bundle_overview");
  });

  it("has required anchors", () => {
    const keys = Object.keys(manifest.anchors);
    expect(keys).toContain("bundle_center");
  });
});

describe("binary file sizes match manifest", () => {
  const manifest = readJson("manifest.json");

  for (const [name, asset] of Object.entries(manifest.assets) as [string, any][]) {
    it(`${asset.path} matches declared byte length`, () => {
      expect(fileSize(asset.path)).toBe(asset.byteLength);
    });
  }
});

describe("AA topology", () => {
  const manifest = readJson("manifest.json");
  const topology = readJson("aa/topology.json");
  const nAtoms = manifest.assets.aa_positions.shape[0];

  it("has correct number of elements", () => {
    expect(topology.elements).toHaveLength(nAtoms);
  });

  it("has valid element set", () => {
    const unique = new Set(topology.elements);
    for (const el of unique) {
      expect(["C", "N", "O", "P", "H", "S"]).toContain(el);
    }
  });

  it("has bonds with valid indices", () => {
    expect(topology.bonds.length).toBeGreaterThan(0);
    for (const [i, j] of topology.bonds) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(nAtoms);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(nAtoms);
    }
  });

  it("has matching array lengths", () => {
    expect(topology.atomNames).toHaveLength(nAtoms);
    expect(topology.residueNames).toHaveLength(nAtoms);
    expect(topology.residueIds).toHaveLength(nAtoms);
    expect(topology.chainIds).toHaveLength(nAtoms);
  });
});

describe("CG topology", () => {
  const manifest = readJson("manifest.json");
  const topology = readJson("cg/topology.json");
  const nBeads = manifest.assets.cg_positions.shape[0];

  it("has correct bead count", () => {
    expect(topology.nBeads).toBe(nBeads);
  });

  it("has valid bond indices", () => {
    for (const [i, j] of topology.beadBonds) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(nBeads);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(nBeads);
    }
  });

  it("has matching metadata array lengths", () => {
    expect(topology.strandIds).toHaveLength(nBeads);
    expect(topology.duplexIds).toHaveLength(nBeads);
  });
});

describe("RDF metadata", () => {
  const meta = readJson("rdf/meta.json");

  it("has bin count", () => {
    expect(meta.nBins).toBeGreaterThan(0);
  });

  it("has valid reference index", () => {
    expect(meta.referenceIndex).toBeGreaterThanOrEqual(0);
  });
});
