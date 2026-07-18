"use client";

import * as THREE from "three";

/**
 * Probe sphere + shell annulus for RDF visualization.
 *
 * - Fill sphere (0 → r): soft translucent cyan volume
 * - Boundary sphere at r: slightly stronger outline
 * - Shell annulus (r ± dr/2): amber band marking the counting shell
 */
export function RDFProbeLayer({
  center,
  radius,
  shellWidth,
}: {
  center: [number, number, number];
  radius: number;
  shellWidth: number;
}) {
  if (radius <= 0) return null;

  const shellInner = Math.max(0, radius - shellWidth * 0.5);
  const shellOuter = radius + shellWidth * 0.5;

  return (
    <group position={center}>
      {/* Accumulated volume fill */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color="#06b6d4"
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Boundary at r */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Shell annulus — explicit inner and outer boundaries */}
      {shellOuter > shellInner && (
        <>
          {shellInner > 0 && (
            <mesh renderOrder={3}>
              <sphereGeometry args={[shellInner, 48, 48]} />
              <meshStandardMaterial
                color="#f59e0b"
                transparent
                opacity={0.24}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          <mesh renderOrder={3}>
            <sphereGeometry args={[shellOuter, 48, 48]} />
            <meshStandardMaterial
              color="#f59e0b"
              transparent
              opacity={0.2}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
