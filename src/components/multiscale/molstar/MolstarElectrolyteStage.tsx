"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra.js";
import { withBasePath } from "@/lib/basePath";
import {
  type CameraSnapshotLike,
  type ColorValue,
  type PluginLike,
  type ResearchCameraActions,
  type ResearchLayer,
  type ResearchPrimitive,
  CARBON,
  CYAN,
  HYDROGEN,
  OXYGEN,
  PURPLE,
  SLATE,
  applyResearchCanvasBackground,
  commitResearchLayers,
  mountResearchPlugin,
} from "./shared";
import { Color } from "molstar/lib/mol-util/color/color.js";

/**
 * 1 M LiPF6 in EC:EMC, from the ByteFF-Pol run: 10,094 atoms, 853 molecules, NPT at 298 K.
 *
 * Two readings of the same box. Close, the camera sits on one Li+ and the molecules within a
 * cutoff of it. Wide, it pulls back to the whole periodic cell with every atom in it, because
 * the size of the box is the argument this level is making.
 */

/** Seconds the loop takes to run the trajectory once. It then runs it back, seamlessly. */
const LOOP_SECONDS = 20;

const SHELL_CUTOFF_NM = 0.28;

const ELEMENT_COLOR: Record<string, ColorValue> = {
  C: CARBON,
  H: HYDROGEN,
  O: OXYGEN,
  F: Color.fromHexStyle("#7dd3fc"),
  P: Color.fromHexStyle("#f97316"),
  Li: PURPLE,
};

const RADIUS: Record<string, number> = { C: 0.17, H: 0.10, O: 0.16, F: 0.15, P: 0.20, Li: 0.13 };

/**
 * How big each thing is drawn. Every number here is derived from a distance in the system
 * rather than picked, because picking is what produced spheres that overlapped into a solid
 * lump and were still being called ball-and-stick.
 *
 * BULK is the medium, not a diagram: its spheres do overlap, which is what a liquid looks like.
 * The solvation complex is a diagram and must not, so BALL_CLEARANCE caps a ball's diameter at
 * a fraction of the shortest bond it has to sit on. Measured on this topology the shortest
 * heavy-heavy bond is 1.134 A, so at the old scale of 0.55 a carbon was 1.87 A across and its
 * neighbours were buried inside it.
 */
const BULK_SCALE = 0.42;
const BALL_CLEARANCE = 0.8;
const STICK_TO_BALL = 0.35;
const MARK_TO_BALL = 1.3;
// The lithiums are redrawn over the bulk at this radius, three times a solvent ball, so the
// camera solve has to know about it: solved against the bulk radius alone, an ion sitting on
// the cell boundary projected 0.16 nm past what the framing reserved and clipped.
const ION_RADIUS_NM = 0.21;

/** How far past a band edge the smoothed count must go before an ion changes colour. */
const BAND_HYSTERESIS = 0.25;

/**
 * Under-, at-, and over-coordinated. Three steps of one hue was tried first and failed: the
 * whole point of this page is that the counts differ, and three lightnesses of gold read as one
 * colour. A diverging blue-gold-red ramp failed for a different reason - the whole cell is
 * drawn behind these ions, so red collided with 2,151 oxygens and light blue with the anion
 * fluorines. Teal and fuchsia are the two strong hues no element in this box uses.
 */
const COUNT_COLOR = [
  Color.fromHexStyle("#2dd4bf"),
  Color.fromHexStyle("#facc15"),
  Color.fromHexStyle("#f472d0"),
] as const;

/**
 * The direction the camera looks from, and the screen basis that follows from it. Face-on, a
 * cube projects to a square and reads as a flat poster of atoms; off-axis it reads as a volume,
 * which is what this level is claiming.
 */
const EYE = Vec3.normalize(Vec3(), Vec3.create(Math.sin(0.33) * Math.cos(0.20), Math.sin(0.20),
                                               Math.cos(0.33) * Math.cos(0.20)));
const WORLD_UP = Vec3.create(0, 1, 0);
const SCREEN_X = Vec3.normalize(Vec3(), Vec3.cross(Vec3(), WORLD_UP, EYE));
const SCREEN_Y = Vec3.cross(Vec3(), EYE, SCREEN_X);

/**
 * Fraction of the viewport each scene is framed to occupy, along whichever axis binds first.
 * These two numbers are the whole camera policy, and they are only meaningful because the
 * extents they multiply are exact rather than approximated by a bounding sphere.
 */
