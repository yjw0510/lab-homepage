"""Generate PO-T2T (C57H42N3O3P3) DFT data from an ORCA run.

Outputs:
- public/data/multiscale/dft/molecule.json
- public/data/multiscale/dft/scf.json
- public/data/multiscale/dft/density-evolution.json
- public/data/multiscale/dft/frontier-orbitals.json

The SCF is not run here. It is an ORCA 6.1 wB97M-V/def2-TZVP calculation on 108 atoms and 2,316
basis functions, started from the HCore guess and held together with damping so that it both
starts far from the answer and still converges. Every iteration's density matrix is printed by
`Print[P_Iter_P] 1`, parsed once by rendering_offloading/density.py into pyscf's AO convention,
and stored as an npz. That parse is the part that can silently go wrong, and it carries its own
check: the last printed P must equal C.occ.C^T from the molden orbitals, and Tr(PS) must equal
the electron count.

Why a density matrix rather than a cube per iteration: rho(r) = sum_ij P_ij phi_i(r) phi_j(r),
so the grid is a free parameter afterwards. 59 matrices at 2,316^2 in float32 is 438 MB against
about 25 MB per cube per iteration, and a cube fixes the resolution at write time.

An earlier version of this script ran the SCF locally in PySCF on chlorophyll a; it is in git
history. PySCF's macOS wheel carries no OpenMP, so a cycle took 133 s on one core of eighteen,
and the starting guesses far enough from the answer to be worth animating did not converge.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter

import mlx.core as mx
import numpy as np
from pyscf import gto

sys.path.insert(0, os.path.dirname(__file__))
from isosurface_remesh import Field, build_mesh
from scipy import ndimage

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "multiscale", "dft")
os.makedirs(OUT_DIR, exist_ok=True)

NPZ = os.environ.get(
    "POT2T_NPZ",
    "/Users/yjw0510/Desktop/projects/rendering_offloading/03_out/pot2t_slow.npz",
)
ENERGIES = os.path.join(os.path.dirname(__file__), "pot2t-scf-energies.json")

BOHR_TO_ANG = 0.529177210903
SYMBOL = {1: "H", 6: "C", 7: "N", 8: "O", 9: "F", 12: "Mg", 15: "P", 16: "S"}

# The molecule is 18.7 A across its widest axis, so half of that plus room for the density to
# fall off. Every grid is a cube centred on the molecule's centroid.
GRID_EXTENT = 13.0
# 27 times the samples of the 80^3 the snapshots started on: three per axis, and evaluated
# from the density matrices rather than interpolated up from a coarser grid. That distinction
# is the whole point. SAMPLE resamples an existing grid through the same tricubic interpolant
# the projection uses, so it makes marching cubes follow the interpolated surface more closely
# but adds no information the coarse grid did not already have; only a finer evaluation of
# rho(r) = sum_ij P_ij phi_i phi_j does. At 240^3 over +-13 A the voxel is 0.109 A against the
# 0.164 A the old grid reached with SAMPLE 2.
ORBITAL_GRID_SIZE = 240
DENSITY_GRID_SIZE = 240
SNAPSHOT_GRID_SIZE = 240
# Chord bound as a fraction of one voxel, and how much finer the field is resampled through the
# tricubic interpolant before extraction. Half a voxel of licence was far too loose: the meshes
# came back 0.20 A off the surface and read worse than the uniform extraction they replaced.
TOLERANCE = 0.15
SAMPLE = 1
# One isovalue for the whole run, taken as the one enclosing this fraction of the converged
# density. See where it is applied for why it is not solved per frame.
CHARGE_FRACTION = 0.90
ORBITAL_LEVEL = 0.02
# Points per chunk when evaluating basis functions. 2,316 functions at 20,000 points is a
# 370 MB array; the whole 80^3 grid in one call would be 9 GB.
CHUNK = 20000
# Frames held in memory at once. Each 240^3 grid is 110 MB, so the whole run resident is 5.7 GB
# on a 24 GB machine, and the write pattern touches every frame on every one of the 692 chunks:
# with the array that size it page-faulted through itself once per chunk and one chunk went from
# 0.2 s to minutes. Eight frames is 0.9 GB, and the cost of the bound is that eval_gto runs once
# per batch instead of once in total.
SNAPSHOT_BATCH = 8

# Covalent radii in Angstrom. Bonds come from distance because the ORCA geometry carries atoms
# and coordinates but no connectivity.
COVALENT = {"H": 0.31, "C": 0.76, "N": 0.71, "O": 0.66, "F": 0.57, "P": 1.07, "S": 1.05}
BOND_SLACK = 1.3


class MeshPack:
    """Collects meshes into one binary blob and hands back JSON-able offsets.

    Meshes are the whole payload here: 175,575 vertices and 338,254 triangles across the SCF
    frames and the converged surface. As JSON that is 18.8 MB of decimal text that the browser
    then has to parse into hundreds of thousands of small arrays; as Float32 and Uint32 it is
    6.9 MB that goes to the GPU as it lands.

    Normals are written and are worth their 12 bytes a vertex: they come from the interpolated
    field gradient, so they are the exact surface normal rather than an average of the
    neighbouring triangles, and they are what lets the renderer build curved PN patches out of
    the triangles instead of drawing them flat.
    """

    def __init__(self):
        self.blob = bytearray()

    def add(self, mesh):
        vertices = np.asarray(mesh["vertices"], dtype=np.float32).reshape(-1)
        faces = np.asarray(mesh["faces"], dtype=np.uint32).reshape(-1)
        entry = {
            "vertexCount": len(vertices) // 3,
            "faceCount": len(faces) // 3,
            "vertices": len(self.blob),
        }
        self.blob += vertices.tobytes()
        entry["faces"] = len(self.blob)
        self.blob += faces.tobytes()
        if mesh.get("normals"):
            entry["normals"] = len(self.blob)
            self.blob += np.asarray(mesh["normals"], dtype=np.float32).reshape(-1).tobytes()
        if mesh.get("values"):
            entry["values"] = len(self.blob)
            self.blob += np.asarray(mesh["values"], dtype=np.float32).tobytes()
        return entry

    def write(self, path):
        with open(path, "wb") as file:
            file.write(self.blob)
        return len(self.blob)


def load_run():
    data = np.load(NPZ, allow_pickle=False)
    charges = data["charges"].astype(int)
    elements = [SYMBOL[z] for z in charges]
    coords_bohr = data["coords"]
    mol = gto.M(
        atom=[(elements[i], coords_bohr[i]) for i in range(len(elements))],
        basis=str(data["basis"]),
        unit="Bohr",
        verbose=0,
    )
    if mol.nao != data["P"].shape[-1]:
        raise SystemExit(f"basis gives {mol.nao} AOs, the npz has {data['P'].shape[-1]}")
    return mol, elements, coords_bohr * BOHR_TO_ANG, data


def bonds_from_distance(elements, positions):
    pairs, orders = [], []
    for i in range(len(elements)):
        for j in range(i + 1, len(elements)):
            if elements[i] == "H" and elements[j] == "H":
                continue
            limit = BOND_SLACK * (COVALENT[elements[i]] + COVALENT[elements[j]])
            if np.linalg.norm(positions[i] - positions[j]) < limit:
                pairs.append([i, j])
                orders.append(1.0)
    return pairs, orders


def grid_points(size, extent, centre):
    axis = np.linspace(-extent, extent, size)
    mesh = np.stack(np.meshgrid(axis, axis, axis, indexing="ij"), axis=-1).reshape(-1, 3)
    return (mesh + centre) / BOHR_TO_ANG, (2 * extent) / (size - 1)


def occupied_orbitals(matrix, count):
    """The `count` most occupied natural orbitals of a density matrix, scaled by sqrt(occupancy).

    rho = sum_ij P_ij phi_i phi_j evaluated as written costs O(N nao^2). P has rank nocc = 237
    against nao = 2316, so the identical rho through P's own eigenvectors costs O(N nao nocc),
    ten times less: rho = sum_k (phi . c_k)^2 with c_k the eigenvector times sqrt(occupancy).

    The eigenvalues below the cut are the noise floor of the float32 matrices ORCA wrote, around
    1e-5 against a leading 3.2, and they carry 0.022 of the 474 electrons in total.
    """
    occupations, orbitals = np.linalg.eigh(np.asarray(matrix, dtype=np.float64))  # ascending
    return orbitals[:, -count:] * np.sqrt(occupations[-count:])


def densities_on_grid(mol, points_bohr, matrices, count, shape):
    """rho for several density matrices on one grid, as one GEMM per chunk on the GPU.

    Two things keep this off the O(N nao^2) path it started on. The basis evaluation does not
    depend on which matrix is being contracted, so every frame shares one eval_gto. And the
    frames are contracted side by side in a single (points x nao) @ (nao x frames*nocc) product
    rather than one call each, which is what gives Metal something big enough to be worth the
    dispatch. float32 costs 0.3-0.7% of the isovalue at the isosurface, about 0.002 A of surface
    displacement against a 0.0163 A chord tolerance.
    """
    frames = len(matrices)
    weighted = mx.array(np.concatenate([occupied_orbitals(m, count) for m in matrices],
                                       axis=1).astype(np.float32))
    print(f"  {frames} frames x {count} occupied orbitals of {mol.nao}, "
          f"one {CHUNK} x {mol.nao} @ {mol.nao} x {frames * count} product per chunk", flush=True)

    # float32 throughout: promoting a 240^3 grid to float64 to hand to the mesher doubles it for
    # nothing the isosurface can see.
    out = np.empty((frames, len(points_bohr)), dtype=np.float32)
    chunks = -(-len(points_bohr) // CHUNK)
    for index, start in enumerate(range(0, len(points_bohr), CHUNK)):
        ao = mol.eval_gto("GTOval_sph", points_bohr[start:start + CHUNK]).astype(np.float32)
        rho = mx.square(mx.array(ao) @ weighted).reshape(-1, frames, count).sum(2)
        out[:, start:start + len(ao)] = np.array(rho).T
        if index % 200 == 0 or index == chunks - 1:
            print(f"    chunk {index + 1}/{chunks}", flush=True)
    np.maximum(out, 0.0, out=out)
    return [row.reshape(shape) for row in out]


def orbitals_on_grid(mol, points_bohr, vectors, shape):
    out = [np.empty(len(points_bohr)) for _ in vectors]
    for start in range(0, len(points_bohr), CHUNK):
        ao = mol.eval_gto("GTOval_sph", points_bohr[start:start + CHUNK])
        for slot, vector in enumerate(vectors):
            out[slot][start:start + CHUNK] = ao @ vector
    return [values.reshape(shape) for values in out]


def extract(grid, level, origin, spacing, reference=None, reference_level=None):
    try:
        mesh = build_mesh(grid, np.full(3, origin), np.full(3, spacing), level,
                          tolerance=TOLERANCE, sample=SAMPLE, log=lambda *_: None,
                          reference=reference, reference_level=reference_level)
    except (ValueError, RuntimeError) as error:
        print(f"  no surface: {error}")
        return {"vertices": [], "faces": [], "normals": [], "values": []}
    print(f"  {mesh['stats']}")
    return {key: mesh[key] for key in ("vertices", "faces", "normals", "values") if key in mesh}


mol, elements, positions, data = load_run()
centre = positions.mean(axis=0)
positions = positions - centre
print(f"PO-T2T: {len(elements)} atoms {dict(Counter(elements))}, {mol.nao} basis functions, "
      f"{data['P'].shape[0]} SCF iterations")

bonds, bond_orders = bonds_from_distance(elements, positions)
print(f"bonds from covalent radii: {len(bonds)}")

# The matrices stay in the npz's float32; only the 237 columns each one is factored into are
# promoted. Holding all 52 as float64 would be 5.6 GB on top of the 3.2 GB the npz already has.
#
# Every iteration ORCA ran, numbered the way ORCA numbers them: `data["P"][k]` is the density
# after iteration k + 1, so `iterations` is 1-based and the label agrees with it. An earlier
# version numbered the labels 1-based and the `iteration` field 0-based off the same list, so
# the slider read one below the calculation everywhere it printed a number.
#
# The first iterations are the point of the animation and are all here. They come off the HCore
# guess, which has no electron repulsion in it, so it fills the lowest one-electron states and
# all 474 electrons pile into cores on phosphorus, oxygen and a subset of the carbons: Tr(P) is
# 5781 against the converged 243, and on a peripheral carbon rho is 0.0000 at its own nucleus.
# On screen that reads as density existing on part of the molecule and nowhere else, because
# that is what the density is at that point. It knits into one envelope by iteration 14.
frames = list(range(len(data["P"])))
distance = np.array([float(np.linalg.norm(data["P"][i] - data["P"][-1])) for i in frames])
print(f"ORCA iterations {frames[0] + 1}..{frames[-1] + 1}, "
      f"|P - P_last| {distance[0]:.1f} -> {distance[-1]:.1f}")
matrices = [data["P"][i] for i in frames]
iterations = [i + 1 for i in frames]
labels = [f"Iter {n}" for n in iterations]

energies = json.load(open(ENERGIES))["energies"]
# delta_e[k] is the change arriving at iteration k + 2. Iteration 1 has no prior energy, so it
# reports the first change there is rather than a number invented for it.
delta_e = [round(abs(energies[i + 1] - energies[i]), 10) for i in range(len(energies) - 1)]
delta_for_iteration = [delta_e[max(0, min(n - 2, len(delta_e) - 1))] for n in iterations]

# Every density matrix in the run has exactly this rank, and it is also where HOMO sits.
occupied = int(np.sum(data["occ"] > 0))

points, spacing = grid_points(SNAPSHOT_GRID_SIZE, GRID_EXTENT, centre)
# The converged density comes first: it is both the last frame and the reference every earlier
# frame is coloured against, so it has to outlive the batches.
print(f"evaluating the reference density on {SNAPSHOT_GRID_SIZE}^3...")
converged_snapshot = densities_on_grid(mol, points, matrices[-1:], occupied,
                                       (SNAPSHOT_GRID_SIZE,) * 3)[0]


def level_for_charge(grid, spacing, fraction):
    """Isovalue enclosing `fraction` of the density integrated on this grid."""
    cell = spacing ** 3
    ordered = np.sort(grid.reshape(-1))[::-1]
    cumulative = np.cumsum(ordered) * cell
    return float(ordered[np.searchsorted(cumulative, fraction * cumulative[-1])])


# One isovalue for the whole run, set by the converged density. Giving each frame its own value
# so that all of them enclose the same charge was tried and is above; it holds the enclosed
# volume nearly constant by construction, which is the opposite of what the animation is of, and
# on the HCore guess it drives the isovalue to 0.2407. The density there is contracted hard
# enough that the 0.2407 contour sits 0.3 A from a carbon nucleus, inside the ball-and-stick
# sphere, so most of the molecule rendered with no visible surface at all: 39 mesh components, 37
# of them beads 0.6 A across.
#
# At the converged 0.0357 the same frames run 110 -> 317 A^3 of enclosed volume and 33 -> 1
# connected components, monotonically. That is the run: a fragmented, contracted guess inflating
# and knitting into one envelope.
level = level_for_charge(converged_snapshot, spacing, CHARGE_FRACTION)
print(f"isovalue {level:.4f} from the converged frame, held for all {len(matrices)}")

# Each frame is extracted on its own. Tracking one topology through the frames was tried and
# is in git history: the converged surface was meshed once and its vertices Newton-projected
# onto each earlier frame's isosurface. It shredded the mesh. Neighbouring vertices travel
# different distances along their own gradients with nothing holding the triangulation
# together, and where the early density never reaches the isovalue at all - measured at 5% of
# vertices on the HCore frame, off-surface by 0.259 against an isovalue of 0.2602 - those
# vertices freeze while their neighbours move, so every such boundary turns into a spike.
# Isosurface tracking needs tangential re-regularisation between projections, which this did
# not have.
#
# The problem that motivated it was surface lumps appearing and vanishing between frames. That
# was read as the fixed isovalue, because at a fixed 0.05 the enclosed volume grew 2.6-fold over
# the run. The growth is the animation, not the fault: the fragments are separate components of
# one surface that merge as the density fills in, and they are gone by iteration 14.
snapshots = []
for first in range(0, len(matrices), SNAPSHOT_BATCH):
    batch = matrices[first:first + SNAPSHOT_BATCH]
    print(f"evaluating frames {first + 1}-{first + len(batch)} of {len(matrices)} "
          f"on {SNAPSHOT_GRID_SIZE}^3...")
    for offset, grid in enumerate(densities_on_grid(mol, points, batch, occupied,
                                                    (SNAPSHOT_GRID_SIZE,) * 3)):
        slot = first + offset
        print(f"snapshot {slot} ({labels[slot]})")
        snapshots.append({
            "iteration": int(iterations[slot]),
            "label": labels[slot],
            "isovalue": round(level, 6),
            "colorT": round(slot / max(1, len(matrices) - 1), 4),
            "mesh": extract(grid, level, -GRID_EXTENT, spacing,
                            reference=converged_snapshot, reference_level=level),
        })

points, spacing = grid_points(DENSITY_GRID_SIZE, GRID_EXTENT, centre)
print(f"evaluating the converged density on {DENSITY_GRID_SIZE}^3...")
final_grid = densities_on_grid(mol, points, [matrices[-1]], occupied,
                               (DENSITY_GRID_SIZE,) * 3)[0]
final_level = level_for_charge(final_grid, spacing, CHARGE_FRACTION)
print("converged density")
final_mesh = extract(final_grid, final_level, -GRID_EXTENT, spacing)

mo = data["mo"]
points, spacing = grid_points(ORBITAL_GRID_SIZE, GRID_EXTENT, centre)
print(f"evaluating HOMO and LUMO on {ORBITAL_GRID_SIZE}^3...")
homo_grid, lumo_grid = orbitals_on_grid(
    mol, points, [mo[:, occupied - 1], mo[:, occupied]], (ORBITAL_GRID_SIZE,) * 3)
orbital_meshes = {}
for name, grid in (("homo", homo_grid), ("lumo", lumo_grid)):
    for sign in (1, -1):
        print(f"{name} {'positive' if sign > 0 else 'negative'}")
        orbital_meshes[f"{name}_{sign}"] = extract(
            grid, sign * ORBITAL_LEVEL, -GRID_EXTENT, spacing)

with open(os.path.join(OUT_DIR, "molecule.json"), "w") as file:
    json.dump({
        "atoms": np.round(positions, 4).tolist(),
        "elements": elements,
        "bonds": bonds,
        "bondOrders": bond_orders,
    }, file)

with open(os.path.join(OUT_DIR, "scf.json"), "w") as file:
    json.dump({
        "energies": [round(v, 10) for v in energies],
        "deltaE": delta_e,
        "trajectory": [{"iteration": n, "deltaE": d}
                       for n, d in zip(iterations, delta_for_iteration)],
        "snapshots": [{"index": slot, "iteration": n, "label": labels[slot]}
                      for slot, n in enumerate(iterations)],
        "threshold": 1e-5,
        "converged": True,
        "iterations": len(delta_e),
    }, file)

density_pack = MeshPack()
with open(os.path.join(OUT_DIR, "density-evolution.json"), "w") as file:
    json.dump({
        "extent": GRID_EXTENT,
        "gridSize": SNAPSHOT_GRID_SIZE,
        "finalDensityGridSize": DENSITY_GRID_SIZE,
        "binary": "density-evolution.bin",
        "finalDensity": {"isovalue": round(final_level, 6),
                         "mesh": density_pack.add(final_mesh)},
        "snapshots": [{**snapshot, "mesh": density_pack.add(snapshot["mesh"])}
                      for snapshot in snapshots],
    }, file)
density_pack.write(os.path.join(OUT_DIR, "density-evolution.bin"))

orbital_pack = MeshPack()
with open(os.path.join(OUT_DIR, "frontier-orbitals.json"), "w") as file:
    json.dump({
        "binary": "frontier-orbitals.bin",
        "homoIsosurface": {"positive": orbital_pack.add(orbital_meshes["homo_1"]),
                           "negative": orbital_pack.add(orbital_meshes["homo_-1"])},
        "lumoIsosurface": {"positive": orbital_pack.add(orbital_meshes["lumo_1"]),
                           "negative": orbital_pack.add(orbital_meshes["lumo_-1"])},
        "orbitalEnergies": {},
    }, file)
orbital_pack.write(os.path.join(OUT_DIR, "frontier-orbitals.bin"))

print("\nWrote:")
for filename in ("molecule.json", "frontier-orbitals.json", "frontier-orbitals.bin",
                 "scf.json", "density-evolution.json", "density-evolution.bin"):
    path = os.path.join(OUT_DIR, filename)
    print(f"  {filename}: {os.path.getsize(path) / (1024 * 1024):.2f} MB")
