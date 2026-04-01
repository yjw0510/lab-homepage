"use client";

import type { MutableRefObject } from "react";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context.js";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec.js";
import { PluginConfig } from "molstar/lib/mol-plugin/config.js";
import { PluginCommands } from "molstar/lib/mol-plugin/commands.js";
import { PluginStateObject as SO, PluginStateTransform } from "molstar/lib/mol-plugin-state/objects.js";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms.js";
import { StateTransformer } from "molstar/lib/mol-state/index.js";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition.js";
import { Task } from "molstar/lib/mol-task/index.js";
import { Mesh } from "molstar/lib/mol-geo/geometry/mesh/mesh.js";
import { MeshBuilder } from "molstar/lib/mol-geo/geometry/mesh/mesh-builder.js";
import { addSphere } from "molstar/lib/mol-geo/geometry/mesh/builder/sphere.js";
import { addCylinder, addFixedCountDashedCylinder } from "molstar/lib/mol-geo/geometry/mesh/builder/cylinder.js";
import { Shape } from "molstar/lib/mol-model/shape.js";
import { Color } from "molstar/lib/mol-util/color/color.js";
import { Binding } from "molstar/lib/mol-util/binding.js";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra.js";

export interface ResearchCameraActions {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
  getMetrics?: () => Record<string, unknown> | null;
}

export type PluginLike = PluginUIContext;
export type ColorValue = Color;
export interface CameraSnapshotLike {
  target: Vec3;
  position: Vec3;
  radius: number;
}

export interface SpherePrimitive {
  kind: "sphere";
  center: [number, number, number];
  radius: number;
  color: ColorValue;
  label?: string;
}

export interface CylinderPrimitive {
  kind: "cylinder";
  start: [number, number, number];
  end: [number, number, number];
  radiusTop: number;
  radiusBottom: number;
  radialSegments?: number;
  color: ColorValue;
  label?: string;
}

export interface DashedCylinderPrimitive {
  kind: "dashed-cylinder";
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  dashCount: number;
  color: ColorValue;
  label?: string;
}

export interface TrianglePrimitive {
  kind: "triangle";
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  color: ColorValue;
  doubleSided?: boolean;
  label?: string;
}

export interface MeshPrimitive {
  kind: "mesh";
  vertices: number[][];
  faces: number[][];
  color: ColorValue;
  doubleSided?: boolean;
  label?: string;
}

export type ResearchPrimitive =
  | SpherePrimitive
  | CylinderPrimitive
  | DashedCylinderPrimitive
  | TrianglePrimitive
  | MeshPrimitive;

export interface ResearchLayerSpec {
  label: string;
  primitives: ResearchPrimitive[];
  params?: Partial<Record<string, unknown>>;
}

export const BACKGROUND = Color.fromHexStyle("#050510");
export const SLATE = Color.fromHexStyle("#9ca3af");
export const WHITE = Color.fromHexStyle("#f8fafc");
export const CARBON = Color.fromHexStyle("#3d4552");
export const NITROGEN = Color.fromHexStyle("#2563eb");
export const OXYGEN = Color.fromHexStyle("#ef4444");
export const HYDROGEN = Color.fromHexStyle("#f3f4f6");
export const CYAN = Color.fromHexStyle("#06b6d4");
export const PURPLE = Color.fromHexStyle("#8b5cf6");
export const RED = Color.fromHexStyle("#fb7185");
export const TEAL = Color.fromHexStyle("#14b8a6");
export const AMBER = Color.fromHexStyle("#fbbf24");
export const ORANGE = Color.fromHexStyle("#f97316");
export const BLUE = Color.fromHexStyle("#2f74ff");
export const LIGHT_BLUE = Color.fromHexStyle("#60a5fa");

export const ELEMENT_COLORS: Record<string, ColorValue> = {
  C: CARBON,
  N: NITROGEN,
  O: OXYGEN,
  H: HYDROGEN,
};

export const ELEMENT_RADII: Record<string, number> = {
  C: 0.51,
  N: 0.47,
  O: 0.46,
  H: 0.36,
};

const molstarResearchGlobals = globalThis as typeof globalThis & {
  __labHomepageResearchMeshProvider3D__?: unknown;
};