const CELL_FILL = 0.98;
const SUBJECT_FILL = 0.62;

/**
 * The close-up's cutoff, as a multiple of the distance from the frame centre to its corner.
 * Molecules within it of the ion are drawn, whole. Above 1 so the liquid runs off the frame
 * rather than ending inside it, which is the difference between an ion in a liquid and an ion
 * in vacuum.
 */
const CONTEXT_CUTOFF = 1.25;

interface Coordination {
  criterionNm: number;
  perFrame: number[][];
  mean: number;
  blockError: number;
  histogram: number[];
  ionFrames: number;
}

interface ElectrolyteTopology {
  atomCount: number;
  frameCount: number;
  framePs: number;
  quantization: { offsetNm: number; scaleNm: number };
  boxNm: [number, number, number];
  elements: string[];
  residueNames: string[];
  residueIds: number[];
  bonds: [number, number][];
  focusLithium: number;
  focusShellAtoms: number[];
  lithium: number[];
  anionPhosphorus: number[];
  carbonylOxygens: number[];
  coordination: Coordination;
}

/**
 * Each atom in the camera's own frame: screen x, screen y, depth toward the camera, radius.
 * Radius is carried along because a sphere's silhouette, not its centre, is what has to fit.
 */
function cameraFrame(
  positions: ArrayLike<number>,
  center: readonly number[],
  radiusOf: (index: number) => number,
  indices?: readonly number[],
) {
  const count = indices ? indices.length : positions.length / 3;
  const packed = new Float32Array(count * 4);
  for (let slot = 0; slot < count; slot++) {
    const i = indices ? indices[slot] : slot;
    const dx = positions[i * 3] - center[0];
    const dy = positions[i * 3 + 1] - center[1];
    const dz = positions[i * 3 + 2] - center[2];
    packed[slot * 4] = dx * SCREEN_X[0] + dy * SCREEN_X[1] + dz * SCREEN_X[2];
    packed[slot * 4 + 1] = dx * SCREEN_Y[0] + dy * SCREEN_Y[1] + dz * SCREEN_Y[2];
    packed[slot * 4 + 2] = dx * EYE[0] + dy * EYE[1] + dz * EYE[2];
    packed[slot * 4 + 3] = radiusOf(i);
  }
  return packed;
}

/**
 * Where to put the camera so the given atoms fill exactly `fill` of the viewport and sit in the
 * middle of it.
 *
 * Solved under perspective, and for the aim as well as the distance. Both matter and both were
 * got wrong in turn. A parallel-projection distance always clips, because an atom on the near
 * side is closer to the camera than the centre the extent was measured about and projects
 * further out than its offset says. Aiming at the centroid then leaves unequal margins for the
 * same reason: measured on the cell, 200 px of black on the left against 381 on the right.
 * Screen offset over depth falls monotonically with distance, so the pair settles by bisecting
 * and re-aiming, a few passes each.
 */
function solveCamera(packed: Float32Array, fill: number, halfFov: number, aspect: number) {
  const tan = Math.tan(halfFov);
  let nearest = -Infinity;
  let reach = 0;
  for (let i = 0; i < packed.length; i += 4) {
    nearest = Math.max(nearest, packed[i + 2] + packed[i + 3]);
    reach = Math.max(reach, Math.hypot(packed[i], packed[i + 1]) + packed[i + 3]);
  }

  const extremes = (distance: number, offsetX: number, offsetY: number) => {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < packed.length; i += 4) {
      const halfHeight = (distance - packed[i + 2]) * tan;
      const halfWidth = halfHeight * aspect;
      const x = (packed[i] - offsetX) / halfWidth;
      const y = (packed[i + 1] - offsetY) / halfHeight;
      const rx = packed[i + 3] / halfWidth;
      const ry = packed[i + 3] / halfHeight;
      if (x + rx > xMax) xMax = x + rx;
      if (x - rx < xMin) xMin = x - rx;
      if (y + ry > yMax) yMax = y + ry;
      if (y - ry < yMin) yMin = y - ry;
    }
    return { xMin, xMax, yMin, yMax };
  };

  let offsetX = 0;
  let offsetY = 0;
  let distance = nearest + reach * 4 + 10;
  for (let pass = 0; pass < 6; pass++) {
    let low = nearest + 0.05;
    let high = low + 4 * reach + 10;
    for (let step = 0; step < 40; step++) {
      const mid = (low + high) / 2;
      const e = extremes(mid, offsetX, offsetY);
      if (Math.max(e.xMax, -e.xMin, e.yMax, -e.yMin) > fill) low = mid; else high = mid;
    }
    distance = high;
    const e = extremes(distance, offsetX, offsetY);
    offsetX += ((e.xMax + e.xMin) / 2) * distance * tan * aspect;
    offsetY += ((e.yMax + e.yMin) / 2) * distance * tan;
  }
  return { distance, reach, offsetX, offsetY, halfHeightNm: distance * tan };
}

