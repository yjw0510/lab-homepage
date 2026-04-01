"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTimedValue, getViewSpec, type MultiscaleTimingSpec } from "../multiscaleViewSchedule";
import { getSubsetIndices, type SubsetAwareData } from "../multiscaleViewRuntime";
import type { ScrollState } from "../scrollState";

interface MlffSystemData {
  focusIndex: number;
  cutoff: number;
  atoms: number[][];
  elements: string[];
  bonds?: number[][];
  forces?: number[][];
  classicalForces?: number[][];
  forceDisplaySelection?: number[];
  sourceAtomCount?: number;
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
}

const ELEMENT_COLORS: Record<string, string> = {
  Na: "#f59e0b",
  O: "#38bdf8",
  H: "#f8fafc",
};

function computeEdges(positions: THREE.Vector3[], focusIdx: number, cutoff: number) {
  const edges: { from: number; to: number; mid: THREE.Vector3; len: number; quat: THREE.Quaternion }[] = [];
  const focus = positions[focusIdx];
  for (let j = 0; j < positions.length; j++) {
    if (j === focusIdx) continue;
    const d = focus.distanceTo(positions[j]);
    if (d < cutoff) {
      const from = focus;
      const to = positions[j];
      edges.push({
        from: focusIdx,
        to: j,
        mid: from.clone().add(to).multiplyScalar(0.5),
        len: d,
        quat: new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          to.clone().sub(from).normalize(),
        ),
      });
    }
  }
  return edges;
}

function getVisuals(step: number, stepProgress: number) {
  const timing = getViewSpec("mlff", step).timing;
  return {
    showCutoff: step === 1,
    cutoffRadius: step === 1 ? (systemCutoff(stepProgress, timing) * 3.2) : 0,
    neighborHighlight: step >= 1 && step <= 5,
    dimOuter: step >= 1 && step <= 5 ? (step === 1 ? stepProgress * 0.7 : 0.7) : 0,

    showEdges: step >= 2 && step <= 4,
    edgeOpacity: step === 2 ? getTimedValue(timing, "edgeOpacity", stepProgress, stepProgress) : step <= 4 ? 0.82 : 0,

    showMessages: step === 3,

    showEnergy: step === 4 || step === 5,
    energyIntensity:
      step === 4 ? getTimedValue(timing, "energyIntensity", stepProgress, stepProgress) : step === 5 ? 1 : 0,

    showForces: step === 5,
    forceOpacity: step === 5 ? getTimedValue(timing, "forceOpacity", stepProgress, stepProgress) : 0,
  };
}

function systemCutoff(stepProgress: number, timing?: MultiscaleTimingSpec) {
  return getTimedValue(timing, "cutoffRadius", stepProgress, stepProgress);
}

const FALLBACK: MlffSystemData = {
  focusIndex: 0,
  cutoff: 3.6,
  atoms: [
    [0, 0, 0],
    [2.2, 0.1, 0.5],
    [2.8, 0.5, 0.9],
    [2.7, -0.8, 0.4],
    [-1.8, 1.7, -0.5],
    [-2.3, 1.9, 0.3],
    [-1.4, 2.2, -1.1],
  ],
  elements: ["Na", "O", "H", "H", "O", "H", "H"],
  forces: [
    [0, 0, 0],
    [-0.16, 0.01, -0.04],
    [-0.08, 0.04, -0.02],
    [-0.07, -0.03, -0.01],
    [0.12, -0.11, 0.03],
    [0.05, -0.08, 0.04],
    [0.03, -0.06, 0.01],
  ],
};

