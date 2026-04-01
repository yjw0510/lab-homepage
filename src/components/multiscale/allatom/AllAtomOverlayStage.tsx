"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { AllAtomSceneSnapshot, AllAtomSystemData } from "../data/allatomSolvent";
import { cachedAllAtomJsonFetch } from "../data/allatomCache";
import { CHOREOGRAPHY } from "../levelData";
import { computeScheduledPlacement, type SubsetAwareData } from "../multiscaleViewRuntime";
import type { ScrollState } from "../scrollState";
import { getAllAtomVisuals, getScheduledAllAtomSnapshot, type AllAtomCameraState } from "./allAtomVisuals";
import type { CameraSnapshotLike } from "../molstar/shared";
import type { AllAtomForceFieldTerm } from "./allAtomPagePolicy";
import { derivePlacementSnapshot } from "./allAtomLayers";
import {
  computeBondCues,
  computeAngleCues,
  computeDihedralCue,
  computeVdwCues,
  computeCoulombCues,
  type BondCue,
  type AngleCue,
  type DihedralCue,
  type VdwCue,
  type CoulombCue,
} from "./forceCue";

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

function cueAnchor(snapshot: AllAtomSceneSnapshot) {
  const focus = snapshot.anchors?.focus_center;
  if (Array.isArray(focus) && focus.length >= 3) return focus as [number, number, number];
  const scene = snapshot.anchors?.scene_center;
  if (Array.isArray(scene) && scene.length >= 3) return scene as [number, number, number];
  return [0, 0, 0] as [number, number, number];
}

function cueColor(family: "bonded" | "nonbonded") {
  switch (family) {
    case "bonded":
      return "#22d3ee";
    case "nonbonded":
    default:
      return "#f59e0b";
  }
}

