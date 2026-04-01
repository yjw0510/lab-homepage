"""Generate phthalocyanine (C32H18N8) DFT data using RDKit + PySCF.

Outputs:
- public/data/multiscale/dft/molecule.json
- public/data/multiscale/dft/scf.json
- public/data/multiscale/dft/density-evolution.json
- public/data/multiscale/dft/frontier-orbitals.json
"""

from __future__ import annotations

import json
import os
from typing import Iterable

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem
from pyscf import dft, gto
from skimage.measure import marching_cubes

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "multiscale", "dft")
os.makedirs(OUT_DIR, exist_ok=True)

ANG_TO_BOHR = 1.8897259886
ORBITAL_GRID_SIZE = 120
DENSITY_GRID_SIZE = 96
SNAPSHOT_GRID_SIZE = 72
GRID_EXTENT = 8.0
DENSITY_THRESHOLD = 1e-5
DENSITY_LEVEL_FRACTION = 0.18
SNAPSHOT_ISOVALUE_LOW = 0.6
SNAPSHOT_ISOVALUE_HIGH = 1.0
ORBITAL_SMOOTHING_ITERATIONS = 6
DENSITY_SMOOTHING_ITERATIONS = 7
ORBITAL_PREFILTER_PASSES = 2
DENSITY_PREFILTER_PASSES = 1
TAUBIN_LAMBDA = 0.41
TAUBIN_MU = -0.43
ORBITAL_SUBDIVISIONS = 2
FINAL_DENSITY_SUBDIVISIONS = 2
SNAPSHOT_DENSITY_SUBDIVISIONS = 1


def build_vertex_neighbors(vertex_count: int, faces: np.ndarray) -> list[set[int]]:
    neighbors = [set() for _ in range(vertex_count)]
    for a, b, c in faces:
        neighbors[a].update((b, c))
        neighbors[b].update((a, c))
        neighbors[c].update((a, b))
    return neighbors


def laplacian_relax(verts: np.ndarray, neighbors: list[set[int]], alpha: float) -> np.ndarray:
    next_positions = verts.copy()
    for index, vertex_neighbors in enumerate(neighbors):
        if not vertex_neighbors:
            continue
        mean_neighbor = verts[list(vertex_neighbors)].mean(axis=0)
        next_positions[index] = verts[index] + alpha * (mean_neighbor - verts[index])
    return next_positions


def taubin_smooth(
    verts: np.ndarray,
    faces: np.ndarray,
    iterations: int,
    lambda_factor: float = TAUBIN_LAMBDA,
    mu_factor: float = TAUBIN_MU,
) -> np.ndarray:
    if iterations <= 0 or verts.size == 0 or faces.size == 0:
        return verts

    smoothed = verts.astype(np.float64, copy=True)
    neighbors = build_vertex_neighbors(len(smoothed), faces)

    for _ in range(iterations):
        smoothed = laplacian_relax(smoothed, neighbors, lambda_factor)
        smoothed = laplacian_relax(smoothed, neighbors, mu_factor)

    return smoothed


