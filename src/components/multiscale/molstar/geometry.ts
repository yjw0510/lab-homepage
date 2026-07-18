type Point3 = [number, number, number];

export function trimBondEndpoints(
  start: number[],
  end: number[],
  startOffset: number,
  endOffset: number,
): { start: Point3; end: Point3 } {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const length = Math.hypot(dx, dy, dz);

  if (length < 1e-6) {
    return {
      start: [start[0], start[1], start[2]],
      end: [end[0], end[1], end[2]],
    };
  }

  const nx = dx / length;
  const ny = dy / length;
  const nz = dz / length;
  return {
    start: [
      start[0] + nx * startOffset,
      start[1] + ny * startOffset,
      start[2] + nz * startOffset,
    ],
    end: [
      end[0] - nx * endOffset,
      end[1] - ny * endOffset,
      end[2] - nz * endOffset,
    ],
  };
}