export function MLFFScene({
  progressRef,
  scrollState,
  isMobile,
  transitionIn,
  transitionOut,
  autoRotateRef,
}: {
  progressRef: React.RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  transitionIn: number;
  transitionOut: number;
  autoRotateRef: React.RefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const packetMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const [system, setSystem] = useState<MlffSystemData>(FALLBACK);
  void progressRef;

  useEffect(() => {
    fetch("/data/multiscale/mlff/system.json")
      .then((response) => response.json())
      .then((next) => {
        if (Array.isArray(next?.atoms) && Array.isArray(next?.elements) && typeof next?.focusIndex === "number") {
          setSystem(next);
        }
      })
      .catch(() => {});
  }, []);

  const positions = useMemo(
    () => system.atoms.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [system.atoms],
  );
  const mlffMeta = system as MlffSystemData & SubsetAwareData;
  const activeSubsetId = getViewSpec("mlff", scrollState.step).cameraSubsetId;
  const activeIndices = useMemo(
    () => getSubsetIndices(mlffMeta, activeSubsetId, system.atoms.length),
    [activeSubsetId, mlffMeta, system.atoms.length],
  );
  const activeIndexSet = useMemo(() => new Set(activeIndices), [activeIndices]);
  const activePositions = useMemo(() => activeIndices.map((index) => positions[index]), [activeIndices, positions]);
  const activeElements = useMemo(() => activeIndices.map((index) => system.elements[index] ?? "H"), [activeIndices, system.elements]);
  const activeForces = useMemo(() => activeIndices.map((index) => system.forces?.[index] ?? [0.1, 0.1, 0.1]), [activeIndices, system.forces]);
  const focusIdx = Math.max(0, activeIndices.indexOf(system.focusIndex));
  const cutoff = system.cutoff ?? 3.6;
  const activeBonds = useMemo(
    () => (system.bonds ?? []).filter(([i, j]) => activeIndexSet.has(i) && activeIndexSet.has(j)),
    [activeIndexSet, system.bonds],
  );
  const edges = useMemo(() => computeEdges(activePositions, focusIdx, cutoff), [activePositions, cutoff, focusIdx]);
  const neighborSet = useMemo(() => new Set(edges.map((edge) => edge.to)), [edges]);
  const activeForceDisplaySelection = useMemo(() => {
    const selected = (system.forceDisplaySelection ?? [])
      .map((index) => activeIndices.indexOf(index))
      .filter((index) => index >= 0);
    if (selected.length > 0) return selected;
    return [focusIdx, ...Array.from(neighborSet)].slice(0, 8);
  }, [activeIndices, focusIdx, neighborSet, system.forceDisplaySelection]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const opacity = transitionIn * (1 - transitionOut);
    groupRef.current.scale.setScalar(Math.max(0.01, opacity));
    if (autoRotateRef.current) groupRef.current.rotation.y += 0.0006;

    if (packetMeshRef.current && scrollState.step === 3) {
      const time = state.clock.elapsedTime;
      const mesh = packetMeshRef.current;
      for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
        const edge = edges[edgeIndex];
        const from = activePositions[edge.from];
        const to = activePositions[edge.to];
        const t = (Math.sin(time * 2.1 + edgeIndex * 1.1) + 1) / 2;
        const px = from.x + (to.x - from.x) * t;
        const py = from.y + (to.y - from.y) * t;
        const pz = from.z + (to.z - from.z) * t;
        tempMatrix.makeScale(0.13, 0.13, 0.13);
        tempMatrix.setPosition(px, py, pz);
        mesh.setMatrixAt(edgeIndex, tempMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const vis = getVisuals(scrollState.step, scrollState.stepProgress);
  const focus = activePositions[focusIdx] ?? new THREE.Vector3();

  return (
    <group ref={groupRef}>
      {activeBonds.map(([rawA, rawB], index) => {
        const a = activeIndices.indexOf(rawA);
        const b = activeIndices.indexOf(rawB);
        if (a < 0 || b < 0) return null;
        const from = activePositions[a];
        const to = activePositions[b];
        const dir = to.clone().sub(from).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        return (
          <mesh key={`bond-${index}`} position={[mid.x, mid.y, mid.z]} quaternion={quat}>
            <cylinderGeometry args={[0.05, 0.05, from.distanceTo(to), isMobile ? 6 : 12]} />
            <meshStandardMaterial color="#475569" transparent opacity={0.48} />
          </mesh>
        );
      })}

      {activePositions.map((pos, i) => {
        const element = activeElements[i] ?? "H";
        const isFocus = i === focusIdx;
        const isNeighbor = neighborSet.has(i);
        const dimmed = vis.neighborHighlight && !isFocus && !isNeighbor;
        const radius = element === "Na" ? 0.68 : element === "O" ? 0.46 : 0.36;

        let emissiveColor = "#000000";
        let emissiveIntensity = 0;
        if (vis.showEnergy && (isFocus || isNeighbor)) {
          const fakeEnergy = Math.sin(i * 1.7) * 0.5;
          const hue = 0.58 + fakeEnergy * 0.12;
          emissiveColor = `hsl(${hue * 360}, 80%, 62%)`;
          emissiveIntensity = vis.energyIntensity * 0.45;
        }

        return (
          <group key={`atom-${activeIndices[i]}`} position={[pos.x, pos.y, pos.z]}>
            <mesh>
              <sphereGeometry args={[radius, isMobile ? 12 : 24, isMobile ? 12 : 24]} />
              <meshStandardMaterial
                color={isFocus ? "#f59e0b" : ELEMENT_COLORS[element] ?? "#a1a1aa"}
                transparent
                opacity={dimmed ? 1 - vis.dimOuter : 1}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                roughness={0.38}
              />
            </mesh>
            {vis.showEnergy && (isFocus || isNeighbor) && (
              <mesh>
                <sphereGeometry args={[radius + 0.15 + vis.energyIntensity * 0.15, isMobile ? 12 : 24, isMobile ? 12 : 24]} />
                <meshStandardMaterial color="#8b5cf6" transparent opacity={vis.energyIntensity * 0.1} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}

      {vis.showCutoff && (
        <mesh position={[focus.x, focus.y, focus.z]}>
          <sphereGeometry args={[vis.cutoffRadius, isMobile ? 24 : 48, isMobile ? 24 : 48]} />
          <meshStandardMaterial color="#8b5cf6" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {vis.showEdges &&
        edges.map((edge, i) => (
          <mesh key={`edge-${i}`} position={[edge.mid.x, edge.mid.y, edge.mid.z]} quaternion={edge.quat}>
            <cylinderGeometry args={[0.035, 0.035, edge.len, isMobile ? 6 : 12]} />
            <meshStandardMaterial color="#8b5cf6" transparent opacity={vis.edgeOpacity} emissive="#8b5cf6" emissiveIntensity={0.3} />
          </mesh>
        ))}

      {vis.showMessages && (
        <instancedMesh ref={packetMeshRef} args={[undefined, undefined, edges.length]}>
          <sphereGeometry args={[1, isMobile ? 8 : 16, isMobile ? 8 : 16]} />
          <meshStandardMaterial color="#e9d5ff" emissive="#8b5cf6" emissiveIntensity={2} transparent opacity={0.9} />
        </instancedMesh>
      )}

      {vis.showForces &&
        activeForceDisplaySelection.map((atomIndex, i) => {
          const pos = activePositions[atomIndex];
          const sourceForce = activeForces[atomIndex] ?? [0, 0, 0];
          const dir = new THREE.Vector3(sourceForce[0], sourceForce[1], sourceForce[2]);
          if (dir.lengthSq() < 1e-6) return null;
          const length = 0.35 + Math.min(0.45, dir.length() * 2.2);
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          return (
            <group key={`force-${i}`}>
              <mesh position={[pos.x + dir.x * 0.5, pos.y + dir.y * 0.5, pos.z + dir.z * 0.5]} quaternion={quat}>
                <cylinderGeometry args={[0.04, 0.04, length, isMobile ? 6 : 12]} />
                <meshStandardMaterial color="#8b5cf6" transparent opacity={vis.forceOpacity} />
              </mesh>
              <mesh position={[pos.x + dir.x, pos.y + dir.y, pos.z + dir.z]} quaternion={quat}>
                <coneGeometry args={[0.10, 0.25, isMobile ? 6 : 12]} />
                <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.4} transparent opacity={vis.forceOpacity} />
              </mesh>
            </group>
          );
        })}
    </group>
  );
}
