/** Decode raw ArrayBuffer as little-endian Float32Array (zero-copy). */
export function decodeFloat32(buffer: ArrayBuffer): Float32Array {
  return new Float32Array(buffer);
}

/**
 * Extract one frame from a flat trajectory buffer.
 * Trajectory layout: [frame0_bead0_x, y, z, frame0_bead1_x, y, z, ..., frame1_bead0_x, ...]
 */
export function getTrajectoryFrame(
  trajectory: Float32Array,
  nBeads: number,
  frameIndex: number,
): Float32Array {
  const offset = frameIndex * nBeads * 3;
  return trajectory.subarray(offset, offset + nBeads * 3);
}

/** Reshape flat [x0,y0,z0, x1,y1,z1, ...] into [[x0,y0,z0], [x1,y1,z1], ...]. */
export function reshapeToVec3(flat: Float32Array): [number, number, number][] {
  const result: [number, number, number][] = [];
  for (let i = 0; i < flat.length; i += 3) {
    result.push([flat[i], flat[i + 1], flat[i + 2]]);
  }
  return result;
}
