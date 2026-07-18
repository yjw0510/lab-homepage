"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { withBasePath } from "@/lib/basePath";
import { DNAPageRouter } from "./dna/DNAPageRouter";
import { MLFFScene } from "./scenes/MLFFScene";
import { computeMesoPairCorrelation, type MesoFramesData } from "./data/mesoPairCorrelation";
import type { ScrollState } from "./scrollState";
import type { ResearchCameraActions } from "./molstar/shared";
import { CHOREOGRAPHY } from "./levelData";
import { MesoMechanism } from "./overlays/MesoMechanism";
import { MlffMechanism } from "./overlays/MlffMechanism";
import {
  applyThreePlacement,
  computeScheduledPlacement,
  type SubsetAwareData,
} from "./multiscaleViewRuntime";

interface ThreeScheduleData extends SubsetAwareData {
  points: number[][];
}

interface MesoScheduleSource {
  atoms: number[][];
  beadPositions: number[][];
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
  boxDimensions?: [number, number, number];
}

interface MlffScheduleSource {
  atoms: number[][];
  focusIndex: number;
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
}

const BASE_ZOOM_INDEX = 3;
const MAX_ZOOM_INDEX = 6;

// Shared fetch cache — prevents duplicate I/O when MesoScene and ThreeStageCamera
// both request the same meso data files on mount.
const jsonFetchCache = new Map<string, Promise<unknown>>();
export function cachedJsonFetch<T>(url: string): Promise<T> {
  let promise = jsonFetchCache.get(url);
  if (!promise) {
    const resolvedUrl = withBasePath(url);
    promise = fetch(resolvedUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${resolvedUrl}: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
    jsonFetchCache.set(url, promise);
  }
  return promise as Promise<T>;
}

function centerMesoScheduleData(source: MesoScheduleSource, frames?: MesoFramesData | null): ThreeScheduleData {
  if (!Array.isArray(source.beadPositions) || source.beadPositions.length === 0) {
    return { points: [] };
  }
  const center =
    source.atoms.length > 0
      ? source.atoms.reduce(
          (acc, [x, y, z]) => [acc[0] + x, acc[1] + y, acc[2] + z],
          [0, 0, 0],
        ).map((value) => value / source.atoms.length)
      : [0, 0, 0];
  const shiftPoint = ([x, y, z]: number[]) => [x - center[0], y - center[1], z - center[2]];
  const anchors = source.anchors
    ? Object.fromEntries(
        Object.entries(source.anchors).map(([key, point]) => [key, shiftPoint(point)]),
      )
    : undefined;
  const points = source.beadPositions.map(shiftPoint);
  const subsets = { ...source.subsets };
  const pairReference = anchors?.pair_reference_center;
  if (pairReference && !subsets.pair_correlation_neighborhood) {
    const box = source.boxDimensions;
    const indices = points.reduce<number[]>((acc, point, index) => {
      let dx = point[0] - pairReference[0];
      let dy = point[1] - pairReference[1];
      let dz = point[2] - pairReference[2];
      if (box) {
        dx -= box[0] * Math.round(dx / box[0]);
        dy -= box[1] * Math.round(dy / box[1]);
        dz -= box[2] * Math.round(dz / box[2]);
      }
      if (Math.hypot(dx, dy, dz) <= 2.5) acc.push(index);
      return acc;
    }, []);
    subsets.pair_correlation_neighborhood = { indices };
  }
  if (frames?.subsets?.pair_correlation_neighborhood?.indices?.length) {
    const pairCorrelation = computeMesoPairCorrelation(frames);
    frames.subsets.pair_correlation_neighborhood.indices.forEach((globalIndex, localIndex) => {
      if (!Array.isArray(points[globalIndex]) || !pairCorrelation.centeredBeads[localIndex]) return;
      points[globalIndex] = [...pairCorrelation.centeredBeads[localIndex]];
    });
    if (anchors) {
      anchors.pair_reference_center = [0, 0, 0];
    }
  }
  return {
    points,
    subsets,
    anchors,
  };
}

function normalizeMlffScheduleData(source: MlffScheduleSource): ThreeScheduleData {
  const focus = source.atoms[source.focusIndex] ?? [0, 0, 0];
  return {
    points: source.atoms,
    subsets: source.subsets,
    anchors: source.anchors ?? { focus_center: focus },
  };
}

function ThreeStageCamera({
  scrollState,
  isMobile,
  actionsRef,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
}) {
  const { camera, size } = useThree();
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const [scheduleData, setScheduleData] = useState<ThreeScheduleData | null>(null);
  const [zoomIndex, setZoomIndex] = useState(BASE_ZOOM_INDEX);
  const [viewRevision, setViewRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (scrollState.level === "meso") {
      // Load camera data from DNA manifest (Phase 1 pipeline output)
      cachedJsonFetch<{
        camera: MesoScheduleSource;
        system?: { box_dimensions?: [number, number, number] };
      }>("/data/dna/manifest.json")
        .then((manifest) => {
          if (cancelled) return;
          // Don't pass AA atoms for centering — use CG bead positions as the reference frame.
          // The AA atoms are in a separate coordinate system (1bna.pdb crystal coords).
          const cameraData = {
            ...manifest.camera,
            atoms: [],
            boxDimensions: manifest.system?.box_dimensions,
          };
          setScheduleData(centerMesoScheduleData(cameraData, null));
        })
        .catch(() => {
          if (cancelled) return;
          setScheduleData({ points: [] });
        });
    } else {
      const path = "/data/multiscale/mlff/system.json";
      cachedJsonFetch<MesoScheduleSource | MlffScheduleSource>(path)
        .then((next) => {
          if (cancelled) return;
          setScheduleData(normalizeMlffScheduleData(next as MlffScheduleSource));
        })
        .catch(() => {
          if (cancelled) return;
          setScheduleData({ points: [] });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [scrollState.level]);

  const stepCount = CHOREOGRAPHY[scrollState.level].steps.length;

  const applyCamera = useCallback(
    (zoomLevel = zoomIndex) => {
      if (!scheduleData || scheduleData.points.length === 0) return;
      const placement = computeScheduledPlacement({
        level: scrollState.level,
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount,
        meta: scheduleData,
        points: scheduleData.points,
        aspect: size.width / Math.max(1, size.height),
        isMobile,
        zoomIndex: zoomLevel,
      });
      applyThreePlacement({
        camera,
        controls: orbitRef.current,
        placement,
      });
    },
    [camera, isMobile, scheduleData, scrollState.level, scrollState.step, scrollState.stepProgress, size.height, size.width, stepCount, zoomIndex],
  );

  useEffect(() => {
    applyCamera();
  }, [applyCamera, viewRevision]);

  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        zoomIn: () => {
          setZoomIndex((current) => Math.max(0, current - 1));
        },
        zoomOut: () => {
          setZoomIndex((current) => Math.min(MAX_ZOOM_INDEX, current + 1));
        },
        fit: () => {
          setZoomIndex(BASE_ZOOM_INDEX);
          setViewRevision((value) => value + 1);
        },
        reset: () => {
          setZoomIndex(BASE_ZOOM_INDEX);
          setViewRevision((value) => value + 1);
        },
      };
    }

    return () => {
      if (actionsRef) actionsRef.current = null;
    };
  }, [actionsRef, applyCamera]);

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enablePan={false}
      enableZoom
      minDistance={0.5}
      maxDistance={500}
      rotateSpeed={0.7}
      dampingFactor={0.08}
      enableDamping
    />
  );
}

