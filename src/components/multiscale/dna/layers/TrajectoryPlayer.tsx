"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getTrajectoryFrame } from "../binaryLoader";
import { unwrapTrajectory, recenterInto } from "../pbcUnwrap";

/**
 * Linear interpolation between two frames into a pre-allocated buffer.
 * Safer than cubic for Brownian/Langevin trajectories with PBC.
 */
function sampleLinearInto(
  f1: Float32Array,
  f2: Float32Array,
  frac: number,
  out: Float32Array,
) {
  const oneMinusFrac = 1 - frac;
  for (let i = 0; i < out.length; i++) {
    out[i] = oneMinusFrac * f1[i] + frac * f2[i];
  }
}

/**
 * Sample trajectory at time t ∈ [0,1) into output buffer.
 * Uses linear interpolation on already-unwrapped coordinates.
 */
function sampleFrameInto(
  trajectory: Float32Array,
  nBeads: number,
  nFrames: number,
  t: number,
  out: Float32Array,
) {
  const rawIdx = t * (nFrames - 1);
  const i1 = Math.max(0, Math.min(Math.floor(rawIdx), nFrames - 1));
  const i2 = Math.min(i1 + 1, nFrames - 1);
  const frac = rawIdx - i1;

  const f1 = getTrajectoryFrame(trajectory, nBeads, i1);
  if (frac < 0.001 || i1 === i2) {
    out.set(f1);
    return;
  }

  const f2 = getTrajectoryFrame(trajectory, nBeads, i2);
  sampleLinearInto(f1, f2, frac, out);
}

/**
 * Ping-pong trajectory sampler with PBC unwrapping.
 *
 * On first call (when trajectory data arrives), pre-unwraps all frames.
 * Per frame: linear interpolation → recenter → return stable buffer.
 * Zero allocations in the render loop.
 */
export function useTrajectorySampler(
  trajectory: Float32Array | null,
  nBeads: number,
  nFrames: number,
  bonds: [number, number][] | undefined,
  box: [number, number, number] | undefined,
  halfPeriod = 15,
) {
  const clockRef = useRef(0);
  const positionsRef = useRef<Float32Array | null>(null);
  const interpBuf = useRef<Float32Array | null>(null);

  // Lazily allocate output buffers
  if (positionsRef.current === null || positionsRef.current.length !== nBeads * 3) {
    positionsRef.current = nBeads > 0 ? new Float32Array(nBeads * 3) : null;
  }
  if (interpBuf.current === null || interpBuf.current.length !== nBeads * 3) {
    interpBuf.current = nBeads > 0 ? new Float32Array(nBeads * 3) : null;
  }

  // Pre-unwrap the entire trajectory (runs once when trajectory loads)
  const unwrapped = useMemo(() => {
    if (!trajectory || nBeads === 0 || nFrames === 0) return null;
    if (bonds && box) {
      return unwrapTrajectory(trajectory, nBeads, nFrames, bonds, box);
    }
    // No box info — use raw coordinates (best effort)
    return trajectory;
  }, [trajectory, nBeads, nFrames, bonds, box]);

  const sampleCurrentFrame = useCallback(() => {
    if (!unwrapped || !positionsRef.current || !interpBuf.current || nBeads === 0 || nFrames === 0) {
      return null;
    }
    const phase = (clockRef.current % (halfPeriod * 2)) / halfPeriod;
    const t = phase <= 1 ? phase : 2 - phase;

    sampleFrameInto(
      unwrapped,
      nBeads,
      nFrames,
      Math.max(0, Math.min(0.999, t)),
      interpBuf.current,
    );

    // Recenter so the cluster stays at origin
    recenterInto(interpBuf.current, positionsRef.current, nBeads);

    return positionsRef.current;
  }, [unwrapped, nBeads, nFrames, halfPeriod]);

  useFrame((_, delta) => {
    clockRef.current += delta;
  });

  return { positionsRef, sampleCurrentFrame, clockRef };
}
