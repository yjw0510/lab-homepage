"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { withBasePath } from "@/lib/basePath";
import { DNAPageRouter } from "./dna/DNAPageRouter";
import type { ScrollState } from "./scrollState";
import type { ResearchCameraActions } from "./molstar/shared";
import { CHOREOGRAPHY } from "./levelData";
import { BASE_ZOOM_INDEX, MAX_ZOOM_INDEX } from "./multiscaleViewSchedule";
import { MesoMechanism } from "./overlays/MesoMechanism";
import { useMultiscaleCanvasColor } from "./useMultiscaleCanvasColor";
import {
  applyThreePlacement,
  computeScheduledPlacement,
  type SubsetAwareData,
} from "./multiscaleViewRuntime";

interface MesoScheduleData extends SubsetAwareData {
  points: number[][];
}

interface MesoScheduleSource {
  beadPositions: number[][];
  anchors?: Record<string, number[]>;
  subsets?: Record<string, { indices: number[] }>;
}



// M2 uses an origin-centered teaching chain rather than the manifest's melt coordinates.
// The mapping motif is one chain and its beads. At 6.5 the camera framed a sphere the
// motif filled only 2-5% of, leaving 217-300px of dead canvas below it. 5.2 removes
// the worst of that without letting the motif touch the canvas edges.
//
// OPEN, measured not guessed: the residual is vertical centering, not radius. This
// override looks at the origin, but the motif draws above it, so probe-canvas-fit.mjs
// still reports 187-198px of empty canvas below the content at 1024x768 and 390x844
// while the left and right margins are 0-1px. The fix is the override's center, which
// needs the motif's real bounds rather than another radius guess.
const MESO_MORPH_RADIUS = 5.2;

const jsonFetchCache = new Map<string, Promise<unknown>>();
function cachedJsonFetch<T>(url: string): Promise<T> {
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

function normalizeMesoScheduleData(source: MesoScheduleSource): MesoScheduleData {
  if (!Array.isArray(source.beadPositions) || source.beadPositions.length === 0) {
    return { points: [] };
  }
  return {
    points: source.beadPositions,
    subsets: source.subsets,
    anchors: source.anchors,
  };
}

function MesoStageCamera({
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
  const [scheduleData, setScheduleData] = useState<MesoScheduleData | null>(null);
  const [zoomIndex, setZoomIndex] = useState(BASE_ZOOM_INDEX);
  const [viewRevision, setViewRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    cachedJsonFetch<{ camera: MesoScheduleSource }>("/data/dna/manifest.json")
      .then((manifest) => {
        if (!cancelled) setScheduleData(normalizeMesoScheduleData(manifest.camera));
      })
      .catch(() => {
        if (!cancelled) setScheduleData({ points: [] });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stepCount = CHOREOGRAPHY.meso.steps.length;

  const applyCamera = useCallback(
    (zoomLevel = zoomIndex) => {
      if (!scheduleData || scheduleData.points.length === 0) return;
      const stepScene = CHOREOGRAPHY.meso.steps[scrollState.step]?.sceneKey;
      const boundsOverride =
        stepScene === "M2_mapping"
          ? { center: [0, 0, 0] as [number, number, number], radius: MESO_MORPH_RADIUS }
          : undefined;
      const placement = computeScheduledPlacement({
        level: "meso",
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount,
        meta: scheduleData,
        points: scheduleData.points,
        aspect: size.width / Math.max(1, size.height),
        isMobile,
        zoomIndex: zoomLevel,
        boundsOverride,
      });
      applyThreePlacement({
        camera,
        controls: orbitRef.current,
        placement,
      });
    },
    [camera, isMobile, scheduleData, scrollState.step, scrollState.stepProgress, size.height, size.width, stepCount, zoomIndex],
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

export function MesoStage({
  scrollState,
  isMobile,
  actionsRef,
  sceneKey,
  reducedMotion = false,
  lang = "en",
  hideMechanism = false,
  mobileSceneHeight,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  sceneKey?: string;
  reducedMotion?: boolean;
  lang?: string;
  hideMechanism?: boolean;
  mobileSceneHeight?: number;
}) {
  const canvasColor = useMultiscaleCanvasColor();
  const separateMobileMechanism = isMobile && Boolean(sceneKey);

  return (
    <div
      className={`relative w-full bg-surface-sunken ${
        separateMobileMechanism ? "flex flex-col" : "h-full overflow-hidden"
      }`}
      data-testid="multiscale-render-surface"
    >
      <div
        className={`relative min-h-0 w-full ${separateMobileMechanism ? "" : "h-full"}`}
        style={separateMobileMechanism ? { height: mobileSceneHeight } : undefined}
      >
        <Canvas camera={{ fov: 50, position: [2.2, 1.2, 12] }} dpr={[1, 2]} shadows={{ type: THREE.PCFShadowMap }}>
          <color attach="background" args={[canvasColor]} />
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
          <MesoStageCamera
            scrollState={scrollState}
            isMobile={isMobile}
            actionsRef={actionsRef}
          />
          <DNAPageRouter scrollState={scrollState} reducedMotion={reducedMotion} />
        </Canvas>
        {!separateMobileMechanism && !hideMechanism && sceneKey && (
          <MesoMechanism sceneKey={sceneKey} lang={lang} />
        )}
      </div>
      {separateMobileMechanism && sceneKey ? (
        <div className="relative w-full flex-shrink-0 border-t border-border bg-surface-sunken">
          <MesoMechanism
            sceneKey={sceneKey}
            lang={lang}
            isMobile
          />
        </div>
      ) : null}
    </div>
  );
}
