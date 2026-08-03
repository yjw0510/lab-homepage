"""Curvature-adaptive isosurface meshing for volumetric quantum-chemistry fields.

Reads a Gaussian cube (`.cub`/`.cube`) or an ORCA `.gbw` and writes one isosurface as a mesh
whose triangles are small where the surface bends and large where it does not.

    python scripts/isosurface_remesh.py density.cub --iso 0.02 --out mesh.json
    python scripts/isosurface_remesh.py --self-test

Marching cubes spends the same triangle everywhere, so the only way to resolve a tight lobe is
to refine the flat sheet next to it as well. Doubling the grid quadruples the count. The
adaptive remesh keeps the lobe and drops the sheet.

The remeshing itself is MeshLab's (Botsch-Kobbelt incremental remeshing with the Dunyach et al.
2013 curvature sizing field, `adaptive=True`). Two things it cannot do are done here, because
they need the volume and it only sees the mesh:

- vertices are Newton-projected onto the isosurface of a tricubic interpolant, so a vertex sits
  on the real surface rather than on the trilinear one marching cubes reconstructed;
- normals come from the interpolated field gradient, not from the triangles.

`--sample N` resamples the field N times finer per axis before extraction. That is the knob for
"more samples": a lobe thinner than a voxel is invisible to any extractor. It does not by itself
add triangles; `--tolerance` sets those, in voxels rather than Angstrom.

`.gbw` holds basis functions and MO coefficients, not a grid, so `orca_plot` has to evaluate one
first. ORCA must be on PATH.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pymeshlab
from scipy import ndimage
from skimage.measure import marching_cubes

BOHR_TO_ANG = 0.529177210903


def load_cube(path: Path):
    """Return (values, origin, step) in Angstrom. Cube axes are axis-aligned in practice."""
    lines = path.read_text().splitlines()
    natoms = int(lines[2].split()[0])
    origin = np.array([float(v) for v in lines[2].split()[1:4]])
    counts, steps = [], []
    for row in range(3):
        parts = lines[3 + row].split()
        counts.append(int(parts[0]))
        steps.append(float(parts[1 + row]))
    # A negative voxel count marks that axis as already Angstrom; otherwise the file is Bohr.
    unit = 1.0 if counts[0] < 0 else BOHR_TO_ANG
    shape = tuple(abs(c) for c in counts)

    start = 6 + abs(natoms) + (1 if natoms < 0 else 0)  # negative natoms adds an orbital-index line
    values = np.array(" ".join(lines[start:]).split(), dtype=np.float64)
    n = shape[0] * shape[1] * shape[2]
    if values.size < n:
        raise SystemExit(f"{path.name}: expected {n} values, found {values.size}")
    return values[:n].reshape(shape), origin * unit, np.array(steps) * unit


def cube_from_gbw(path: Path, points: int, out_dir: Path) -> Path:
    """Drive orca_plot's menu to write a density cube. ORCA 6 key sequence."""
    stdin = "\n".join(["4", "2", "5", str(points), "1", "3", "10", "11"]) + "\n"
    try:
        subprocess.run(["orca_plot", str(path), "-i"], input=stdin, text=True,
                       cwd=out_dir, check=True, capture_output=True)
    except FileNotFoundError:
        raise SystemExit(
            "orca_plot is not on PATH. Either put ORCA there, or make the cube yourself:\n"
            "    orca_plot job.gbw -i   # 4, 2 (density), 5 <points>, 1, 3 (cube), 10, 11"
        )
    cubes = sorted(set(out_dir.glob("*.cube")) | set(out_dir.glob("*.cub")))
    if not cubes:
        raise SystemExit("orca_plot wrote no cube; run it interactively to see its menu.")
    return cubes[0]


