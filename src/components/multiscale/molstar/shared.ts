"use client";

import type { MutableRefObject } from "react";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context.js";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec.js";
import { PluginBehaviors } from "molstar/lib/mol-plugin/behavior.js";
import { PluginConfig } from "molstar/lib/mol-plugin/config.js";
import { PluginCommands } from "molstar/lib/mol-plugin/commands.js";
import { PluginStateObject as SO, PluginStateTransform } from "molstar/lib/mol-plugin-state/objects.js";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms.js";
import { StateTransformer } from "molstar/lib/mol-state/index.js";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition.js";
import { Task } from "molstar/lib/mol-task/index.js";
import { Mesh } from "molstar/lib/mol-geo/geometry/mesh/mesh.js";
import { Spheres } from "molstar/lib/mol-geo/geometry/spheres/spheres.js";
import { Cylinders } from "molstar/lib/mol-geo/geometry/cylinders/cylinders.js";
import { CylindersBuilder } from "molstar/lib/mol-geo/geometry/cylinders/cylinders-builder.js";
import { MeshBuilder } from "molstar/lib/mol-geo/geometry/mesh/mesh-builder.js";
import { addSphere } from "molstar/lib/mol-geo/geometry/mesh/builder/sphere.js";
import { addCylinder, addSimpleCylinder, addFixedCountDashedCylinder } from "molstar/lib/mol-geo/geometry/mesh/builder/cylinder.js";
import { Shape } from "molstar/lib/mol-model/shape.js";
import { Color } from "molstar/lib/mol-util/color/color.js";
import { Binding } from "molstar/lib/mol-util/binding.js";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra.js";
import { ChunkedArray } from "molstar/lib/mol-data/util.js";
import { pnSubdivide } from "../pnTriangles";

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
  // Mol* bails out of Camera.update() while this is 0, and only sets it itself when its
  // own automatic reset is enabled. It has to be written alongside the placement.
  radiusMax?: number;
  /**
   * Nearest the camera is allowed to get to its target.
   *
   * Mol* defaults it to 5, which suits the Angstrom-sized structures it was built for. These
   * scenes are in nanometres and sit at a radius under one, so the default is several times the
   * whole scene: measured on the electrolyte page, zooming in moved `radius` from 0.719 to 0.338
   * while the camera distance stayed pinned at exactly 5. Nothing magnified, the clip planes just
   * closed in and ate the surrounding molecules. Scenes that are not in Angstroms have to say so.
   */
  minNear?: number;
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
  /** Flat xyz triples. Typed arrays because these come straight out of a .bin. */
  vertices: Float32Array;
  /** Flat vertex-index triples. */
  faces: Uint32Array;
  color: ColorValue;
  doubleSided?: boolean;
  label?: string;
  /**
   * One scalar per vertex, painted onto the surface as a departure from `color`.
   *
   * The SCF scene uses it for how far this iteration's density is from the converged one. The
   * surface itself stays the total density, which is what the page says it is; the colour is
   * what shrinks as the field settles. Measured on chlorophyll a, the surface alone moves very
   * little between the starting guess and convergence, so without this there is nothing to see.
   */
  values?: Float32Array;
  /** How `values` map onto the ramp for this primitive; see `valueColor` and `ValueScale`. */
  valueScale?: ValueScale;
  /**
   * Exact surface normal per vertex, flat xyz triples.
   *
   * Two things depend on it. Supplied normals are written straight through, so Mol* does not
   * have to average the incident triangles for a normal we already know exactly. And with
   * normals a triangle defines a curved patch, which `subdivide` then tessellates.
   */
  normals?: Float32Array;
  /**
   * Split each triangle into this many per edge along its PN patch. 1 leaves it flat.
   *
   * Requires `normals`. Costs the square in triangles and nothing in payload, which is the
   * point: the file stays a coarse mesh and the curve is reconstructed here.
   */
  subdivide?: number;
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

/**
 * A layer drawn as impostor spheres instead of meshes.
 *
 * The mesh path tessellates every sphere into 320 triangles on the CPU, which is fine for the
 * few hundred a schematic draws and impossible for the ten thousand a periodic cell holds:
 * 3.2 M triangles rebuilt per frame is seconds, not milliseconds. Impostors upload three
 * floats per atom and let the fragment shader do the sphere, so a full simulation box can be
 * re-sent every frame. Use this for atom counts in the thousands, the mesh path for
 * everything shaped like a diagram.
 *
 * One colour and one radius for the whole layer, so callers split by element rather than pass
 * per-atom arrays. Mol* builds its colour and size arrays by calling a theme once per group,
 * and at twenty thousand groups a frame that was 45% of the frame time: making both uniform
 * took the whole-cell view from 13.3 to 23.5 frames a second with nothing else changed.
 */