/**
 * Everything about the scene that does not change from frame to frame: which atom belongs to
 * which molecule, how big each thing is drawn, the cell wireframe, the camera's packed input.
 */
function prepare(topology: ElectrolyteTopology, frames: Float32Array[]) {
  const first = frames[0];
  const at = (index: number) => [first[index * 3], first[index * 3 + 1], first[index * 3 + 2]];
  const focus = at(topology.focusLithium);

  // Molecules, and which one each atom belongs to. Selection downstream is molecule-granular:
  // an atom-by-atom cutoff cuts carbonates in half and leaves fragments floating in the frame.
  const residueAtoms = new Map<number, number[]>();
  topology.residueIds.forEach((residue, atom) => {
    const list = residueAtoms.get(residue);
    if (list) list.push(atom); else residueAtoms.set(residue, [atom]);
  });
  const molecules = [...residueAtoms.entries()]
    .map(([residue, atoms]) => ({ residue, atoms }))
    .sort((a, b) => a.residue - b.residue);
  const focusResidue = topology.residueIds[topology.focusLithium];
  const moleculeBonds = new Map<number, [number, number][]>();
  for (const [a, b] of topology.bonds) {
    const residue = topology.residueIds[a];
    const list = moleculeBonds.get(residue);
    if (list) list.push([a, b]); else moleculeBonds.set(residue, [[a, b]]);
  }

  // Which carbonyl oxygens the focus ion holds, under minimum image, and the molecules they
  // belong to. Those molecules are the close-up's subject.
  const coordinating = new Set<number>();
  for (const oxygen of topology.carbonylOxygens) {
    const o = at(oxygen);
    const d = Math.hypot(...[0, 1, 2].map((axis) => {
      const raw = o[axis] - focus[axis];
      return raw - topology.boxNm[axis] * Math.round(raw / topology.boxNm[axis]);
    }));
    if (d <= SHELL_CUTOFF_NM) coordinating.add(oxygen);
  }
  const shellResidues = new Set([...coordinating].map((o) => topology.residueIds[o]));
  const shell = new Set<number>();
  for (const residue of shellResidues) for (const atom of residueAtoms.get(residue)!) shell.add(atom);
  const subjectResidues = new Set([...shellResidues, focusResidue]);

  // Ball radius from the shortest bond any ball has to sit on, so no two touch.
  let shortestBond = Infinity;
  for (const residue of shellResidues) {
    for (const [a, b] of moleculeBonds.get(residue) ?? []) {
      if (topology.elements[a] === "H" || topology.elements[b] === "H") continue;
      shortestBond = Math.min(shortestBond, Math.hypot(
        first[a * 3] - first[b * 3], first[a * 3 + 1] - first[b * 3 + 1],
        first[a * 3 + 2] - first[b * 3 + 2]));
    }
  }
  const ballScale = (BALL_CLEARANCE * shortestBond) /
    (2 * Math.max(...[...shell].map((i) => RADIUS[topology.elements[i]] ?? 0.15)));
  const ball = (index: number) => (RADIUS[topology.elements[index]] ?? 0.15) * ballScale;
  const markRadius = (RADIUS.O ?? 0.16) * ballScale * MARK_TO_BALL;
  const stickRadius = (RADIUS.C ?? 0.17) * ballScale * STICK_TO_BALL;
  // The focus ion at its own van der Waals radius: three times a ball, so it reads as the
  // subject, and still clearing the 1.98 A Li-O contact once a marked oxygen is added to it.
  const focusRadius = RADIUS.Li ?? 0.13;

  // Atoms grouped by element, so every impostor layer carries one colour and one radius and
  // Mol* never runs a per-atom theme callback.
  const bulkGroups = [...new Set(topology.elements)].filter((e) => e !== "Li").map((element) => ({
    element,
    radius: (RADIUS[element] ?? 0.15) * BULK_SCALE,
    color: ELEMENT_COLOR[element] ?? SLATE,
    indices: Int32Array.from(topology.elements.flatMap((e, i) => (e === element ? [i] : []))),
  }));
  const bulkRadius = (index: number) => (RADIUS[topology.elements[index]] ?? 0.15) * BULK_SCALE;

  const bulkStickRadius = (RADIUS.C ?? 0.17) * BULK_SCALE * STICK_TO_BALL;

  const cellBonds = Int32Array.from(topology.bonds.flat());

  // Centre the cell on the atoms. The coordinates are wrapped to the image nearest the focus
  // ion, so the cloud's own centre is the cell centre.
  const cellCenter = [0, 1, 2].map((axis) => {
    let sum = 0;
    for (let i = 0; i < topology.atomCount; i++) sum += first[i * 3 + axis];
    return sum / topology.atomCount;
  }) as [number, number, number];
  // Packed as a bound on the whole loop rather than as one configuration out of it.
  //
  // A camera solved on a single frame frames the cell at t=0 and lets it run off the canvas by
  // the middle of the loop: measured on the phone viewport, the silhouette's own edge moves 45
  // px over the 30 ps the asset covers, against the 17 px of margin the fill fraction leaves.
  // Sampling frames only narrows the odds of missing the worst one. Instead each atom
  // contributes two entries carrying the extremes it reaches anywhere in the loop, one for each
  // side, both at the nearest depth it ever reaches. That encloses the true silhouette from
  // outside at every phase, keeps the signs the aim solve needs, and costs two frames of memory
  // rather than two hundred.
  const lithium = new Set(topology.lithium);
  const cellRadius = (i: number) => (lithium.has(i) ? ION_RADIUS_NM : bulkRadius(i));
  const cellPacked = new Float32Array(topology.atomCount * 8);
  for (let i = 0; i < topology.atomCount; i++) {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, zMax = -Infinity;
    for (const frame of frames) {
      const dx = frame[i * 3] - cellCenter[0];
      const dy = frame[i * 3 + 1] - cellCenter[1];
      const dz = frame[i * 3 + 2] - cellCenter[2];
      const x = dx * SCREEN_X[0] + dy * SCREEN_X[1] + dz * SCREEN_X[2];
      const y = dx * SCREEN_Y[0] + dy * SCREEN_Y[1] + dz * SCREEN_Y[2];
      const z = dx * EYE[0] + dy * EYE[1] + dz * EYE[2];
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
      if (z > zMax) zMax = z;
    }
    const radius = cellRadius(i);
    cellPacked.set([xMax, yMax, zMax, radius, xMin, yMin, zMax, radius], i * 8);
  }

  const half = topology.boxNm.map((v) => v / 2);
  const bit = (v: number, n: number) => (v >> n) & 1;
  const corner = (v: number): [number, number, number] => [
    cellCenter[0] + (bit(v, 0) ? half[0] : -half[0]),
    cellCenter[1] + (bit(v, 1) ? half[1] : -half[1]),
    cellCenter[2] + (bit(v, 2) ? half[2] : -half[2]),
  ];
  const cellEdges: ResearchPrimitive[] = [];
  for (const [a, b] of [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]]) {
    cellEdges.push({ kind: "cylinder", start: corner(a), end: corner(b),
                     radiusTop: 0.014, radiusBottom: 0.014, radialSegments: 6, color: SLATE });
  }

  // The close-up's camera, solved once against every frame rather than per frame. Recomputed
  // each frame it tracked the subject's own thermal motion, which moved the whole picture 40 px
  // peak to peak on an 836 px canvas: the scene appeared to shake while the atoms did not.
  const subjectAtoms = [topology.focusLithium, ...shell];
  const subjectCenter = [0, 1, 2].map((axis) => {
    let sum = 0;
    for (const frame of frames) for (const i of subjectAtoms) sum += frame[i * 3 + axis];
    return sum / (frames.length * subjectAtoms.length);
  }) as [number, number, number];
  const drawnSubjectRadius = (index: number) =>
    index === topology.focusLithium ? focusRadius
      : coordinating.has(index) ? markRadius : ball(index);
  const subjectPacked = new Float32Array(frames.length * subjectAtoms.length * 4);
  frames.forEach((frame, f) => {
    subjectPacked.set(cameraFrame(frame, subjectCenter, drawnSubjectRadius, subjectAtoms),
                      f * subjectAtoms.length * 4);
  });

  // Which colour band each ion is in, frame by frame.
  //
  // Two things are done to the raw count before it picks a colour. It is averaged over +-0.5 ps,
  // because a hard 2.8 A cutoff makes an oxygen sitting on the boundary flip the ion between two
  // colours at frame rate. And the band, once entered, is held until the average clears the
  // threshold by BAND_HYSTERESIS, because averaging alone still left an ion crossing 4.5 and
  // returning within a few frames: measured on this trajectory, 7 of the 28 excursions into the
  // over-coordinated band lasted 300 ms or less, which on screen is an ion flashing pink and
  // going back. At 0.25 every one of those is gone and the population is unmoved, 18.9/79.1/2.0
  // becoming 18.8/79.3/1.9. Twice that erases the band altogether, so the margin is not free.
  const halfWidth = Math.max(1, Math.round(0.5 / topology.framePs));
  const raw = topology.coordination.perFrame;
  const held = new Array<number>(raw[0]?.length ?? 0).fill(1);
  const smoothedBucket = raw.map((_, f) => raw[f].map((__, ion) => {
    let sum = 0;
    for (let k = -halfWidth; k <= halfWidth; k++) {
      sum += raw[Math.min(raw.length - 1, Math.max(0, f + k))][ion];
    }
    const mean = sum / (2 * halfWidth + 1);
    const band = held[ion];
    const low = 3.5 + (band === 0 ? BAND_HYSTERESIS : band === 1 ? -BAND_HYSTERESIS : 0);
    const high = 4.5 + (band === 2 ? -BAND_HYSTERESIS : band === 1 ? BAND_HYSTERESIS : 0);
    held[ion] = mean < low ? 0 : mean < high ? 1 : 2;
    return held[ion];
  }));

  return { molecules, moleculeBonds, subjectResidues, shell, coordinating,
           ball, markRadius, stickRadius, focusRadius, bulkGroups, bulkRadius, bulkStickRadius,
           cellBonds, cellEdges, cellCenter, cellPacked,
           subjectCenter, subjectPacked, smoothedBucket };
}

