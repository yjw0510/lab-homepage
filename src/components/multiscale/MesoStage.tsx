"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DNAPageRouter } from "./dna/DNAPageRouter";
import { cachedJson } from "./dna/useDNAAssets";
import type { CollectiveBounds } from "./dna/pages/Page6Settle";
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
//
// Raised to 5.6 with the horizontal offset below: at 5.2 the chain's right end sat on the
// canvas edge at every viewport (margins L 71 / R 0 px on the 870px desktop canvas, L 36 / R 3
// on a phone), so the last base pair was cut.
const MESO_MORPH_RADIUS = 5.6;
// Measured, not guessed, which is what the note above asked for. Screenshotting the canvas with
// every chrome overlay hidden and taking the bbox of what is actually painted put the motif's
// centre 98-117px above the canvas centre at 1024x768 and 1440x900, leaving 228-266px of dead
// canvas below it, and 102px above centre on a phone. Converted through the framed extent
// (2 x radius x padding over canvas height) that is about 1.7 world units of +y.
// Measured, which the note above asked for and which the earlier attempts got wrong.
//
// The "187-198px of empty canvas below the content" that motivated this was chrome, not the
// motif: the bbox included the scene-title card and the camera-control cluster painted over the
// canvas. Screenshotting with every element except the canvas hidden puts the motif's centre
// 6px off centre on a phone and 13-16px off on a 703-835px desktop canvas, i.e. 1-2%. There was
// no centring defect; there is a small residual, and this is it. Converted through the framed
// extent (2 x radius x padding over canvas height) it is a fifth of a world unit, and the same
// number lands on all three viewports.
//
// The horizontal residual was never measured and is not small: the chain drew about 35px right
// of centre on desktop and 16px on a phone, both about half a world unit. The camera looks
// from azimuth 28 degrees, so screen-right is (cos 28, 0, -sin 28) in world space, and the
// centre moves 0.5 along it.
const MESO_MORPH_CENTER: [number, number, number] = [0.44, 0.2, -0.23];

/**
 * The collective page is framed on what it paints: the unwrapped, recentred first frame that
 * Page6Settle draws and reports. The manifest's camera positions are the wrapped +-12.3 nm box,
 * while the drawn chains are unwrapped into a cloud about 70 nm across, so framing the box let
 * them run off the top edge and under the title card.
 *
 * The schedule's 1.85 padding for this step was measured against those wrapped bounds; against
 * the real ones it would frame the cloud at about 60% of the canvas. This padding goes with the measured
 * bounds and is passed as the scene's own camera metadata, which the placement reads first.
 */
const MESO_COLLECTIVE_PADDING = 1.1;

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
  collectiveBounds,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  collectiveBounds: CollectiveBounds | null;
}) {
  const { camera, size } = useThree();
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const [scheduleData, setScheduleData] = useState<MesoScheduleData | null>(null);
  const [zoomIndex, setZoomIndex] = useState(BASE_ZOOM_INDEX);
  const [viewRevision, setViewRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    cachedJson<{ camera: MesoScheduleSource }>("/data/dna/manifest.json")
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
      const collective = stepScene === "M5_collective" && collectiveBounds;
      const boundsOverride =
        stepScene === "M2_mapping"
          ? { center: MESO_MORPH_CENTER, radius: MESO_MORPH_RADIUS }
          : collective
            ? collectiveBounds
            : undefined;
      const placement = computeScheduledPlacement({
        level: "meso",
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount,
        meta: collective
          ? { ...scheduleData, camera: { padding: MESO_COLLECTIVE_PADDING } }
          : scheduleData,
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
    [camera, collectiveBounds, isMobile, scheduleData, scrollState.step, scrollState.stepProgress, size.height, size.width, stepCount, zoomIndex],
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
  const [collectiveBounds, setCollectiveBounds] = useState<CollectiveBounds | null>(null);
  const [trajectoryPending, setTrajectoryPending] = useState(false);
  const ko = lang.toLowerCase().startsWith("ko");

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
            collectiveBounds={collectiveBounds}
          />
          <DNAPageRouter
            scrollState={scrollState}
            reducedMotion={reducedMotion}
            onCollectiveBounds={setCollectiveBounds}
            onTrajectoryPending={setTrajectoryPending}
          />
        </Canvas>
        {/* The collective page shows a still frame while its trajectory downloads; this says
            the motion is still coming rather than leaving a frozen cloud unexplained. */}
        {trajectoryPending ? (
          <p
            role="status"
            className="type-mono-meta pointer-events-none absolute inset-x-0 bottom-4 z-[2] text-center text-xs text-muted-foreground"
          >
            {ko ? "궤적 불러오는 중" : "Loading trajectory"}
          </p>
        ) : null}
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
