/** Asset manifest written by the DNA pipeline (scripts/dna/export_assets.py). */
export interface DNAManifest {
  version: number;
  generated: string;
  pipeline: string;
  system: {
    name: string;
    duplex_count: number;
    bp_per_duplex: number;
    aa_source: string;
    box_dimensions?: [number, number, number];
  };
  assets: Record<string, DNAAssetEntry>;
  topology: {
    aa: string;
    cg: string;
    mapping: string;
    rdf_meta: string;
  };
  camera: DNACameraData;
  subsets: Record<string, { indices: number[] | "all" }>;
  anchors: Record<string, number[]>;
}

export interface DNAAssetEntry {
  path: string;
  dtype: string;
  shape: number[];
  byteLength: number;
  unit?: string;
  layout?: string;
}

/** Camera data section — same shape as polymer.json for ThreeStageCamera compatibility. */
export interface DNACameraData {
  beadPositions: number[][];
  atoms: number[][];
  anchors: Record<string, number[]>;
  referenceBeadIndex: number;
}

export interface AATopology {
  elements: string[];
  bonds: [number, number][];
  atomNames: string[];
  residueNames: string[];
  residueIds: number[];
  chainIds: string[];
}

export interface CGTopology {
  nBeads: number;
  beadBonds: [number, number][];
  strandIds: number[];
  duplexIds: number[];
  basePairIds: number[];
  pairedBeadIndices: number[];
  duplexCount: number;
  bpPerDuplex: number;
}

export interface CGMapping {
  monomerMap: number[][];
  cgMapping: Array<{
    bead_id: number;
    chain: string;
    resname: string;
    resid: number;
    atom_indices: number[];
  }>;
}

export interface RDFMeta {
  shellRadii: number[];
  nBins: number;
  maxRadius: number;
  referenceIndex: number;
}
