export interface WaterMolecule {
  oxygen: number[];
  hydrogens: number[][];
}

export interface PolarContact {
  acceptor: number[];
  hydrogen: number[];
}

export interface AllAtomTrail {
  points: number[][];
}

export interface AllAtomRingPlane {
  center: number[];
  normal: number[];
  radius: number;
}

export interface AllAtomCuePoint {
  point: number[];
  family: "bonded" | "nonbonded";
  weight?: number;
}

export interface AllAtomBoxData {
  lengths: number[];
  referenceLengths?: number[];
}

export interface AllAtomCameraMetrics {
  target: number[];
  forward: number[];
  radius: number;
  padding: number;
  nearFactor: number;
  farFactor: number;
}

export interface AllAtomSceneSnapshot {
  id: string;
  phase?: string;
  frame?: number;
  timePs?: number;
  atoms: number[][];
  elements: string[];
  charges: number[];
  bonds: number[][];
  residueNames: string[];
  residueIds: number[];
  focusAtomIndices?: number[];
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
  box?: AllAtomBoxData;
  trails?: AllAtomTrail[];
  stackPlanes?: AllAtomRingPlane[];
  stackPairs?: Array<{ start: number[]; end: number[] }>;
  stackResidueIds?: number[];
  polarContacts?: PolarContact[];
  waterMolecules?: WaterMolecule[];
  cuePoints?: AllAtomCuePoint[];
  camera?: AllAtomCameraMetrics;
  sourceIndices?: number[];
}

export interface AllAtomSystemData {
  caffeineCount?: number;
  waterCount?: number;
  soluteAtomCount?: number;
  atomCount: number;
  atoms: number[][];
  elements?: string[];
  types: number[];
  bonds: number[][];
  charges: number[];
  focusAtomIndices?: number[];
  residueNames?: string[];
  residueIds?: number[];
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
  snapshots: AllAtomSceneSnapshot[];
}
export type AllAtomBoxMode = "none" | "current" | "current+reference";

export interface AllAtomTrajectoryFrame {
  frame: number;
  phase: string;
  timePs: number;
  atoms: number[][];
  box?: AllAtomBoxData;
  anchors?: Record<string, number[]>;
}

export interface AllAtomTrajectoryPage {
  id: string;
  pageKind: "global" | "local";
  boxMode: AllAtomBoxMode;
  primaryMotionIndices: number[];
  frames: AllAtomTrajectoryFrame[];
}

export interface AllAtomTrajectoryData {
  pages: AllAtomTrajectoryPage[];
}
