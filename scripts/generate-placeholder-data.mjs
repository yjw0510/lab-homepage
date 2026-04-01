#!/usr/bin/env node
/**
 * Generates placeholder scientific data for the Research tab.
 * All data matches the shapes expected by the production pipeline.
 * Run: node scripts/generate-placeholder-data.mjs
 */

import { writeFileSync } from "fs";
import { join } from "path";

const BASE = "public/data/multiscale";

// ─── Utilities ───

function rand(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

function randVec3(radius = 5) {
  return [rand(-radius, radius), rand(-radius, radius), rand(-radius, radius)];
}

// ─── MESO ───

function generateMesoFrames() {
  // ~200 atoms, ~50 beads, mapping indices
  const atomCount = 200;
  const beadCount = 50;
  const atomsPerBead = Math.floor(atomCount / beadCount);

  const atoms = Array.from({ length: atomCount }, () => randVec3(8));
  const beads = Array.from({ length: beadCount }, (_, i) => {
    // Bead center = average of its atoms
    const start = i * atomsPerBead;
    const group = atoms.slice(start, start + atomsPerBead);
    return group.reduce(
      (acc, a) => [acc[0] + a[0] / group.length, acc[1] + a[1] / group.length, acc[2] + a[2] / group.length],
      [0, 0, 0]
    );
  });
  const mapping = Array.from({ length: beadCount }, (_, i) =>
    Array.from({ length: atomsPerBead }, (_, j) => i * atomsPerBead + j)
  );
  // Atom types: 0=C, 1=N, 2=O, 3=H
  const atomTypes = Array.from({ length: atomCount }, () => Math.floor(rand(0, 4)));
  // Bonds: connect neighboring atoms
  const bonds = [];
  for (let i = 0; i < atomCount - 1; i++) {
    if (rand() < 0.3) bonds.push([i, i + 1]);
  }

  return { atomCount, beadCount, atoms, beads, mapping, atomTypes, bonds };
}

function generateDensityProfile() {
  // ρ(z) with CPB/SDPB kink
  const points = [];
  for (let z = 0; z <= 10; z += 0.1) {
    let rho;
    if (z < 3) rho = 0.8 - 0.05 * z + rand(-0.02, 0.02); // CPB: dense
    else if (z < 4) rho = 0.65 - 0.2 * (z - 3) + rand(-0.02, 0.02); // transition
    else rho = 0.45 * Math.exp(-0.3 * (z - 4)) + rand(-0.01, 0.01); // SDPB: decay
    points.push({ z: +z.toFixed(2), rho: +Math.max(0, rho).toFixed(4) });
  }
  return points;
}

// ─── ALL-ATOM ───

function generateAllAtomSystem() {
  // Water molecules in a box + a few ions
  const waterCount = 80;
  const atoms = [];
  const types = []; // 0=O, 1=H, 2=Na, 3=Cl
  const bonds = [];
  const charges = [];

  for (let i = 0; i < waterCount; i++) {
    const center = randVec3(6);
    const oIdx = atoms.length;
    atoms.push(center);
    types.push(0);
    charges.push(-0.8476);
    // H1
    atoms.push([center[0] + rand(0.7, 1.1), center[1] + rand(-0.3, 0.3), center[2] + rand(-0.3, 0.3)]);
    types.push(1);
    charges.push(0.4238);
    bonds.push([oIdx, oIdx + 1]);
    // H2
    atoms.push([center[0] + rand(-0.3, 0.3), center[1] + rand(0.7, 1.1), center[2] + rand(-0.3, 0.3)]);
    types.push(1);
    charges.push(0.4238);
    bonds.push([oIdx, oIdx + 2]);
  }
  // 2 Na+, 2 Cl-
  for (let i = 0; i < 2; i++) {
    atoms.push(randVec3(4));
    types.push(2);
    charges.push(1.0);
    atoms.push(randVec3(4));
    types.push(3);
    charges.push(-1.0);
  }

  return { atomCount: atoms.length, atoms, types, bonds, charges };
}

function generateRDF() {
  // g(r) for O-O in water
  const points = [];
  for (let r = 0.1; r <= 8; r += 0.05) {
    let g = 1.0;
    // First shell peak ~2.8 Å
    g += 2.5 * Math.exp(-((r - 2.8) ** 2) / 0.1);
    // Second shell peak ~4.5 Å
    g += 0.8 * Math.exp(-((r - 4.5) ** 2) / 0.3);
    // Anti-correlation dip
    g -= 0.3 * Math.exp(-((r - 3.5) ** 2) / 0.15);
    g += rand(-0.05, 0.05);
    points.push({ r: +r.toFixed(2), g: +Math.max(0, g).toFixed(4) });
  }
  return points;
}

// ─── MLFF ───

function generateMLFFPredictions() {
  const atomCount = 244; // same as allatom
  const energies = Array.from({ length: atomCount }, () => rand(-0.5, 0.0));
  const forces = Array.from({ length: atomCount }, () => randVec3(2));
  const classicalForces = Array.from({ length: atomCount }, () => randVec3(2));
  return { atomCount, energies, forces, classicalForces };
}

function generateParityData() {
  const n = 100;
  const dftE = Array.from({ length: n }, () => rand(-500, -100));
  const mlffE = dftE.map((e) => e + rand(-5, 5));
  const dftF = Array.from({ length: n * 3 }, () => rand(-3, 3));
  const mlffF = dftF.map((f) => f + rand(-0.3, 0.3));
  return { dftE, mlffE, dftF, mlffF };
}

// ─── DFT ───

function generateDensityBin() {
  // 64^3 Float32 grid with Gaussian blobs at atom positions
  const size = 64;
  const grid = new Float32Array(size * size * size);
  // Place 4 atom centers
  const centers = [
    [0.3, 0.3, 0.3],
    [0.7, 0.7, 0.3],
    [0.3, 0.7, 0.7],
    [0.7, 0.3, 0.7],
  ];
  const sigma = 0.08;

  for (let iz = 0; iz < size; iz++) {
    for (let iy = 0; iy < size; iy++) {
      for (let ix = 0; ix < size; ix++) {
        const x = ix / size;
        const y = iy / size;
        const z = iz / size;
        let val = 0;
        for (const c of centers) {
          const dx = x - c[0];
          const dy = y - c[1];
          const dz = z - c[2];
          val += Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sigma * sigma));
        }
        grid[iz * size * size + iy * size + ix] = val;
      }
    }
  }
  return Buffer.from(grid.buffer);
}

