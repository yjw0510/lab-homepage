"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeMesoPairCorrelation, type MesoFramesData } from "../data/mesoPairCorrelation";
import { getTimedValue, getViewSpec } from "../multiscaleViewSchedule";
import { getSubsetIndices, type SubsetAwareData } from "../multiscaleViewRuntime";
import type { ScrollState } from "../scrollState";
import { cachedJsonFetch } from "../ThreeMultiscaleStage";

const ELEMENT_COLORS: Record<string, string> = {
  C: "#94a3b8",
  H: "#ffffff",
  O: "#f97316",
  N: "#38bdf8",
  P: "#f59e0b",
};

const ELEMENT_RADII: Record<string, number> = {
  H: 0.36,
  C: 0.51,
  N: 0.47,
  O: 0.46,
  P: 0.54,
};

const MONOMER_COLORS = [
  "#f59e0b", "#06b6d4", "#8b5cf6", "#ef4444",
  "#22c55e", "#ec4899", "#f97316", "#3b82f6",
];

interface PolymerData {
  atoms: number[][];
  elements: string[];
  bonds: number[][];
  monomerMap: number[][];
  beadPositions: number[][];
  beadBonds: number[][];
  nMonomers: number;
  strandIds?: number[];
  duplexIds?: number[];
  basePairIds?: number[];
  pairedBeadIndices?: number[];
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
  referenceBeadIndex?: number;
}

function cylinderQuaternion(from: THREE.Vector3, to: THREE.Vector3): THREE.Quaternion {
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
}

// Schedule-authoritative step fractions.
// All phase values are read from the schedule's timing spec via getTimedValue.
function getStepFractions(step: number, p: number) {
  const t = getViewSpec("meso", step).timing;

  const beadIn = getTimedValue(t, "beadOpacity", p, step >= 2 ? 1 : 0);
  const hullIn = getTimedValue(t, "hullOpacity", p, 0);
  const mapIn = getTimedValue(t, "mappingOpacity", p, 0);
  const bondGlowIn = getTimedValue(t, "bondGlowOpacity", p, 0);
  const thermalIn = getTimedValue(t, "thermalAmplitude", p, 0);
  const bundleIn = getTimedValue(t, "bundleOpacity", p, step === 5 ? 1 : 0);

  return {
    atomOpacity:
      step === 0 ? 1 - getTimedValue(t, "atomOpacity", p, 0) :
      step === 1 ? Math.max(0, 0.82 - getTimedValue(t, "atomOpacity", p, 0) * 0.82) : 0,
    hullOpacity: step === 1 ? 0.05 + hullIn * 0.06 : 0,
    beadOpacity:
      step === 0 ? beadIn * 0.36 :
      step === 1 ? 0.18 + beadIn * 0.64 :
      step === 5 ? 0.82 + bundleIn * 0.1 :
      step >= 2 ? 0.82 + beadIn * 0.1 : 0,
    mappingOpacity: mapIn * 0.38,
    bondGlowOpacity: bondGlowIn * 0.32,
    thermalAmplitude: step === 3 ? 0.03 + thermalIn * 0.11 : 0,
    showMapping: step === 1 && mapIn > 0,
    showBondEmphasis: step === 2 && bondGlowIn > 0,
    showBeadBonds: step >= 2,
  };
}

