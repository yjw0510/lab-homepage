"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";

export interface BondLayerHandle {
  update: (positions: Float32Array) => void;
}

interface BondLayerProps {
  /** Initial positions (also used for static scenes). */
  positions?: Float32Array;
  bonds: [number, number][];
  radius?: number;
  color?: string;
  opacity?: number;
  center?: [number, number, number];
  maxBondLength?: number;
}

export const BondLayer = forwardRef<BondLayerHandle, BondLayerProps>(
  function BondLayer(
    {
      positions,
      bonds,
      radius = 0.08,
      color = "#666666",
      opacity = 1,
      center,
      maxBondLength = 3.0,
    },
    ref,
  ) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const cx = center?.[0] ?? 0;
    const cy = center?.[1] ?? 0;
    const cz = center?.[2] ?? 0;

    // Shared scratch objects
    const scratch = useMemo(() => ({
      mat: new THREE.Matrix4(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      mid: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      quat: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
    }), []);

    const updateMatrices = useMemo(() => {
      return (pos: Float32Array) => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const { mat, from, to, mid, dir, up, quat, scale } = scratch;
        const maxSq = maxBondLength * maxBondLength;
        let visible = 0;

        for (let bi = 0; bi < bonds.length; bi++) {
          const [i, j] = bonds[bi];
          const dx = pos[3 * i] - pos[3 * j];
          const dy = pos[3 * i + 1] - pos[3 * j + 1];
          const dz = pos[3 * i + 2] - pos[3 * j + 2];
          if (dx * dx + dy * dy + dz * dz >= maxSq) continue;

          from.set(pos[3 * i] - cx, pos[3 * i + 1] - cy, pos[3 * i + 2] - cz);
          to.set(pos[3 * j] - cx, pos[3 * j + 1] - cy, pos[3 * j + 2] - cz);

          mid.addVectors(from, to).multiplyScalar(0.5);
          dir.subVectors(to, from);
          const len = dir.length();
          dir.normalize();
          quat.setFromUnitVectors(up, dir);

          scale.set(radius, len, radius);
          mat.compose(mid, quat, scale);
          mesh.setMatrixAt(visible++, mat);
        }

        mesh.count = visible;
        mesh.instanceMatrix.needsUpdate = true;
      };
    }, [bonds, radius, cx, cy, cz, maxBondLength, scratch]);

    useImperativeHandle(ref, () => ({ update: updateMatrices }), [updateMatrices]);

    // Props-based static init
    useLayoutEffect(() => {
      if (positions) updateMatrices(positions);
    }, [positions, updateMatrices]);

    if (bonds.length === 0) return null;

    return (
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, bonds.length]}
        renderOrder={0}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity >= 1}
        />
      </instancedMesh>
    );
  },
);
