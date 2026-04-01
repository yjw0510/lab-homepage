"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERT = /* glsl */ `
varying float vEdgeT;
varying vec3 vInstColor;

void main() {
  vEdgeT = position.y + 0.5;
  vInstColor = vec3(0.0);
  #ifdef USE_INSTANCING_COLOR
    vInstColor = instanceColor;
  #endif
  vec4 transformed = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    transformed = instanceMatrix * transformed;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * transformed;
}
`;

const FRAG = /* glsl */ `
varying float vEdgeT;
varying vec3 vInstColor;
uniform float uTime;
uniform vec3 uColor;

void main() {
  float phase = vInstColor.r;
  float speed = 0.10 + vInstColor.g * 0.15;
  // Ping-pong: wavepacket travels bead→bead→bead
  float raw = fract(uTime * speed + phase);
  float wavePos = 1.0 - abs(raw * 2.0 - 1.0);

  float d = abs(vEdgeT - wavePos);
  float glow = exp(-120.0 * d * d);

  vec3 color = uColor * (0.08 + 3.0 * glow);
  float alpha = 0.015 + 0.985 * glow;
  gl_FragColor = vec4(color, alpha);
}
`;

/** Deterministic phase from bead pair indices. */
function pairPhase(i: number, j: number): number {
  return ((i * 31 + j * 17) % 1000) / 1000;
}
function pairSpeed(i: number, j: number): number {
  return ((i * 13 + j * 47) % 1000) / 1000;
}

const DEFAULT_COLOR: [number, number, number] = [0.25, 0.65, 1.0];

/**
 * All N(N-1)/2 pairwise edges as thin instanced cylinders.
 * Each edge carries a light-emitting wavepacket that ping-pongs
 * between the two beads (additive blending, custom ShaderMaterial).
 */
export function PairEdgeLayer({
  positions,
  color = DEFAULT_COLOR,
  radius = 0.004,
}: {
  positions: Float32Array;
  color?: [number, number, number];
  radius?: number;
}) {
  const nBeads = positions.length / 3;
  const nPairs = (nBeads * (nBeads - 1)) / 2;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 4, 1, true), []);

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
    if (!mesh || nBeads === 0) return;

    const m = new THREE.Matrix4();
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const c = new THREE.Color();

    let idx = 0;
    for (let i = 0; i < nBeads; i++) {
      for (let j = i + 1; j < nBeads; j++) {
        from.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
        to.set(positions[3 * j], positions[3 * j + 1], positions[3 * j + 2]);
        mid.addVectors(from, to).multiplyScalar(0.5);
        dir.subVectors(to, from);
        const len = dir.length();
        dir.normalize();
        q.setFromUnitVectors(up, dir);
        s.set(radius, len, radius);
        m.compose(mid, q, s);
        mesh.setMatrixAt(idx, m);

        c.setRGB(pairPhase(i, j), pairSpeed(i, j), 0);
        mesh.setColorAt(idx, c);
        idx++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    material.needsUpdate = true;
  }, [positions, nBeads, radius, material]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  if (nPairs === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, material, nPairs]}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}
