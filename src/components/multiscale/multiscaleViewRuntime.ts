"use client";

import * as THREE from "three";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra.js";
import type { PluginLike, CameraSnapshotLike } from "./molstar/shared";
import { computeCameraDistance } from "./cameraFraming";
import { getStepBlendT, getViewSpec, lerpNumber, type MultiscaleAnchorSpec, type MultiscaleSubsetSpec, type MultiscaleViewSpec } from "./multiscaleViewSchedule";
import type { LevelId } from "./scrollState";

export interface SubsetAwareData {
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
  camera?: {
    target?: number[];
    forward?: number[];
    radius?: number;
    padding?: number;
    nearFactor?: number;
    farFactor?: number;
  };
}

export interface ScheduledViewResult {
  spec: MultiscaleViewSpec;
  nextSpec: MultiscaleViewSpec | null;
  blendT: number;
}

export function getScheduledView(level: LevelId, step: number, stepProgress: number, stepCount?: number): ScheduledViewResult {
  const spec = getViewSpec(level, step);
  const hasNext = stepCount !== undefined ? step < stepCount - 1 : true;
  const nextSpec = hasNext ? getViewSpec(level, step + 1) : null;
  return {
    spec,
    nextSpec,
    blendT: nextSpec && spec.transitionMode === "hold-then-blend" ? getStepBlendT(stepProgress) : 0,
  };
}

export function getSubsetIndices(meta: SubsetAwareData | undefined, subsetId: string, totalCount: number) {
  const indices = meta?.subsets?.[subsetId]?.indices;
  if (Array.isArray(indices) && indices.length > 0) return indices;
  return Array.from({ length: totalCount }, (_, index) => index);
}

export function getAnchorPoint(meta: SubsetAwareData | undefined, anchorId: string) {
  const point = meta?.anchors?.[anchorId];
  if (!Array.isArray(point) || point.length < 3) return [0, 0, 0] as [number, number, number];
  return [point[0], point[1], point[2]] as [number, number, number];
}

export function subsetPoints(points: number[][], indices: number[]) {
  return indices.map((index) => points[index]).filter(Boolean);
}

export function computeBounds(points: number[][]) {
  if (points.length === 0) {
    return {
      center: [0, 0, 0] as [number, number, number],
      radius: 1,
    };
  }
  const center = points.reduce(
    (acc, [x, y, z]) => [acc[0] + x, acc[1] + y, acc[2] + z],
    [0, 0, 0],
  ).map((value) => value / points.length) as [number, number, number];
  let radius = 0;
  points.forEach(([x, y, z]) => {
    const dx = x - center[0];
    const dy = y - center[1];
    const dz = z - center[2];
    radius = Math.max(radius, Math.sqrt(dx * dx + dy * dy + dz * dz));
  });
  return {
    center,
    radius: Math.max(radius, 0.5),
  };
}

function viewDirection(azimuthDeg: number, elevationDeg: number) {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize();
}

function normalizeVector(vector: [number, number, number]) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length] as [number, number, number];
}

function blendSpec(current: MultiscaleViewSpec, next: MultiscaleViewSpec, t: number): MultiscaleViewSpec {
  if (t <= 0) return current;
  return {
    ...current,
    azimuthDeg: lerpNumber(current.azimuthDeg, next.azimuthDeg, t),
    elevationDeg: lerpNumber(current.elevationDeg, next.elevationDeg, t),
    rollDeg: lerpNumber(current.rollDeg, next.rollDeg, t),
    targetOffset: [
      lerpNumber(current.targetOffset[0], next.targetOffset[0], t),
      lerpNumber(current.targetOffset[1], next.targetOffset[1], t),
      lerpNumber(current.targetOffset[2], next.targetOffset[2], t),
    ],
    padding: lerpNumber(current.padding, next.padding, t),
    nearFactor: lerpNumber(current.nearFactor, next.nearFactor, t),
    farFactor: lerpNumber(current.farFactor, next.farFactor, t),
  };
}