type Prepared = ReturnType<typeof prepare>;

const MATERIAL = { metalness: 0, roughness: 0.45, bumpiness: 0 };

/** Gather the given atoms' positions into a contiguous buffer for one impostor layer. */
function gather(frame: Float32Array, indices: ArrayLike<number>) {
  const out = new Float32Array(indices.length * 3);
  for (let slot = 0; slot < indices.length; slot++) {
    const i = indices[slot] * 3;
    out[slot * 3] = frame[i];
    out[slot * 3 + 1] = frame[i + 1];
    out[slot * 3 + 2] = frame[i + 2];
  }
  return out;
}

/**
 * Bonds, trimmed to the surfaces of the two atoms they join rather than run centre to centre.
 *
 * Centre to centre is what every viewer does and it is invisible while the atoms are opaque,
 * because the buried length is behind their own front faces. Turn the atoms translucent and it
 * stops being invisible: the tube is drawn through the middle of each sphere and, blended
 * rather than occluded, reads as a rod skewering every atom. Trimming removes the geometry
 * instead of trying to hide it.
 */
function bondLayer(
  label: string, frame: Float32Array, pairs: ArrayLike<number>,
  atomRadius: (index: number) => number,
  radius: number, color: ColorValue, alpha: number,
): ResearchLayer {
  const count = pairs.length / 2;
  const starts = new Float32Array(count * 3);
  const ends = new Float32Array(count * 3);
  let kept = 0;
  for (let bond = 0; bond < count; bond++) {
    const ai = pairs[bond * 2];
    const bi = pairs[bond * 2 + 1];
    const ax = frame[ai * 3], ay = frame[ai * 3 + 1], az = frame[ai * 3 + 2];
    const bx = frame[bi * 3], by = frame[bi * 3 + 1], bz = frame[bi * 3 + 2];
    const length = Math.hypot(bx - ax, by - ay, bz - az);
    const from = atomRadius(ai);
    const to = atomRadius(bi);
    // Nothing sticks out between two atoms that already touch, so there is nothing to draw.
    if (length <= from + to) continue;
    const ux = (bx - ax) / length, uy = (by - ay) / length, uz = (bz - az) / length;
    starts[kept * 3] = ax + ux * from;
    starts[kept * 3 + 1] = ay + uy * from;
    starts[kept * 3 + 2] = az + uz * from;
    ends[kept * 3] = bx - ux * to;
    ends[kept * 3 + 1] = by - uy * to;
    ends[kept * 3 + 2] = bz - uz * to;
    kept++;
  }
  return { label, starts: starts.subarray(0, kept * 3), ends: ends.subarray(0, kept * 3),
           radius, color, params: { alpha, quality: "high", material: MATERIAL } };
}

