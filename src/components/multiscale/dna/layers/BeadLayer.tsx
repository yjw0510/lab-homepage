"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";

const DUPLEX_COLORS = [
  "#f59e0b", "#06b6d4", "#8b5cf6", "#ef4444",
  "#22c55e", "#ec4899", "#f97316", "#3b82f6",
  "#a855f7", "#14b8a6", "#f43f5e", "#eab308",
];

export interface BeadLayerHandle {
  update: (positions: Float32Array) => void;
}

interface BeadLayerProps {
  /** Initial positions (also used for static scenes). */
  positions?: Float32Array;
  count?: number;
  duplexIds?: number[];
  radius?: number;
  opacity?: number;
  highlightSet?: Set<number>;
  highlightColor?: string;
}

export const BeadLayer = forwardRef<BeadLayerHandle, BeadLayerProps>(
  function BeadLayer(
    {
      positions,
      count: countProp,
      duplexIds,
      radius = 0.17,
      opacity = 1,
      highlightSet,
      highlightColor = "#06b6d4",
    },
    ref,
  ) {
    const count = countProp ?? (positions ? positions.length / 3 : 0);
    const hasHighlights = highlightSet && highlightSet.size > 0;

    // Group beads by duplex + highlight status
    const meshes = useMemo(() => {
      const byDuplex = new Map<number, { normal: number[]; highlighted: number[] }>();
      for (let i = 0; i < count; i++) {
        const did = duplexIds?.[i] ?? (i % 12);
        if (!byDuplex.has(did)) byDuplex.set(did, { normal: [], highlighted: [] });
        const group = byDuplex.get(did)!;
        if (hasHighlights && highlightSet!.has(i)) {
          group.highlighted.push(i);
        } else {
          group.normal.push(i);
        }
      }
      const result: Array<{ indices: number[]; color: string; isHighlight: boolean }> = [];
      for (const [did, group] of byDuplex) {
        const baseColor = DUPLEX_COLORS[did % DUPLEX_COLORS.length];
        if (group.normal.length > 0) {
          result.push({ indices: group.normal, color: baseColor, isHighlight: false });
        }
        if (group.highlighted.length > 0) {
          result.push({ indices: group.highlighted, color: highlightColor, isHighlight: true });
        }
      }
      return result;
    }, [count, duplexIds, hasHighlights, highlightSet, highlightColor]);

    // Shared scratch objects (never reallocated)
    const scratch = useMemo(() => ({
      mat: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
    }), []);

    const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

    // Imperative update: write positions into instanced matrices
    const updateMatrices = useMemo(() => {
      return (pos: Float32Array) => {
        const { mat, pos: v, quat } = scratch;
        for (let g = 0; g < meshes.length; g++) {
          const mesh = meshRefs.current[g];
          if (!mesh) continue;
          const indices = meshes[g].indices;
          const r = meshes[g].isHighlight ? radius * 1.15 : radius;
          const scale = new THREE.Vector3(r, r, r);
          for (let k = 0; k < indices.length; k++) {
            const i = indices[k];
            v.set(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
            mat.compose(v, quat, scale);
            mesh.setMatrixAt(k, mat);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      };
    }, [meshes, radius, scratch]);

    useImperativeHandle(ref, () => ({ update: updateMatrices }), [updateMatrices]);

    // Props-based static init (for non-animated scenes like Page5)
    useLayoutEffect(() => {
      if (positions) updateMatrices(positions);
    }, [positions, updateMatrices]);

    if (count === 0) return null;

    return (
      <group>
        {meshes.map((m, idx) => (
          <instancedMesh
            key={idx}
            ref={(mesh) => { meshRefs.current[idx] = mesh; }}
            args={[undefined, undefined, m.indices.length]}
            renderOrder={2}
            castShadow
            receiveShadow
            frustumCulled={false}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              color={m.color}
              transparent={m.isHighlight ? false : opacity < 1}
              opacity={!m.isHighlight && hasHighlights ? opacity * 0.2 : opacity}
              depthWrite={(!m.isHighlight && hasHighlights ? opacity * 0.2 : opacity) >= 0.9}
              roughness={0.45}
              metalness={0.0}
              emissive={m.isHighlight ? m.color : undefined}
              emissiveIntensity={m.isHighlight ? 0.3 : 0}
            />
          </instancedMesh>
        ))}
      </group>
    );
  },
);