class Field:
    """Tricubic interpolant of the volume, with the gradient taken on the lattice.

    `map_coordinates(order=3)` is a cubic B-spline, so the interpolated isosurface is a genuine
    smooth surface; the trilinear one marching cubes reconstructs is only C0 and its shape near
    a lobe is a property of the grid.
    """

    def __init__(self, values, origin, step):
        self.origin, self.step = origin, step
        f = lambda a: ndimage.spline_filter(a, order=3, mode="nearest")
        self.value_c = f(values)
        self.grad_c = [f(g) for g in np.gradient(values, *step, edge_order=2)]

    def _at(self, coeffs, points):
        index = ((points - self.origin) / self.step).T
        return ndimage.map_coordinates(coeffs, index, order=3, mode="nearest", prefilter=False)

    def value(self, points):
        return self._at(self.value_c, points)

    def gradient(self, points):
        return np.stack([self._at(c, points) for c in self.grad_c], axis=1)

    def project(self, points, level, steps=3):
        """x <- x - (f(x) - level) * g / |g|^2, each step no longer than one voxel.

        The clamp is not a refinement, it is what stops the method exploding. A vertex sitting
        where the gradient has nearly collapsed gets a step of (rho - level)/|grad|, and the
        `|grad|^2 > 1e-18` test passes long after that quotient stops being a distance: measured
        on the SCF density snapshots, six of eight meshes came back with vertices up to 2.3e7 A
        from a box 11 A across, and the camera then framed all of it and drew the molecule as a
        speck. A vertex of an isosurface has no business moving more than a voxel or two, so
        that is the budget it gets.
        """
        limit = float(np.min(self.step))
        for _ in range(steps):
            value = self._at(self.value_c, points)
            grad = self.gradient(points)
            norm2 = np.einsum("ij,ij->i", grad, grad)
            ok = norm2 > 1e-18
            shift = np.zeros_like(points)
            shift[ok] = ((value[ok] - level) / norm2[ok])[:, None] * grad[ok]
            length = np.linalg.norm(shift, axis=1, keepdims=True)
            shift = np.where(length > limit, shift * (limit / np.maximum(length, 1e-30)), shift)
            points = points - shift
        return points

    def normals(self, points, sign):
        grad = self.gradient(points)
        return sign * grad / np.maximum(np.linalg.norm(grad, axis=1, keepdims=True), 1e-18)


def remesh(vertices, faces, tolerance, iterations, log=print):
    """MeshLab adaptive isotropic remeshing, bounded by `tolerance` in world units.

    `tolerance` has to be read against the extraction grid, not chosen in the abstract. Asking
    the remesher to stay within 0.03 A of a mesh whose voxels are 0.31 A apart pins every
    vertex where it already is, so instead of coarsening it subdivides to satisfy the
    constraint: measured on an SCF density snapshot, 19,204 input faces came back as 199,136.
    The caller passes a tolerance derived from the voxel size for that reason.

    The guard is the real lesson. This function exists to spend fewer triangles, so returning
    more of them is a failure however plausible the parameters looked, and the uniform mesh is
    a correct answer where the remesh is not.
    """
    mesh_set = pymeshlab.MeshSet()
    mesh_set.add_mesh(pymeshlab.Mesh(vertex_matrix=vertices, face_matrix=faces))
    mesh_set.meshing_isotropic_explicit_remeshing(
        iterations=iterations,
        adaptive=True,
        # The base edge length the curvature field modulates downward, so it has to sit above
        # the longest edge the rule would ever ask for or it caps both ends and nothing adapts.
        # At 8x the bound it did exactly that: on two lobes of radius 2.5 and 0.6 the sizing
        # field wants 0.92 A and 0.45 A, the cap was 0.34 A, and the triangles came out 1.3x
        # apart instead of 4x.
        targetlen=pymeshlab.PureValue(float(tolerance) * 24),
        checksurfdist=True,
        maxsurfdist=pymeshlab.PureValue(float(tolerance)),
    )
    out = mesh_set.current_mesh()
    new_vertices, new_faces = out.vertex_matrix(), out.face_matrix()
    if len(new_faces) > len(faces):
        log(f"  remesh grew {len(faces)} faces to {len(new_faces)}; keeping the uniform mesh")
        return vertices, faces, False
    return new_vertices, new_faces, True


