"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const DUPLEX_COLORS = [
  "#f59e0b", "#06b6d4", "#8b5cf6", "#ef4444",
  "#22c55e", "#ec4899", "#f97316", "#3b82f6",
  "#a855f7", "#14b8a6", "#f43f5e", "#eab308",
];

/**
 * RDF-aware neighborhood layer: classifies beads into four visual groups.
 *
 * - reference: single gold emissive sphere
 * - inside:    duplex-colored instanced spheres (within radius - dr/2)
 * - shell:     bright cyan emissive spheres (the counting annulus)
 * - outside:   faint white dots (THREE.Points)
 */
export function RDFNeighborhoodLayer({
  positions,
  duplexIds,
  referenceIndex,
  center,
  radius,
  shellWidth,
  beadRadius = 0.17,
}: {
  positions: Float32Array;
  duplexIds?: number[];
  referenceIndex: number;
  center: [number, number, number];
  radius: number;
  shellWidth: number;
  beadRadius?: number;
}) {
  const nBeads = positions.length / 3;
  const rInner = Math.max(0, radius - shellWidth * 0.5);
  const rOuter = radius + shellWidth * 0.5;

  // Classify beads
  const { insideByDuplex, shellIndices, outsideIndices } = useMemo(() => {
    const byDuplex = new Map<number, number[]>();
    const shell: number[] = [];
    const outside: number[] = [];

    for (let i = 0; i < nBeads; i++) {
      if (i === referenceIndex) continue;

      const dx = positions[3 * i] - center[0];
      const dy = positions[3 * i + 1] - center[1];
      const dz = positions[3 * i + 2] - center[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (d < rInner) {
        const did = duplexIds?.[i] ?? (i % 12);
        if (!byDuplex.has(did)) byDuplex.set(did, []);
        byDuplex.get(did)!.push(i);
      } else if (d < rOuter) {
        shell.push(i);
      } else {
        outside.push(i);
      }
    }

    return {
      insideByDuplex: Array.from(byDuplex.entries()),
      shellIndices: shell,
      outsideIndices: outside,
    };
  }, [positions, nBeads, referenceIndex, center, rInner, rOuter, duplexIds]);

  return (
    <group>
      {/* Reference bead */}
      <ReferenceBead positions={positions} index={referenceIndex} radius={beadRadius * 1.4} />

      {/* Inside beads — one instanced mesh per duplex color */}
      {insideByDuplex.map(([did, indices]) => (
        <InsideGroup
          key={did}
          positions={positions}
          indices={indices}
          color={DUPLEX_COLORS[did % DUPLEX_COLORS.length]}
          radius={beadRadius}
        />
      ))}

      {/* Shell beads */}
      {shellIndices.length > 0 && (
        <ShellGroup
          positions={positions}
          indices={shellIndices}
          radius={beadRadius * 1.15}
        />
      )}

      {/* Outside beads — faint dots */}
      {outsideIndices.length > 0 && (
        <OutsidePoints positions={positions} indices={outsideIndices} />
      )}
    </group>
  );
}

/* ── Reference bead ────────────────────────────────────────── */

function ReferenceBead({
  positions,
  index,
  radius,
}: {
  positions: Float32Array;
  index: number;
  radius: number;
}) {
  const pos: [number, number, number] = [
    positions[3 * index],
    positions[3 * index + 1],
    positions[3 * index + 2],
  ];

  return (
    <mesh position={pos} renderOrder={5}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#fbbf24"
        emissiveIntensity={0.4}
        roughness={0.35}
        metalness={0}
      />
    </mesh>
  );
}

/* ── Inside beads (one duplex color group) ────────────────── */

function InsideGroup({
  positions,
  indices,
  color,
  radius,
}: {
  positions: Float32Array;
  indices: number[];
  color: string;
  radius: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(radius, radius, radius);
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      pos.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
      mat.compose(pos, quat, scale);
      mesh.setMatrixAt(k, mat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [positions, indices, radius]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, indices.length]} frustumCulled={false} renderOrder={3}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color={color} opacity={0.9} transparent roughness={0.45} metalness={0} />
    </instancedMesh>
  );
}

/* ── Shell beads ──────────────────────────────────────────── */

function ShellGroup({
  positions,
  indices,
  radius,
}: {
  positions: Float32Array;
  indices: number[];
  radius: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(radius, radius, radius);
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      pos.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
      mat.compose(pos, quat, scale);
      mesh.setMatrixAt(k, mat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [positions, indices, radius]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, indices.length]} frustumCulled={false} renderOrder={4}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={0.35}
        roughness={0.3}
        metalness={0}
      />
    </instancedMesh>
  );
}

/* ── Outside beads (Points) ───────────────────────────────── */

function OutsidePoints({
  positions,
  indices,
}: {
  positions: Float32Array;
  indices: number[];
}) {
  const pointPositions = useMemo(() => {
    const arr = new Float32Array(indices.length * 3);
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      arr[3 * k] = positions[3 * i];
      arr[3 * k + 1] = positions[3 * i + 1];
      arr[3 * k + 2] = positions[3 * i + 2];
    }
    return arr;
  }, [positions, indices]);

  return (
    <points renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pointPositions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#94a3b8"
        transparent
        opacity={0.12}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
