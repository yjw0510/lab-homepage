"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { AllAtomSystemData, AllAtomTrajectoryData } from "../data/allatomSolvent";
import { cachedAllAtomJsonFetch } from "../data/allatomCache";
import type { ScrollState } from "../scrollState";
import { CHOREOGRAPHY } from "../levelData";
import { applyMolstarPlacement, computeScheduledPlacement } from "../multiscaleViewRuntime";
import { getScheduledAllAtomSnapshot, getAllAtomPagePolicy, type AllAtomCameraState, type AllAtomForceFieldTerm, type AllAtomReadoutId } from "../allatom/allAtomConfig";
import {
  type AllAtomStageData,
  buildAllAtomLayers,
  computeLayerEmphasis,
  derivePlacementSnapshot,
  getDisplaySnapshot,
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
  const sceneKey = `${scrollState.step}`;
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
        step: scrollState.step,
        stepProgress: scrollState.stepProgress,
        stepCount: CHOREOGRAPHY.allatom.steps.length,
        meta: referenceSnapshot,
        points: referenceSnapshot.atoms,
        aspect,
        isMobile,
        zoomIndex: zoomLevel,
      });
      defaultSnapshotRef.current = applyMolstarPlacement(plugin, placement, durationMs);
      cameraSnapshotRef && (cameraSnapshotRef.current = defaultSnapshotRef.current);
    },
    [cameraSnapshotRef, effectiveZoomIndex, isMobile, scrollState.step, scrollState.stepProgress],
  );

  const activeTermRef = useRef(activeTerm);
  activeTermRef.current = activeTerm;
  const activeReadoutRef = useRef(activeReadout);
  activeReadoutRef.current = activeReadout;

  const rebuildScene = useCallback(async (resetCamera = false, nextFrameIndex?: number) => {
    const plugin = pluginRef.current;
    const data = dataRef.current;
    if (!plugin || !data) return;
    const fi = nextFrameIndex ?? frameTimeRef.current;
    const layers = buildAllAtomLayers(data, scrollState, phase, activeTermRef.current, activeReadoutRef.current, fi);
    await commitResearchLayers(plugin, layers);
    if (resetCamera) applyScheduledCamera(0, effectiveZoomIndex);
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

  // Continuous frame animation: requestAnimationFrame loop with 80ms rebuild cadence
  useEffect(() => {
    const data = dataRef.current;
    const snapshot = data ? getScheduledAllAtomSnapshot(data.system, scrollState.step) : null;
    const trajectoryPage = snapshot ? getTrajectoryPage(data?.trajectory ?? null, snapshot.id) : null;
    const frameCount = trajectoryPage?.frames.length ?? 0;
    if (!isReady || frameCount < 2) return;

    const intervalMs = getAllAtomPagePolicy(scrollState.step).frameIntervalMs;
    const cycleDurationMs = frameCount * intervalMs; // total cycle duration
    const rebuildCadenceMs = 80; // rebuild Mol* scene every 80ms for smooth interpolation
    let startTime = performance.now();
    let rafId = 0;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      // Continuous fractional frame index (wraps around)
      const t = (elapsed % cycleDurationMs) / cycleDurationMs;
      const fractionalFrame = t * frameCount;
      frameTimeRef.current = fractionalFrame;

      // Smooth overlay: update atom positions every RAF tick
      if (displayAtomsRef && data) {
        const snap = getScheduledAllAtomSnapshot(data.system, scrollState.step);
        if (snap) {
          const pg = getTrajectoryPage(data.trajectory, snap.id);
          const disp = getDisplaySnapshot(snap, pg, fractionalFrame);
          displayAtomsRef.current = { atoms: disp.atoms, elements: disp.elements, charges: disp.charges ?? [] };
        }
      }

      // Rebuild Mol* scene at cadence (expensive commit)
      if (now - lastRebuildTimeRef.current >= rebuildCadenceMs) {
        lastRebuildTimeRef.current = now;
        void rebuildScene(false, fractionalFrame);
      }

      rafId = requestAnimationFrame(tick);
    };

    startTime = performance.now();
    lastRebuildTimeRef.current = startTime;
    void rebuildScene(false, 0); // initial build
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [isReady, rebuildScene, scrollState.step]);

  // Emphasis-only: activeTerm/activeReadout changes update alpha/emissive without scene rebuild
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!isReady || !plugin) return;
    const params = computeLayerEmphasis(scrollState.step, scrollState.stepProgress, activeTerm, activeReadout);
    void updateResearchLayerParams(plugin, params);
  }, [activeTerm, activeReadout, isReady, scrollState.step, scrollState.stepProgress]);

  // Cue-aware camera: retarget when activeTerm changes on step 1
  useEffect(() => {
    if (!isReady || scrollState.step !== 1) return;
    applyScheduledCamera(200);
  }, [activeTerm, applyScheduledCamera, isReady, scrollState.step]);

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