export interface ResearchSpheresLayerSpec {
  label: string;
  centers: Float32Array;
  radius: number;
  color: ColorValue;
  params?: Partial<Record<string, unknown>>;
}

/**
 * Bonds drawn as impostor cylinders, for the same reason the spheres above are impostors: the
 * periodic cell holds 9,482 of them, which as meshed tubes is 1.1 M triangles rebuilt per frame.
 * One start, one end and a radius per bond instead, and the fragment shader does the tube.
 */
export interface ResearchCylindersLayerSpec {
  label: string;
  starts: Float32Array;
  ends: Float32Array;
  radius: number;
  color: ColorValue;
  params?: Partial<Record<string, unknown>>;
}

export type ResearchLayer =
  | ResearchLayerSpec
  | ResearchSpheresLayerSpec
  | ResearchCylindersLayerSpec;

const isSpheresLayer = (layer: ResearchLayer): layer is ResearchSpheresLayerSpec =>
  "centers" in layer;
const isCylindersLayer = (layer: ResearchLayer): layer is ResearchCylindersLayerSpec =>
  "starts" in layer;
const isImpostorLayer = (layer: ResearchLayer) => isSpheresLayer(layer) || isCylindersLayer(layer);

/**
 * Bounds of what these layers paint, for framing a camera on them.
 *
 * Mol* keeps the same measurement in `canvas3d.boundingSphereVisible`, but that is a stale
 * object between its own commits: read at the moment a placement is computed it is still 0,
 * and reading it late means placing the camera twice with a visible jump. The layer list is
 * the draw list, so measure that. Centre is the midpoint of the extremes rather than a
 * centroid — a centroid weighted by primitive count sits inside whichever cluster has the
 * most atoms and leaves the frame lopsided.
 */
export function layerBounds(layers: ResearchLayer[]) {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const grow = (point: ArrayLike<number>, pad = 0) => {
    for (let axis = 0; axis < 3; axis++) {
      if (point[axis] - pad < min[axis]) min[axis] = point[axis] - pad;
      if (point[axis] + pad > max[axis]) max[axis] = point[axis] + pad;
    }
  };

  const points: Array<{ point: ArrayLike<number>; pad: number }> = [];
  for (const layer of layers) {
    // A layer faded to nothing is not painted, so it must not pull the frame.
    const alpha = layer.params?.alpha;
    if (typeof alpha === "number" && alpha < 0.02) continue;
    if (isSpheresLayer(layer)) {
      for (let i = 0; i < layer.centers.length; i += 3) {
        points.push({ point: layer.centers.subarray(i, i + 3), pad: layer.radius });
      }
      continue;
    }
    if (isCylindersLayer(layer)) {
      for (let i = 0; i < layer.starts.length; i += 3) {
        points.push({ point: layer.starts.subarray(i, i + 3), pad: layer.radius },
                    { point: layer.ends.subarray(i, i + 3), pad: layer.radius });
      }
      continue;
    }
    for (const primitive of layer.primitives) {
      switch (primitive.kind) {
        case "sphere":
          points.push({ point: primitive.center, pad: primitive.radius });
          break;
        case "cylinder":
        case "dashed-cylinder":
          points.push({ point: primitive.start, pad: 0 }, { point: primitive.end, pad: 0 });
          break;
        case "triangle":
          points.push({ point: primitive.a, pad: 0 }, { point: primitive.b, pad: 0 }, { point: primitive.c, pad: 0 });
          break;
        case "mesh":
          for (let at = 0; at < primitive.vertices.length; at += 3) {
            points.push({ point: primitive.vertices.subarray(at, at + 3), pad: 0 });
          }
          break;
      }
    }
  }
  if (!points.length) return null;
  for (const { point, pad } of points) grow(point, pad);

  const center = [0, 1, 2].map((axis) => (min[axis] + max[axis]) / 2) as [number, number, number];
  let radius = 0;
  for (const { point, pad } of points) {
    radius = Math.max(
      radius,
      Math.hypot(point[0] - center[0], point[1] - center[1], point[2] - center[2]) + pad,
    );
  }
  return { center, radius: Math.max(radius, 0.5) };
}