function ReferenceBox({
  lengths,
  opacity,
}: {
  lengths: number[];
  opacity: number;
}) {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(lengths[0], lengths[1], lengths[2])), [lengths]);

  const tRef = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
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
}: {
  trails: NonNullable<AllAtomSceneSnapshot["trails"]>;
  opacity: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const tRef = useRef(0);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    tRef.current += delta;
    trails.forEach((trail, trailIndex) => {
      if (trail.points.length < 2) return;
      const phase = (tRef.current * 0.16 + trailIndex * 0.21) % 1;
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

function CueDots({
  snapshot,
  family,
  opacity,
  radius,
}: {
  snapshot: AllAtomSceneSnapshot;
  family: "bonded" | "nonbonded";
  opacity: number;
  radius: number;
}) {
  const cues = useMemo(
    () => (snapshot.cuePoints ?? []).filter((cue) => cue.family === family),
    [family, snapshot.cuePoints],
  );
  const anchor = useMemo(() => cueAnchor(snapshot), [snapshot]);
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  const tRef = useRef(0);
  useFrame((_, delta) => {
    tRef.current += delta;
    refs.current.forEach((mesh, index) => {
      const cue = cues[index];
      if (!mesh || !cue) return;
      const dx = cue.point[0] - anchor[0];
      const dy = cue.point[1] - anchor[1];
      const dz = cue.point[2] - anchor[2];
      const radialPhase = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.24;
      const scale = 1 + Math.sin(tRef.current * 2.0 - radialPhase) * 0.08 * (cue.weight ?? 1);
      mesh.scale.setScalar(scale);
    });
  });

  if (cues.length === 0 || opacity <= 0) return null;

  return (
    <group renderOrder={18}>
      {cues.map((cue, index) => (
        <mesh
          key={`${family}-${index}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          position={cue.point as [number, number, number]}
        >
          <sphereGeometry args={[radius * Math.max(0.8, cue.weight ?? 1), 12, 12]} />
          <meshBasicMaterial
            color={cueColor(family)}
            transparent
            opacity={opacity * (0.22 + (cue.weight ?? 1) * 0.12)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function OverlayCamera({
  snapshot,
  scrollState,
  isMobile,
  cameraState,
  cameraSnapshotRef,
  activeTerm,
}: {
  snapshot: AllAtomSceneSnapshot;
  scrollState: ScrollState;
  isMobile: boolean;
  cameraState: AllAtomCameraState;
  cameraSnapshotRef?: MutableRefObject<CameraSnapshotLike | null>;
  activeTerm?: AllAtomForceFieldTerm | null;
}) {
  const { camera, size } = useThree();

  // Compute overlay camera independently using the same schedule as Molstar,
  // avoiding projection mismatches from cross-renderer camera syncing.
  useFrame(() => {
    const enriched = derivePlacementSnapshot(snapshot, scrollState.step, activeTerm);
    const placement = computeScheduledPlacement({
      level: "allatom",
      step: scrollState.step,
      stepProgress: scrollState.stepProgress,
      stepCount: CHOREOGRAPHY.allatom.steps.length,
      meta: enriched as AllAtomSceneSnapshot & SubsetAwareData,
      points: snapshot.atoms,
      aspect: size.width / Math.max(1, size.height),
      isMobile,
      zoomIndex: cameraState.zoomIndex,
    });
    camera.position.set(...placement.position);
    camera.near = Math.max(0.01, placement.radius * placement.nearFactor);
    camera.far = Math.max(placement.radius * placement.farFactor, camera.near + 1);
    camera.lookAt(...placement.target);
    camera.updateProjectionMatrix();
  });

  return null;
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

function CueLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span className="select-none whitespace-nowrap rounded-md bg-slate-900/80 px-2 py-0.5 text-xs font-mono text-white/90 backdrop-blur-sm shadow-lg border border-white/10">
        {text}
      </span>
    </Html>
  );
}

/* ── FF Term Overlays ── */

function FFBondOverlay({ cues }: { cues: BondCue[] }) {
  return (
    <group>
      {cues.map((cue, idx) => (
        <group key={idx}>
          {/* Rest-length ghost bond */}
          <CylinderBetween start={cue.a} end={cue.restEnd} radius={0.04} color="#94a3b8" opacity={0.45}
            depthTest={false} depthWrite={false} renderOrder={38} />
          {/* Live bond — two-pass, colored by signed stretch */}
          <TwoPassCylinder start={cue.a} end={cue.b} radius={cue.liveRadius} color={cue.liveColor}
            xrayOpacity={0.35} frontOpacity={0.9} />
          {/* Anchor atoms */}
          <TwoPassSphere position={cue.a} radius={0.18} color={cue.liveColor}
            xrayOpacity={0.3} frontOpacity={0.85} />
          <TwoPassSphere position={cue.b} radius={0.18} color={cue.liveColor}
            xrayOpacity={0.3} frontOpacity={0.85} />
          {/* Label */}
          <CueLabel position={midpoint(cue.a, cue.b)} text={`\u0394r = ${cue.delta.toFixed(3)} \u00C5`} />
        </group>
      ))}
    </group>
  );
}

function AngleWedgeMesh({ cue }: { cue: AngleCue }) {
  const geoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

  useEffect(() => {
    const geo = geoRef.current;
    const positions = new Float32Array(cue.wedgeVertices.length * 3);
    for (let i = 0; i < cue.wedgeVertices.length; i++) {
      positions[i * 3] = cue.wedgeVertices[i][0];
      positions[i * 3 + 1] = cue.wedgeVertices[i][1];
      positions[i * 3 + 2] = cue.wedgeVertices[i][2];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(cue.wedgeFaces.flat());
    geo.computeVertexNormals();
  }, [cue.wedgeVertices, cue.wedgeFaces]);

  useEffect(() => () => { geoRef.current.dispose(); }, []);

  return (
    <>
      {/* X-ray wedge */}
      <mesh geometry={geoRef.current} renderOrder={39}>
        <meshBasicMaterial color="#22c55e" transparent opacity={0.12} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Front wedge */}
      <mesh geometry={geoRef.current} renderOrder={41}>
        <meshBasicMaterial color="#22c55e" transparent opacity={0.30} depthTest={true} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function FFAngleOverlay({ cues }: { cues: AngleCue[] }) {
  return (
    <group>
      {cues.map((cue, idx) => (
        <group key={idx}>
          <AngleWedgeMesh cue={cue} />
          {/* Arc line segments — two-pass */}
          {cue.arcPoints.slice(0, -1).map((p, si) => (
            <TwoPassCylinder key={si} start={p} end={cue.arcPoints[si + 1]} radius={0.035} color="#22c55e"
              xrayOpacity={0.25} frontOpacity={0.8} />
          ))}
          {/* Hinge atom emphasis */}
          <TwoPassSphere position={cue.j} radius={0.22} color="#22c55e"
            xrayOpacity={0.3} frontOpacity={0.8} />
          {/* Label at arc midpoint */}
          <CueLabel
            position={cue.arcPoints[Math.floor(cue.arcPoints.length / 2)]}
            text={`\u03B8 = ${(cue.theta * 180 / Math.PI).toFixed(1)}\u00B0`}
          />
        </group>
      ))}
    </group>
  );
}

function QuadMesh({ quad, color, opacity, xrayOpacity }: { quad: [number, number, number][]; color: string; opacity: number; xrayOpacity: number }) {
  const geoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

  useEffect(() => {
    const geo = geoRef.current;
    const positions = new Float32Array(quad.length * 3);
    for (let i = 0; i < quad.length; i++) {
      positions[i * 3] = quad[i][0];
      positions[i * 3 + 1] = quad[i][1];
      positions[i * 3 + 2] = quad[i][2];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
  }, [quad]);

  useEffect(() => () => { geoRef.current.dispose(); }, []);

  return (
    <>
      <mesh geometry={geoRef.current} renderOrder={39}>
        <meshBasicMaterial color={color} transparent opacity={xrayOpacity} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geoRef.current} renderOrder={41}>
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={true} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function FFDihedralOverlay({ cue }: { cue: NonNullable<DihedralCue> }) {
  return (
    <group>
      {/* Half-plane 1 (i-j-k) — amber */}
      <QuadMesh quad={cue.plane1Quad} color="#f59e0b" opacity={0.20} xrayOpacity={0.08} />
      {/* Half-plane 2 (j-k-l) — violet for two-hue distinction */}
      <QuadMesh quad={cue.plane2Quad} color="#a78bfa" opacity={0.18} xrayOpacity={0.07} />
      {/* Central bond axis — thick, two-pass */}
      <TwoPassCylinder start={cue.axisStart} end={cue.axisEnd} radius={0.09} color="#f59e0b"
        xrayOpacity={0.3} frontOpacity={0.9} />
      {/* Torsion arc — two-pass */}
      {cue.arcPoints.slice(0, -1).map((p, i) => (
        <TwoPassCylinder key={i} start={p} end={cue.arcPoints[i + 1]} radius={0.04} color="#f59e0b"
          xrayOpacity={0.22} frontOpacity={0.75} />
      ))}
      {/* Axis endpoint atoms */}
      <TwoPassSphere position={cue.axisStart} radius={0.14} color="#f59e0b"
        xrayOpacity={0.25} frontOpacity={0.75} />
      <TwoPassSphere position={cue.axisEnd} radius={0.14} color="#f59e0b"
        xrayOpacity={0.25} frontOpacity={0.75} />
      {/* Label at arc midpoint */}
      {cue.arcPoints.length > 1 && (
        <CueLabel
          position={cue.arcPoints[Math.floor(cue.arcPoints.length / 2)]}
          text={`\u03C6 = ${(cue.phi * 180 / Math.PI).toFixed(1)}\u00B0`}
        />
      )}
    </group>
  );
}

function FFVdwOverlay({ cues }: { cues: VdwCue[] }) {
  return (
    <group>
      {cues.map((cue, idx) => (
        <group key={idx}>
          {/* Translucent vdW spheres — context only, additive */}
          <mesh position={cue.a} renderOrder={14}>
            <sphereGeometry args={[cue.radiusA, 24, 24]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={cue.b} renderOrder={14}>
            <sphereGeometry args={[cue.radiusB, 24, 24]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* Regime-colored bridge — hero, two-pass */}
          <TwoPassSphere position={cue.bridgeCenter} radius={cue.bridgeRadius} color={cue.bridgeColor}
            xrayOpacity={0.25} frontOpacity={0.65} />
          {/* Connecting line — two-pass */}
          <TwoPassCylinder start={cue.a} end={cue.b} radius={0.035} color={cue.bridgeColor}
            xrayOpacity={0.18} frontOpacity={0.5} />
          {/* Label */}
          <CueLabel position={cue.bridgeCenter} text={`d\u2212\u03C3 = ${cue.gap.toFixed(2)} \u00C5`} />
        </group>
      ))}
    </group>
  );
}

function FFCoulombOverlay({ cues }: { cues: CoulombCue[] }) {
  return (
    <group>
      {cues.map((cue, idx) => {
        const tubeColor = cue.sign > 0 ? "#ef4444" : "#60a5fa";
        return (
          <group key={idx}>
            {/* Charge halos — additive glow */}
            <mesh position={cue.a} renderOrder={38}>
              <sphereGeometry args={[0.2 + Math.abs(cue.qA) * 0.25, 14, 14]} />
              <meshBasicMaterial color={cue.colorA} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh position={cue.b} renderOrder={38}>
              <sphereGeometry args={[0.2 + Math.abs(cue.qB) * 0.25, 14, 14]} />
              <meshBasicMaterial color={cue.colorB} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* Interaction tube — two-pass */}
            <TwoPassCylinder
              start={cue.a}
              end={cue.b}
              radius={0.06 + cue.strength * 0.04}
              color={tubeColor}
              xrayOpacity={0.2 + cue.strength * 0.2}
              frontOpacity={0.4 + cue.strength * 0.5}
            />
            {/* Label */}
            <CueLabel position={midpoint(cue.a, cue.b)}
              text={`q\u2081q\u2082/r = ${cue.interaction.toFixed(3)}`} />
          </group>
        );
      })}
    </group>
  );
}

function FFTermOverlay({
  activeTerm,
  displayAtomsRef,
}: {
  activeTerm: AllAtomForceFieldTerm | null;
  displayAtomsRef: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
}) {
  const lastDataRef = useRef<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);
  const lastUpdateRef = useRef(0);
  const [data, setData] = useState<{ atoms: number[][]; elements: string[]; charges: number[] } | null>(null);

  // Version-gated with 30Hz throttle for smooth motion without excessive React churn
  const tRef = useRef(0);
  useFrame((_, delta) => {
    tRef.current += delta;
    const current = displayAtomsRef.current;
    if (!current || current === lastDataRef.current) return;
    if (tRef.current - lastUpdateRef.current < 0.033) return;
    lastUpdateRef.current = tRef.current;
    lastDataRef.current = current;
    setData(current);
  });

  if (!activeTerm || !data) return null;

  const { atoms, elements, charges } = data;

  switch (activeTerm) {
    case "Ubond":
      return <FFBondOverlay cues={computeBondCues(atoms)} />;
    case "Uangle":
      return <FFAngleOverlay cues={computeAngleCues(atoms)} />;
    case "Udihedral": {
      const cue = computeDihedralCue(atoms);
      if (!cue) return null;
      return <FFDihedralOverlay cue={cue} />;
    }
    case "UvdW":
      return <FFVdwOverlay cues={computeVdwCues(atoms, elements)} />;
    case "UCoul":
      return <FFCoulombOverlay cues={computeCoulombCues(atoms, charges)} />;
    default:
      return null;
  }
}

function OverlayScene({
  system,
  scrollState,
  activeTerm,
  displayAtomsRef,
}: {
  system: AllAtomSystemData;
  scrollState: ScrollState;
  activeTerm: AllAtomForceFieldTerm | null;
  displayAtomsRef: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
}) {
  const snapshot = getScheduledAllAtomSnapshot(system, scrollState.step);
  const visuals = getAllAtomVisuals(scrollState.step, scrollState.stepProgress);

  if (!snapshot) return null;

  return (
    <group>
      {scrollState.step === 1 && (
        <FFTermOverlay activeTerm={activeTerm} displayAtomsRef={displayAtomsRef} />
      )}
      {scrollState.step === 3 && snapshot.box?.referenceLengths && visuals.referenceBoxCue > 0 && (
        <ReferenceBox lengths={snapshot.box.referenceLengths} opacity={visuals.referenceBoxCue * 0.52} />
      )}
      {scrollState.step === 3 && snapshot.trails && visuals.trailCue > 0 && (
        <TrailPackets trails={snapshot.trails.slice(0, 4)} opacity={visuals.trailCue * 0.65} />
      )}
    </group>
  );
}

export function AllAtomOverlayStage({
  scrollState,
  isMobile,
  cameraState,
  cameraSnapshotRef,
  activeTerm,
  displayAtomsRef,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  cameraState: AllAtomCameraState;
  cameraSnapshotRef?: MutableRefObject<CameraSnapshotLike | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  displayAtomsRef?: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
}) {
  const [system, setSystem] = useState<AllAtomSystemData | null>(null);

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
          cameraSnapshotRef={cameraSnapshotRef}
          activeTerm={activeTerm}
        />
        <OverlayScene system={system} scrollState={scrollState} activeTerm={activeTerm} displayAtomsRef={displayAtomsRef ?? { current: null }} />
      </Canvas>
    </div>
  );
}
