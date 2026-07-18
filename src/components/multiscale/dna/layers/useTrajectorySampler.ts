"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getTrajectoryFrame } from "../binaryLoader";
import { recenterInto, unwrapTrajectory } from "../pbcUnwrap";

function sampleLinearInto(
  firstFrame: Float32Array,
  secondFrame: Float32Array,
  fraction: number,
  output: Float32Array,
) {
  const firstWeight = 1 - fraction;
  for (let index = 0; index < output.length; index++) {
    output[index] = firstWeight * firstFrame[index] + fraction * secondFrame[index];
  }
}

function sampleFrameInto(
  trajectory: Float32Array,
  beadCount: number,
  frameCount: number,
  time: number,
  output: Float32Array,
) {
  const rawIndex = time * (frameCount - 1);
  const firstIndex = Math.max(0, Math.min(Math.floor(rawIndex), frameCount - 1));
  const secondIndex = Math.min(firstIndex + 1, frameCount - 1);
  const fraction = rawIndex - firstIndex;
  const firstFrame = getTrajectoryFrame(trajectory, beadCount, firstIndex);

  if (fraction < 0.001 || firstIndex === secondIndex) {
    output.set(firstFrame);
    return;
  }

  sampleLinearInto(
    firstFrame,
    getTrajectoryFrame(trajectory, beadCount, secondIndex),
    fraction,
    output,
  );
}

export function useTrajectorySampler(
  trajectory: Float32Array | null,
  beadCount: number,
  frameCount: number,
  bonds: [number, number][] | undefined,
  box: [number, number, number] | undefined,
  halfPeriod = 15,
  mode: "pingpong" | "hold" = "pingpong",
  paused = false,
) {
  const clockRef = useRef(0);
  const positions = useMemo(
    () => (beadCount > 0 ? new Float32Array(beadCount * 3) : null),
    [beadCount],
  );
  const interpolationBuffer = useMemo(
    () => (beadCount > 0 ? new Float32Array(beadCount * 3) : null),
    [beadCount],
  );

  // Unwrapping once avoids discontinuities and allocations in the render loop.
  const unwrappedTrajectory = useMemo(() => {
    if (!trajectory || beadCount === 0 || frameCount === 0) return null;
    return bonds && box
      ? unwrapTrajectory(trajectory, beadCount, frameCount, bonds, box)
      : trajectory;
  }, [trajectory, beadCount, frameCount, bonds, box]);

  const sampleCurrentFrame = useCallback(() => {
    if (
      !unwrappedTrajectory ||
      !positions ||
      !interpolationBuffer ||
      beadCount === 0 ||
      frameCount === 0
    ) {
      return null;
    }

    const phase = clockRef.current / halfPeriod;
    const time = mode === "hold"
      ? Math.min(0.999, phase)
      : (() => {
          const folded = phase % 2;
          return folded <= 1 ? folded : 2 - folded;
        })();

    sampleFrameInto(
      unwrappedTrajectory,
      beadCount,
      frameCount,
      Math.max(0, Math.min(0.999, time)),
      interpolationBuffer,
    );
    recenterInto(interpolationBuffer, positions, beadCount);
    return positions;
  }, [
    unwrappedTrajectory,
    positions,
    interpolationBuffer,
    beadCount,
    frameCount,
    halfPeriod,
    mode,
  ]);

  useFrame((_, delta) => {
    if (!paused) clockRef.current += delta;
  });

  return { sampleCurrentFrame, clockRef };
}