export const BACKGROUND = Color.fromHexStyle("#0a0909");
export const SLATE = Color.fromHexStyle("#9ca3af");
export const WHITE = Color.fromHexStyle("#f8fafc");
export const CARBON = Color.fromHexStyle("#3d4552");
export const NITROGEN = Color.fromHexStyle("#2563eb");
export const OXYGEN = Color.fromHexStyle("#ef4444");
export const HYDROGEN = Color.fromHexStyle("#f3f4f6");
export const CYAN = Color.fromHexStyle("#06b6d4");
export const PURPLE = Color.fromHexStyle("#8b5cf6");
export const RED = Color.fromHexStyle("#fb7185");
export const GREEN = Color.fromHexStyle("#22c55e");
export const AMBER = Color.fromHexStyle("#fbbf24");
export const ORANGE = Color.fromHexStyle("#f97316");
export const BLUE = Color.fromHexStyle("#2f74ff");
export const LIGHT_BLUE = Color.fromHexStyle("#60a5fa");
/**
 * The SCF density ramp: this iteration's density against the converged one, low to high.
 *
 * cmasher's `tropical`, sampled at nine stops. Directed and sequential, which is what the
 * quantity is - one number running from below the converged density to above it, with no
 * privileged middle. Two earlier attempts were diverging maps built around the converged value;
 * the second walked teal to amber through violet and pink, which spans plenty of hue and none of
 * it ordered. A reader cannot rank a rainbow.
 *
 * Nine stops rather than five because tropical turns through magenta, red, amber, green and cyan;
 * straight-line interpolation across a quarter of that span cuts the corners off the hue path.
 *
 * Hex rather than Color because the legend beside the canvas paints the same ramp in CSS.
 */
export const DENSITY_RAMP = [
  "#900ea5", "#b70681", "#d2264f", "#d95624", "#cf8203", "#b3ab23", "#7cd160", "#2cecb0", "#44fcfc",
] as const;
const RAMP = DENSITY_RAMP.map((hex) => Color.fromHexStyle(hex));
export const PALE = RAMP[(RAMP.length - 1) / 2];

/**
 * The surface every scene draws atoms and bonds with.
 *
 * Matte and non-metallic, so a sphere reads by its silhouette and one soft highlight rather than
 * by a reflection that moves when the camera does. It lives here because it was diverging: the
 * electrolyte tier had these numbers and the DFT tier had its own metalness 0.08 / bumpiness 0.03
 * / emissive 0.02, which is enough to make the same molecule look like a different material.
 */
export const ATOM_MATERIAL = { metalness: 0, roughness: 0.45, bumpiness: 0 };

export const ELEMENT_COLORS: Record<string, ColorValue> = {
  C: CARBON,
  N: NITROGEN,
  O: OXYGEN,
  H: HYDROGEN,
  Mg: GREEN,
};

