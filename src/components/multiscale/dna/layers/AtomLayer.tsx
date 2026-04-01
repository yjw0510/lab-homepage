"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// RasMol CPK colors (standard structural biology)
const ELEMENT_COLORS: Record<string, string> = {
  C: "#C8C8C8",  // light gray
  N: "#8F8FFF",  // blue-purple
  O: "#F00000",  // red
  P: "#FFA500",  // orange
  H: "#FFFFFF",  // white
  S: "#FFC832",  // yellow
};

const ELEMENT_RADII: Record<string, number> = {
  C: 0.050,
  N: 0.048,
  O: 0.046,
  P: 0.058,
  H: 0.025,
  S: 0.054,
};

interface ElementGroup {
  element: string;
  indices: number[];
}

/**
 * Instanced atom sphere rendering — one InstancedMesh per element type
 * for reliable per-element coloring.
 */
export function AtomLayer({
  positions,
  elements,
  opacity = 1,
  center,
}: {
  positions: Float32Array;
  elements: string[];
  opacity?: number;
  center?: [number, number, number];
}) {
  const cx = center?.[0] ?? 0;
  const cy = center?.[1] ?? 0;
  const cz = center?.[2] ?? 0;

  // Group atoms by element type
  const groups = useMemo<ElementGroup[]>(() => {
    const map = new Map<string, number[]>();
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (!map.has(el)) map.set(el, []);
      map.get(el)!.push(i);
    }
    return Array.from(map.entries()).map(([element, indices]) => ({ element, indices }));
  }, [elements]);

  if (positions.length === 0) return null;

  return (
    <group>
      {groups.map((group) => (
        <ElementMesh
          key={group.element}
          element={group.element}
          indices={group.indices}
          positions={positions}
          cx={cx}
          cy={cy}
          cz={cz}
          opacity={opacity}
        />
      ))}
    </group>
  );
}

function ElementMesh({
  element,
  indices,
  positions,
  cx,
  cy,
  cz,
  opacity,
}: {
  element: string;
  indices: number[];
  positions: Float32Array;
  cx: number;
  cy: number;
  cz: number;
  opacity: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const radius = ELEMENT_RADII[element] ?? 0.045;
  const color = ELEMENT_COLORS[element] ?? "#888888";

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(radius, radius, radius);

    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      pos.set(positions[3 * i] - cx, positions[3 * i + 1] - cy, positions[3 * i + 2] - cz);
      mat.compose(pos, quat, scale);
      mesh.setMatrixAt(k, mat);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [indices, positions, cx, cy, cz, radius]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, indices.length]} renderOrder={0} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 20]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
        roughness={0.35}
        metalness={0.05}
      />
    </instancedMesh>
  );
}
