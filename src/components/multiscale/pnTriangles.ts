/**
 * Curved PN triangles: Vlachos et al. 2001, "Curved PN Triangles".
 *
 * A triangle with a normal at each corner already implies a curved patch. Shading uses that
 * implication and geometry does not, which is why a surface can be perfectly smooth inside and
 * still show a polygonal outline: the silhouette is where the flat triangle edge is the shape.
 * This replaces each triangle with the cubic Bezier patch its three point-normal pairs define
 * and tessellates that.
 *
 * The alternative is GPU hardware tessellation, which is where this normally lives. WebGL2 has
 * no tessellation stage - it is an OpenGL 4 feature and WebGPU left it out of v1 - so this runs
 * on the CPU at scene-build time.
 *
 * Positions come from the cubic patch, normals from linear interpolation of the corner normals,
 * which is what the reference GLSL implementation does. Vlachos also gives a quadratic normal
 * patch; it matters where a patch has an inflection, and the isosurfaces here do not.
 */

export interface PnMesh {
  vertices: Float32Array;
  normals: Float32Array;
  faces: Uint32Array;
}

/**
 * Split every triangle into `level * level` sub-triangles lying on its PN patch.
 *
 * Vertices are not shared between neighbouring input triangles. They do not need to be: an
 * edge's control points depend only on the two corners it joins, so the two patches meeting
 * there evaluate to the same points and the seam is closed. Sharing would save memory and cost
 * a hash per lattice point.
 */
export function pnSubdivide(
  vertices: ArrayLike<number>,
  normals: ArrayLike<number>,
  faces: ArrayLike<number>,
  level: number,
): PnMesh {
  const triangles = faces.length / 3;
  const perTriangle = ((level + 1) * (level + 2)) / 2;
  const out: PnMesh = {
    vertices: new Float32Array(triangles * perTriangle * 3),
    normals: new Float32Array(triangles * perTriangle * 3),
    faces: new Uint32Array(triangles * level * level * 3),
  };

  // Ten position control points and the three corner normals, reused per triangle.
  const b = Array.from({ length: 10 }, () => new Float64Array(3));
  const [b300, b030, b003, b210, b120, b021, b012, b102, b201, b111] = b;
  const p = [new Float64Array(3), new Float64Array(3), new Float64Array(3)];
  const n = [new Float64Array(3), new Float64Array(3), new Float64Array(3)];

  let vertexAt = 0;
  let faceAt = 0;

  for (let t = 0; t < triangles; t++) {
    for (let corner = 0; corner < 3; corner++) {
      const source = faces[t * 3 + corner] * 3;
      for (let axis = 0; axis < 3; axis++) {
        p[corner][axis] = vertices[source + axis];
        n[corner][axis] = normals[source + axis];
      }
    }

    // wij = (Pj - Pi) . Ni, and the edge point one third along ij pushed onto Pi's tangent plane.
    const edge = (target: Float64Array, i: number, j: number) => {
      let w = 0;
      for (let axis = 0; axis < 3; axis++) w += (p[j][axis] - p[i][axis]) * n[i][axis];
      for (let axis = 0; axis < 3; axis++) {
        target[axis] = (2 * p[i][axis] + p[j][axis] - w * n[i][axis]) / 3;
      }
    };
    for (let axis = 0; axis < 3; axis++) {
      b300[axis] = p[0][axis];
      b030[axis] = p[1][axis];
      b003[axis] = p[2][axis];
    }
    edge(b210, 0, 1);
    edge(b120, 1, 0);
    edge(b021, 1, 2);
    edge(b012, 2, 1);
    edge(b102, 2, 0);
    edge(b201, 0, 2);
    for (let axis = 0; axis < 3; axis++) {
      const e = (b210[axis] + b120[axis] + b021[axis] + b012[axis] + b102[axis] + b201[axis]) / 6;
      const v = (p[0][axis] + p[1][axis] + p[2][axis]) / 3;
      b111[axis] = e + (e - v) / 2;
    }

    // Lattice of barycentric coordinates, row by row, so the triangle strips below index into
    // a known layout. `w` goes with P1, `u` with P2, `v` with P3, matching the control point
    // subscripts: b210 carries exponents (2,1,0) on (w,u,v).
    const base = vertexAt / 3;
    for (let row = 0; row <= level; row++) {
      // Row `row` holds level - row + 1 points: v is fixed and u runs to whatever is left.
      // Sizing the rows as row + 1 instead puts w at -1 on the last row, which is outside the
      // patch, and the Bezier form then extrapolates the surface far past the triangle.
      for (let column = 0; column <= level - row; column++) {
        const v = row / level;
        const u = column / level;
        const w = 1 - u - v;
        const w2 = w * w;
        const u2 = u * u;
        const v2 = v * v;
        for (let axis = 0; axis < 3; axis++) {
          out.vertices[vertexAt + axis] =
            b300[axis] * w2 * w + b030[axis] * u2 * u + b003[axis] * v2 * v
            + 3 * b210[axis] * w2 * u + 3 * b120[axis] * w * u2
            + 3 * b021[axis] * u2 * v + 3 * b012[axis] * u * v2
            + 3 * b102[axis] * w * v2 + 3 * b201[axis] * w2 * v
            + 6 * b111[axis] * u * v * w;
        }
        let length = 0;
        for (let axis = 0; axis < 3; axis++) {
          const value = n[0][axis] * w + n[1][axis] * u + n[2][axis] * v;
          out.normals[vertexAt + axis] = value;
          length += value * value;
        }
        length = Math.sqrt(length) || 1;
        for (let axis = 0; axis < 3; axis++) out.normals[vertexAt + axis] /= length;
        vertexAt += 3;
      }
    }

    // Row `row` starts at row * (level + 1) - row(row - 1)/2, the running total of the rows
    // above it. Between two rows each column gives one upward triangle, and every column but
    // the last also gives the downward one that fills the gap. Winding follows u then v, which
    // is the input triangle's own order.
    const rowStart = (row: number) => base + row * (level + 1) - (row * (row - 1)) / 2;
    for (let row = 0; row < level; row++) {
      const top = rowStart(row);
      const bottom = rowStart(row + 1);
      for (let column = 0; column < level - row; column++) {
        out.faces[faceAt++] = top + column;
        out.faces[faceAt++] = top + column + 1;
        out.faces[faceAt++] = bottom + column;
        if (column < level - row - 1) {
          out.faces[faceAt++] = top + column + 1;
          out.faces[faceAt++] = bottom + column + 1;
          out.faces[faceAt++] = bottom + column;
        }
      }
    }
  }

  return out;
}