/**
 * The whole periodic cell: every atom, every bond, and the 68 lithiums over the top lit by the
 * count each is holding. Nothing is thinned out, because the size of the box is the claim.
 */
function wideLayers(
  topology: ElectrolyteTopology, prepared: Prepared, frame: Float32Array, frameIndex: number,
): ResearchLayer[] {
  const buckets = prepared.smoothedBucket[frameIndex] ?? [];
  const byBucket: number[][] = [[], [], []];
  topology.lithium.forEach((index, ion) => byBucket[buckets[ion] ?? 1].push(index));

  return [
    { label: "Simulation Cell", primitives: prepared.cellEdges,
      params: { alpha: 1, quality: "medium", material: MATERIAL } },
    bondLayer("Electrolyte Bonds", frame, prepared.cellBonds, prepared.bulkRadius,
              prepared.bulkStickRadius, SLATE, 1),
    ...prepared.bulkGroups.map((group) => ({
      label: `Electrolyte ${group.element}`,
      centers: gather(frame, group.indices),
      radius: group.radius,
      color: group.color,
      params: { alpha: 1, quality: "high", material: MATERIAL },
    })),
    ...byBucket.map((indices, bucket) => ({
      label: `Lithium ${bucket}`,
      centers: gather(frame, indices),
      radius: ION_RADIUS_NM,
      color: COUNT_COLOR[bucket],
      params: { alpha: 1, quality: "high", material: MATERIAL, emissive: 0.1 },
    })),
  ];
}

