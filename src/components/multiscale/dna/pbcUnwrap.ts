/**
 * PBC (periodic boundary conditions) utilities for polymer trajectories.
 *
 * Wrapped MD coordinates place each bead in the primary image independently,
 * which splits bonded chains across box boundaries. This module reconstructs
 * continuous (unwrapped) coordinates using the bond topology.
 */

function minimumImageDelta(d: number, boxL: number): number {
  if (d > 0.5 * boxL) return d - boxL;
  if (d < -0.5 * boxL) return d + boxL;
  return d;
}

/**
 * Build adjacency list once from bonds array.
 */
export function buildAdjacency(
  bonds: [number, number][],
  nBeads: number,
): number[][] {
  const adj: number[][] = Array.from({ length: nBeads }, () => []);
  for (const [i, j] of bonds) {
    adj[i].push(j);
    adj[j].push(i);
  }
  return adj;
}

/**
 * Unwrap a single frame: BFS from each connected component root,
 * placing each neighbor at the minimum-image position relative to
 * its already-placed parent.
 *
 * @param wrapped  flat Float32Array [x0,y0,z0, x1,y1,z1, ...]
 * @param adj      adjacency list (from buildAdjacency)
 * @param box      [Lx, Ly, Lz]
 * @param nBeads   number of beads
 * @param out      pre-allocated output buffer (same size as wrapped)
 */
export function unwrapFrame(
  wrapped: Float32Array,
  adj: number[][],
  box: [number, number, number],
  nBeads: number,
  out: Float32Array,
): void {
  const visited = new Uint8Array(nBeads);
  const stack: number[] = [];

  for (let root = 0; root < nBeads; root++) {
    if (visited[root]) continue;

    visited[root] = 1;
    out[3 * root] = wrapped[3 * root];
    out[3 * root + 1] = wrapped[3 * root + 1];
    out[3 * root + 2] = wrapped[3 * root + 2];

    stack.length = 0;
    stack.push(root);

    while (stack.length > 0) {
      const i = stack.pop()!;
      const neighbors = adj[i];
      for (let ni = 0; ni < neighbors.length; ni++) {
        const j = neighbors[ni];
        if (visited[j]) continue;

        out[3 * j] =
          out[3 * i] +
          minimumImageDelta(wrapped[3 * j] - wrapped[3 * i], box[0]);
        out[3 * j + 1] =
          out[3 * i + 1] +
          minimumImageDelta(wrapped[3 * j + 1] - wrapped[3 * i + 1], box[1]);
        out[3 * j + 2] =
          out[3 * i + 2] +
          minimumImageDelta(wrapped[3 * j + 2] - wrapped[3 * i + 2], box[2]);

        visited[j] = 1;
        stack.push(j);
      }
    }
  }
}

/**
 * Pre-unwrap an entire trajectory (all frames) into a new Float32Array.
 * Returns a flat buffer with the same layout as the input trajectory.
 */
export function unwrapTrajectory(
  trajectory: Float32Array,
  nBeads: number,
  nFrames: number,
  bonds: [number, number][],
  box: [number, number, number],
): Float32Array {
  const adj = buildAdjacency(bonds, nBeads);
  const stride = nBeads * 3;
  const out = new Float32Array(trajectory.length);
  const frameBuf = new Float32Array(stride);

  for (let f = 0; f < nFrames; f++) {
    const offset = f * stride;
    const wrapped = trajectory.subarray(offset, offset + stride);

    // Step 1: spatial unwrap within this frame (topology BFS)
    unwrapFrame(wrapped, adj, box, nBeads, frameBuf);

    // Step 2: temporal unwrap — shift each bead's image to be closest
    // to its position in the previous frame. This prevents whole-chain
    // image flips between consecutive frames.
    if (f > 0) {
      const prevOffset = (f - 1) * stride;
      for (let i = 0; i < nBeads; i++) {
        for (let d = 0; d < 3; d++) {
          const idx = 3 * i + d;
          let delta = frameBuf[idx] - out[prevOffset + idx];
          if (delta > 0.5 * box[d]) delta -= box[d];
          else if (delta < -0.5 * box[d]) delta += box[d];
          frameBuf[idx] = out[prevOffset + idx] + delta;
        }
      }
    }

    out.set(frameBuf, offset);
  }

  return out;
}

/**
 * Recenter positions by subtracting the centroid.
 * Writes into `out` (may alias `pos`).
 */
export function recenterInto(
  pos: Float32Array,
  out: Float32Array,
  nBeads: number,
): void {
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < nBeads; i++) {
    cx += pos[3 * i];
    cy += pos[3 * i + 1];
    cz += pos[3 * i + 2];
  }
  cx /= nBeads;
  cy /= nBeads;
  cz /= nBeads;

  for (let i = 0; i < nBeads; i++) {
    out[3 * i] = pos[3 * i] - cx;
    out[3 * i + 1] = pos[3 * i + 1] - cy;
    out[3 * i + 2] = pos[3 * i + 2] - cz;
  }
}