export function ThreeMultiscaleStage({
  progressRef,
  scrollState,
  isMobile,
  autoRotateRef,
  actionsRef,
  rdfBinIndex,
  sceneKey,
  reducedMotion = false,
  lang = "en",
  hideMechanism = false,
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  rdfBinIndex?: number;
  sceneKey?: string;
  reducedMotion?: boolean;
  lang?: string;
  hideMechanism?: boolean;
}) {
  const commonProps = {
    progressRef,
    scrollState,
    isMobile,
    transitionIn: 1,
    transitionOut: 0,
    autoRotateRef,
    rdfBinIndex,
  };
  const separateMobileMechanism =
    isMobile &&
    Boolean(sceneKey) &&
    (scrollState.level === "mlff" || scrollState.level === "meso");
  const mobileMechanismHeight =
    scrollState.level === "meso"
      ? sceneKey === "M1_select"
        ? "1020px"
        : sceneKey === "M2_mapping"
          ? "760px"
          : sceneKey === "M3_interactions"
            ? "640px"
            : sceneKey === "M4_langevin"
              ? "820px"
              : sceneKey === "M5_collective"
                ? "660px"
                : "830px"
      : sceneKey === "L1_why"
      ? "950px"
      : sceneKey === "L2_dataset"
        ? "700px"
        : sceneKey === "L3_locality"
          ? "730px"
          : sceneKey === "L4_symmetry"
            ? "760px"
            : sceneKey === "L5_energy_force"
              ? "1220px"
      : sceneKey === "L6_validate"
        ? "710px"
        : sceneKey === "L7_active"
          ? "620px"
          : "600px";

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#050510] ${
        separateMobileMechanism ? "flex flex-col" : ""
      }`}
      data-testid="multiscale-render-surface"
    >
      <div className={`relative min-h-0 w-full ${separateMobileMechanism ? "flex-1" : "h-full"}`}>
        <Canvas camera={{ fov: 50, position: [2.2, 1.2, 12] }} dpr={[1, 2]} shadows={{ type: THREE.PCFShadowMap }}>
          <color attach="background" args={["#050510"]} />
          <ambientLight intensity={0.6} color="#e2e8f0" />
          <hemisphereLight args={["#dbeafe", "#09090f", 0.55]} />
          <directionalLight
            position={[6, 8, 5]}
            intensity={1.2}
            color="#ffffff"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.1}
            shadow-camera-far={500}
            shadow-camera-left={-150}
            shadow-camera-right={150}
            shadow-camera-top={150}
            shadow-camera-bottom={-150}
            shadow-bias={-0.001}
          />
          <directionalLight position={[-4, 3, 6]} intensity={0.35} color="#93c5fd" />
          <directionalLight position={[2, -3, 4]} intensity={0.12} color="#fca5a5" />
          <EffectComposer>
            <N8AO
              aoRadius={4.0}
              intensity={3.5}
              distanceFalloff={0.6}
              color="#000010"
            />
          </EffectComposer>
          <ThreeStageCamera
            key={scrollState.level}
            scrollState={scrollState}
            isMobile={isMobile}
            actionsRef={actionsRef}
          />
          {scrollState.level === "meso" ? (
            <DNAPageRouter {...commonProps} reducedMotion={reducedMotion} />
          ) : (
            <MLFFScene {...commonProps} sceneKey={sceneKey} reducedMotion={reducedMotion} />
          )}
        </Canvas>
        {!separateMobileMechanism && !hideMechanism && scrollState.level === "mlff" && sceneKey && (
          <MlffMechanism
            sceneKey={sceneKey}
            lang={lang}
            reducedMotion={reducedMotion}
          />
        )}
        {!separateMobileMechanism && !hideMechanism && scrollState.level === "meso" && sceneKey && (
          <MesoMechanism sceneKey={sceneKey} lang={lang} reducedMotion={reducedMotion} />
        )}
      </div>
      {separateMobileMechanism && sceneKey ? (
        <div
          className="relative w-full flex-shrink-0 border-t border-white/12 bg-[#050510]"
          style={{ height: mobileMechanismHeight }}
        >
          {scrollState.level === "mlff" ? (
            <MlffMechanism
              sceneKey={sceneKey}
              lang={lang}
              reducedMotion={reducedMotion}
              isMobile
            />
          ) : (
            <MesoMechanism
              sceneKey={sceneKey}
              lang={lang}
              reducedMotion={reducedMotion}
              isMobile
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
