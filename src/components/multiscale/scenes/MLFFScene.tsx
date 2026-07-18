"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { withBasePath } from "@/lib/basePath";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CHOREOGRAPHY } from "../levelData";
import { getSubsetIndices, type SubsetAwareData } from "../multiscaleViewRuntime";
import {
  normalizeMlffSceneKey,
  type MlffSceneKey,
} from "../overlays/MlffMechanism";
import type { ScrollState } from "../scrollState";

interface MlffSystemData {
  focusIndex: number;
  cutoff: number;
  atoms: number[][];
  elements: string[];
  bonds?: number[][];
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
}

interface LocalEdge {
  from: number;
  to: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  midpoint: THREE.Vector3;
  length: number;
  quaternion: THREE.Quaternion;
}

const ELEMENT_COLORS: Record<string, string> = {
  Na: "#f59e0b",
  O: "#38bdf8",
  H: "#f8fafc",
};

const STEP_SCENE_KEYS: MlffSceneKey[] = [
  "L1_why",
  "L5_energy_force",
];

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
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function atomRadius(element: string) {
  if (element === "Na") return 0.68;
  if (element === "O") return 0.46;
  return 0.36;
}

function subsetForScene(sceneKey: MlffSceneKey) {
  if (sceneKey === "L1_why" || sceneKey === "L2_dataset" || sceneKey === "L7_active") {
    return "expanded_local";
  }
  return "local_core";
}

function computeLocalEdges(positions: THREE.Vector3[], focusIndex: number, cutoff: number) {
  const focus = positions[focusIndex];
  if (!focus) return [] as LocalEdge[];
  const edges: LocalEdge[] = [];
  for (let index = 0; index < positions.length; index += 1) {
    if (index === focusIndex) continue;
    const end = positions[index];
    const length = focus.distanceTo(end);
    if (length >= cutoff) continue;
    const direction = end.clone().sub(focus).normalize();
    edges.push({
      from: focusIndex,
      to: index,
      start: focus,
      end,
      midpoint: focus.clone().add(end).multiplyScalar(0.5),
      length,
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      ),
    });
  }
  return edges;
}

