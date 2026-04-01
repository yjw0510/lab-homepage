"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERT = /* glsl */ `
varying float vChainPos;

void main() {
  vChainPos = 0.0;
  #ifdef USE_INSTANCING_COLOR
    vChainPos = instanceColor.r;
  #endif
  vec4 transformed = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    transformed = instanceMatrix * transformed;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * transformed;
}
`;

const FRAG = /* glsl */ `
varying float vChainPos;
uniform float uTime;
uniform vec3 uColor;

void main() {
  // Ping-pong wave along the chain
  float raw = fract(uTime * 0.35);
  float waveCenter = 1.0 - abs(raw * 2.0 - 1.0);

  float d = abs(vChainPos - waveCenter);
  d = min(d, 1.0 - d);
  float glow = exp(-35.0 * d * d);

  vec3 color = uColor * (0.15 + 2.8 * glow);
  float alpha = 0.06 + 0.94 * glow;
  gl_FragColor = vec4(color, alpha);
}
`;

const DEFAULT_COLOR: [number, number, number] = [1.0, 0.6, 0.13];

/**
 * N-1 backbone bonds as instanced cylinders with a traveling glow wave.
 * A bright pulse sweeps along the chain (additive blending).
 */
export function GlowBondLayer({
  positions,
  bonds,
  color = DEFAULT_COLOR,
  radius = 0.025,
}: {
  positions: Float32Array;
  bonds: [number, number][];
  color?: [number, number, number];
  radius?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(...color) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || bonds.length === 0) return;

    const m = new THREE.Matrix4();
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const c = new THREE.Color();

    for (let bi = 0; bi < bonds.length; bi++) {
      const [i, j] = bonds[bi];
      from.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
      to.set(positions[3 * j], positions[3 * j + 1], positions[3 * j + 2]);
      mid.addVectors(from, to).multiplyScalar(0.5);
      dir.subVectors(to, from);
      const len = dir.length();
      dir.normalize();
      q.setFromUnitVectors(up, dir);
      s.set(radius, len, radius);
      m.compose(mid, q, s);
      mesh.setMatrixAt(bi, m);

      // Chain position: bond index / total → determines when this bond glows
      c.setRGB(bi / bonds.length, 0, 0);
      mesh.setColorAt(bi, c);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    material.needsUpdate = true;
  }, [positions, bonds, radius, material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  if (bonds.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, material, bonds.length]}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}