def subdivide_mesh(verts: np.ndarray, faces: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if verts.size == 0 or faces.size == 0:
        return verts, faces

    edge_midpoints: dict[tuple[int, int], int] = {}
    next_vertices = verts.astype(np.float64, copy=True).tolist()
    next_faces: list[list[int]] = []

    def midpoint_index(a: int, b: int) -> int:
        key = (a, b) if a < b else (b, a)
        if key in edge_midpoints:
            return edge_midpoints[key]
        midpoint = ((verts[a] + verts[b]) * 0.5).tolist()
        edge_midpoints[key] = len(next_vertices)
        next_vertices.append(midpoint)
        return edge_midpoints[key]

    for a, b, c in faces:
        ab = midpoint_index(int(a), int(b))
        bc = midpoint_index(int(b), int(c))
        ca = midpoint_index(int(c), int(a))
        next_faces.extend(
            [
                [int(a), ab, ca],
                [ab, int(b), bc],
                [ca, bc, int(c)],
                [ab, bc, ca],
            ]
        )

    return np.asarray(next_vertices, dtype=np.float64), np.asarray(next_faces, dtype=np.int32)


def smooth_scalar_field(grid: np.ndarray, passes: int) -> np.ndarray:
    if passes <= 0:
        return grid

    kernel = np.array([1.0, 2.0, 1.0], dtype=np.float64)
    kernel /= kernel.sum()
    smoothed = grid.astype(np.float64, copy=True)

    for _ in range(passes):
        for axis in range(3):
            pad_width = [(0, 0), (0, 0), (0, 0)]
            pad_width[axis] = (1, 1)
            padded = np.pad(smoothed, pad_width, mode="edge")

            prev_slice = [slice(None), slice(None), slice(None)]
            curr_slice = [slice(None), slice(None), slice(None)]
            next_slice = [slice(None), slice(None), slice(None)]
            prev_slice[axis] = slice(0, -2)
            curr_slice[axis] = slice(1, -1)
            next_slice[axis] = slice(2, None)

            smoothed = (
                padded[tuple(prev_slice)] * kernel[0]
                + padded[tuple(curr_slice)] * kernel[1]
                + padded[tuple(next_slice)] * kernel[2]
            )

    return smoothed


def extract_isosurface(
    grid: np.ndarray,
    level: float,
    origin: Iterable[float],
    spacing_value: float,
    smoothing_iterations: int = 0,
    prefilter_passes: int = 0,
    subdivisions: int = 0,
) -> dict:
    try:
        surface_grid = smooth_scalar_field(grid, prefilter_passes)
        verts, faces, normals, _ = marching_cubes(surface_grid, level=level)
        if smoothing_iterations > 0:
            verts = taubin_smooth(verts, faces, iterations=smoothing_iterations)
        for _ in range(subdivisions):
            verts, faces = subdivide_mesh(verts, faces)
            verts = taubin_smooth(verts, faces, iterations=1)
        verts_world = verts * spacing_value + np.array(origin)
        return {
            "vertices": np.round(verts_world, 4).tolist(),
            "faces": faces.tolist(),
            "normals": [] if smoothing_iterations > 0 else np.round(normals, 4).tolist(),
        }
    except (ValueError, RuntimeError):
        return {"vertices": [], "faces": [], "normals": []}


def build_grid(size: int, extent: float) -> tuple[np.ndarray, float, list[float]]:
    coords_1d = np.linspace(-extent, extent, size)
    spacing = (2 * extent) / (size - 1)
    grid_points = np.array([[x, y, z] for x in coords_1d for y in coords_1d for z in coords_1d]) * ANG_TO_BOHR
    origin = [-extent, -extent, -extent]
    return grid_points, spacing, origin


def density_on_grid(ao_values: np.ndarray, density_matrix: np.ndarray) -> np.ndarray:
    rho = np.einsum("pi,ij,pj->p", ao_values, density_matrix, ao_values, optimize=True)
    return np.maximum(rho, 0.0)


print("Building phthalocyanine geometry with RDKit...")
smiles = "c1ccc2c(c1)c1[nH]c2nc2nc(nc3nc(nc4[nH]c(n1)c1ccccc14)c1ccccc13)c1ccccc12"
mol_rdk = Chem.MolFromSmiles(smiles)
mol_rdk = Chem.AddHs(mol_rdk)
params = AllChem.ETKDGv3()
params.randomSeed = 42
AllChem.EmbedMolecule(mol_rdk, params)
AllChem.MMFFOptimizeMolecule(mol_rdk, maxIters=500)

conf = mol_rdk.GetConformer()
n_atoms = mol_rdk.GetNumAtoms()

atoms = []
elements = []
for index in range(n_atoms):
    position = conf.GetAtomPosition(index)
    atoms.append([round(position.x, 4), round(position.y, 4), round(position.z, 4)])
    elements.append(mol_rdk.GetAtomWithIdx(index).GetSymbol())

bonds = []
bond_orders = []
for bond in mol_rdk.GetBonds():
    bonds.append([bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()])
    bond_orders.append(bond.GetBondTypeAsDouble())

atom_str = "".join(
    f"  {elements[index]}  {conf.GetAtomPosition(index).x:.6f}  {conf.GetAtomPosition(index).y:.6f}  {conf.GetAtomPosition(index).z:.6f}\n"
    for index in range(n_atoms)
)
mol = gto.M(atom=atom_str, basis="6-31g*", verbose=0)

mf = dft.RKS(mol)
mf.xc = "B3LYP"

scf_energies: list[float] = []
scf_density_matrices: list[np.ndarray] = []
initial_density_matrix = np.array(mf.get_init_guess(mol), copy=True)


def _scf_callback(envs):
    scf_energies.append(float(envs["e_tot"]))
    dm = envs.get("dm")
    if dm is not None:
      scf_density_matrices.append(np.array(dm, copy=True))


mf.callback = _scf_callback

print("Running PySCF B3LYP/6-31G*...")
mf.kernel()

print(f"DFT/B3LYP converged: {mf.converged}")
print(f"Total energy: {mf.e_tot:.6f} Hartree")

nocc = mol.nelectron // 2
mo_energies = mf.mo_energy

orbital_grid_points, orbital_spacing, orbital_origin = build_grid(ORBITAL_GRID_SIZE, GRID_EXTENT)
print(f"Evaluating orbitals on {ORBITAL_GRID_SIZE}^3 grid...")
ao_orbital = mol.eval_gto("GTOval_sph", orbital_grid_points)
mo_coeff = mf.mo_coeff
homo_grid = (ao_orbital @ mo_coeff[:, nocc - 1]).reshape((ORBITAL_GRID_SIZE, ORBITAL_GRID_SIZE, ORBITAL_GRID_SIZE))
lumo_grid = (ao_orbital @ mo_coeff[:, nocc]).reshape((ORBITAL_GRID_SIZE, ORBITAL_GRID_SIZE, ORBITAL_GRID_SIZE))

homo_level = 0.024
lumo_level = 0.024
homo_pos = extract_isosurface(
    homo_grid,
    +homo_level,
    orbital_origin,
    orbital_spacing,
    smoothing_iterations=ORBITAL_SMOOTHING_ITERATIONS,
    prefilter_passes=ORBITAL_PREFILTER_PASSES,
    subdivisions=ORBITAL_SUBDIVISIONS,
)
homo_neg = extract_isosurface(
    homo_grid,
    -homo_level,
    orbital_origin,
    orbital_spacing,
    smoothing_iterations=ORBITAL_SMOOTHING_ITERATIONS,
    prefilter_passes=ORBITAL_PREFILTER_PASSES,
    subdivisions=ORBITAL_SUBDIVISIONS,
)
lumo_pos = extract_isosurface(
    lumo_grid,
    +lumo_level,
    orbital_origin,
    orbital_spacing,
    smoothing_iterations=ORBITAL_SMOOTHING_ITERATIONS,
    prefilter_passes=ORBITAL_PREFILTER_PASSES,
    subdivisions=ORBITAL_SUBDIVISIONS,
)
lumo_neg = extract_isosurface(
    lumo_grid,
    -lumo_level,
    orbital_origin,
    orbital_spacing,
    smoothing_iterations=ORBITAL_SMOOTHING_ITERATIONS,
    prefilter_passes=ORBITAL_PREFILTER_PASSES,
    subdivisions=ORBITAL_SUBDIVISIONS,
)

density_grid_points, density_spacing, density_origin = build_grid(DENSITY_GRID_SIZE, GRID_EXTENT)
snapshot_grid_points, snapshot_spacing, snapshot_origin = build_grid(SNAPSHOT_GRID_SIZE, GRID_EXTENT)
print(f"Evaluating final density on {DENSITY_GRID_SIZE}^3 grid...")
ao_density = mol.eval_gto("GTOval_sph", density_grid_points)
print(f"Evaluating density snapshots on {SNAPSHOT_GRID_SIZE}^3 grid...")
ao_snapshot_density = mol.eval_gto("GTOval_sph", snapshot_grid_points)

final_density_matrix = np.array(mf.make_rdm1(), copy=True)
density_matrices = [initial_density_matrix, *scf_density_matrices]
if not np.allclose(density_matrices[-1], final_density_matrix):
    density_matrices.append(final_density_matrix)

final_rho_grid = density_on_grid(ao_density, final_density_matrix).reshape((DENSITY_GRID_SIZE, DENSITY_GRID_SIZE, DENSITY_GRID_SIZE))
rho_grids = [
    density_on_grid(ao_snapshot_density, density_matrix).reshape((SNAPSHOT_GRID_SIZE, SNAPSHOT_GRID_SIZE, SNAPSHOT_GRID_SIZE))
    for density_matrix in density_matrices
]
final_snapshot_rho_grid = rho_grids[-1]
final_density_level = float(np.clip(final_rho_grid.max() * DENSITY_LEVEL_FRACTION, 0.018, 0.05))
all_density_snapshots = []
n_snapshots = len(rho_grids)
for snapshot_index, rho_grid in enumerate(rho_grids):
    t = snapshot_index / max(1, n_snapshots - 1)
    isovalue = final_density_level * (SNAPSHOT_ISOVALUE_LOW + (SNAPSHOT_ISOVALUE_HIGH - SNAPSHOT_ISOVALUE_LOW) * t)

    all_density_snapshots.append(
        {
            "iteration": int(min(snapshot_index, max(0, len(scf_energies) - 1))),
            "label": "Initial guess" if snapshot_index == 0 else f"Iter {snapshot_index}",
            "isovalue": round(float(isovalue), 6),
            "colorT": round(t, 4),
            "mesh": extract_isosurface(
                rho_grid,
                isovalue,
                snapshot_origin,
                snapshot_spacing,
                smoothing_iterations=DENSITY_SMOOTHING_ITERATIONS,
                prefilter_passes=DENSITY_PREFILTER_PASSES,
                subdivisions=SNAPSHOT_DENSITY_SUBDIVISIONS,
            ),
        }
    )
    print(
        f"Density snapshot {snapshot_index}: "
        f"{len(all_density_snapshots[-1]['mesh']['vertices'])} verts, "
        f"isovalue={isovalue:.6f}, colorT={t:.3f}"
    )

selected_snapshot_indices = list(range(min(7, n_snapshots)))
last_with_mesh = max(
    (i for i, s in enumerate(all_density_snapshots) if s["mesh"]["vertices"]),
    default=0,
)
selected_snapshot_indices.append(last_with_mesh)
selected_snapshot_indices.append(n_snapshots - 1)
selected_snapshot_indices = sorted(set(i for i in selected_snapshot_indices if i < n_snapshots))
density_snapshots = [all_density_snapshots[i] for i in selected_snapshot_indices]

delta_e = [
    round(abs(scf_energies[index + 1] - scf_energies[index]), 10)
    for index in range(len(scf_energies) - 1)
]

plot_trajectory = [
    {
        "iteration": snapshot["iteration"],
        "deltaE": round(float(delta_e[min(max(snapshot["iteration"] - 1, 0), len(delta_e) - 1)] if delta_e else 0.0), 10),
    }
    for snapshot in density_snapshots
]

scaffold_data = {
    "atoms": atoms,
    "elements": elements,
    "bonds": bonds,
    "bondOrders": bond_orders,
    "scf": {
        "totalEnergy": round(float(mf.e_tot), 6),
        "converged": bool(mf.converged),
    },
}

frontier_orbital_data = {
    "homoIsosurface": {
        "positive": homo_pos,
        "negative": homo_neg,
        "isovalue": homo_level,
    },
    "lumoIsosurface": {
        "positive": lumo_pos,
        "negative": lumo_neg,
        "isovalue": lumo_level,
    },
    "orbitalEnergies": {
        "homo": round(float(mo_energies[nocc - 1]), 4),
        "lumo": round(float(mo_energies[nocc]), 4),
        "homoEV": round(float(mo_energies[nocc - 1] * 27.2114), 2),
        "lumoEV": round(float(mo_energies[nocc] * 27.2114), 2),
    },
    "orbitalLabels": {
        "homo": "π (macrocyclic ring)",
        "lumo": "π* (macrocyclic ring)",
    },
}

scf_data = {
    "energies": [round(float(value), 10) for value in scf_energies],
    "deltaE": delta_e,
    "trajectory": plot_trajectory,
    "snapshots": [
        {
            "index": index,
            "iteration": int(snapshot["iteration"]),
            "label": snapshot["label"],
        }
        for index, snapshot in enumerate(density_snapshots)
    ],
    "threshold": DENSITY_THRESHOLD,
    "converged": bool(mf.converged),
    "iterations": len(delta_e),
}

density_evolution_data = {
    "extent": GRID_EXTENT,
    "gridSize": SNAPSHOT_GRID_SIZE,
    "finalDensityGridSize": DENSITY_GRID_SIZE,
    "finalDensity": {
        "isovalue": round(final_density_level, 6),
        "mesh": extract_isosurface(
            final_rho_grid,
            final_density_level,
            density_origin,
            density_spacing,
            smoothing_iterations=DENSITY_SMOOTHING_ITERATIONS,
            prefilter_passes=DENSITY_PREFILTER_PASSES,
            subdivisions=FINAL_DENSITY_SUBDIVISIONS,
        ),
    },
    "snapshots": density_snapshots,
}

with open(os.path.join(OUT_DIR, "molecule.json"), "w") as file:
    json.dump(scaffold_data, file)

with open(os.path.join(OUT_DIR, "frontier-orbitals.json"), "w") as file:
    json.dump(frontier_orbital_data, file)

with open(os.path.join(OUT_DIR, "scf.json"), "w") as file:
    json.dump(scf_data, file)

with open(os.path.join(OUT_DIR, "density-evolution.json"), "w") as file:
    json.dump(density_evolution_data, file)

print("\nWrote:")
for filename in ("molecule.json", "frontier-orbitals.json", "scf.json", "density-evolution.json"):
    path = os.path.join(OUT_DIR, filename)
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"  {filename}: {size_mb:.2f} MB")