def build_mesh(values, origin, step, level, tolerance=0.01, sample=1, iterations=8, log=print,
               reference=None, reference_level=None):
    """Extract one isosurface of `values`; optionally paint each vertex with its distance from
    a `reference` field sampled on the same lattice.

    The reference is what makes an SCF animation readable. The total density surface barely
    moves between the starting guess and convergence, measured on chlorophyll a at 0.96 overlap,
    so the frames look alike. Sampling the converged density at each vertex and returning
    rho(v) - rho_converged(v) puts the part that does change onto the surface as a value the
    renderer can colour.
    """
    if sample > 1:
        values = ndimage.zoom(values, sample, order=3, mode="nearest")
        step = step / sample
    field = Field(values, origin, step)

    vertices, faces, _, _ = marching_cubes(values, level=level, spacing=tuple(step))
    vertices = vertices + origin
    uniform = len(faces)
    log(f"marching cubes on {values.shape}: {len(vertices)} v / {uniform} f")

    # The tolerance is read against the voxel: a bound tighter than the grid can resolve is not
    # a stricter mesh, it is a remesher with nothing legal to do. `tolerance` is that fraction
    # of the shortest voxel edge.
    bound = float(tolerance) * float(np.min(step))
    vertices, faces, adapted = remesh(field.project(vertices, level), faces, bound, iterations,
                                      log=log)
    vertices = field.project(vertices, level)

    # Which way is out: take the consensus between the winding the extractor produced and the
    # field gradient, rather than trusting either convention.
    a, b, c = (vertices[faces[:, i]] for i in range(3))
    winding = np.cross(b - a, c - a)
    sign = -1.0 if np.einsum("ij,ij->i", winding, field.gradient(a)).sum() < 0 else 1.0

    # Chord height at the triangle centroids. The vertices were projected onto the surface, so
    # measuring there would report zero for any mesh however coarse.
    #
    # |rho - level| / |grad rho| is a first-order distance to the surface and it is only that
    # where the gradient means something. At a saddle or a flat spot the gradient collapses and
    # the ratio runs away: this reported a chord error of 5e+16 on real density snapshots, which
    # is the 1e-18 floor showing through rather than a measurement. Those centroids are dropped.
    centroids = vertices[faces].mean(axis=1)
    slope = np.linalg.norm(field.gradient(centroids), axis=1)
    # 1e-3 of the median was too loose: it still let through centroids reporting chord heights
    # of 158 and 220 A, which is a hundred voxels and plainly not a distance to anything. Five
    # percent of the median gradient is the point below which the linear estimate stops being
    # one, and how many triangles that removes is reported rather than quietly dropped.
    usable = slope > 0.05 * np.median(slope)
    error = np.abs(field.value(centroids[usable]) - level) / slope[usable]
    skipped = int((~usable).sum())

    edges = np.sort(np.vstack([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]), axis=1)
    _, counts = np.unique(edges, axis=0, return_counts=True)

    # An isosurface of a field sampled on a box lives in that box. Anything outside is a
    # projection that ran away, and it is worth reporting on every run rather than only in the
    # self test: the camera frames whatever it is given, so one escaped vertex draws the whole
    # molecule as a speck.
    low = origin - np.array(step)
    high = origin + (np.array(values.shape) - 1) * np.array(step) + np.array(step)
    escaped = int((np.any(vertices < low, axis=1) | np.any(vertices > high, axis=1)).sum())

    result = {
        "vertices": np.round(vertices, 5).tolist(),
        "faces": faces.tolist(),
        "normals": np.round(field.normals(vertices, sign), 4).tolist(),
        "stats": {
            "uniformFaces": int(uniform),
            "adaptiveFaces": int(len(faces)),
            "adapted": bool(adapted),
            "boundA": round(bound, 4),
            "chordP95": round(float(np.percentile(error, 95)), 5) if error.size else None,
            "chordMax": round(float(error.max()), 5) if error.size else None,
            "closedManifold": bool(np.all(counts == 2)),
            "outsideGrid": escaped,
            "skippedCentroids": skipped,
        },
    }

    if reference is not None:
        if sample > 1:
            reference = ndimage.zoom(reference, sample, order=3, mode="nearest")
        # Log of the ratio, not the difference. Zero exactly where this vertex also lies on the
        # reference surface, and one unit means a factor of e either way whatever the isovalue is.
        #
        # The difference carries the density's own scale, and across an SCF run that scale spans
        # four orders: measured on these frames its 95th percentile went 0.097, 0.0094, 0.0018,
        # 7e-6, 7e-9. Painted on one linear ramp the last frames are the base colour and the run
        # looks finished long before it is. The log compresses the opening excursion and leaves
        # the small late departures a share of the ramp they can be seen in.
        #
        # The reference's own level is the numerator, not this frame's: with a per-frame isovalue
        # the two differ, and using this frame's would fold the isovalue difference into a number
        # that is supposed to say how far the surface still has to travel.
        numerator = reference_level if reference_level is not None else level
        sampled = Field(reference, origin, step).value(vertices)
        # Vertices can sit where the reference density has all but vanished, and the ratio there
        # runs away. Clamped to a factor of e^3, which is already past the end of the ramp.
        departure = np.log(numerator / np.clip(sampled, numerator * np.exp(-3.0), None))
        departure = np.clip(departure, -3.0, 3.0)
        result["values"] = np.round(departure, 6).tolist()
        result["stats"]["departureP95"] = float(np.percentile(np.abs(departure), 95))
        result["stats"]["departureMax"] = float(np.abs(departure).max())

    return result