function createResearchMeshProvider() {
  return PluginStateTransform.BuiltIn({
    name: "multiscale-mesh-provider-3d",
    display: "Research Mesh",
    from: SO.Root,
    to: SO.Shape.Provider,
    params: {
      label: PD.Text("Research Layer"),
      spec: PD.Value<ResearchLayerSpec>({ label: "Research Layer", primitives: [] }),
    },
  })({
    canAutoUpdate() {
      return true;
    },
    apply({ params }) {
      return Task.create("Research Mesh Provider", async () => {
        return new SO.Shape.Provider(
          {
            label: params.label,
            data: params.spec,
            params: Mesh.Params,
            getShape: (_, spec) => createShapeFromLayer(spec),
            geometryUtils: Mesh.Utils,
          },
          { label: params.label },
        );
      });
    },
    update({ b, newParams }) {
      b.data.label = newParams.label;
      b.data.data = newParams.spec;
      b.label = newParams.label;
      return Task.create("Research Mesh Provider", async () => StateTransformer.UpdateResult.Updated);
    },
  });
}

const ResearchMeshProvider3D =
  (molstarResearchGlobals.__labHomepageResearchMeshProvider3D__ as ReturnType<typeof createResearchMeshProvider>) ??
  (molstarResearchGlobals.__labHomepageResearchMeshProvider3D__ = createResearchMeshProvider());

function toMolstarVec3(point: [number, number, number] | number[]) {
  return Vec3.create(point[0], point[1], point[2]);
}

function createShapeFromLayer(spec: ResearchLayerSpec) {
  const builderState = MeshBuilder.createState(4096, 2048);
  const groupColors: ColorValue[] = [];
  const groupLabels: string[] = [];

  spec.primitives.forEach((primitive, groupIndex) => {
    builderState.currentGroup = groupIndex;
    groupColors[groupIndex] = primitive.color;
    groupLabels[groupIndex] = primitive.label ?? spec.label;

    if (primitive.kind === "sphere") {
      addSphere(builderState, toMolstarVec3(primitive.center), primitive.radius, 2);
      return;
    }

    if (primitive.kind === "cylinder") {
      addCylinder(builderState, toMolstarVec3(primitive.start), toMolstarVec3(primitive.end), 1, {
        radiusTop: primitive.radiusTop,
        radiusBottom: primitive.radiusBottom,
        radialSegments: primitive.radialSegments ?? 14,
        topCap: primitive.radiusTop > 0,
        bottomCap: primitive.radiusBottom > 0,
      });
      return;
    }

    if (primitive.kind === "dashed-cylinder") {
      addFixedCountDashedCylinder(
        builderState,
        toMolstarVec3(primitive.start),
        toMolstarVec3(primitive.end),
        1,
        primitive.dashCount,
        false,
        {
          radiusTop: primitive.radius,
          radiusBottom: primitive.radius,
          radialSegments: 10,
        },
      );
      return;
    }

    if (primitive.kind === "triangle") {
      MeshBuilder.addTriangle(
        builderState,
        toMolstarVec3(primitive.a),
        toMolstarVec3(primitive.b),
        toMolstarVec3(primitive.c),
      );
      if (primitive.doubleSided) {
        MeshBuilder.addTriangle(
          builderState,
          toMolstarVec3(primitive.a),
          toMolstarVec3(primitive.c),
          toMolstarVec3(primitive.b),
        );
      }
      return;
    }

    primitive.faces.forEach((face) => {
      const a = primitive.vertices[face[0]];
      const b = primitive.vertices[face[1]];
      const c = primitive.vertices[face[2]];
      MeshBuilder.addTriangle(builderState, toMolstarVec3(a), toMolstarVec3(b), toMolstarVec3(c));
      if (primitive.doubleSided) {
        MeshBuilder.addTriangle(builderState, toMolstarVec3(a), toMolstarVec3(c), toMolstarVec3(b));
      }
    });
  });

  const mesh = MeshBuilder.getMesh(builderState);
  Mesh.computeNormals(mesh);

  return Shape.create(
    spec.label,
    spec,
    mesh,
    (groupId) => groupColors[groupId] ?? WHITE,
    () => 1,
    (groupId) => groupLabels[groupId] ?? spec.label,
  );
}

