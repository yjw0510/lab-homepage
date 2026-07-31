"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { AllAtomSystemData, AllAtomTrajectoryData } from "../data/allatomSolvent";
import { cachedAllAtomJsonFetch } from "../data/allatomCache";
import type { ScrollState } from "../scrollState";
import { applyMolstarPlacement, computeScheduledPlacement } from "../multiscaleViewRuntime";
import {
  getScheduledAllAtomSnapshot,
  getAllAtomPagePolicy,
  getAllAtomSceneKey,
  type AllAtomCameraState,
  type AllAtomForceFieldTerm,
  type AllAtomReadoutId,
} from "../allatom/allAtomConfig";
import {
  type AllAtomStageData,
  buildAllAtomLayers,
  computeLayerEmphasis,
  derivePlacementSnapshot,
  getDisplaySnapshot,
  getMeasuredContactDistance,
  getTrajectoryPage,
} from "../allatom/allAtomLayers";
import {
  type CameraSnapshotLike,
  type PluginLike,
  type ResearchCameraActions,
  applyResearchCanvasBackground,
  commitResearchLayers,
  layerBounds,
  mountResearchPlugin,
  updateResearchLayerParams,
} from "./shared";

export function MolstarAllAtomStage({
  scrollState,
  isMobile,
  actionsRef,
  cameraState,
  activeTerm,
  activeReadout,
  reducedMotion = false,
  onMeasuredDistance,
  canvasColor,
}: {
  scrollState: ScrollState;
  isMobile: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  cameraState?: AllAtomCameraState;
  activeTerm: AllAtomForceFieldTerm | null;
  activeReadout: AllAtomReadoutId | null;
  reducedMotion?: boolean;
  onMeasuredDistance?: (nm: number | null) => void;
  canvasColor: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
  const canvasColorRef = useRef(canvasColor);
  const dataRef = useRef<AllAtomStageData | null>(null);
  const defaultSnapshotRef = useRef<CameraSnapshotLike | null>(null);
  const sceneKeyRef = useRef("");
  const [isReady, setIsReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [viewRevision, setViewRevision] = useState(0);
  const frameTimeRef = useRef(0); // continuous fractional frame index
  const lastRebuildTimeRef = useRef(0);
  const effectiveZoomIndex = cameraState?.zoomIndex ?? zoomIndex;
  const effectiveViewRevision = cameraState?.viewRevision ?? viewRevision;

  useEffect(() => {
    canvasColorRef.current = canvasColor;
  }, [canvasColor]);

  const sceneKey = getAllAtomSceneKey(scrollState.step);
  const [initialBuild] = useState(() => ({ scrollState, sceneKey }));

  const applyScheduledCamera = useCallback(
    (durationMs = 160, zoomLevel = effectiveZoomIndex) => {
      const plugin = pluginRef.current;
      const data = dataRef.current;
      if (!plugin || !data) return;

      const snapshot = getScheduledAllAtomSnapshot(data.system, scrollState.step);
      if (!snapshot) return;
      // Use frame 0 (base snapshot) for camera placement — NOT the animated frame.
      // This locks the camera distance so the viewer can perceive real physical motion
      // (box shrinkage in NPT, atom vibration amplitude) without the camera chasing it.
      const referenceSnapshot = derivePlacementSnapshot(
        getDisplaySnapshot(snapshot, getTrajectoryPage(data.trajectory, snapshot.id), 0),
        scrollState.step,
      );

      // Frame the scene as painted. Deriving it from the snapshot instead meant restating
      // every rule buildAllAtomLayers follows — which atoms the page keeps, which waters, the
      // contact partner, the stacking discs, the trails — and missing any one of them framed
      // the scene off-centre. The layers are the draw list, so they are measured directly.
      const boundsOverride = paintedBoundsRef.current ?? undefined;

      const container = containerRef.current;
      const aspect = (container?.clientWidth ?? 1) / Math.max(1, container?.clientHeight ?? 1);
      const placement = computeScheduledPlacement({
        level: "allatom",
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount: scrollState.stepCount,
        meta: referenceSnapshot,
        points: referenceSnapshot.atoms,
        aspect,
        isMobile,
        zoomIndex: zoomLevel,
        boundsOverride,
      });
      defaultSnapshotRef.current = applyMolstarPlacement(plugin, placement, durationMs);
    },
    [effectiveZoomIndex, isMobile, scrollState.step, scrollState.stepCount, scrollState.stepProgress],
  );

  const activeTermRef = useRef(activeTerm);
  activeTermRef.current = activeTerm;
  const activeReadoutRef = useRef(activeReadout);
  activeReadoutRef.current = activeReadout;
  const onMeasuredDistanceRef = useRef(onMeasuredDistance);
  onMeasuredDistanceRef.current = onMeasuredDistance;
  const lastMeasuredRef = useRef<number | null>(null);

  const rebuildingRef = useRef(false);
  const paintedBoundsRef = useRef<{ center: [number, number, number]; radius: number } | null>(null);

  const rebuildScene = useCallback(async (resetCamera = false, nextFrameIndex?: number) => {
    const plugin = pluginRef.current;
    const data = dataRef.current;
    if (!plugin || !data) return;
    // Skip if a rebuild is already in progress (prevents queue buildup in RAF loop)
    if (rebuildingRef.current && !resetCamera) return;
    rebuildingRef.current = true;
    try {
      const fi = nextFrameIndex ?? frameTimeRef.current;
      const layers = buildAllAtomLayers(data, scrollState, activeTermRef.current, activeReadoutRef.current, fi);
      paintedBoundsRef.current = layerBounds(layers);
      await commitResearchLayers(plugin, layers);
      if (resetCamera) applyScheduledCamera(0, effectiveZoomIndex);
      // Report the exact drawn-contact distance to the rail, from the same
      // displayed frame as the geometry. Only emit when the rounded value
      // changes so playback doesn't spam React state.
      if (onMeasuredDistanceRef.current) {
        const measuring =
          getAllAtomSceneKey(scrollState.step) === "A6_observables" &&
          activeReadoutRef.current === "orientation";
        const raw = measuring ? getMeasuredContactDistance(data, scrollState, fi) : null;
        const rounded = raw == null ? null : Math.round(raw * 100) / 100;
        if (rounded !== lastMeasuredRef.current) {
          lastMeasuredRef.current = rounded;
          onMeasuredDistanceRef.current(rounded);
        }
      }
    } finally {
      rebuildingRef.current = false;
    }
  }, [applyScheduledCamera, effectiveZoomIndex, scrollState]);

  useEffect(() => {
    if (cameraState) return;
    setZoomIndex(2);
    setViewRevision((value) => value + 1);
  }, [cameraState, scrollState.level]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      if (!container || pluginRef.current) return;

      let mountedPlugin: PluginLike | null = null;
      try {
        setMountError(null);
        const { plugin, error } = await mountResearchPlugin({
          container,
          autoRotate: false,
          backgroundColor: canvasColorRef.current,
          actionsRef: undefined,
          defaultSnapshotRef,
        });
        if (!plugin) {
          setMountError(error);
          return;
        }

        mountedPlugin = plugin;
        const [system, trajectory] = await Promise.all([
          cachedAllAtomJsonFetch<AllAtomSystemData>("/data/multiscale/allatom/system.json"),
          cachedAllAtomJsonFetch<AllAtomTrajectoryData>("/data/multiscale/allatom/trajectory.json").catch(() => null),
        ]);
        if (cancelled) {
          plugin.dispose();
          return;
        }

        pluginRef.current = plugin;
        dataRef.current = { system, trajectory };

        sceneKeyRef.current = initialBuild.sceneKey;
        await commitResearchLayers(
          plugin,
          buildAllAtomLayers(dataRef.current, initialBuild.scrollState, activeTerm, activeReadout, 0),
        );
        if (!cancelled) setIsReady(true);
      } catch (error) {
        setMountError(error instanceof Error ? error.message : "Failed to initialize the Mol* viewer.");
        mountedPlugin?.dispose();
      }
    })();

    return () => {
      cancelled = true;
      if (actionsRef) actionsRef.current = null;
      const plugin = pluginRef.current;
      pluginRef.current = null;
      plugin?.dispose();
      container?.replaceChildren();
    };
  }, [actionsRef, activeReadout, activeTerm, initialBuild]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !isReady) return;
    void applyResearchCanvasBackground(plugin, canvasColor);
  }, [canvasColor, isReady]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !isReady) return;
    if (sceneKeyRef.current === sceneKey) return;
    sceneKeyRef.current = sceneKey;
    frameTimeRef.current = 0;
    void rebuildScene(true, 0);
  }, [isReady, rebuildScene, sceneKey]);

  // Reset frame time on step change
  useEffect(() => {
    frameTimeRef.current = 0;
    lastRebuildTimeRef.current = 0;
  }, [scrollState.step]);

  // Ping-pong avoids inventing a last-to-first trajectory interpolation.
  useEffect(() => {
    const data = dataRef.current;
    const snapshot = data ? getScheduledAllAtomSnapshot(data.system, scrollState.step) : null;
    const trajectoryPage = snapshot ? getTrajectoryPage(data?.trajectory ?? null, snapshot.id) : null;
    const frameCount = trajectoryPage?.frames.length ?? 0;
    if (!isReady || !data || !snapshot || frameCount < 1) return;

    const pagePolicy = getAllAtomPagePolicy(scrollState.step);
    const intervalMs = pagePolicy.frameIntervalMs;
    const cycleDurationMs = Math.max(intervalMs, (frameCount - 1) * intervalMs);
    const rebuildCadenceMs = 80; // rebuild Mol* scene every 80ms for smooth interpolation
    let rafId = 0;

    const publishFrame = (fractionalFrame: number, forceRebuild = false) => {
      frameTimeRef.current = fractionalFrame;
      const now = performance.now();
      if (forceRebuild || now - lastRebuildTimeRef.current >= rebuildCadenceMs) {
        lastRebuildTimeRef.current = now;
        void rebuildScene(false, fractionalFrame);
      }
    };

    if (reducedMotion || frameCount < 2) {
      publishFrame(Math.floor((frameCount - 1) * 0.5), true);
      return;
    }

    const startTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const phase = (elapsed % (cycleDurationMs * 2)) / cycleDurationMs;
      const trajectoryProgress = phase <= 1 ? phase : 2 - phase;
      publishFrame(trajectoryProgress * (frameCount - 1));
      rafId = requestAnimationFrame(tick);
    };

    lastRebuildTimeRef.current = startTime;
    void rebuildScene(false, 0);
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [isReady, rebuildScene, reducedMotion, scrollState.step]);

  // Emphasis-only: activeTerm/activeReadout changes update alpha/emissive without scene rebuild
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!isReady || !plugin) return;
    const params = computeLayerEmphasis(scrollState.step, scrollState.stepProgress, activeReadout);
    void updateResearchLayerParams(plugin, params);
  }, [activeTerm, activeReadout, isReady, scrollState.step, scrollState.stepProgress]);

  useEffect(() => {
    if (!isReady) return;
    applyScheduledCamera(150);
  }, [applyScheduledCamera, effectiveViewRevision, effectiveZoomIndex, isReady]);

  useEffect(() => {
    if (!actionsRef || cameraState) return;
    actionsRef.current = {
      zoomIn: () => setZoomIndex((current) => Math.max(0, current - 1)),
      zoomOut: () => setZoomIndex((current) => Math.min(4, current + 1)),
      fit: () => {
        setZoomIndex(2);
        setViewRevision((value) => value + 1);
      },
      reset: () => {
        setZoomIndex(2);
        setViewRevision((value) => value + 1);
      },
    };

    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef, cameraState]);

  return (
    <div
      className="multiscale-molstar relative h-full w-full overflow-hidden"
      style={{ backgroundColor: canvasColor }}
      data-testid="multiscale-render-surface"
    >
      {!isReady && <div className="absolute inset-0" style={{ backgroundColor: canvasColor }} />}
      <div ref={containerRef} className="h-full w-full" />
      {mountError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
          <div className="max-w-md border border-border bg-surface-raised/90 px-6 py-5 backdrop-blur-md">
            <p className="font-semibold text-foreground">Mol* could not start WebGL.</p>
            <p className="mt-2 leading-6 text-muted-foreground">{mountError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