def self_test() -> int:
    """Two lobes of very different radius, joined by a neck about one voxel across.

    The first version of this test was two clean well-separated blobs and it passed while the
    remesher was turning 19,868 faces into 296,246 on real SCF density. What it was missing is
    the neck: a saddle is where the gradient collapses, where the curvature estimate is worst,
    and where an isosurface of a molecular density spends most of its awkwardness. It also
    reports a per-frame reference, which is the other thing real use exercises.

    Also checks the two failures that version could not see: that the mesh is not larger than
    the one it replaced, and that the reported chord error is a measurement rather than a
    division by a vanishing gradient.
    """
    axis = np.linspace(-8, 8, 96)
    step = np.full(3, axis[1] - axis[0])
    x, y, z = np.meshgrid(axis, axis, axis, indexing="ij")
    lobes = (np.exp(-(((x + 3) ** 2 + y ** 2 + z ** 2) / 2.5 ** 2))
             + np.exp(-(((x - 3.2) ** 2 + y ** 2 + z ** 2) / 0.6 ** 2)))
    # A thin bridge between the two, which puts a saddle on the surface.
    neck = 0.62 * np.exp(-((y ** 2 + z ** 2) / 0.45 ** 2) - ((x - 0.2) ** 2 / 3.0 ** 2))
    field = lobes + neck

    result = build_mesh(field, np.full(3, -8.0), step, level=np.exp(-1.0), tolerance=0.5,
                        sample=2, iterations=8, reference=lobes)
    stats = result["stats"]
    print(stats)

    vertices, faces = np.array(result["vertices"]), np.array(result["faces"])
    centroids = vertices[faces].mean(axis=1)
    a, b, c = (vertices[faces[:, i]] for i in range(3))
    area = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
    # Sampled on the far side of each lobe. The neck runs most of the way across x and is the
    # highest-curvature thing in the box, so a window that catches any of it reports the neck's
    # triangles rather than the lobe's.
    flat, curved = centroids[:, 0] < -4.5, centroids[:, 0] > 3.4
    ratio = (np.median(area[flat]) / np.median(area[curved])
             if flat.sum() and curved.sum() else 0.0)
    print(f"median triangle area, gentle lobe / tight lobe: {ratio:.2f}x")

    chord = stats["chordP95"]
    bound = stats["boundA"]
    failures = [
        message for ok, message in [
            (stats["closedManifold"], "not a closed 2-manifold"),
            (stats["adaptiveFaces"] < stats["uniformFaces"], "not cheaper than uniform"),
            (stats["adapted"], "fell back to the uniform mesh"),
            (chord is not None and chord < 1.0,
             f"chord p95 {chord} is not a length; the gradient guard is not holding"),
            (chord is not None and chord <= 6 * bound,
             f"chord p95 {chord} far over the {bound:.3f} A bound"),
            (stats["outsideGrid"] == 0,
             f"{stats['outsideGrid']} vertices projected outside the grid"),
            (flat.sum() > 20 and curved.sum() > 20, "a lobe was not meshed"),
            (ratio > 2.0, f"triangle size barely tracks curvature ({ratio:.2f}x)"),
            ("values" in result and len(result["values"]) == len(vertices),
             "reference did not produce one value per vertex"),
            (stats.get("departureP95", 0) > 0, "reference departure came back all zero"),
        ] if not ok
    ]
    for message in failures:
        print(f"FAIL: {message}")
    print("PASS" if not failures else "")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("input", nargs="?", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--iso", type=float, default=0.02)
    parser.add_argument("--tolerance", type=float, default=0.5,
                        help="surface deviation bound, in voxels; drives the sizing field")
    parser.add_argument("--sample", type=int, default=1)
    parser.add_argument("--iterations", type=int, default=8)
    parser.add_argument("--gbw-points", type=int, default=120)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if args.input is None:
        parser.error("an input file is required unless --self-test is given")

    with tempfile.TemporaryDirectory() as scratch:
        path = args.input
        if path.suffix.lower() == ".gbw":
            path = cube_from_gbw(path, args.gbw_points, Path(scratch))
        values, origin, step = load_cube(path)

    result = build_mesh(values, origin, step, args.iso, args.tolerance,
                        args.sample, args.iterations)
    print(result["stats"])
    if args.out:
        args.out.write_text(json.dumps(result))
        print(f"wrote {args.out} ({args.out.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
