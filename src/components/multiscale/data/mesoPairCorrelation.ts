export interface MesoFramesData {
  beadCount: number;
  beads: number[][];
  bonds: number[][];
  referenceIndex?: number;
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
}

export interface PairCorrelationPoint {
  r: number;
  g: number;
}

export interface MesoPairCorrelationData {
  centeredBeads: number[][];
  bonds: number[][];
  referenceIndex: number;
  shellRadii: number[];
  points: PairCorrelationPoint[];
  maxRadius: number;
}

function distance(a: number[], b: number[]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function movingAverage(values: number[]) {
  return values.map((value, index) => {
    const window = values.slice(Math.max(0, index - 1), Math.min(values.length, index + 2));
    return window.reduce((sum, entry) => sum + entry, 0) / window.length;
  });
}

function findPeaks(points: PairCorrelationPoint[]) {
  const peaks: number[] = [];
  for (let index = 1; index < points.length - 1; index++) {
    if (points[index].g > points[index - 1].g && points[index].g >= points[index + 1].g) {
      peaks.push(index);
    }
  }
  return peaks;
}

export function computeMesoPairCorrelation(data: MesoFramesData): MesoPairCorrelationData {
  const subsetIndices = data.subsets?.pair_correlation_neighborhood?.indices;
  const activeBeads =
    Array.isArray(subsetIndices) && subsetIndices.length > 0
      ? subsetIndices.map((index) => data.beads[index]).filter(Boolean)
      : data.beads;
  const activeBondSet =
    Array.isArray(subsetIndices) && subsetIndices.length > 0 ? new Set(subsetIndices) : null;
  const activeBonds =
    activeBondSet
      ? data.bonds.filter(([i, j]) => activeBondSet.has(i) && activeBondSet.has(j))
      : data.bonds;

  const center = activeBeads.reduce(
    (acc, bead) => [acc[0] + bead[0], acc[1] + bead[1], acc[2] + bead[2]],
    [0, 0, 0],
  ).map((value) => value / Math.max(1, activeBeads.length));

  const centeredBeads = activeBeads.map(([x, y, z]) => [x - center[0], y - center[1], z - center[2]]);

  const referenceIndex =
    typeof data.referenceIndex === "number" && Array.isArray(subsetIndices)
      ? Math.max(0, subsetIndices.indexOf(data.referenceIndex))
      : centeredBeads.reduce((bestIndex, bead, index) => {
          const bestDistance = distance(centeredBeads[bestIndex], [0, 0, 0]);
          const nextDistance = distance(bead, [0, 0, 0]);
          return nextDistance < bestDistance ? index : bestIndex;
        }, 0);

  const pairDistances: number[] = [];
  let maxDistance = 0;
  for (let i = 0; i < centeredBeads.length; i++) {
    for (let j = i + 1; j < centeredBeads.length; j++) {
      const nextDistance = distance(centeredBeads[i], centeredBeads[j]);
      pairDistances.push(nextDistance);
      maxDistance = Math.max(maxDistance, nextDistance);
    }
  }

  const maxRadius = Math.max(4, maxDistance * 0.88);
  const binCount = 32;
  const binWidth = maxRadius / binCount;
  const histogram = new Array(binCount).fill(0);
  const eps = 1e-6;

  pairDistances.forEach((pairDistance) => {
    if (pairDistance >= maxRadius) return;
    const bin = Math.min(binCount - 1, Math.floor(pairDistance / binWidth));
    histogram[bin] += 1;
  });

  const bbox = centeredBeads.reduce(
    (acc, bead) => ({
      minX: Math.min(acc.minX, bead[0]),
      maxX: Math.max(acc.maxX, bead[0]),
      minY: Math.min(acc.minY, bead[1]),
      maxY: Math.max(acc.maxY, bead[1]),
      minZ: Math.min(acc.minZ, bead[2]),
      maxZ: Math.max(acc.maxZ, bead[2]),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  );
  const volume = Math.max(
    eps,
    (bbox.maxX - bbox.minX + 1.2) * (bbox.maxY - bbox.minY + 1.2) * (bbox.maxZ - bbox.minZ + 1.2),
  );
  const density = centeredBeads.length / volume;

  const raw = histogram.map((count, bin) => {
    const rInner = bin * binWidth;
    const rOuter = (bin + 1) * binWidth;
    const shellVolume = (4 / 3) * Math.PI * (rOuter ** 3 - rInner ** 3);
    return count / Math.max(eps, shellVolume * density * centeredBeads.length * 0.5);
  });
  const smoothed = movingAverage(raw);
  const tail = smoothed.slice(Math.floor(binCount * 0.65)).filter((value) => value > 0);
  const tailMean = tail.length > 0 ? tail.reduce((sum, value) => sum + value, 0) / tail.length : 1;

  const points = smoothed.map((value, bin) => ({
    r: (bin + 0.5) * binWidth,
    g: Math.max(0, value / Math.max(eps, tailMean)),
  }));

  const peakIndices = findPeaks(points);
  const shellRadii = peakIndices.slice(0, 2).map((index) => points[index].r);

  return {
    centeredBeads,
    bonds: activeBonds,
    referenceIndex,
    shellRadii: shellRadii.length > 0 ? shellRadii : [maxRadius * 0.22, maxRadius * 0.42],
    points,
    maxRadius,
  };
}
