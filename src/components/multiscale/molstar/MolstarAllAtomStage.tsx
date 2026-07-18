"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { AllAtomSystemData, AllAtomTrajectoryData } from "../data/allatomSolvent";
import { cachedAllAtomJsonFetch } from "../data/allatomCache";
import type { ScrollState } from "../scrollState";
import { applyMolstarPlacement, computeScheduledPlacement } from "../multiscaleViewRuntime";
import {
  getScheduledAllAtomSnapshot,
  getAllAtomPagePolicy,
  getAllAtomSceneKey,
  getAllAtomViewStep,
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
  applySpinSetting,
  commitResearchLayers,
  mountResearchPlugin,
  updateResearchLayerParams,
} from "./shared";

export function MolstarAllAtomStage({
  progressRef,
  scrollState,
  isMobile,
  autoRotateRef,
  actionsRef,
  cameraState,
  cameraSnapshotRef,
  displayAtomsRef,
  activeTerm,
  activeReadout,
  reducedMotion = false,
  onMeasuredDistance,
}: {
  progressRef: RefObject<number>;
  scrollState: ScrollState;
  isMobile: boolean;
  autoRotateRef: MutableRefObject<boolean>;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  cameraState?: AllAtomCameraState;
  cameraSnapshotRef?: MutableRefObject<CameraSnapshotLike | null>;
  displayAtomsRef?: MutableRefObject<{ atoms: number[][]; elements: string[]; charges: number[] } | null>;
  activeTerm: AllAtomForceFieldTerm | null;
  activeReadout: AllAtomReadoutId | null;
  reducedMotion?: boolean;
  onMeasuredDistance?: (nm: number | null) => void;
}) {
  void progressRef;
  void isMobile;

  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginLike | null>(null);
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

  const phase = useMemo(() => Math.round(scrollState.stepProgress * 6) / 6, [scrollState.stepProgress]);
  const sceneKey = getAllAtomSceneKey(scrollState.step);
  const viewStep = getAllAtomViewStep(sceneKey);
  const [initialBuild] = useState(() => ({ scrollState, phase, sceneKey }));

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
        activeTermRef.current,
      );

      const container = containerRef.current;
      const aspect = (container?.clientWidth ?? 1) / Math.max(1, container?.clientHeight ?? 1);
      const placement = computeScheduledPlacement({
        level: "allatom",
        step: viewStep,
        stepProgress: scrollState.stepProgress,
        stepCount: 5,
        meta: referenceSnapshot,
        points: referenceSnapshot.atoms,
        aspect,
        isMobile,
        zoomIndex: zoomLevel,
      });
      defaultSnapshotRef.current = applyMolstarPlacement(plugin, placement, durationMs);
      if (cameraSnapshotRef) cameraSnapshotRef.current = defaultSnapshotRef.current;
    },
    [cameraSnapshotRef, effectiveZoomIndex, isMobile, scrollState.step, scrollState.stepProgress, viewStep],
  );

  const activeTermRef = useRef(activeTerm);
  activeTermRef.current = activeTerm;
  const activeReadoutRef = useRef(activeReadout);
  activeReadoutRef.current = activeReadout;
  const onMeasuredDistanceRef = useRef(onMeasuredDistance);
  onMeasuredDistanceRef.current = onMeasuredDistance;
  const lastMeasuredRef = useRef<number | null>(null);

  const rebuildingRef = useRef(false);

  const rebuildScene = useCallback(async (resetCamera = false, nextFrameIndex?: number) => {
    const plugin = pluginRef.current;
    const data = dataRef.current;
    if (!plugin || !data) return;
    // Skip if a rebuild is already in progress (prevents queue buildup in RAF loop)
    if (rebuildingRef.current && !resetCamera) return;
    rebuildingRef.current = true;
    try {
      const fi = nextFrameIndex ?? frameTimeRef.current;
      const layers = buildAllAtomLayers(data, scrollState, phase, activeTermRef.current, activeReadoutRef.current, fi);
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
  }, [applyScheduledCamera, effectiveZoomIndex, phase, scrollState]);

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
          autoRotate: autoRotateRef.current,
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
          buildAllAtomLayers(dataRef.current, initialBuild.scrollState, initialBuild.phase, activeTerm, activeReadout, 0),
        );
        if (cameraSnapshotRef) {
          cameraSnapshotRef.current = (plugin.canvas3d?.camera.getSnapshot() as CameraSnapshotLike | undefined) ?? null;
        }
        if (!cancelled) setIsReady(true);
      } catch (error) {
        console.error(error);
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
  }, [actionsRef, activeReadout, activeTerm, autoRotateRef, cameraSnapshotRef, initialBuild]);

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

  // Page-aware trajectory playback. Stationary windows ping-pong to avoid an
  // invented last-to-first interpolation; preparation plays once and holds.
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
    let startTime = performance.now();
    let rafId = 0;

    const publishFrame = (fractionalFrame: number, forceRebuild = false) => {
      frameTimeRef.current = fractionalFrame;
      const pg = getTrajectoryPage(data.trajectory, snapshot.id);
      const disp = getDisplaySnapshot(snapshot, pg, fractionalFrame);
      if (displayAtomsRef) {
        displayAtomsRef.current = {
          atoms: disp.atoms,
          elements: disp.elements,
          charges: disp.charges ?? [],
        };
      }
      const now = performance.now();
      if (forceRebuild || now - lastRebuildTimeRef.current >= rebuildCadenceMs) {
        lastRebuildTimeRef.current = now;
        void rebuildScene(false, fractionalFrame);
      }
    };

    if (pagePolicy.playbackMode === "hold" || reducedMotion || frameCount < 2) {
      const stillFrame =
        pagePolicy.playbackMode === "one-way"
          ? frameCount - 1
          : Math.floor((frameCount - 1) * 0.5);
      publishFrame(stillFrame, true);
      return;
    }

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      let fractionalFrame = 0;
      let finished = false;

      if (pagePolicy.playbackMode === "one-way") {
        const t = Math.min(1, elapsed / cycleDurationMs);
        fractionalFrame = t * (frameCount - 1);
        finished = t >= 1;
      } else {
        const phaseT = (elapsed % (cycleDurationMs * 2)) / cycleDurationMs;
        const t = phaseT <= 1 ? phaseT : 2 - phaseT;
        fractionalFrame = t * (frameCount - 1);
      }

      publishFrame(fractionalFrame, finished);
      if (finished) return;
      rafId = requestAnimationFrame(tick);
    };

    startTime = performance.now();
    lastRebuildTimeRef.current = startTime;
    void rebuildScene(false, 0); // initial build
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [displayAtomsRef, isReady, rebuildScene, reducedMotion, scrollState.step]);

  // Emphasis-only: activeTerm/activeReadout changes update alpha/emissive without scene rebuild
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!isReady || !plugin) return;
    const params = computeLayerEmphasis(scrollState.step, scrollState.stepProgress, activeTerm, activeReadout);
    void updateResearchLayerParams(plugin, params);
  }, [activeTerm, activeReadout, isReady, scrollState.step, scrollState.stepProgress]);

  // Cue-aware camera: retarget when the force-field selection changes.
  useEffect(() => {
    if (!isReady || sceneKey !== "A3_forcefield") return;
    applyScheduledCamera(200);
  }, [activeTerm, applyScheduledCamera, isReady, sceneKey]);

  useEffect(() => {
    if (!isReady) return;
    applyScheduledCamera(150);
  }, [applyScheduledCamera, effectiveViewRevision, effectiveZoomIndex, isReady]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;
    void applySpinSetting(plugin, autoRotateRef.current);
  }, [autoRotateRef]);

  useEffect(() => {
    if (!cameraSnapshotRef || !isReady) return;
    let frame = 0;
    const sync = () => {
      const plugin = pluginRef.current;
      if (plugin?.canvas3d) {
        cameraSnapshotRef.current = (plugin.canvas3d.camera.getSnapshot() as CameraSnapshotLike | undefined) ?? null;
      }
      frame = window.requestAnimationFrame(sync);
    };
    frame = window.requestAnimationFrame(sync);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [cameraSnapshotRef, isReady]);

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
    <div className="multiscale-molstar relative h-full w-full overflow-hidden bg-[#050510]" data-testid="multiscale-render-surface">
      {!isReady && <div className="absolute inset-0 bg-[#050510]" />}
      <div ref={containerRef} className="h-full w-full" />
      {mountError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-slate-300">
          <div className="max-w-md rounded-3xl border border-white/10 bg-slate-950/72 px-6 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <p className="font-semibold text-white/92">Mol* could not start WebGL.</p>
            <p className="mt-2 leading-6 text-slate-300/90">{mountError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
