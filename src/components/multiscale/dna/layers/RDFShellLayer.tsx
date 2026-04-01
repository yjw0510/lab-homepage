"use client";

import * as THREE from "three";

/**
 * Translucent sphere overlay for RDF shell visualization.
 */
export function RDFShellLayer({
  center,
  radius,
  color = "#06b6d4",
  opacity = 0.06,
}: {
  center: [number, number, number];
  radius: number;
  color?: string;
  opacity?: number;
}) {
  if (radius <= 0) return null;

  return (
    <mesh position={center} renderOrder={1}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