/**
 * One ion, the molecules it is holding, and the liquid within a cutoff of it.
 *
 * The cutoff is applied to whole molecules, by the distance from the ion to each molecule's
 * centre, re-evaluated every frame. Cutting by atom instead left half-carbonates in the frame
 * with their other halves missing.
 */
function closeLayers(
  topology: ElectrolyteTopology, prepared: Prepared, frame: Float32Array, cutoffNm: number,
): ResearchLayer[] {
  const focusIndex = topology.focusLithium * 3;
  const focus = [frame[focusIndex], frame[focusIndex + 1], frame[focusIndex + 2]];
  const byElement = new Map<string, number[]>();
  const contextBonds: number[] = [];
  for (const { residue, atoms } of prepared.molecules) {
    if (prepared.subjectResidues.has(residue)) continue;
    let cx = 0, cy = 0, cz = 0;
    for (const atom of atoms) {
      cx += frame[atom * 3]; cy += frame[atom * 3 + 1]; cz += frame[atom * 3 + 2];
    }
    const n = atoms.length;
    if (Math.hypot(cx / n - focus[0], cy / n - focus[1], cz / n - focus[2]) > cutoffNm) continue;
    for (const atom of atoms) {
      const element = topology.elements[atom];
      const list = byElement.get(element);
      if (list) list.push(atom); else byElement.set(element, [atom]);
    }
    for (const [a, b] of prepared.moleculeBonds.get(residue) ?? []) contextBonds.push(a, b);
  }

  const at = (index: number) => [frame[index * 3], frame[index * 3 + 1], frame[index * 3 + 2]];
  const subjectSpheres: ResearchPrimitive[] = [{
    kind: "sphere", center: at(topology.focusLithium) as [number, number, number],
    radius: prepared.focusRadius, color: PURPLE,
  }];
  const marked: ResearchPrimitive[] = [...prepared.coordinating].map((oxygen) => ({
    kind: "sphere" as const, center: at(oxygen) as [number, number, number],
    radius: prepared.markRadius, color: CYAN,
  }));
  for (const i of prepared.shell) {
    if (prepared.coordinating.has(i)) continue;
    subjectSpheres.push({ kind: "sphere", center: at(i) as [number, number, number],
                          radius: prepared.ball(i),
                          color: ELEMENT_COLOR[topology.elements[i]] ?? SLATE });
  }
  const subjectSticks: ResearchPrimitive[] = [];
  for (const residue of prepared.subjectResidues) {
    for (const [a, b] of prepared.moleculeBonds.get(residue) ?? []) {
      subjectSticks.push({ kind: "cylinder", start: at(a) as [number, number, number],
                           end: at(b) as [number, number, number],
                           radiusTop: prepared.stickRadius, radiusBottom: prepared.stickRadius,
                           radialSegments: 10, color: SLATE });
    }
  }


  // The liquid around the subject is context, not content. Held at an alpha where it reads as
  // the medium the ion sits in without competing with the complex drawn opaque inside it.
  const contextAlpha = 0.16;
  return [
    bondLayer("Liquid Bonds", frame, contextBonds, prepared.ball,
              prepared.stickRadius, SLATE, contextAlpha),
    ...[...byElement.entries()].map(([element, indices]) => ({
      label: `Liquid ${element}`,
      centers: gather(frame, indices),
      // Ball scale, the same one the subject uses. At the bulk's 0.42 the spheres of a bond
      // already overlap, so trimming the bond to their surfaces leaves nothing between them
      // and the liquid reads as loose dots rather than molecules.
      radius: prepared.ball(indices[0]),
      color: ELEMENT_COLOR[element] ?? SLATE,
      params: { alpha: contextAlpha, quality: "high", material: MATERIAL },
    })),
    { label: "Solvation Shell", primitives: subjectSpheres,
      params: { alpha: 1, quality: "high", material: MATERIAL, emissive: 0.08 } },
    { label: "Shell Bonds", primitives: subjectSticks,
      params: { alpha: 0.95, quality: "high", material: MATERIAL } },
    { label: "Coordinating Oxygens", primitives: marked,
      params: { alpha: 1, quality: "high", material: MATERIAL, emissive: 0.45 } },
  ];
}