const molstarResearchGlobals = globalThis as typeof globalThis & {
  __labHomepageResearchMeshProvider3D__?: unknown;
  __labHomepageResearchSpheresProvider3D__?: unknown;
  __labHomepageResearchCylindersProvider3D__?: unknown;
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

function createShapeFromSpheresLayer(spec: ResearchSpheresLayerSpec) {
  const count = spec.centers.length / 3;
  const groups = new Float32Array(count);
  for (let i = 0; i < count; i++) groups[i] = i;
  const spheres = Spheres.create(spec.centers, groups, count);
  return Shape.create(
    spec.label,
    spec,
    spheres,
    () => spec.color,
    () => spec.radius,
    () => spec.label,
  );
}

function createResearchSpheresProvider() {
  return PluginStateTransform.BuiltIn({
    name: "multiscale-spheres-provider-3d",
    display: "Research Spheres",
    from: SO.Root,
    to: SO.Shape.Provider,
    params: {
      label: PD.Text("Research Layer"),
      spec: PD.Value<ResearchSpheresLayerSpec>({
        label: "Research Layer",
        centers: new Float32Array(0),
        radius: 1,
        color: WHITE,
      }),
    },
  })({
    canAutoUpdate() {
      return true;
    },
    apply({ params }) {
      return Task.create("Research Spheres Provider", async () => {
        return new SO.Shape.Provider(
          {
            label: params.label,
            data: params.spec,
            params: Spheres.Params,
            getShape: (_, spec) => createShapeFromSpheresLayer(spec),
            geometryUtils: Spheres.Utils,
          },
          { label: params.label },
        );
      });
    },
    update({ b, newParams }) {
      b.data.label = newParams.label;
      b.data.data = newParams.spec;
      b.label = newParams.label;
      return Task.create("Research Spheres Provider", async () => StateTransformer.UpdateResult.Updated);
    },
  });
}

function createShapeFromCylindersLayer(spec: ResearchCylindersLayerSpec) {
  const count = spec.starts.length / 3;
  const builder = CylindersBuilder.create(count, count);
  for (let i = 0; i < count; i++) {
    builder.add(spec.starts[i * 3], spec.starts[i * 3 + 1], spec.starts[i * 3 + 2],
                spec.ends[i * 3], spec.ends[i * 3 + 1], spec.ends[i * 3 + 2],
                1, true, true, 2, i);
  }
  return Shape.create(
    spec.label,
    spec,
    builder.getCylinders(),
    () => spec.color,
    () => spec.radius,
    () => spec.label,
  );
}

function createResearchCylindersProvider() {
  return PluginStateTransform.BuiltIn({
    name: "multiscale-cylinders-provider-3d",
    display: "Research Cylinders",
    from: SO.Root,
    to: SO.Shape.Provider,
    params: {
      label: PD.Text("Research Layer"),
      spec: PD.Value<ResearchCylindersLayerSpec>({
        label: "Research Layer",
        starts: new Float32Array(0),
        ends: new Float32Array(0),
        radius: 1,
        color: WHITE,
      }),
    },
  })({
    canAutoUpdate() {
      return true;
    },
    apply({ params }) {
      return Task.create("Research Cylinders Provider", async () => {
        return new SO.Shape.Provider(
          {
            label: params.label,
            data: params.spec,
            params: Cylinders.Params,
            getShape: (_, spec) => createShapeFromCylindersLayer(spec),
            geometryUtils: Cylinders.Utils,
          },
          { label: params.label },
        );
      });
    },
    update({ b, newParams }) {
      b.data.label = newParams.label;
      b.data.data = newParams.spec;
      b.label = newParams.label;
      return Task.create("Research Cylinders Provider", async () => StateTransformer.UpdateResult.Updated);
    },
  });
}

const ResearchCylindersProvider3D =
  (molstarResearchGlobals.__labHomepageResearchCylindersProvider3D__ as ReturnType<typeof createResearchCylindersProvider>) ??
  (molstarResearchGlobals.__labHomepageResearchCylindersProvider3D__ = createResearchCylindersProvider());

const ResearchSpheresProvider3D =
  (molstarResearchGlobals.__labHomepageResearchSpheresProvider3D__ as ReturnType<typeof createResearchSpheresProvider>) ??
  (molstarResearchGlobals.__labHomepageResearchSpheresProvider3D__ = createResearchSpheresProvider());

function toMolstarVec3(point: [number, number, number] | number[]) {
  return Vec3.create(point[0], point[1], point[2]);
}

/**
 * Where a vertex value lands between the layer's own colour and the two accents.
 *
 * Diverging rather than a single hue because the sign matters: an iteration can sit above or
 * below the converged density and those are different statements. Zero is the layer colour, so
 * a converged surface is simply the surface and the reader has nothing extra to decode.
 */
/**
 * How one primitive's `values` land on DENSITY_RAMP: `t = amp * asinh(value / knee) / norm`.
 *
 * Shape and envelope are separate on purpose. `knee`/`norm` are fitted to this frame's own value
 * distribution, so the surface grades smoothly instead of piling onto the ramp ends; `amp` is set
 * on a scale shared by the whole run, so across frames only the envelope moves and convergence
 * stays legible. The producer decides both - see `frameScales` in MolstarDftStage, which carries
 * the measurements this replaces a fixed global transfer over.
 */
export interface ValueScale {
  /** Signed-log knee for this frame's values. Non-positive means everything maps to zero. */
  knee: number;
  /** asinh units from the knee to where the shape saturates (this frame's p99). */
  norm: number;
  /** Fraction of the half-ramp this frame may use, 0..1, from the run-wide envelope. */
  amp: number;
}

/**
 * Position `value` on DENSITY_RAMP through `scale`.
 *
 * The layer's own colour does not enter it. On a sequential map every value including zero has
 * a colour of its own, so mixing the layer colour back in would flatten the middle of the scale
 * towards whatever that layer happened to be.
 */
function valueColor(value: number, scale: ValueScale | undefined): ColorValue {
  const t = !scale || scale.knee <= 0
    ? 0
    : scale.amp * Math.max(-1, Math.min(1, Math.asinh(value / scale.knee) / scale.norm));
  const at = ((t + 1) / 2) * (RAMP.length - 1);
  const step = Math.min(RAMP.length - 2, Math.floor(at));
  return mixColor(RAMP[step], RAMP[step + 1], at - step);
}

function createShapeFromLayer(spec: ResearchLayerSpec) {
  const builderState = MeshBuilder.createState(4096, 2048);
  const groupColors: ColorValue[] = [];
  const groupLabels: string[] = [];
  // Set when any primitive brought its own normals, which is what decides whether Mol* has to
  // derive them from the triangles below. The isosurfaces know their exact normal from the
  // field gradient, and averaging incident faces would only blur it.
  let suppliedNormals = false;
  // Per-vertex colouring needs one group per vertex, and those ids have to live past the
  // per-primitive ones. Cheap now: the isosurfaces are curvature-remeshed and run to a few
  // thousand vertices rather than the quarter million a uniform extraction produced.
  let nextGroup = spec.primitives.length;

  spec.primitives.forEach((primitive, groupIndex) => {
    builderState.currentGroup = groupIndex;
    groupColors[groupIndex] = primitive.color;
    groupLabels[groupIndex] = primitive.label ?? spec.label;

    if (primitive.kind === "sphere") {
      addSphere(builderState, toMolstarVec3(primitive.center), primitive.radius, 2);
      return;
    }

    if (primitive.kind === "cylinder") {
      const cylinderProps = {
        radiusTop: primitive.radiusTop,
        radiusBottom: primitive.radiusBottom,
        radialSegments: primitive.radialSegments ?? 14,
        topCap: primitive.radiusTop > 0,
        bottomCap: primitive.radiusBottom > 0,
      };
      const from = toMolstarVec3(primitive.start);
      const to = toMolstarVec3(primitive.end);
      if (primitive.radiusTop === primitive.radiusBottom) {
        // Uniform cylinder (bond): addCylinder's matchDir keeps adjacent
        // segments' triangles aligned, and a symmetric radius makes the flip
        // it introduces harmless.
        addCylinder(builderState, from, to, 1, cylinderProps);
      } else {
        // Tapered cylinder (arrowhead cone): addCylinder flips start↔end for
        // half of all directions, which reverses the cone into a bowtie head.
        // addSimpleCylinder pins the orientation so radiusTop is always at
        // `end` and radiusBottom at `start`.
        addSimpleCylinder(builderState, from, to, cylinderProps);
      }
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

    // Push the vertex list once and index into it, rather than calling addTriangle per face.
    // addTriangle appends three fresh vertices and writes the face normal to all three, so a
    // triangle never shares a vertex with its neighbours and Mesh.computeNormals below can only
    // hand back that same face normal. Every isosurface in the site was flat-shaded because of
    // it, whatever its triangle count: the 79k-triangle SCF density read as facets. Shared
    // vertices cost nothing and let computeNormals average across the incident faces, which is
    // what the spheres already get from addSphere.
    // Curve the triangles first, when the primitive brought the normals that define the patch.
    // Values are carried across by repeating each corner's value over its lattice, which is
    // exact at the corners and linear between, matching how the normals are interpolated.
    let vertices = primitive.vertices;
    let faces = primitive.faces;
    let normals = primitive.normals;
    let values = primitive.values;
    const level = primitive.subdivide ?? 1;
    if (normals && level > 1) {
      const curved = pnSubdivide(vertices, normals, faces, level);
      if (values) {
        const perTriangle = ((level + 1) * (level + 2)) / 2;
        const spread = new Float32Array(curved.vertices.length / 3);
        let at = 0;
        for (let triangle = 0; triangle < faces.length / 3; triangle++) {
          const corner = [values[faces[triangle * 3]], values[faces[triangle * 3 + 1]],
                          values[faces[triangle * 3 + 2]]];
          for (let row = 0; row <= level; row++) {
            for (let column = 0; column <= level - row; column++) {
              const v = row / level;
              const u = column / level;
              spread[at++] = corner[0] * (1 - u - v) + corner[1] * u + corner[2] * v;
            }
          }
        }
        if (at !== curved.vertices.length / 3) {
          throw new Error(`value lattice ${at} against ${curved.vertices.length / 3} vertices`);
        }
        values = spread;
        void perTriangle;
      }
      vertices = curved.vertices;
      faces = curved.faces;
      normals = curved.normals;
    }
    if (normals) suppliedNormals = true;

    // One group id per vertex, resolved once so the back-face copy below paints the same
    // colours. Without values every vertex shares the primitive's own group, as before.
    const vertexCount = vertices.length / 3;
    const vertexGroups = new Uint32Array(vertexCount);
    for (let index = 0; index < vertexCount; index++) {
      if (!values) {
        vertexGroups[index] = groupIndex;
        continue;
      }
      const group = nextGroup++;
      groupColors[group] = valueColor(values[index] ?? 0, primitive.valueScale);
      groupLabels[group] = primitive.label ?? spec.label;
      vertexGroups[index] = group;
    }

    const base = builderState.vertices.elementCount;
    for (let index = 0; index < vertexCount; index++) {
      const at = index * 3;
      ChunkedArray.add3(builderState.vertices, vertices[at], vertices[at + 1], vertices[at + 2]);
      if (normals) {
        ChunkedArray.add3(builderState.normals, normals[at], normals[at + 1], normals[at + 2]);
      } else {
        ChunkedArray.add3(builderState.normals, 0, 0, 0);
      }
      ChunkedArray.add(builderState.groups, vertexGroups[index]);
    }
    for (let at = 0; at < faces.length; at += 3) {
      ChunkedArray.add3(builderState.indices, base + faces[at], base + faces[at + 1],
                        base + faces[at + 2]);
    }
    if (primitive.doubleSided) {
      // A second copy of the vertices with the winding reversed. Reusing the same vertices for
      // both windings would give each one two opposed face normals to average and cancel it to
      // zero.
      const back = builderState.vertices.elementCount;
      for (let index = 0; index < vertexCount; index++) {
        const at = index * 3;
        ChunkedArray.add3(builderState.vertices, vertices[at], vertices[at + 1], vertices[at + 2]);
        if (normals) {
          ChunkedArray.add3(builderState.normals, -normals[at], -normals[at + 1], -normals[at + 2]);
        } else {
          ChunkedArray.add3(builderState.normals, 0, 0, 0);
        }
        ChunkedArray.add(builderState.groups, vertexGroups[index]);
      }
      for (let at = 0; at < faces.length; at += 3) {
        ChunkedArray.add3(builderState.indices, back + faces[at], back + faces[at + 2],
                          back + faces[at + 1]);
      }
    }
  });

  const mesh = MeshBuilder.getMesh(builderState);
  if (!suppliedNormals) Mesh.computeNormals(mesh);

  return Shape.create(
    spec.label,
    spec,
    mesh,
    (groupId) => groupColors[groupId] ?? WHITE,
    () => 1,
    (groupId) => groupLabels[groupId] ?? spec.label,
  );
}

// Mutex to prevent concurrent tree operations (causes "Node not present" errors)
let _commitLock: Promise<void> = Promise.resolve();

function representationParams(layer: ResearchLayer) {
  const defaults = isSpheresLayer(layer) ? Spheres.Params
    : isCylindersLayer(layer) ? Cylinders.Params : Mesh.Params;
  return {
    ...PD.getDefaultValues(defaults),
    quality: "high",
    alpha: 1,
    material: { metalness: 0.04, roughness: 0.6, bumpiness: 0, ...(layer.params?.material as object) },
    emissive: 0,
    xrayShaded: false,
    transparentBackfaces: "on",
    ...(isImpostorLayer(layer) ? { sizeFactor: 1, solidInterior: true } : null),
    ...(layer.params ?? {}),
  };
}

/**
 * Rebuild the whole draw list. Every animation frame goes through here.
 *
 * Reusing the existing state nodes and only pushing new positions into them was tried, on the
 * theory that dropping and reallocating the GPU buffers each frame was the cost. It is not, and
 * it silently broke the animation: the provider mutates its object in place, so the downstream
 * representation saw an unchanged input and never recomputed the geometry. Measured on the
 * whole-cell view, the share of ink pixels that moved between two readbacks 200 ms apart went
 * from 0.84 to 0.11 while the frame counter kept reporting 40 fps, because the camera was still
 * moving. A full rebuild costs nothing here: 32-49 fps across both scenes and every viewport.
 */
export async function commitResearchLayers(plugin: PluginLike, layers: ResearchLayer[]) {
  // Wait for any in-flight commit to finish before starting a new one
  const prev = _commitLock;
  let release: () => void;
  _commitLock = new Promise<void>((r) => { release = r; });
  await prev;

  const drawn = layers.filter((l) => (isSpheresLayer(l) ? l.centers.length
    : isCylindersLayer(l) ? l.starts.length : l.primitives.length) > 0);

  try {
    await plugin.clear();
    const build = plugin.build();

    drawn.forEach((layer) => {
      const provider = build
        .toRoot()
        .apply(isSpheresLayer(layer) ? ResearchSpheresProvider3D
          : isCylindersLayer(layer) ? ResearchCylindersProvider3D : ResearchMeshProvider3D, {
          label: layer.label,
          spec: layer,
        } as never);
      provider.apply(
        StateTransforms.Representation.ShapeRepresentation3D,
        representationParams(layer) as never,
      );
    });

    await build.commit();
  } finally {
    release!();
  }
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
    ambientIntensity?: number;
  };
  postprocessing: {
    occlusion?: { name: string; params?: Record<string, unknown> };
    outline?: { name: string; params?: Record<string, unknown> };
    shadow?: { name: string; params?: Record<string, unknown> };
    antialiasing?: { name: string };
    sharpening?: { name: string; params?: Record<string, unknown> };
  };
  transparency: string;
  camera: {
    manualReset: boolean;
  };
  trackball: {
    bindings: Record<string, unknown>;
    zoomSpeed: number;
    rotateSpeed: number;
    animate: { name: string; params: Record<string, unknown> };
    autoAdjustMinMaxDistance: { name: string; params: Record<string, unknown> };
  };
}

// Cap on how much the drawing buffer oversamples CSS pixels. Mol*'s default
// `auto` resolution renders mobile canvases at pixelScale/devicePixelRatio,
// which collapses the backing store to CSS resolution (≈1× on a DPR-3 phone)
// and upscales it — the source of the blurry molecule renders. We force
// `native` mode and pick a pixelScale so the backing store is DPR × css,
// clamped to this multiple so a DPR-3 phone stays at 2× rather than 3×.
const RESEARCH_MAX_OVERSAMPLE = 2;

function researchPixelScale() {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, RESEARCH_MAX_OVERSAMPLE) / dpr;
}

