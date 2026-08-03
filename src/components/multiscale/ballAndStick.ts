/**
 * One ball-and-stick rule for every scene that draws atoms.
 *
 * The all-atom tier settled these numbers against its own topology, and three other scenes
 * then picked their own. Measured on what shipped: the MLFF glyph drew a stick at 0.155 of a
 * ball against this tier's 0.35, which is why its atoms read as fat; the DNA scenes carried a
 * third palette again. Same molecules, three looks.
 *
 * The sizes are derived, not chosen. The widest ball in a scene is `BALL_CLEARANCE` of the
 * shortest bond it has to sit on and the rest follow by their van der Waals ratios, so no
 * sphere can ever swallow its own neighbour. That was the state the MLFF glyph was in: it
 * multiplied its radii by 1.8 without touching the positions.
 */

/** Van der Waals radii in nm, the set the all-atom tier uses. */
export const VDW_NM: Record<string, number> = {
  H: 0.10,
  C: 0.17,
  N: 0.155,
  O: 0.16,
  F: 0.15,
  Na: 0.227,
  Mg: 0.173,
  P: 0.20,
  S: 0.18,
  Li: 0.13,
};

/**
 * The widest ball in a scene is drawn this fraction of the shortest bond it sits on, and the
 * rest follow by their van der Waals ratios. Expressed against the bond rather than as an
 * absolute radius because the scenes are not all in the same units: the MLFF glyph works in
 * its own schematic space, and a nanometre-sized radius there drew atoms as specks.
 */
export const BALL_CLEARANCE = 0.8;
/** Stick radius as a fraction of the ball it joins. */
export const STICK_TO_BALL = 0.35;

/**
 * Element colours. The all-atom tier's palette, which is the one the reader meets first and
 * the one every other scene now matches.
 */
export const ELEMENT_HEX: Record<string, string> = {
  H: "#f3f4f6",
  C: "#3d4552",
  N: "#2563eb",
  O: "#ef4444",
  F: "#7dd3fc",
  Na: "#8b5cf6",
  // The only metal centre in these scenes. Green rather than another violet: it sits inside a
  // ring of four nitrogens and has to read against them, not with the alkali ions.
  Mg: "#22c55e",
  P: "#f97316",
  S: "#fbbf24",
  Li: "#8b5cf6",
};

/** Anything the table does not name is drawn in the neutral the tier uses for it. */
export const FALLBACK_HEX = "#9ca3af";
const FALLBACK_VDW = 0.16;

export interface BallAndStick {
  /** Drawn radius for one element, in the same units as the positions. */
  ball: (element: string) => number;
  /** One stick radius for the scene, taken from the ball it most often joins. */
  stick: number;
  /**
   * How far to pull a stick back so it stops where it enters a ball, not where it grazes it.
   *
   * A stick has width, so the plane at one ball radius along the bond axis touches the sphere
   * at a single point and the cylinder's whole end cap stands outside it. On carbon here that
   * left a 0.029 A notch between rod and sphere - six percent of the ball - which reads as the
   * bond not quite reaching the atom. The cylinder's rim crosses the sphere at
   * sqrt(ball^2 - stick^2), which is where the cut belongs.
   */
  trim: (element: string) => number;
}

/**
 * `shortestBond` is what binds the cap, so it must come from the scene's own coordinates and
 * in the scene's own units. Pass a low percentile rather than the true minimum: a topology
 * with one degenerate pair (this DNA model has a bond of 0.0053 against a median of 0.1426)
 * would otherwise collapse every ball in the scene.
 */
export function ballAndStick(shortestBond: number, elements: readonly string[] = []): BallAndStick {
  const present = elements.length
    ? [...new Set(elements)].map((e) => VDW_NM[e] ?? FALLBACK_VDW)
    : Object.values(VDW_NM);
  const widest = Math.max(...present);
  const scale = (BALL_CLEARANCE * shortestBond) / 2 / widest;
  const ball = (element: string) => (VDW_NM[element] ?? FALLBACK_VDW) * scale;
  // Carbon is the ball a stick joins in almost every organic scene here, so it sets the one
  // stick radius rather than an average nothing is drawn at.
  const stick = STICK_TO_BALL * ball("C");
  return {
    ball,
    stick,
    // A ball narrower than the stick it joins has no crossing; stop at its centre instead.
    trim: (element) => Math.sqrt(Math.max(0, ball(element) ** 2 - stick ** 2)),
  };
}

/** The bond length the cap should be taken from: a low percentile, ignoring hydrogens. */
export function shortestHeavyBond(
  positions: ArrayLike<number>,
  bonds: readonly (readonly [number, number])[],
  elements: readonly string[],
  percentile = 5,
): number {
  const length = ([i, j]: readonly [number, number]) => Math.hypot(
    positions[3 * i] - positions[3 * j],
    positions[3 * i + 1] - positions[3 * j + 1],
    positions[3 * i + 2] - positions[3 * j + 2],
  );
  let lengths = bonds
    .filter(([i, j]) => elements[i] !== "H" && elements[j] !== "H")
    .map(length);
  // A water box has no heavy-heavy bond at all. Falling back to a fixed number here put a
  // nanometre length into a scene measured in angstroms and drew its atoms as specks; the
  // scene's own O-H is the right yardstick and is in the scene's own units.
  if (lengths.length === 0) lengths = bonds.map(length);
  if (lengths.length === 0) return 0.14;
  lengths.sort((a, b) => a - b);
  // At least the second shortest whenever there is one. On a small scene the percentile index
  // rounds to zero and hands back the very outlier this function exists to skip: with four
  // bonds, floor(4 x 5 / 100) is 0.
  const index = Math.max(lengths.length > 1 ? 1 : 0,
                         Math.floor((lengths.length * percentile) / 100));
  return lengths[Math.min(lengths.length - 1, index)];
}
