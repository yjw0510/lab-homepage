"use client";

export interface ScfSnapshotLike {
  iteration: number;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = clamp01((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return x * x * (3 - 2 * x);
}

export function buildScfAnchors(snapshots: ScfSnapshotLike[]) {
  if (snapshots.length <= 1) return [0];

  const lastIndex = snapshots.length - 1;
  const maxIteration = Math.max(1, snapshots[lastIndex]?.iteration ?? lastIndex);

  return snapshots.map((snapshot, index) => {
    if (index === 0) return 0;
    if (index === lastIndex) return 1;

    const uniform = index / lastIndex;
    const logAnchor = Math.log1p(Math.max(0, snapshot.iteration)) / Math.log1p(maxIteration);
    return clamp01(logAnchor * 0.62 + uniform * 0.38);
  });
}

export function mapScfProgress(progress: number) {
  const p = clamp01(progress);
  const biased = Math.pow(p, 1.45);
  return clamp01(biased * 0.84 + smoothstep(0, 1, p) * 0.16);
}

export function selectScfSnapshotIndex({
  currentIndex,
  mappedProgress,
  anchors,
  hysteresis = 0.05,
}: {
  currentIndex: number;
  mappedProgress: number;
  anchors: number[];
  hysteresis?: number;
}) {
  if (anchors.length <= 1) return 0;

  let nextIndex = Math.max(0, Math.min(currentIndex, anchors.length - 1));

  while (nextIndex < anchors.length - 1) {
    const boundary = (anchors[nextIndex] + anchors[nextIndex + 1]) * 0.5;
    if (mappedProgress > boundary + hysteresis) {
      nextIndex += 1;
      continue;
    }
    break;
  }

  while (nextIndex > 0) {
    const boundary = (anchors[nextIndex - 1] + anchors[nextIndex]) * 0.5;
    if (mappedProgress < boundary - hysteresis) {
      nextIndex -= 1;
      continue;
    }
    break;
  }

  return nextIndex;
}