export function createResearchPlugin() {
  const spec = DefaultPluginUISpec();
  return new PluginUIContext({
    ...spec,
    // Mol*'s camera-focus behaviour, dropped. It binds a double-click to `camera.focus` on
    // whatever was hit and a plain click on empty space to a camera reset, both of which
    // overwrite the placement these scenes solve for themselves. Its floor is worse than the
    // hijack: `minRadius` is 8, written for structures measured in angstroms, and this scene is
    // in nanometres, so one double-click asks for a 8 nm framing of a 4.8 nm cell. Framing here
    // belongs to the fit and reset controls next to the canvas.
    behaviors: spec.behaviors.filter(
      (behavior) => behavior.transformer.id !== PluginBehaviors.Camera.FocusLoci.id),
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
      [PluginConfig.General.ResolutionMode, "native"],
      [PluginConfig.General.PixelScale, researchPixelScale()],
    ],
  });
}

/**
 * Screen-space ambient occlusion and a depth outline, the two passes that separate a Mol*
 * gallery render from a flat pile of spheres. Off by default: the schematic stages draw a few
 * dozen well-separated primitives where occlusion has nothing to darken and an outline only
 * adds noise. They earn their cost on a condensed-phase box, where the crevices between ten
 * thousand atoms are the entire sense of depth.
 *
 * Mol* takes the occlusion radius as an exponent, `2^radius`, in scene units. Scene units here
 * are nanometres, so its default of 5 would sample 32 nm across a 5 nm cell and shade nothing.
 * 0 is the parameter's floor and gives 1 nm, about six atom radii.
 */
