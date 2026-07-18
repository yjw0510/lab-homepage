"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { AllAtomSceneSnapshot, AllAtomSystemData } from "../data/allatomSolvent";
import { cachedAllAtomJsonFetch } from "../data/allatomCache";
import { computeScheduledPlacement, type SubsetAwareData } from "../multiscaleViewRuntime";
import type { ScrollState } from "../scrollState";
import {
  getAllAtomSceneKey,
  getAllAtomViewStep,
  getAllAtomVisuals,
  getScheduledAllAtomSnapshot,
  type AllAtomCameraState,
} from "./allAtomVisuals";
import type { AllAtomForceFieldTerm } from "./allAtomPagePolicy";
import { derivePlacementSnapshot } from "./allAtomLayers";
import { computeBondCues, type BondCue } from "./forceCue";

function lerpPoint(left: number[], right: number[], t: number) {
  return [
    left[0] + (right[0] - left[0]) * t,
    left[1] + (right[1] - left[1]) * t,
    left[2] + (right[2] - left[2]) * t,
  ] as [number, number, number];
}

function midpoint(a: number[], b: number[]): [number, number, number] {
  return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
}

function ReferenceBox({
  lengths,
  opacity,
  reducedMotion,
}: {
  lengths: number[];
  opacity: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(lengths[0], lengths[1], lengths[2])), [lengths]);

  const tRef = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (reducedMotion) {
      ref.current.scale.setScalar(1);
      return;
    }
    tRef.current += delta;
    const scale = 1 + Math.sin(tRef.current * 1.2) * 0.012;
    ref.current.scale.setScalar(scale);
  });

  return (
    <lineSegments ref={ref} geometry={geometry} renderOrder={10}>
      <lineBasicMaterial color="#e2e8f0" transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function TrailPackets({
  trails,
  opacity,
  reducedMotion,
}: {
  trails: NonNullable<AllAtomSceneSnapshot["trails"]>;
  opacity: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const tRef = useRef(0);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!reducedMotion) tRef.current += delta;
    trails.forEach((trail, trailIndex) => {
      if (trail.points.length < 2) return;
      const phase = reducedMotion
        ? Math.min(0.84, 0.18 + trailIndex * 0.21)
        : (tRef.current * 0.16 + trailIndex * 0.21) % 1;
      const scaled = phase * (trail.points.length - 1);
      const left = Math.floor(scaled);
      const right = Math.min(trail.points.length - 1, left + 1);
      const point = lerpPoint(trail.points[left], trail.points[right], scaled - left);
      dummy.position.set(point[0], point[1], point[2]);
      dummy.scale.setScalar(0.42);
      dummy.updateMatrix();
      mesh.setMatrixAt(trailIndex, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, trails.length]} renderOrder={20}>
      <sphereGeometry args={[0.40, 14, 14]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

function OverlayCamera({
  snapshot,
  scrollState,
  isMobile,
  cameraState,
  activeTerm,
}: {
  snapshot: AllAtomSceneSnapshot;
  scrollState: ScrollState;
  isMobile: boolean;
  cameraState: AllAtomCameraState;
  activeTerm?: AllAtomForceFieldTerm | null;
}) {
  const { camera, size } = useThree();

  // Compute overlay camera independently using the same schedule as Molstar,
  // avoiding projection mismatches from cross-renderer camera syncing.
  useFrame(() => {
    const enriched = derivePlacementSnapshot(snapshot, scrollState.step, activeTerm);
    const viewStep = getAllAtomViewStep(getAllAtomSceneKey(scrollState.step));
    const placement = computeScheduledPlacement({
      level: "allatom",
      step: viewStep,
      stepProgress: scrollState.stepProgress,
      stepCount: 5,
      meta: enriched as AllAtomSceneSnapshot & SubsetAwareData,
      points: snapshot.atoms,
      aspect: size.width / Math.max(1, size.height),
      isMobile,
      zoomIndex: cameraState.zoomIndex,
    });
    placeOverlayCamera(camera, placement);
  });

  return null;
}

function placeOverlayCamera(
  camera: THREE.Camera,
  placement: ReturnType<typeof computeScheduledPlacement>,
) {
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  perspectiveCamera.position.set(...placement.position);
  perspectiveCamera.near = Math.max(0.01, placement.radius * placement.nearFactor);
  perspectiveCamera.far = Math.max(
    placement.radius * placement.farFactor,
    perspectiveCamera.near + 1,
  );
  perspectiveCamera.lookAt(...placement.target);
  perspectiveCamera.updateProjectionMatrix();
}

/* ── Shared helpers ── */

function CylinderBetween({
  start,
  end,
  radius,
  color,
  opacity,
  depthTest = true,
  depthWrite = false,
  renderOrder = 15,
  blending = THREE.NormalBlending,
}: {
  start: number[];
  end: number[];
  radius: number;
  color: string;
  opacity: number;
  depthTest?: boolean;
  depthWrite?: boolean;
  renderOrder?: number;
  blending?: THREE.Blending;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const mid = useMemo(() => new THREE.Vector3((start[0]+end[0])/2, (start[1]+end[1])/2, (start[2]+end[2])/2), [start, end]);
  const len = useMemo(() => new THREE.Vector3(end[0]-start[0], end[1]-start[1], end[2]-start[2]).length(), [start, end]);
  const dir = useMemo(() => new THREE.Vector3(end[0]-start[0], end[1]-start[1], end[2]-start[2]).normalize(), [start, end]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.position.copy(mid);
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }, [mid, dir]);

  return (
    <mesh ref={ref} renderOrder={renderOrder}>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={depthTest} depthWrite={depthWrite} blending={blending} />
    </mesh>
  );
}

function TwoPassCylinder({
  start,
  end,
  radius,
  color,
  xrayOpacity = 0.22,
  frontOpacity = 0.95,
}: {
  start: number[];
  end: number[];
  radius: number;
  color: string;
  xrayOpacity?: number;
  frontOpacity?: number;
}) {
  return (
    <>
      <CylinderBetween start={start} end={end} radius={radius * 1.25} color={color}
        opacity={xrayOpacity} depthTest={false} depthWrite={false} renderOrder={40} />
      <CylinderBetween start={start} end={end} radius={radius} color={color}
        opacity={frontOpacity} depthTest={true} depthWrite={false} renderOrder={41} />
    </>
  );
}

function TwoPassSphere({
  position,
  radius,
  color,
  xrayOpacity = 0.22,
  frontOpacity = 0.85,
  blending = THREE.NormalBlending,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
  xrayOpacity?: number;
  frontOpacity?: number;
  blending?: THREE.Blending;
}) {
  return (
    <>
      <mesh position={position} renderOrder={40}>
        <sphereGeometry args={[radius * 1.2, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={xrayOpacity} depthTest={false} depthWrite={false} blending={blending} />
      </mesh>
      <mesh position={position} renderOrder={41}>
        <sphereGeometry args={[radius, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={frontOpacity} depthTest={true} depthWrite={false} blending={blending} />
      </mesh>
    </>
  );
}

function ArrowHead({
  start,
  end,
  color,
  opacity,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const direction = useMemo(
    () => new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]),
    [end, start],
  );
  const length = direction.length();

  useEffect(() => {
    if (!ref.current || length < 1e-6) return;
    ref.current.position.set(...end);
    ref.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
  }, [direction, end, length]);

  if (length < 1e-6) return null;
  return (
    <mesh ref={ref} renderOrder={44}>
      <coneGeometry args={[0.13, 0.32, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function VectorArrow({
  start,
  end,
  color,
  opacity = 0.9,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  opacity?: number;
}) {
  const delta = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const length = delta.length();
  if (length < 1e-6) return null;
  const shaftEnd = new THREE.Vector3(...end)
    .addScaledVector(delta.normalize(), -0.16)
    .toArray() as [number, number, number];
  return (
    <>
      <CylinderBetween
        start={start}
        end={shaftEnd}
        radius={0.045}
        color={color}
        opacity={opacity}
        depthTest={false}
        renderOrder={43}
      />
      <ArrowHead start={start} end={end} color={color} opacity={opacity} />
    </>
  );
}

function CueLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span className="select-none whitespace-nowrap rounded-md bg-slate-900/80 px-2 py-0.5 text-xs font-mono text-white/90 backdrop-blur-sm shadow-lg border border-white/10">
        {text}
      </span>
    </Html>
  );
}

function IntegrationStepOverlay({
  displayAtomsRef,
}: {
  displayAtomsRef: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
}) {
  const lastDataRef = useRef<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);
  const lastUpdateRef = useRef(0);
  const elapsedRef = useRef(0);
  const [data, setData] = useState<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    const current = displayAtomsRef.current;
    if (!current || current === lastDataRef.current) return;
    if (elapsedRef.current - lastUpdateRef.current < 0.05) return;
    lastUpdateRef.current = elapsedRef.current;
    lastDataRef.current = current;
    setData(current);
  });

  if (!data) return null;
  const cue = computeBondCues(data.atoms)[0];
  if (!cue) return null;

  const live = new THREE.Vector3(...cue.b);
  const partner = new THREE.Vector3(...cue.a);
  const forceDirection = cue.delta >= 0
    ? partner.clone().sub(live).normalize()
    : live.clone().sub(partner).normalize();
  const forceEnd = live.clone().addScaledVector(forceDirection, 0.52 + cue.strength * 0.28);
  const nextPosition = forceEnd.clone().addScaledVector(forceDirection, 0.38);
  const forceEndPoint = forceEnd.toArray() as [number, number, number];
  const nextPoint = nextPosition.toArray() as [number, number, number];

  return (
    <group>
      <FFBondOverlay cues={[cue]} />
      <VectorArrow start={cue.b} end={forceEndPoint} color="#22d3ee" />
      <VectorArrow start={forceEndPoint} end={nextPoint} color="#f59e0b" opacity={0.82} />
      <TwoPassSphere
        position={nextPoint}
        radius={0.18}
        color="#f59e0b"
        xrayOpacity={0.2}
        frontOpacity={0.48}
      />
      <CueLabel position={forceEndPoint} text={"F = -\u2207U"} />
      <CueLabel position={nextPoint} text={"\u0394t = 2 fs"} />
    </group>
  );
}

function FFBondOverlay({ cues }: { cues: BondCue[] }) {
  return (
    <group>
      {cues.map((cue, idx) => (
        <group key={idx}>
          {/* Rest-length ghost bond */}
          <CylinderBetween start={cue.a} end={cue.restEnd} radius={0.04} color="#94a3b8" opacity={0.45}
            depthTest={false} depthWrite={false} renderOrder={38} />
          {/* Live bond \u2014 two-pass, colored by signed stretch */}
          <TwoPassCylinder start={cue.a} end={cue.b} radius={cue.liveRadius} color={cue.liveColor}
            xrayOpacity={0.35} frontOpacity={0.9} />
          {/* Anchor atoms */}
          <TwoPassSphere position={cue.a} radius={0.18} color={cue.liveColor}
            xrayOpacity={0.3} frontOpacity={0.85} />
          <TwoPassSphere position={cue.b} radius={0.18} color={cue.liveColor}
            xrayOpacity={0.3} frontOpacity={0.85} />
          {/* Label */}
          <CueLabel position={midpoint(cue.a, cue.b)} text={`\u0394r = ${cue.delta.toFixed(3)} \u00c5`} />
        </group>
      ))}
    </group>
  );
}

function OverlayScene({
  system,
  scrollState,
  activeTerm,
  displayAtomsRef,
  reducedMotion,
}: {
  system: AllAtomSystemData;
  scrollState: ScrollState;
  activeTerm: AllAtomForceFieldTerm | null;
  displayAtomsRef: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
  reducedMotion: boolean;
}) {
  const sceneKey = getAllAtomSceneKey(scrollState.step);
  const snapshot = getScheduledAllAtomSnapshot(system, scrollState.step);
  const visuals = getAllAtomVisuals(scrollState.step, scrollState.stepProgress);

  if (!snapshot) return null;

  return (
    <group>
      {/* A3_forcefield term cues are drawn as registered Molstar primitives in
          the main stage (buildForceTermLayers), not on this overlay canvas. */}
      {sceneKey === "A4_integrate" && (
        <IntegrationStepOverlay displayAtomsRef={displayAtomsRef} />
      )}
      {sceneKey === "A5_ensemble" && snapshot.box?.referenceLengths && visuals.referenceBoxCue > 0 && (
        <ReferenceBox
          lengths={snapshot.box.referenceLengths}
          opacity={visuals.referenceBoxCue * 0.52}
          reducedMotion={reducedMotion}
        />
      )}
      {sceneKey === "A5_ensemble" && snapshot.trails && visuals.trailCue > 0 && (
        <TrailPackets
          trails={snapshot.trails.slice(0, 4)}
          opacity={visuals.trailCue * 0.65}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
}

export function AllAtomOverlayStage({
  scrollState,
  isMobile,
  cameraState,
  activeTerm,
  displayAtomsRef,
  reducedMotion = false,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  cameraState: AllAtomCameraState;
  activeTerm: AllAtomForceFieldTerm | null;
  displayAtomsRef?: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
  reducedMotion?: boolean;
}) {
  const [system, setSystem] = useState<AllAtomSystemData | null>(null);
  const emptyDisplayAtomsRef = useRef<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);

  useEffect(() => {
    cachedAllAtomJsonFetch<AllAtomSystemData>("/data/multiscale/allatom/system.json").then(setSystem).catch(() => {});
  }, []);

  if (!system) return null;
  const snapshot = getScheduledAllAtomSnapshot(system, scrollState.step);
  if (!snapshot) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      <Canvas
        className="pointer-events-none"
        style={{ pointerEvents: "none" }}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 50, position: [0, 0, 12] }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[6, 8, 4]} intensity={0.45} color="#dbeafe" />
        <OverlayCamera
          snapshot={snapshot}
          scrollState={scrollState}
          isMobile={isMobile}
          cameraState={cameraState}
          activeTerm={activeTerm}
        />
        <OverlayScene
          system={system}
          scrollState={scrollState}
          activeTerm={activeTerm}
          displayAtomsRef={displayAtomsRef ?? emptyDisplayAtomsRef}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}