export async function commitResearchLayers(plugin: PluginLike, layers: ResearchLayerSpec[]) {
  await plugin.clear();
  const build = plugin.build();

  layers.forEach((layer) => {
    if (layer.primitives.length === 0) return;
    const provider = build.toRoot().apply(ResearchMeshProvider3D, {
      label: layer.label,
      spec: layer,
    });
    const representationParams = {
      ...PD.getDefaultValues(Mesh.Params),
      quality: "high",
      alpha: 1,
      material: { metalness: 0.04, roughness: 0.6, bumpiness: 0, ...(layer.params?.material as object) },
      emissive: 0,
      xrayShaded: false,
      transparentBackfaces: "on",
      ...(layer.params ?? {}),
    };
    provider.apply(StateTransforms.Representation.ShapeRepresentation3D, representationParams as never);
  });

  await build.commit();
}

export interface LayerParamUpdate {
  label: string;
  alpha: number;
  emissive: number;
}

/** Update alpha/emissive on existing representations without rebuilding geometry. */
export async function updateResearchLayerParams(plugin: PluginLike, updates: LayerParamUpdate[]) {
  if (updates.length === 0) return;
  const build = plugin.build();
  let touched = false;

  for (const cell of plugin.state.data.cells.values()) {
    if (!cell.obj) continue;
    const label = cell.obj.label;
    const update = updates.find((u) => u.label === label);
    if (!update) continue;

    const children = plugin.state.data.tree.children.get(cell.transform.ref);
    if (!children) continue;
    for (const childRef of children.toArray()) {
      const child = plugin.state.data.cells.get(childRef);
      if (!child?.obj) continue;
      build.to(childRef).update({ alpha: update.alpha, emissive: update.emissive } as never);
      touched = true;
    }
  }

  if (touched) await build.commit();
}

interface CanvasSettingsProps {
  renderer: {
    backgroundColor: ColorValue;
    pickingAlphaThreshold: number;
  };
  postprocessing: {
    occlusion?: { name: string };
    outline?: { name: string };
    shadow?: { name: string };
    antialiasing?: { name: string };
  };
  transparency: string;
  trackball: {
    bindings: Record<string, unknown>;
    zoomSpeed: number;
    rotateSpeed: number;
    animate: { name: string; params: Record<string, unknown> };
  };
}

export function createResearchPlugin() {
  return new PluginUIContext({
    ...DefaultPluginUISpec(),
    layout: {
      initial: {
        isExpanded: false,
        showControls: false,
      },
    },
    components: {
      controls: { left: "none", right: "none", top: "none", bottom: "none" },
      remoteState: "none",
    },
    canvas3d: {
      camera: {
        helper: { axes: { name: "off", params: {} } },
      },
    },
    config: [
      [PluginConfig.Viewport.ShowExpand, false],
      [PluginConfig.Viewport.ShowControls, false],
      [PluginConfig.Viewport.ShowSelectionMode, false],
      [PluginConfig.Viewport.ShowAnimation, false],
    ],
  });
}

export async function applyResearchCanvasSettings(plugin: PluginLike, autoRotate: boolean) {
  await PluginCommands.Canvas3D.SetSettings(plugin, {
    settings: (props) => {
      const canvasProps = props as unknown as CanvasSettingsProps;
      canvasProps.renderer.backgroundColor = BACKGROUND;
      canvasProps.renderer.pickingAlphaThreshold = 0.05;
      canvasProps.postprocessing ??= {};
      if (canvasProps.postprocessing.occlusion) canvasProps.postprocessing.occlusion.name = "off";
      if (canvasProps.postprocessing.outline) canvasProps.postprocessing.outline.name = "off";
      if (canvasProps.postprocessing.shadow) canvasProps.postprocessing.shadow.name = "off";
      if (canvasProps.postprocessing.antialiasing) canvasProps.postprocessing.antialiasing.name = "smaa";
      canvasProps.transparency = "wboit";
      canvasProps.trackball.bindings = {
        ...canvasProps.trackball.bindings,
        scrollZoom: Binding.Empty,
        scrollFocus: Binding.Empty,
        scrollFocusZoom: Binding.Empty,
      };
      canvasProps.trackball.zoomSpeed = 4;
      canvasProps.trackball.rotateSpeed = 3.5;
      canvasProps.trackball.animate = autoRotate
        ? { name: "spin", params: { speed: 0.06, axis: Vec3.create(0, -1, 0) } }
        : { name: "off", params: {} };
    },
  });
}