const CINEMATIC_POSTPROCESSING = {
  occlusion: {
    name: "on",
    params: {
      samples: 16,
      multiScale: { name: "off", params: {} },
      radius: 0,
      bias: 0.9,
      blurKernelSize: 11,
      blurDepthBias: 0.5,
      resolutionScale: 0.5,
      color: Color.fromHexStyle("#000000"),
      transparentThreshold: 0.4,
    },
  },
  outline: {
    name: "on",
    params: {
      scale: 1,
      threshold: 0.15,
      color: Color.fromHexStyle("#000000"),
      includeTransparent: false,
    },
  },
  // Contact shadows. Mol* has no path tracer, so this ray-marched pass is the closest thing to
  // real light transport it offers, and on a packed cell it is what puts atoms behind other
  // atoms rather than beside them. maxDistance is in scene units, so it is set to a few atom
  // radii; at Mol*'s default of 3 it would march across the whole 4.8 nm box and flatten out.
  shadow: { name: "on", params: { steps: 1, maxDistance: 0.6, tolerance: 1.0 } },
  sharpening: { name: "on", params: { sharpness: 0.5, denoise: true } },
} as const;

export async function applyResearchCanvasSettings(
  plugin: PluginLike,
  autoRotate: boolean,
  backgroundColor = BACKGROUND,
  cinematic = false,
) {
  await PluginCommands.Canvas3D.SetSettings(plugin, {
    settings: (props) => {
      const canvasProps = props as unknown as CanvasSettingsProps;
      canvasProps.renderer.backgroundColor = backgroundColor;
      canvasProps.renderer.pickingAlphaThreshold = 0.05;
      // Mol* re-frames the camera onto the visible scene bounding sphere after any commit
      // that grows it, which on an animating trajectory is most of them. It overwrote every
      // placement this app computes: the force-field page asked for a camera distance of
      // 8.35 and ended up at 20.63, so the whole view schedule — padding, targetOccupancy,
      // the zoom ladder — was configuration nothing read. Own the camera; every path that
      // moves it (scroll, zoom buttons, fit, reset) already goes through
      // applyMolstarPlacement.
      canvasProps.camera.manualReset = true;
      canvasProps.postprocessing ??= {};
      if (cinematic) {
        Object.assign(canvasProps.postprocessing, structuredClone(CINEMATIC_POSTPROCESSING));
        canvasProps.renderer.ambientIntensity = 0.75;
      } else {
        if (canvasProps.postprocessing.occlusion) canvasProps.postprocessing.occlusion.name = "off";
        if (canvasProps.postprocessing.outline) canvasProps.postprocessing.outline.name = "off";
      }
      if (!cinematic && canvasProps.postprocessing.shadow) canvasProps.postprocessing.shadow.name = "off";
      if (canvasProps.postprocessing.antialiasing) canvasProps.postprocessing.antialiasing.name = "smaa";
      canvasProps.transparency = "wboit";
      canvasProps.trackball.bindings = {
        ...canvasProps.trackball.bindings,
        scrollZoom: Binding.Empty,
        scrollFocus: Binding.Empty,
        scrollFocusZoom: Binding.Empty,
      };
      // How close the controls let the camera get, as a share of the scene rather than an
      // absolute. Mol* ships minDistanceFactor 0 and minDistancePadding 5, which is 5 of
      // whatever unit the scene happens to use. The electrolyte tier is in nanometres at a
      // radius of 0.72, so that floor is seven times the whole scene: zooming in shrank the clip
      // radius from 0.719 to 0.338 while the camera distance stayed pinned at exactly 5, and the
      // page zoomed out instead of in as the closing clip planes ate the surrounding molecules.
      canvasProps.trackball.autoAdjustMinMaxDistance = {
        name: "on",
        params: { minDistanceFactor: 0.2, minDistancePadding: 0,
                  maxDistanceFactor: 10, maxDistanceMin: 0 },
      };
      canvasProps.trackball.zoomSpeed = 4;
      canvasProps.trackball.rotateSpeed = 3.5;
      canvasProps.trackball.animate = autoRotate
        ? { name: "spin", params: { speed: 0.06, axis: Vec3.create(0, -1, 0) } }
        : { name: "off", params: {} };
    },
  });
}

