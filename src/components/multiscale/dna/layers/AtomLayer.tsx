"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ELEMENT_HEX, FALLBACK_HEX } from "../../ballAndStick";

// RasMol CPK colors (standard structural biology)
// The palette and the radii both come from ballAndStick.ts. These scenes carried a third
// set of element colours, so the same oxygen was one red here and another in the all-atom
// tier two pages earlier.



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
  scale = 1,
  ball,
  center,
}: {
  positions: Float32Array;
  elements: string[];
  /** Drawn radius per element. Comes from `ballAndStick`, measured on this scene's own
   *  bond lengths, so a ball can never be wider than the bond it sits on. */
  ball: (element: string) => number;
  opacity?: number;
  /** Multiplies every element radius. Opacity alone cannot make a dense scene faint: these
   *  spheres do not write depth while transparent, so alpha accumulates along the view and
   *  1,476 of them at 0.12 each still composite to nearly solid. Coverage goes as the square
   *  of the radius, so shrinking is the knob that actually thins the scene out. */
  scale?: number;
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
          scale={scale}
          ball={ball}
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
  scale: scaleFactor,
  ball,
}: {
  element: string;
  indices: number[];
  positions: Float32Array;
  cx: number;
  cy: number;
  cz: number;
  opacity: number;
  scale: number;
  ball: (element: string) => number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const radius = ball(element) * scaleFactor;
  const color = ELEMENT_HEX[element] ?? FALLBACK_HEX;

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