export function applySpinSetting(plugin: PluginLike, enabled: boolean) {
  return PluginCommands.Canvas3D.SetSettings(plugin, {
    settings: (props) => {
      const canvasProps = props as unknown as CanvasSettingsProps;
      canvasProps.trackball.animate = enabled
        ? { name: "spin", params: { speed: 0.06, axis: Vec3.create(0, -1, 0) } }
        : { name: "off", params: {} };
    },
  });
}

export async function fitScene(plugin: PluginLike, durationMs = 0): Promise<CameraSnapshotLike | null> {
  await PluginCommands.Camera.Reset(plugin, { durationMs });
  return (plugin.canvas3d?.camera.getSnapshot() as CameraSnapshotLike | undefined) ?? null;
}

export function bindResearchCameraActions(
  plugin: PluginLike,
  actionsRef: MutableRefObject<ResearchCameraActions | null> | undefined,
  defaultSnapshotRef: MutableRefObject<CameraSnapshotLike | null>,
) {
  if (!actionsRef) return;

  actionsRef.current = {
    zoomIn: () => {
      const current = plugin.canvas3d?.camera.getSnapshot();
      if (!current) return;
      plugin.managers.camera.setSnapshot(scaleSnapshot(current, 0.86), 150);
    },
    zoomOut: () => {
      const current = plugin.canvas3d?.camera.getSnapshot();
      if (!current) return;
      plugin.managers.camera.setSnapshot(scaleSnapshot(current, 1.18), 150);
    },
    fit: () => {
      void fitScene(plugin, 150).then((snapshot) => {
        defaultSnapshotRef.current = snapshot;
      });
    },
    reset: () => {
      if (defaultSnapshotRef.current) {
        plugin.managers.camera.setSnapshot(defaultSnapshotRef.current, 150);
      } else {
        void fitScene(plugin, 150).then((snapshot) => {
          defaultSnapshotRef.current = snapshot;
        });
      }
    },
  };
}

export async function mountResearchPlugin({
  container,
  autoRotate,
  actionsRef,
  defaultSnapshotRef,
}: {
  container: HTMLDivElement;
  autoRotate: boolean;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  defaultSnapshotRef: MutableRefObject<CameraSnapshotLike | null>;
}) {
  const plugin = createResearchPlugin();
  await plugin.init();
  const mounted = await plugin.mountAsync(container);
  if (!mounted) {
    plugin.dispose();
    return { plugin: null, error: "WebGL could not be initialized in this browser session." };
  }

  await applyResearchCanvasSettings(plugin, autoRotate);
  bindResearchCameraActions(plugin, actionsRef, defaultSnapshotRef);
  return { plugin, error: null };
}

export function scaleSnapshot<T extends CameraSnapshotLike>(snapshot: T, factor: number): T {
  const target = snapshot.target;
  const position = snapshot.position;
  const direction = Vec3.sub(Vec3(), position, target);
  Vec3.scale(direction, direction, factor);
  return {
    ...snapshot,
    position: Vec3.add(Vec3(), target, direction),
    radius: snapshot.radius * factor,
  };
}

export function centerPoints(points: number[][]) {
  const center = [0, 0, 0];
  if (points.length === 0) return { center, points: [] as number[][] };

  points.forEach(([x, y, z]) => {
    center[0] += x;
    center[1] += y;
    center[2] += z;
  });
  center[0] /= points.length;
  center[1] /= points.length;
  center[2] /= points.length;

  return {
    center,
    points: points.map(([x, y, z]) => [x - center[0], y - center[1], z - center[2]]),
  };
}

export function offsetMesh<T extends { vertices: number[][] }>(mesh: T, offset: number[]) {
  return {
    ...mesh,
    vertices: mesh.vertices.map(([x, y, z]) => [x - offset[0], y - offset[1], z - offset[2]]),
  };
}

export function mixColor(a: ColorValue, b: ColorValue, t: number) {
  return Color.interpolate(a, b, Math.max(0, Math.min(1, t)));
}