export function computeScheduledPlacement({
  level,
  step,
  stepProgress,
  stepCount,
  meta,
  points,
  aspect,
  isMobile,
  zoomIndex,
}: {
  level: LevelId;
  step: number;
  stepProgress: number;
  stepCount: number;
  meta?: SubsetAwareData;
  points: number[][];
  aspect: number;
  isMobile: boolean;
  zoomIndex: number;
}) {
  const { spec, nextSpec, blendT } = getScheduledView(level, step, stepProgress, stepCount);
  const currentIndices = getSubsetIndices(meta, spec.cameraSubsetId, points.length);
  const nextIndices = nextSpec ? getSubsetIndices(meta, nextSpec.cameraSubsetId, points.length) : currentIndices;
  const currentBounds = computeBounds(subsetPoints(points, currentIndices));
  const nextBounds = computeBounds(subsetPoints(points, nextIndices));
  const effectiveSpec = nextSpec ? blendSpec(spec, nextSpec, blendT) : spec;
  const computedCenter: [number, number, number] = [
    lerpNumber(currentBounds.center[0], nextBounds.center[0], blendT),
    lerpNumber(currentBounds.center[1], nextBounds.center[1], blendT),
    lerpNumber(currentBounds.center[2], nextBounds.center[2], blendT),
  ];
  const computedRadius = lerpNumber(currentBounds.radius, nextBounds.radius, blendT);
  const anchor = getAnchorPoint(meta, spec.anchorId);
  const nextAnchor = nextSpec ? getAnchorPoint(meta, nextSpec.anchorId) : anchor;
  const blendedAnchor: [number, number, number] = [
    lerpNumber(anchor[0], nextAnchor[0], blendT),
    lerpNumber(anchor[1], nextAnchor[1], blendT),
    lerpNumber(anchor[2], nextAnchor[2], blendT),
  ];
  const target: [number, number, number] = [
    blendedAnchor[0] + effectiveSpec.targetOffset[0],
    blendedAnchor[1] + effectiveSpec.targetOffset[1],
    blendedAnchor[2] + effectiveSpec.targetOffset[2],
  ];
  const metaTarget = Array.isArray(meta?.camera?.target) && meta.camera.target.length >= 3
    ? (meta.camera.target as [number, number, number])
    : null;
  const targetPoint = metaTarget ?? target;
  const radius = typeof meta?.camera?.radius === "number" ? Math.max(meta.camera.radius, 0.5) : computedRadius;
  const padding = typeof meta?.camera?.padding === "number" ? meta.camera.padding : effectiveSpec.padding;
  const zoomFactor = effectiveSpec.zoomLadder[Math.max(0, Math.min(zoomIndex, effectiveSpec.zoomLadder.length - 1))] ?? 1;
  const distance = computeCameraDistance({
    radius,
    fovDeg: 50,
    aspect,
    padding: padding * (isMobile ? 1.08 : 1),
  }) * zoomFactor;
  const dir = Array.isArray(meta?.camera?.forward) && meta.camera.forward.length >= 3
    ? normalizeVector(meta.camera.forward as [number, number, number])
    : (viewDirection(effectiveSpec.azimuthDeg, effectiveSpec.elevationDeg).toArray() as [number, number, number]);
  const position: [number, number, number] = [
    targetPoint[0] + dir[0] * distance,
    targetPoint[1] + dir[1] * distance,
    targetPoint[2] + dir[2] * distance,
  ];
  return {
    spec: effectiveSpec,
    center: computedCenter,
    radius,
    target: targetPoint,
    position,
    zoomFactor,
    nearFactor: typeof meta?.camera?.nearFactor === "number" ? meta.camera.nearFactor : effectiveSpec.nearFactor,
    farFactor: typeof meta?.camera?.farFactor === "number" ? meta.camera.farFactor : effectiveSpec.farFactor,
  };
}

export function applyThreePlacement({
  camera,
  controls,
  placement,
}: {
  camera: THREE.Camera & {
    near: number;
    far: number;
    lookAt: (x: number, y: number, z: number) => void;
    updateProjectionMatrix: () => void;
  };
  controls?: { target: THREE.Vector3; update: () => void; enableDamping?: boolean } | null;
  placement: ReturnType<typeof computeScheduledPlacement>;
}) {
  camera.position.set(...placement.position);
  camera.near = Math.max(0.01, placement.radius * placement.nearFactor);
  camera.far = Math.max(placement.radius * placement.farFactor, camera.near + 1);
  camera.lookAt(...placement.target);
  camera.updateProjectionMatrix();
  if (controls) {
    const prevDamping = controls.enableDamping;
    controls.enableDamping = false;
    controls.target.set(...placement.target);
    controls.update();
    if (prevDamping !== undefined) controls.enableDamping = prevDamping;
  }
}

export function applyMolstarPlacement(
  plugin: PluginLike,
  placement: ReturnType<typeof computeScheduledPlacement>,
  durationMs = 150,
) {
  const current = plugin.canvas3d?.camera.getSnapshot() as CameraSnapshotLike | undefined;
  if (!current) return null;
  const snapshot = {
    ...current,
    target: Vec3.create(...placement.target),
    position: Vec3.create(...placement.position),
    radius: Math.max(placement.radius * placement.zoomFactor, placement.radius * 0.8),
  };
  plugin.managers.camera.setSnapshot(snapshot, durationMs);
  return snapshot;
}