export function MesoScene({
  progressRef,
  scrollState,
  isMobile,
  transitionIn,
  transitionOut,
  autoRotateRef,
}: {
  progressRef: React.RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  transitionIn: number;
  transitionOut: number;
  autoRotateRef: React.RefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beadMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  void progressRef;

  const [polymerData, setPolymerData] = useState<PolymerData | null>(null);
  const [framesData, setFramesData] = useState<MesoFramesData | null>(null);

  useEffect(() => {
    cachedJsonFetch<PolymerData>("/data/multiscale/meso/polymer.json")
      .then(setPolymerData)
      .catch(() => {});
    cachedJsonFetch<MesoFramesData>("/data/multiscale/meso/frames.json")
      .then(setFramesData)
      .catch(() => {});
  }, []);

  const center = useMemo(() => {
    if (!polymerData) return new THREE.Vector3();
    const next = new THREE.Vector3();
    polymerData.atoms.forEach(([x, y, z]) => next.add(new THREE.Vector3(x, y, z)));
    return next.divideScalar(polymerData.atoms.length);
  }, [polymerData]);

  const atomVecs = useMemo(
    () => polymerData?.atoms.map(([x, y, z]) => new THREE.Vector3(x - center.x, y - center.y, z - center.z)) ?? [],
    [center, polymerData],
  );

  const beadVecs = useMemo(
    () => polymerData?.beadPositions.map(([x, y, z]) => new THREE.Vector3(x - center.x, y - center.y, z - center.z)) ?? [],
    [center, polymerData],
  );

  // Separate render visibility from camera focus.
  // renderSubsetId controls what's drawn; cameraSubsetId controls emphasis (mapping lines).
  const mesoMeta = polymerData as PolymerData & SubsetAwareData;
  const view = getViewSpec("meso", scrollState.step);
  const renderSubsetId = view.renderSubsetId ?? view.cameraSubsetId;
  const focusSubsetId = view.cameraSubsetId;

  const visibleBeadIndices = useMemo(
    () =>
      renderSubsetId === "all_beads"
        ? Array.from({ length: beadVecs.length }, (_, i) => i)
        : getSubsetIndices(mesoMeta, renderSubsetId, beadVecs.length),
    [renderSubsetId, beadVecs.length, mesoMeta],
  );
  const visibleBeadIndexSet = useMemo(() => new Set(visibleBeadIndices), [visibleBeadIndices]);

  const focusedBeadIndices = useMemo(
    () => getSubsetIndices(mesoMeta, focusSubsetId, beadVecs.length),
    [focusSubsetId, beadVecs.length, mesoMeta],
  );
  const focusedBeadIndexSet = useMemo(() => new Set(focusedBeadIndices), [focusedBeadIndices]);

  // Atom visibility derived from visible beads
  const visibleAtomIndices = useMemo(() => {
    if (!polymerData) return [];
    const mapped = visibleBeadIndices.flatMap((index) => polymerData.monomerMap[index] ?? []);
    return Array.from(new Set(mapped));
  }, [visibleBeadIndices, polymerData]);
  const visibleAtomIndexSet = useMemo(() => new Set(visibleAtomIndices), [visibleAtomIndices]);

  const pairCorrelation = useMemo(
    () => (framesData ? computeMesoPairCorrelation(framesData) : null),
    [framesData],
  );

  const pairCorrelationVecs = useMemo(
    () => pairCorrelation?.centeredBeads.map(([x, y, z]) => new THREE.Vector3(x, y, z)) ?? [],
    [pairCorrelation],
  );

  const bondData = useMemo(() => {
    if (!polymerData || atomVecs.length === 0) return [];
    return polymerData.bonds.map(([i, j]) => {
      const from = atomVecs[i];
      const to = atomVecs[j];
      return {
        i,
        j,
        mid: from.clone().add(to).multiplyScalar(0.5),
        len: from.distanceTo(to),
        quat: cylinderQuaternion(from, to),
      };
    });
  }, [atomVecs, polymerData]);

  const beadBondData = useMemo(() => {
    if (!polymerData || beadVecs.length === 0) return [];
    return polymerData.beadBonds.map(([i, j]) => {
      const from = beadVecs[i];
      const to = beadVecs[j];
      return {
        i,
        j,
        mid: from.clone().add(to).multiplyScalar(0.5),
        len: from.distanceTo(to),
        quat: cylinderQuaternion(from, to),
        sameStrand:
          polymerData.strandIds?.[i] !== undefined &&
          polymerData.strandIds?.[i] === polymerData.strandIds?.[j],
        sameBasePair:
          polymerData.basePairIds?.[i] !== undefined &&
          polymerData.basePairIds?.[i] === polymerData.basePairIds?.[j],
      };
    });
  }, [beadVecs, polymerData]);

  // Mapping lines use focused subset (camera focus) for emphasis
  const mappingLines = useMemo(() => {
    if (!polymerData || beadVecs.length === 0) return [];
    const lines: { beadIndex: number; atomIndex: number; mid: THREE.Vector3; len: number; quat: THREE.Quaternion }[] = [];
    focusedBeadIndices.forEach((beadIndex) => {
      const bead = beadVecs[beadIndex];
      const mappedAtoms = (polymerData.monomerMap[beadIndex] ?? []).slice(0, 3);
      mappedAtoms.forEach((atomIndex) => {
        const atom = atomVecs[atomIndex];
        if (!atom) return;
        lines.push({
          beadIndex,
          atomIndex,
          mid: bead.clone().add(atom).multiplyScalar(0.5),
          len: bead.distanceTo(atom),
          quat: cylinderQuaternion(bead, atom),
        });
      });
    });
    return lines;
  }, [focusedBeadIndices, atomVecs, beadVecs, polymerData]);

  const correlationDistances = useMemo(() => {
    if (!pairCorrelation || pairCorrelationVecs.length === 0) return [];
    const reference = pairCorrelationVecs[pairCorrelation.referenceIndex];
    return pairCorrelationVecs.map((vector) => vector.distanceTo(reference));
  }, [pairCorrelation, pairCorrelationVecs]);

  const correlationDisplayVecs = useMemo(() => {
    if (!pairCorrelation || pairCorrelationVecs.length === 0) return [];
    const reference = pairCorrelationVecs[pairCorrelation.referenceIndex];
    return pairCorrelationVecs.map((vector) => vector.clone().sub(reference));
  }, [pairCorrelation, pairCorrelationVecs]);

  const f = getStepFractions(scrollState.step, scrollState.stepProgress);
  const showCorrelationOverlay = scrollState.step === 4 && !!pairCorrelation && pairCorrelationVecs.length > 0;
  const shellPhase = getTimedValue(getViewSpec("meso", 4).timing, "shellRadius", scrollState.stepProgress, scrollState.stepProgress);
  const neighborPhase = getTimedValue(getViewSpec("meso", 4).timing, "neighborReveal", scrollState.stepProgress, 1);
  const firstShellRadius = pairCorrelation?.shellRadii[0] ?? 0;
  const secondShellRadius = pairCorrelation?.shellRadii[1] ?? firstShellRadius * 1.75;
  const shellGrowthLimit = Math.max(firstShellRadius * 1.2, secondShellRadius * 1.12);
  const activeShellRadius = pairCorrelation
    ? Math.min(
        shellGrowthLimit,
        firstShellRadius * 0.55 + shellPhase * Math.max(0.01, shellGrowthLimit - firstShellRadius * 0.55),
      )
    : 0;
  const highlightedByRadius = correlationDistances.map((distance, index) => {
    if (index === pairCorrelation?.referenceIndex) return false;
    return neighborPhase > 0 && distance <= activeShellRadius;
  });

  useFrame((state) => {
    if (!groupRef.current) return;
    const opacity = transitionIn * (1 - transitionOut);
    groupRef.current.scale.setScalar(Math.max(0.01, opacity));
    if (autoRotateRef.current) groupRef.current.rotation.y += 0.001;

    const time = state.clock.elapsedTime;
    beadMeshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const base = showCorrelationOverlay ? (correlationDisplayVecs[index] ?? beadVecs[index]) : beadVecs[index];
      if (!base) return;
      if (scrollState.step === 3 && !showCorrelationOverlay) {
        const amplitude = f.thermalAmplitude + (index % 5) * 0.006;
        const dx = Math.sin(time * (2.8 + (index % 7) * 0.15) + index * 0.8) * amplitude;
        const dy = Math.cos(time * (3.2 + (index % 6) * 0.11) + index * 0.6) * amplitude * 0.8;
        const dz = Math.sin(time * (2.2 + (index % 4) * 0.2) + index * 1.1) * amplitude * 0.75;
        mesh.position.set(base.x + dx, base.y + dy, base.z + dz);
      } else {
        mesh.position.set(base.x, base.y, base.z);
      }
    });
  });

  if (!polymerData || atomVecs.length === 0) return <group ref={groupRef} />;

  return (
    <group ref={groupRef}>
      {/* Atoms — visible in steps 0-1 only */}
      {f.atomOpacity > 0 && (
        <group>
          {atomVecs.map((pos, i) => {
            if (!visibleAtomIndexSet.has(i)) return null;
            const elem = polymerData.elements[i];
            if (elem === "H" && isMobile) return null;
            const radius = ELEMENT_RADII[elem] ?? 0.22;
            const color = ELEMENT_COLORS[elem] ?? "#888888";
            const seg = elem === "H" ? 16 : isMobile ? 12 : 24;
            return (
              <mesh key={`a-${i}`} position={[pos.x, pos.y, pos.z]} renderOrder={0}>
                <sphereGeometry args={[radius, seg, seg]} />
                <meshStandardMaterial color={color} transparent opacity={f.atomOpacity} depthWrite={false} roughness={0.6} />
              </mesh>
            );
          })}
          {bondData
            .filter((bond) => visibleAtomIndexSet.has(bond.i) && visibleAtomIndexSet.has(bond.j))
            .map((bond, i) => (
            <mesh key={`b-${i}`} position={[bond.mid.x, bond.mid.y, bond.mid.z]} quaternion={bond.quat} renderOrder={0}>
              <cylinderGeometry args={[0.07, 0.07, bond.len, isMobile ? 6 : 12]} />
              <meshStandardMaterial color="#666666" transparent opacity={f.atomOpacity * 0.7} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* Mapping lines — uses focused subset for emphasis */}
      {f.showMapping &&
        mappingLines.map((line, index) => (
          <mesh key={`map-${index}`} position={[line.mid.x, line.mid.y, line.mid.z]} quaternion={line.quat} renderOrder={4}>
            <cylinderGeometry args={[0.03, 0.03, line.len, isMobile ? 6 : 12]} />
            <meshStandardMaterial color="#eab308" transparent opacity={f.mappingOpacity} depthWrite={false} emissive="#eab308" emissiveIntensity={0.3} />
          </mesh>
        ))}

      {/* Hulls — render before beads, FrontSide only */}
      {f.hullOpacity > 0 &&
        polymerData.monomerMap.map((monomerAtoms, monomerIndex) => {
          if (!visibleBeadIndexSet.has(monomerIndex)) return null;
          const bead = beadVecs[monomerIndex];
          if (!bead) return null;
          let maxDist = 0;
          for (const atomIndex of monomerAtoms) {
            const atom = atomVecs[atomIndex];
            if (!atom) continue;
            maxDist = Math.max(maxDist, atom.distanceTo(bead));
          }
          return (
            <mesh key={`hull-${monomerIndex}`} position={[bead.x, bead.y, bead.z]} renderOrder={1}>
              <sphereGeometry args={[Math.max(0.9, maxDist * 0.92), isMobile ? 16 : 32, isMobile ? 16 : 32]} />
              <meshStandardMaterial
                color={MONOMER_COLORS[monomerIndex % MONOMER_COLORS.length]}
                transparent
                opacity={f.hullOpacity}
                depthWrite={false}
                side={THREE.FrontSide}
              />
            </mesh>
          );
        })}

      {/* CG beads — always visible for all beads in renderSubset.
          In step 4 (pair correlation), non-highlighted beads are dimmed. */}
      {f.beadOpacity > 0 &&
        beadVecs.map((pos, i) => {
          if (!visibleBeadIndexSet.has(i)) return null;
          const isReference = showCorrelationOverlay && i === pairCorrelation?.referenceIndex;
          const isHighlighted = showCorrelationOverlay && highlightedByRadius[i];
          const dimmed = showCorrelationOverlay && !isReference && !isHighlighted;
          const basePos = showCorrelationOverlay ? (correlationDisplayVecs[i] ?? pos) : pos;
          return (
            <mesh
              key={`bead-${i}`}
              ref={(node) => {
                beadMeshRefs.current[i] = node;
              }}
              position={[basePos.x, basePos.y, basePos.z]}
              renderOrder={2}
            >
              <sphereGeometry args={[isReference ? 0.69 : 0.82, isMobile ? 16 : 32, isMobile ? 16 : 32]} />
              <meshStandardMaterial
                color={isReference ? "#06b6d4" : MONOMER_COLORS[i % MONOMER_COLORS.length]}
                transparent
                opacity={dimmed ? 0.12 : isReference ? 0.96 : f.beadOpacity}
                depthWrite={false}
                roughness={0.3}
                metalness={0.08}
                emissive={isReference ? "#06b6d4" : isHighlighted ? "#f59e0b" : undefined}
                emissiveIntensity={isReference ? 0.55 : isHighlighted ? 0.18 : 0}
              />
            </mesh>
          );
        })}

      {/* Bead bonds */}
      {f.showBeadBonds &&
        beadBondData
          .filter((bond) => visibleBeadIndexSet.has(bond.i) && visibleBeadIndexSet.has(bond.j))
          .map((bond, i) => (
          <mesh key={`bb-${i}`} position={[bond.mid.x, bond.mid.y, bond.mid.z]} quaternion={bond.quat} renderOrder={3}>
            <cylinderGeometry args={[bond.sameStrand ? 0.14 : 0.10, bond.sameStrand ? 0.14 : 0.10, bond.len, isMobile ? 6 : 12]} />
            <meshStandardMaterial
              color={bond.sameStrand ? "#f59e0b" : "#38bdf8"}
              transparent
              opacity={(bond.sameStrand ? 0.62 : 0.52) * (showCorrelationOverlay ? 0.15 : 1)}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Bond glow emphasis (step 2 only) */}
      {f.showBondEmphasis &&
        beadBondData
          .filter((bond) => visibleBeadIndexSet.has(bond.i) && visibleBeadIndexSet.has(bond.j))
          .map((bond, i) => (
          <mesh key={`bond-glow-${i}`} position={[bond.mid.x, bond.mid.y, bond.mid.z]} quaternion={bond.quat} renderOrder={5}>
            <cylinderGeometry args={[0.23, 0.23, bond.len, isMobile ? 6 : 12]} />
            <meshStandardMaterial color="#4ecdc4" transparent opacity={f.bondGlowOpacity} depthWrite={false} emissive="#4ecdc4" emissiveIntensity={0.6} />
          </mesh>
        ))}

      {/* Pair correlation shell overlay (step 4) */}
      {showCorrelationOverlay && (
        <mesh position={[0, 0, 0]} renderOrder={1}>
          <sphereGeometry args={[activeShellRadius, isMobile ? 18 : 36, isMobile ? 18 : 36]} />
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.022} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      <pointLight position={[4, 3, 5]} intensity={0.75} color="#dbeafe" />
      <pointLight position={[-5, -3, 4]} intensity={0.32} color="#f59e0b" />
    </group>
  );
}