function CylinderBetween({
  start,
  end,
  radius,
  color,
  opacity,
  radialSegments,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  color: string;
  opacity: number;
  radialSegments: number;
}) {
  const geometry = useMemo(() => {
    const delta = end.clone().sub(start);
    const length = delta.length();
    return {
      length,
      midpoint: start.clone().add(end).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.normalize(),
      ),
    };
  }, [end, start]);

  return (
    <mesh position={geometry.midpoint} quaternion={geometry.quaternion}>
      <cylinderGeometry args={[radius, radius, geometry.length, radialSegments]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function schematicForceDirection(
  position: THREE.Vector3,
  focus: THREE.Vector3,
  index: number,
) {
  const radial = position.clone().sub(focus);
  if (radial.lengthSq() < 1e-6) {
    return new THREE.Vector3(0.36, 0.72, 0.42).normalize();
  }
  radial.normalize();
  const tangent = new THREE.Vector3().crossVectors(
    radial,
    Math.abs(radial.y) > 0.88
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0),
  ).normalize();
  const signedTangent = tangent.multiplyScalar(index % 2 === 0 ? 0.42 : -0.42);
  return radial.multiplyScalar(0.72).add(signedTangent).normalize();
}

function ForceArrow({
  origin,
  direction,
  length,
  radialSegments,
  color = "#67e8f9",
  shaftRadius = 0.035,
  headRadius = 0.1,
  opacity = 0.9,
  renderOrder = 32,
}: {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  radialSegments: number;
  color?: string;
  shaftRadius?: number;
  headRadius?: number;
  opacity?: number;
  renderOrder?: number;
}) {
  const unit = useMemo(() => direction.clone().normalize(), [direction]);
  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        unit,
      ),
    [unit],
  );
  const shaftLength = Math.max(0.25, length - 0.22);
  const shaftCenter = useMemo(
    () => origin.clone().add(unit.clone().multiplyScalar(shaftLength / 2)),
    [origin, shaftLength, unit],
  );
  const headCenter = useMemo(
    () => origin.clone().add(unit.clone().multiplyScalar(shaftLength + 0.11)),
    [origin, shaftLength, unit],
  );

  return (
    <group>
      <mesh position={shaftCenter} quaternion={quaternion} renderOrder={renderOrder}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, radialSegments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      <mesh position={headCenter} quaternion={quaternion} renderOrder={renderOrder + 1}>
        <coneGeometry args={[headRadius, 0.22, radialSegments]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={Math.min(1, opacity + 0.06)}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function DiagnosticMarkers({
  positions,
  indices,
  isMobile,
}: {
  positions: THREE.Vector3[];
  indices: number[];
  isMobile: boolean;
}) {
  const colors = ["#67e8f9", "#fbbf24", "#fda4af"];
  return (
    <group>
      {indices.slice(0, isMobile ? 2 : 3).map((index, markerIndex) => {
        const position = positions[index];
        if (!position) return null;
        return (
          <mesh
            key={`diagnostic-${index}`}
            position={position}
            rotation={[Math.PI / 2, 0, markerIndex * 0.7]}
            renderOrder={28}
          >
            <torusGeometry
              args={[atomRadius("O") + 0.2, 0.025, isMobile ? 8 : 12, isMobile ? 24 : 48]}
            />
            <meshBasicMaterial
              color={colors[markerIndex]}
              transparent
              opacity={0.76}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function MLFFScene({
  progressRef,
  scrollState,
  isMobile,
  transitionIn,
  transitionOut,
  autoRotateRef,
  sceneKey,
  reducedMotion,
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  transitionIn: number;
  transitionOut: number;
  autoRotateRef: RefObject<boolean>;
  sceneKey?: string;
  reducedMotion?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const motionReduced = reducedMotion ?? prefersReducedMotion;
  const groupRef = useRef<THREE.Group>(null);
  const cutoffRef = useRef<THREE.Group>(null);
  const uncertaintyRef = useRef<THREE.Group>(null);
  const packetMeshRef = useRef<THREE.InstancedMesh>(null);
  const bloomRef = useRef<THREE.Mesh>(null);
  const sceneTimeRef = useRef(0);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const [system, setSystem] = useState<MlffSystemData>(FALLBACK);
  void progressRef;

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/mlff/system.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`MLFF teaching geometry: ${response.status}`);
        return response.json();
      })
      .then((next) => {
        if (
          Array.isArray(next?.atoms) &&
          Array.isArray(next?.elements) &&
          typeof next?.focusIndex === "number"
        ) {
          setSystem(next);
        }
      })
      .catch(() => {});
  }, []);

  const configuredSceneKey =
    sceneKey ??
    CHOREOGRAPHY.mlff.steps[scrollState.step]?.sceneKey ??
    STEP_SCENE_KEYS[scrollState.step] ??
    "L1_why";
  const activeSceneKey = normalizeMlffSceneKey(configuredSceneKey);

  useEffect(() => {
    sceneTimeRef.current = 0;
  }, [activeSceneKey]);

  const positions = useMemo(
    () => system.atoms.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [system.atoms],
  );
  const metadata = system as MlffSystemData & SubsetAwareData;
  const activeSubsetId = subsetForScene(activeSceneKey);
  const activeIndices = useMemo(
    () => getSubsetIndices(metadata, activeSubsetId, system.atoms.length),
    [activeSubsetId, metadata, system.atoms.length],
  );
  const activeIndexSet = useMemo(() => new Set(activeIndices), [activeIndices]);
  const activeIndexMap = useMemo(
    () => new Map(activeIndices.map((globalIndex, localIndex) => [globalIndex, localIndex])),
    [activeIndices],
  );
  const activePositions = useMemo(
    () => activeIndices.map((index) => positions[index]).filter(Boolean),
    [activeIndices, positions],
  );
  const activeElements = useMemo(
    () => activeIndices.map((index) => system.elements[index] ?? "H"),
    [activeIndices, system.elements],
  );
  const focusIndex = Math.max(0, activeIndices.indexOf(system.focusIndex));
  const focus = useMemo(
    () => activePositions[focusIndex] ?? new THREE.Vector3(),
    [activePositions, focusIndex],
  );
  const cutoff = Math.max(0.1, system.cutoff ?? 3.6);
  const edges = useMemo(
    () => computeLocalEdges(activePositions, focusIndex, cutoff),
    [activePositions, cutoff, focusIndex],
  );
  const neighborSet = useMemo(
    () => new Set(edges.map((edge) => edge.to)),
    [edges],
  );
  const activeBonds = useMemo(
    () =>
      (system.bonds ?? [])
        .filter(([left, right]) => activeIndexSet.has(left) && activeIndexSet.has(right))
        .map(([left, right]) => [
          activeIndexMap.get(left) ?? -1,
          activeIndexMap.get(right) ?? -1,
        ] as const)
        .filter(([left, right]) => left >= 0 && right >= 0),
    [activeIndexMap, activeIndexSet, system.bonds],
  );
  const schematicForceIndices = useMemo(
    () => [focusIndex, ...Array.from(neighborSet)].slice(0, isMobile ? 4 : 7),
    [focusIndex, isMobile, neighborSet],
  );
  const latentIndices = useMemo(
    () => [focusIndex, ...Array.from(neighborSet)].slice(0, isMobile ? 5 : 9),
    [focusIndex, isMobile, neighborSet],
  );

  // L1_why flagship: ab-initio accuracy meets MD scale, shown as reference vs
  // inference on the teaching geometry. The MLFF aggregates neighbor messages
  // (violet packets streaming in along the graph) into a cheap inference force
  // that lands on the expensive ab-initio reference force (gold), which is only
  // recomputed occasionally (heavy electron-density bloom).
  const showReferenceInference = activeSceneKey === "L1_why";
  const forceDir = useMemo(() => {
    // Net neighbor direction, biased strongly upward so the arrows read clearly
    // above the focus atom instead of being buried inside the cluster.
    const dir = new THREE.Vector3();
    neighborSet.forEach((index) => {
      const p = activePositions[index];
      if (!p) return;
      dir.add(focus.clone().sub(p).normalize());
    });
    if (dir.lengthSq() < 1e-6) dir.set(0.2, 1, 0.3);
    return dir.normalize().multiplyScalar(0.4).add(new THREE.Vector3(0, 1, 0.12)).normalize();
  }, [neighborSet, activePositions, focus]);
  // Nearest neighbors only for the receptive-field graph, so it reads as a clean
  // aggregation into the focus atom rather than a dense starburst.
  const riEdges = useMemo(
    () => [...edges].sort((a, b) => a.length - b.length).slice(0, isMobile ? 8 : 12),
    [edges, isMobile],
  );
  const riNeighborSet = useMemo(() => new Set(riEdges.map((edge) => edge.to)), [riEdges]);

  const showCutoff = activeSceneKey === "L3_locality";
  const showGraph =
    activeSceneKey === "L3_locality" ||
    activeSceneKey === "L4_symmetry" ||
    activeSceneKey === "L5_energy_force";
  const showMessages =
    activeSceneKey === "L4_symmetry" || activeSceneKey === "L5_energy_force";
  const showLatentEnergy = activeSceneKey === "L5_energy_force";
  const showForces = activeSceneKey === "L5_energy_force";
  const showDiagnostics = activeSceneKey === "L6_validate";
  const showUncertainty = activeSceneKey === "L7_active";
  const highlightNeighborhood =
    activeSceneKey === "L3_locality" ||
    activeSceneKey === "L4_symmetry" ||
    activeSceneKey === "L5_energy_force";
  const dimOuter = highlightNeighborhood ? 0.72 : showDiagnostics ? 0.35 : 0;
  const edgeOpacity =
    activeSceneKey === "L3_locality"
      ? 0.34
      : activeSceneKey === "L4_symmetry"
        ? 0.78
        : 0.56;

  useFrame((_, delta) => {
    sceneTimeRef.current += Math.min(delta, 0.05);
    const elapsed = sceneTimeRef.current;

    if (groupRef.current) {
      const transitionScale = Math.max(0.01, transitionIn * (1 - transitionOut));
      groupRef.current.scale.setScalar(transitionScale);
      if (autoRotateRef.current) groupRef.current.rotation.y += 0.0006;
    }

    if (cutoffRef.current) {
      const reveal = motionReduced ? 1 : 0.18 + 0.82 * smoothstep(elapsed / 1.6);
      cutoffRef.current.scale.setScalar(reveal);
    }

    if (uncertaintyRef.current) {
      const pulse = motionReduced ? 1 : 1 + Math.sin(elapsed * 2.2) * 0.06;
      uncertaintyRef.current.scale.setScalar(pulse);
      uncertaintyRef.current.rotation.y = motionReduced ? 0 : elapsed * 0.18;
    }

    if (packetMeshRef.current && showMessages) {
      for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
        const edge = edges[edgeIndex];
        const progress = motionReduced
          ? 0.72
          : smoothstep((elapsed - edgeIndex * 0.035) / 1.55);
        const position = edge.end.clone().lerp(edge.start, progress);
        const fade = motionReduced
          ? 1
          : 1 - smoothstep((progress - 0.78) / 0.22);
        const scale = 0.11 * Math.max(0.001, fade);
        tempMatrix.makeScale(scale, scale, scale);
        tempMatrix.setPosition(position);
        packetMeshRef.current.setMatrixAt(edgeIndex, tempMatrix);
      }
      packetMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (showReferenceInference) {
      // Inference: neighbor messages stream continuously into the focus atom
      // (cheap, rapid, ongoing) — this is the MD-scale reach.
      if (packetMeshRef.current) {
        for (let edgeIndex = 0; edgeIndex < riEdges.length; edgeIndex += 1) {
          const edge = riEdges[edgeIndex];
          const progress = motionReduced
            ? 0.5
            : (elapsed * 0.9 + edgeIndex * 0.13) % 1;
          const position = edge.end.clone().lerp(edge.start, progress);
          const fade = Math.sin(Math.PI * progress);
          const scale = 0.085 * Math.max(0.001, fade);
          tempMatrix.makeScale(scale, scale, scale);
          tempMatrix.setPosition(position);
          packetMeshRef.current.setMatrixAt(edgeIndex, tempMatrix);
        }
        packetMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      // Reference: the expensive ab-initio recompute — a heavy electron-density
      // bloom around the focus, only occasionally.
      if (bloomRef.current) {
        const period = 4.2;
        const p = motionReduced ? 0.2 : (elapsed % period) / period;
        // One heavy pulse per period: grow to ~2/3 of the cutoff, brightest at
        // mid-growth, then fade — a costly electronic-structure recompute.
        const active = p < 0.5 ? p / 0.5 : 0;
        const grow = smoothstep(active);
        const visible = Math.sin(Math.PI * active);
        bloomRef.current.scale.setScalar(0.5 + grow * (cutoff * 0.62 - 0.5));
        const mat = bloomRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = motionReduced ? 0.14 : 0.42 * visible;
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {activeBonds.map(([left, right], index) => {
          const start = activePositions[left];
          const end = activePositions[right];
          if (!start || !end) return null;
          return (
            <CylinderBetween
              key={`bond-${index}`}
              start={start}
              end={end}
              radius={0.05}
              color="#475569"
              opacity={showReferenceInference ? 0.12 : 0.48}
              radialSegments={isMobile ? 6 : 12}
            />
          );
        })}

        {activePositions.map((position, index) => {
          const element = activeElements[index] ?? "H";
          const isFocus = index === focusIndex;
          const isNeighbor = showReferenceInference
            ? riNeighborSet.has(index)
            : neighborSet.has(index);
          const dimmed = (highlightNeighborhood || showReferenceInference) && !isFocus && !isNeighbor;
          const dim = showReferenceInference ? 0.82 : dimOuter;
          const radius = atomRadius(element);
          return (
            <group
              key={`atom-${activeIndices[index]}`}
              position={position}
            >
              <mesh>
                <sphereGeometry
                  args={[radius, isMobile ? 12 : 24, isMobile ? 12 : 24]}
                />
                <meshStandardMaterial
                  color={isFocus ? "#f59e0b" : ELEMENT_COLORS[element] ?? "#a1a1aa"}
                  transparent
                  opacity={dimmed ? 1 - dim : 1}
                  emissive={isFocus ? "#78350f" : "#050510"}
                  emissiveIntensity={isFocus ? 0.24 : 0}
                  roughness={0.38}
                />
              </mesh>

              {showLatentEnergy && latentIndices.includes(index) && (
                <mesh position={[0, radius + 0.25, 0]} renderOrder={24}>
                  <octahedronGeometry args={[0.1, 0]} />
                  <meshBasicMaterial
                    color="#c4b5fd"
                    transparent
                    opacity={0.9}
                    depthWrite={false}
                  />
                </mesh>
              )}
            </group>
          );
        })}

        {showCutoff && (
          <group ref={cutoffRef} position={focus}>
            <mesh renderOrder={18}>
              <sphereGeometry args={[cutoff, isMobile ? 24 : 48, isMobile ? 18 : 32]} />
              <meshBasicMaterial
                color="#8b5cf6"
                transparent
                opacity={0.045}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh renderOrder={19}>
              <sphereGeometry args={[cutoff, isMobile ? 18 : 32, isMobile ? 12 : 24]} />
              <meshBasicMaterial
                color="#c4b5fd"
                transparent
                opacity={0.22}
                wireframe
                depthWrite={false}
              />
            </mesh>
          </group>
        )}

        {showGraph &&
          edges.map((edge, index) => (
            <mesh
              key={`edge-${index}`}
              position={edge.midpoint}
              quaternion={edge.quaternion}
              renderOrder={20}
            >
              <cylinderGeometry
                args={[0.028, 0.028, edge.length, isMobile ? 6 : 10]}
              />
              <meshBasicMaterial
                color="#a78bfa"
                transparent
                opacity={edgeOpacity}
                depthWrite={false}
              />
            </mesh>
          ))}

        {(showMessages || showReferenceInference) && edges.length > 0 && (
          <instancedMesh
            ref={packetMeshRef}
            args={[undefined, undefined, showReferenceInference ? riEdges.length : edges.length]}
            frustumCulled={false}
            renderOrder={26}
          >
            <sphereGeometry args={[1, isMobile ? 8 : 12, isMobile ? 8 : 12]} />
            <meshBasicMaterial
              color={showReferenceInference ? "#c4b5fd" : "#ede9fe"}
              transparent
              opacity={0.94}
              depthWrite={false}
            />
          </instancedMesh>
        )}

        {showForces &&
          schematicForceIndices.map((index, arrowIndex) => {
            const origin = activePositions[index];
            if (!origin) return null;
            const direction = schematicForceDirection(origin, focus, arrowIndex);
            return (
              <ForceArrow
                key={`schematic-force-${index}`}
                origin={origin}
                direction={direction}
                length={0.65 + (arrowIndex % 3) * 0.12}
                radialSegments={isMobile ? 6 : 10}
              />
            );
          })}

        {showReferenceInference && edges.length > 0 && (
          <group>
            {/* Receptive-field graph: nearest neighbors feed the focus atom. */}
            {riEdges.map((edge, index) => (
              <mesh
                key={`ri-edge-${index}`}
                position={edge.midpoint}
                quaternion={edge.quaternion}
                renderOrder={20}
              >
                <cylinderGeometry args={[0.022, 0.022, edge.length, isMobile ? 6 : 10]} />
                <meshBasicMaterial color="#a78bfa" transparent opacity={0.42} depthWrite={false} />
              </mesh>
            ))}
            {/* Ab-initio reference: an expensive electron-density bloom, recomputed rarely. */}
            <mesh ref={bloomRef} position={focus} renderOrder={17}>
              <sphereGeometry args={[1, isMobile ? 20 : 32, isMobile ? 16 : 24]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0} depthWrite={false} />
            </mesh>
            {/* Reference force (gold, steady target). */}
            <ForceArrow
              origin={focus}
              direction={forceDir}
              length={2.35}
              radialSegments={isMobile ? 8 : 14}
              color="#fbbf24"
              shaftRadius={0.062}
              headRadius={0.2}
              opacity={0.52}
              renderOrder={30}
            />
            {/* Inference force (violet) lands on the reference: same direction, cheap, repeated. */}
            <ForceArrow
              origin={focus}
              direction={forceDir}
              length={2.18}
              radialSegments={isMobile ? 8 : 14}
              color="#c4b5fd"
              shaftRadius={0.034}
              headRadius={0.13}
              opacity={0.97}
              renderOrder={34}
            />
          </group>
        )}

        {showDiagnostics && (
          <DiagnosticMarkers
            positions={activePositions}
            indices={[focusIndex, ...Array.from(neighborSet)]}
            isMobile={isMobile}
          />
        )}

        {showUncertainty && (
          <group ref={uncertaintyRef} position={focus}>
            <mesh renderOrder={30}>
              <icosahedronGeometry args={[1.05, 1]} />
              <meshBasicMaterial
                color="#fbbf24"
                transparent
                opacity={0.58}
                wireframe
                depthWrite={false}
              />
            </mesh>
          </group>
        )}
      </group>

    </>
  );
}