function generateOrbitals() {
  // HOMO/LUMO as 32^3 grids
  const size = 32;
  function makeOrbital(phase) {
    const data = [];
    for (let iz = 0; iz < size; iz++) {
      for (let iy = 0; iy < size; iy++) {
        for (let ix = 0; ix < size; ix++) {
          const x = (ix / size - 0.5) * 2;
          const y = (iy / size - 0.5) * 2;
          const z = (iz / size - 0.5) * 2;
          const r2 = x * x + y * y + z * z;
          // p-orbital like: x * exp(-r^2)
          const val = phase * x * Math.exp(-r2 * 2);
          data.push(+val.toFixed(4));
        }
      }
    }
    return data;
  }
  return {
    size,
    homo: makeOrbital(1),
    lumo: makeOrbital(-1),
  };
}

function generateBands() {
  // 4 bands along 3 k-segments: Γ→X→M→Γ
  const segments = [
    { from: "Γ", to: "X", points: 30 },
    { from: "X", to: "M", points: 20 },
    { from: "M", to: "Γ", points: 30 },
  ];
  const kpoints = [];
  let k = 0;
  for (const seg of segments) {
    for (let i = 0; i < seg.points; i++) {
      kpoints.push(+(k + i / seg.points).toFixed(4));
    }
    k += 1;
  }
  kpoints.push(3);

  const bandCount = 6;
  const bands = Array.from({ length: bandCount }, (_, b) => {
    const offset = -8 + b * 3;
    return kpoints.map((kp) => {
      const x = (kp / 3) * Math.PI;
      return +(offset + 1.5 * Math.cos(x * (1 + b * 0.3)) + rand(-0.1, 0.1)).toFixed(3);
    });
  });

  const labels = [
    { k: 0, label: "Γ" },
    { k: 1, label: "X" },
    { k: 2, label: "M" },
    { k: 3, label: "Γ" },
  ];

  return { kpoints, bands, labels };
}

function generateDOS() {
  const energies = [];
  const total = [];
  const projected = { s: [], p: [], d: [] };

  for (let e = -15; e <= 10; e += 0.1) {
    energies.push(+e.toFixed(1));
    // Peaked near valence and conduction bands
    let dos = 0.2;
    dos += 3.0 * Math.exp(-((e + 5) ** 2) / 2);
    dos += 2.0 * Math.exp(-((e + 2) ** 2) / 1);
    dos += 1.5 * Math.exp(-((e - 3) ** 2) / 1.5);
    dos += rand(0, 0.1);
    total.push(+dos.toFixed(3));
    projected.s.push(+(dos * 0.3 + rand(0, 0.05)).toFixed(3));
    projected.p.push(+(dos * 0.5 + rand(0, 0.05)).toFixed(3));
    projected.d.push(+(dos * 0.2 + rand(0, 0.05)).toFixed(3));
  }

  return { energies, total, projected };
}

function generateSCF() {
  const iterations = [];
  let deltaE = 1.0;
  for (let i = 1; i <= 15; i++) {
    deltaE *= rand(0.2, 0.5);
    iterations.push({ iteration: i, deltaE: +deltaE.toExponential(3) });
  }
  return iterations;
}

// ─── Write all files ───

console.log("Generating placeholder multiscale data...");

writeFileSync(join(BASE, "meso/frames.json"), JSON.stringify(generateMesoFrames()));
writeFileSync(join(BASE, "meso/density-profile.json"), JSON.stringify(generateDensityProfile()));
writeFileSync(join(BASE, "allatom/system.json"), JSON.stringify(generateAllAtomSystem()));
writeFileSync(join(BASE, "allatom/rdf.json"), JSON.stringify(generateRDF()));
writeFileSync(join(BASE, "mlff/predictions.json"), JSON.stringify(generateMLFFPredictions()));
writeFileSync(join(BASE, "mlff/parity.json"), JSON.stringify(generateParityData()));
writeFileSync(join(BASE, "dft/density.bin"), generateDensityBin());
writeFileSync(join(BASE, "dft/orbitals.json"), JSON.stringify(generateOrbitals()));
writeFileSync(join(BASE, "dft/bands.json"), JSON.stringify(generateBands()));
writeFileSync(join(BASE, "dft/dos.json"), JSON.stringify(generateDOS()));
writeFileSync(join(BASE, "dft/scf.json"), JSON.stringify(generateSCF()));

console.log("Done. Files written to", BASE);