export function applyResearchCanvasBackground(plugin: PluginLike, backgroundColor: string) {
  return PluginCommands.Canvas3D.SetSettings(plugin, {
    settings: (props) => {
      const canvasProps = props as unknown as CanvasSettingsProps;
      canvasProps.renderer.backgroundColor = Color.fromHexStyle(backgroundColor);
    },
  });
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export async function fitScene(plugin: PluginLike, durationMs = 0): Promise<CameraSnapshotLike | null> {
  const before = plugin.canvas3d?.camera.getSnapshot() as CameraSnapshotLike | undefined;
  await PluginCommands.Camera.Reset(plugin, { durationMs });
  // The command only queues the reset; Mol* applies it inside its render loop, so the
  // snapshot is still the previous camera the moment the command resolves. Mol*'s own
  // automatic re-fit used to correct that a frame later. With `manualReset` on nothing does,
  // and reading early left every MLFF panel framed at Mol*'s default 10 A radius, which drew
  // the molecules as specks. Wait for the camera to actually move.
  for (let frame = 0; frame < 12; frame++) {
    await nextFrame();
    const now = plugin.canvas3d?.camera.getSnapshot() as CameraSnapshotLike | undefined;
    if (now && (!before || !Vec3.exactEquals(now.position, before.position))) return now;
  }
  return (plugin.canvas3d?.camera.getSnapshot() as CameraSnapshotLike | undefined) ?? null;
}

export function bindResearchCameraActions(
  plugin: PluginLike,
  actionsRef: MutableRefObject<ResearchCameraActions | null> | undefined,
  defaultSnapshotRef: MutableRefObject<CameraSnapshotLike | null>,
) {
  if (!actionsRef) return;

  actionsRef.current = {
    // `radius` has to scale with the position, not just the position. These scenes render
    // orthographic, where the frustum half-height is the radius and the camera's distance from
    // the target changes nothing: moving the position alone was measured at exactly zero pixels
    // of change over eight clicks.
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
    // Already declared on the interface and reachable from window.__multiscaleDebug; the scenes
    // animate, so pixel differences alone cannot tell a camera move from the trajectory playing.
    getMetrics: () => {
      const current = plugin.canvas3d?.camera.getSnapshot();
      if (!current) return null;
      return {
        radius: current.radius,
        radiusMax: current.radiusMax,
        distance: Vec3.distance(current.position, current.target),
      };
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
  backgroundColor,
  actionsRef,
  defaultSnapshotRef,
  cinematic = false,
}: {
  container: HTMLDivElement;
  autoRotate: boolean;
  backgroundColor?: string;
  actionsRef?: MutableRefObject<ResearchCameraActions | null>;
  defaultSnapshotRef: MutableRefObject<CameraSnapshotLike | null>;
  cinematic?: boolean;
}) {
  const plugin = createResearchPlugin();
  await plugin.init();
  const mounted = await plugin.mountAsync(container);
  if (!mounted) {
    plugin.dispose();
    return { plugin: null, error: "WebGL could not be initialized in this browser session." };
  }

  await applyResearchCanvasSettings(
    plugin,
    autoRotate,
    backgroundColor ? Color.fromHexStyle(backgroundColor) : BACKGROUND,
    cinematic,
  );
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
