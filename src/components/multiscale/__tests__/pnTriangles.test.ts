import { describe, expect, it } from "vitest";
import { pnSubdivide } from "../pnTriangles";

/** A coarse icosahedron on the unit sphere, with the exact sphere normal at every vertex. */
function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  });
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const vertices = new Float32Array(raw.flat());
  // On the unit sphere the outward normal is the position.
  return { vertices, normals: vertices.slice(), faces: new Uint32Array(faces.flat()) };
}

/** Worst flat-midpoint miss over every edge, which is what the patch has to beat. */
function chordError(vertices: ArrayLike<number>, faces: ArrayLike<number>) {
  let worst = 0;
  for (let at = 0; at < faces.length; at += 3) {
    const corners = [faces[at], faces[at + 1], faces[at + 2]];
    for (const [a, b] of [[corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[0]]]) {
      const point = [0, 1, 2].map((axis) => (vertices[a * 3 + axis] + vertices[b * 3 + axis]) / 2);
      worst = Math.max(worst, Math.abs(Math.hypot(point[0], point[1], point[2]) - 1));
    }
  }
  return worst;
}

/** One flat 1-to-4 split with the new points pushed back onto the sphere, for a finer input. */
function refineOnSphere(vertices: Float32Array, faces: Uint32Array) {
  const points = [...vertices];
  const out: number[] = [];
  const midpoints = new Map<string, number>();
  const midpoint = (a: number, b: number) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const seen = midpoints.get(key);
    if (seen !== undefined) return seen;
    const p = [0, 1, 2].map((axis) => (points[a * 3 + axis] + points[b * 3 + axis]) / 2);
    const length = Math.hypot(p[0], p[1], p[2]);
    p.forEach((value) => points.push(value / length));
    const index = points.length / 3 - 1;
    midpoints.set(key, index);
    return index;
  };
  for (let at = 0; at < faces.length; at += 3) {
    const [a, b, c] = [faces[at], faces[at + 1], faces[at + 2]];
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    out.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
  }
  const grown = new Float32Array(points);
  return { vertices: grown, normals: grown, faces: new Uint32Array(out) };
}

/** How far a point set sits from the unit sphere. */
function radialError(vertices: ArrayLike<number>) {
  let worst = 0;
  for (let at = 0; at < vertices.length; at += 3) {
    const radius = Math.hypot(vertices[at], vertices[at + 1], vertices[at + 2]);
    worst = Math.max(worst, Math.abs(radius - 1));
  }
  return worst;
}

describe("PN triangles", () => {
  const sphere = icosahedron();

  it("converges on the real surface two orders faster than the flat chord", () => {
    // The property worth pinning is the convergence order, not a threshold. A flat triangle's
    // midpoint misses a curved surface by O(h^2); the cubic patch misses it by O(h^4), so every
    // refinement of the input widens the gap about fourfold. Measured on the unit sphere:
    //
    //   input tris    chord error    PN error     ratio
    //           20       1.49e-1     5.89e-2       2.5x
    //           80       4.89e-2     6.36e-3       7.7x
    //          320       1.33e-2     4.70e-4      28.3x
    //         1280       3.39e-3     3.07e-5     110.6x
    //
    // The icosahedron alone is a weak test: its edges subtend 63 degrees, where a cubic can
    // only do so much, and a fixed threshold there says nothing about a mesh of small triangles.
    let mesh = sphere;
    let previous = 0;
    for (let round = 0; round < 3; round++) {
      const curved = pnSubdivide(mesh.vertices, mesh.normals, mesh.faces, 3);
      const ratio = chordError(mesh.vertices, mesh.faces) / radialError(curved.vertices);
      if (previous > 0) expect(ratio).toBeGreaterThan(previous * 3);
      previous = ratio;
      mesh = refineOnSphere(mesh.vertices, mesh.faces);
    }
    expect(previous).toBeGreaterThan(20);
  });

  it("keeps the corners exactly where they were", () => {
    const curved = pnSubdivide(sphere.vertices, sphere.normals, sphere.faces, 2);
    // The first lattice point of the first patch is barycentric (w,u,v) = (1,0,0), which is P1.
    for (let axis = 0; axis < 3; axis++) {
      expect(curved.vertices[axis]).toBeCloseTo(sphere.vertices[sphere.faces[0] * 3 + axis], 5);
    }
  });

  it("emits level^2 triangles and a closed lattice per input face", () => {
    const level = 4;
    const curved = pnSubdivide(sphere.vertices, sphere.normals, sphere.faces, level);
    const triangles = sphere.faces.length / 3;
    expect(curved.faces.length / 3).toBe(triangles * level * level);
    expect(curved.vertices.length / 3).toBe(triangles * ((level + 1) * (level + 2)) / 2);
    // Every index has to point at a vertex this function actually wrote.
    expect(Math.max(...curved.faces)).toBeLessThan(curved.vertices.length / 3);
  });

  it("returns unit normals", () => {
    const curved = pnSubdivide(sphere.vertices, sphere.normals, sphere.faces, 3);
    for (let at = 0; at < curved.normals.length; at += 3) {
      expect(Math.hypot(curved.normals[at], curved.normals[at + 1], curved.normals[at + 2]))
        .toBeCloseTo(1, 5);
    }
  });
});