export function MolstarElectrolyteStage({
  step,
  reducedMotion = false,
  canvasColor,
  actionsRef,
}: {
  step: number;
  reducedMotion?: boolean;
  canvasColor: string;
  /** Where the instrument's zoom, fit and reset are bound. Handed to the plugin rather than
   *  translated into a scene-level zoom index: the camera is the thing being moved, and the
   *  shared binding already scales the snapshot the same way the DFT tier does. */
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const dataRef = useRef<{
    topology: ElectrolyteTopology;
    keyframes: Float32Array[];
    scratch: Float32Array;
    prepared: Prepared;
  } | null>(null);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const solveRef = useRef<
    ({ key: string; cutoffNm: number } & ReturnType<typeof solveCamera>) | null>(null);
  const canvasColorRef = useRef(canvasColor);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wide = step === 1;

  useEffect(() => { canvasColorRef.current = canvasColor; }, [canvasColor]);
  useEffect(() => {
    if (pluginRef.current) applyResearchCanvasBackground(pluginRef.current, canvasColor);
  }, [canvasColor]);

  /**
   * Draw the configuration the trajectory is at `elapsed` seconds into its loop.
   *
   * Playback is driven by the clock, not by a frame counter, and the position between two
   * keyframes is interpolated. That decouples how long the loop takes from how fast the browser
   * can commit: the trajectory runs in LOOP_SECONDS whether the machine manages 60 frames a
   * second or 20. The second half of the period runs the same keyframes backwards, which joins
   * seamlessly at both ends and, on a trajectory, is as true backwards as forwards.
   */
  const draw = useCallback(async (elapsed: number) => {
    const plugin = pluginRef.current;
    const data = dataRef.current;
    if (!plugin || !data) return;

    const camera = plugin.canvas3d?.camera.getSnapshot() as (CameraSnapshotLike & { fov?: number }) | undefined;
    if (!camera) return;
    const halfFov = (camera.fov ?? Math.PI / 4) / 2;
    const viewport = containerRef.current?.getBoundingClientRect();
    const aspect = viewport && viewport.height > 0 ? viewport.width / viewport.height : 1;

    const cycle = (elapsed / LOOP_SECONDS) % 2;
    const travel = cycle < 1 ? cycle : 2 - cycle;
    const position = travel * (data.topology.frameCount - 1);
    const lower = Math.min(data.topology.frameCount - 2, Math.floor(position));
    const blend = position - lower;
    const a = data.keyframes[lower];
    const b = data.keyframes[lower + 1];
    const frame = data.scratch;
    for (let i = 0; i < frame.length; i++) frame[i] = a[i] + (b[i] - a[i]) * blend;

    // Both views hold their camera still: the cell's is measured on every atom, the close-up's
    // on its subject across every frame. Neither depends on which configuration is drawn, so
    // the solve runs once per viewport.
    const center = wide ? data.prepared.cellCenter : data.prepared.subjectCenter;
    const packed = wide ? data.prepared.cellPacked : data.prepared.subjectPacked;
    const key = `${wide}:${aspect.toFixed(4)}`;
    const reframed = solveRef.current?.key !== key;
    if (reframed) {
      const solved = solveCamera(packed, wide ? CELL_FILL : SUBJECT_FILL, halfFov, aspect);
      solveRef.current = { key, ...solved,
        cutoffNm: solved.halfHeightNm * Math.hypot(1, aspect) * CONTEXT_CUTOFF };
    }
    const solved = solveRef.current!;

    await commitResearchLayers(plugin, wide
      ? wideLayers(data.topology, data.prepared, frame, Math.round(position))
      : closeLayers(data.topology, data.prepared, frame, solved.cutoffNm));

    const target = Vec3.create(...center);
    Vec3.scaleAndAdd(target, target, SCREEN_X, solved.offsetX);
    Vec3.scaleAndAdd(target, target, SCREEN_Y, solved.offsetY);
    const snapshot = {
      ...camera,
      target,
      position: Vec3.scaleAndAdd(Vec3(), target, EYE, solved.distance),
      up: WORLD_UP,
      radius: solved.reach,
      radiusMax: solved.reach * 4,
    };
    defaultSnapshotRef.current = snapshot as CameraSnapshotLike;
    // Only when the framing itself changed. Writing the camera on every animation frame is what
    // made the zoom buttons and the trackball appear dead: a drag was overwritten by the
    // placement solved for the scene as fast as the scene could be committed.
    if (reframed) plugin.managers.camera.setSnapshot(snapshot, 0);
  }, [wide]);

  useEffect(() => {
    let cancelled = false;
    let mounted: PluginLike | null = null;
    void (async () => {
      const container = containerRef.current;
      if (!container || pluginRef.current) return;
      try {
        const [topologyResponse, framesResponse] = await Promise.all([
          fetch(withBasePath("/data/multiscale/allatom/electrolyte.json")),
          fetch(withBasePath("/data/multiscale/allatom/electrolyte-frames.bin")),
        ]);
        const topology = (await topologyResponse.json()) as ElectrolyteTopology;
        const buffer = await framesResponse.arrayBuffer();
        // One uint16 frame on a fixed grid, then int8 differences on the same grid. Absolute
        // positions at this many frames weigh twice as much, and because the differences are
        // exact integers on the grid, replaying them cannot drift.
        const stride = topology.atomCount * 3;
        const { offsetNm, scaleNm } = topology.quantization;
        const base = new Uint16Array(buffer, 0, stride);
        const deltas = new Int8Array(buffer, stride * 2);
        const grid = new Int32Array(stride);
        const keyframes: Float32Array[] = [];
        for (let f = 0; f < topology.frameCount; f++) {
          for (let i = 0; i < stride; i++) {
            grid[i] = f === 0 ? base[i] : grid[i] + deltas[(f - 1) * stride + i];
          }
          const positions = new Float32Array(stride);
          for (let i = 0; i < stride; i++) positions[i] = grid[i] * scaleNm + offsetNm;
          keyframes.push(positions);
        }
        if (cancelled) return;
        dataRef.current = { topology, keyframes, scratch: new Float32Array(stride),
                            prepared: prepare(topology, keyframes) };

        const result = await mountResearchPlugin({
          container, autoRotate: false, backgroundColor: canvasColorRef.current,
          defaultSnapshotRef, actionsRef, cinematic: true,
        });
        if (!result.plugin) { setError(result.error); return; }
        mounted = result.plugin;
        pluginRef.current = result.plugin;
        if (cancelled) return;
        await draw(0);
        setReady(true);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "electrolyte scene failed to load");
      }
    })();
    return () => { cancelled = true; mounted?.dispose(); pluginRef.current = null; setReady(false); };
  }, [draw]);

  useEffect(() => { if (ready) void draw(0); }, [draw, ready, step]);

  useEffect(() => {
    if (!ready || reducedMotion) return;
    let stopped = false;
    let timer = 0;
    const started = performance.now();
    const tick = async () => {
      await draw((performance.now() - started) / 1000);
      if (!stopped) timer = window.setTimeout(tick, 0);
    };
    timer = window.setTimeout(tick, 0);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [draw, ready, reducedMotion]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {error ? (
        <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-muted-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
