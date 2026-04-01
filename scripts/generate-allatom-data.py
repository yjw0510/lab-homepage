"""Generate trajectory-backed caffeine/water all-atom assets for the multiscale stage.

Run with the research-md conda environment:
  /Users/yjw0510/miniconda3/envs/research-md/bin/python scripts/generate-allatom-data.py
"""

from __future__ import annotations

import json
import math
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from openmm import LangevinMiddleIntegrator, MonteCarloBarostat, Platform, unit
from openmm.app import AmberInpcrdFile, AmberPrmtopFile, HBonds, PME, Simulation
from rdkit import Chem
from rdkit.Chem import AllChem

from multiscale_validation import (
    combine_checks,
    ensure_validation_passed,
    validate_bond_lengths,
    validate_energy,
    validate_nonbonded_contacts,
    validate_trajectory_selection,
    write_validation_report,
)


ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "data" / "multiscale" / "allatom"
OUT_DIR.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(42)
ENV_BIN = Path(sys.executable).resolve().parent

CAFFEINE_SMILES = "Cn1c(=O)c2c(ncn2C)n(C)c1=O"
CAFFEINE_COUNT = int(os.environ.get("ALLATOM_CAFFEINE_COUNT", "12"))
WATER_COUNT = int(os.environ.get("ALLATOM_WATER_COUNT", "600"))
PACKMOL_BOX = np.array([32.0, 29.0, 27.0], dtype=np.float64)
DILUTE_SCALE = 1.12
MINIMIZE_ITERS = 600
NPT_STEPS = 16000
NVT_STEPS = 10000
REPORT_STRIDE = 100
TEMPERATURE_K = 300.0
PRESSURE_BAR = 1.0
FRICTION_PS = 1.0
TIMESTEP_FS = 2.0
BAROSTAT_INTERVAL = 25
WATER_CHARGES = {"O": -0.834, "H": 0.417}
EXPECTED_RESIDUE_COUNTS = {"CAF": CAFFEINE_COUNT, "HOH": WATER_COUNT}
TARGET_DENSITY_RANGE = (0.95, 1.055)
MAX_NVT_DENSITY_STD = 0.03
ALLOW_FAILED_VALIDATION = os.environ.get("ALLATOM_ALLOW_FAILED_VALIDATION", "").lower() in {"1", "true", "yes"}


@dataclass
class TrajectoryFrame:
    phase: str
    frame_index: int
    time_ps: float
    positions_angstrom: np.ndarray
    box_lengths_angstrom: np.ndarray
    volume_angstrom3: float
    density_g_cm3: float
    potential_energy_kj_mol: float


@dataclass
class ProtocolResult:
    frames: list[TrajectoryFrame]
    seed_frame: TrajectoryFrame
    final_positions_angstrom: np.ndarray
    final_forces_kj_mol_nm: np.ndarray
    final_potential_energy_kj_mol: float
    force_rms_kj_mol_nm: float
    force_p95_kj_mol_nm: float
    force_max_kj_mol_nm: float


def run_command(args: list[str], cwd: Path) -> None:
    subprocess.run(args, cwd=str(cwd), check=True)


def build_caffeine_template():
    mol = Chem.AddHs(Chem.MolFromSmiles(CAFFEINE_SMILES))
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    params.useRandomCoords = True
    AllChem.EmbedMolecule(mol, params)
    AllChem.MMFFOptimizeMolecule(mol, maxIters=500)

    conf = mol.GetConformer()
    coords = []
    elements = []
    for index in range(mol.GetNumAtoms()):
        pos = conf.GetAtomPosition(index)
        coords.append([pos.x, pos.y, pos.z])
        elements.append(mol.GetAtomWithIdx(index).GetSymbol())

    bonds = []
    for bond in mol.GetBonds():
        bonds.append([bond.GetBeginAtomIdx(), bond.GetEndAtomIdx(), bond.GetBondTypeAsDouble()])

    angles = set()
    dihedrals = set()
    for atom in mol.GetAtoms():
        center = atom.GetIdx()
        neighbors = [neighbor.GetIdx() for neighbor in atom.GetNeighbors()]
        for i, left in enumerate(neighbors):
            for right in neighbors[i + 1 :]:
                angles.add((min(left, right), center, max(left, right)))

    for bond in mol.GetBonds():
        j = bond.GetBeginAtomIdx()
        k = bond.GetEndAtomIdx()
        for ni in mol.GetAtomWithIdx(j).GetNeighbors():
            i = ni.GetIdx()
            if i == k:
                continue
            for nk in mol.GetAtomWithIdx(k).GetNeighbors():
                l = nk.GetIdx()
                if l in {i, j}:
                    continue
                dihedrals.add((i, j, k, l) if j < k else (l, k, j, i))

    AllChem.ComputeGasteigerCharges(mol)
    charges = [float(atom.GetDoubleProp("_GasteigerCharge")) for atom in mol.GetAtoms()]
    heavy_angles = [list(angle) for angle in sorted(angles) if all(elements[index] != "H" for index in angle)]
    heavy_dihedrals = [list(dihedral) for dihedral in sorted(dihedrals) if all(elements[index] != "H" for index in dihedral)]
    aromatic_ring_atoms = [atom.GetIdx() for atom in mol.GetAtoms() if atom.GetIsAromatic() and atom.GetSymbol() != "H"]
    carbonyl_oxygen_indices = [atom.GetIdx() for atom in mol.GetAtoms() if atom.GetSymbol() == "O"]

    return {
        "mol": mol,
        "coords": np.asarray(coords, dtype=np.float64),
        "elements": elements,
        "bonds": bonds,
        "charges": charges,
        "heavyAngles": heavy_angles[:10],
        "dihedralLabels": {
            "phi": heavy_dihedrals[0],
            "psi": heavy_dihedrals[1] if len(heavy_dihedrals) > 1 else heavy_dihedrals[0],
        },
        "aromaticRingAtoms": aromatic_ring_atoms,
        "carbonylOxygenIndices": carbonyl_oxygen_indices,
        "atomCount": mol.GetNumAtoms(),
    }


def parameterize_caffeine(workdir: Path, mol: Chem.Mol) -> None:
    Chem.MolToMolFile(mol, str(workdir / "caffeine.mol"))
    run_command(
        [
            str(ENV_BIN / "antechamber"),
            "-i",
            "caffeine.mol",
            "-fi",
            "mdl",
            "-o",
            "caffeine.mol2",
            "-fo",
            "mol2",
            "-c",
            "bcc",
            "-s",
            "1",
            "-at",
            "gaff2",
            "-rn",
            "CAF",
        ],
        workdir,
    )
    run_command(
        [
            str(ENV_BIN / "parmchk2"),
            "-i",
            "caffeine.mol2",
            "-f",
            "mol2",
            "-o",
            "caffeine.frcmod",
            "-s",
            "gaff2",
        ],
        workdir,
    )


def export_caffeine_template_pdb(workdir: Path) -> None:
    script = "\n".join(
        [
            "source leaprc.gaff2",
            "loadamberparams caffeine.frcmod",
            "CAF = loadmol2 caffeine.mol2",
            "savepdb CAF caffeine_template.pdb",
            "quit",
        ]
    ) + "\n"
    (workdir / "caffeine_template.leap").write_text(script)
    run_command([str(ENV_BIN / "tleap"), "-f", "caffeine_template.leap"], workdir)


def write_water_template_pdb(path: Path) -> None:
    path.write_text(
        "\n".join(
            [
                "HETATM    1  O   WAT A   1       0.000   0.000   0.000  1.00  0.00           O",
                "HETATM    2  H1  WAT A   1       0.957   0.000   0.000  1.00  0.00           H",
                "HETATM    3  H2  WAT A   1      -0.240   0.927   0.000  1.00  0.00           H",
                "TER",
                "END",
                "",
            ]
        )
    )


def run_packmol(workdir: Path) -> None:
    packmol_input = "\n".join(
        [
            "seed 42",
            "tolerance 2.0",
            "nloop 200",
            "maxit 80",
            "movebadrandom",
            "filetype pdb",
            "output packed.pdb",
            "",
            "structure caffeine_template.pdb",
            f"  number {CAFFEINE_COUNT}",
            f"  inside box 0. 0. 0. {PACKMOL_BOX[0]:.3f} {PACKMOL_BOX[1]:.3f} {PACKMOL_BOX[2]:.3f}",
            "end structure",
            "",
            "structure water_template.pdb",
            f"  number {WATER_COUNT}",
            f"  inside box 0. 0. 0. {PACKMOL_BOX[0]:.3f} {PACKMOL_BOX[1]:.3f} {PACKMOL_BOX[2]:.3f}",
            "end structure",
            "",
        ]
    )
    input_path = workdir / "packmol.inp"
    input_path.write_text(packmol_input)
    with input_path.open("r") as handle:
        subprocess.run(
            [str(ENV_BIN / "packmol")],
            cwd=str(workdir),
            stdin=handle,
            text=True,
            check=True,
        )


def prepend_cryst1_record(pdb_path: Path, box_lengths_angstrom: np.ndarray) -> None:
    lines = pdb_path.read_text().splitlines()
    cryst1 = (
        f"CRYST1{box_lengths_angstrom[0]:9.3f}{box_lengths_angstrom[1]:9.3f}"
        f"{box_lengths_angstrom[2]:9.3f}{90.0:7.2f}{90.0:7.2f}{90.0:7.2f} P 1           1"
    )
    if lines and lines[0].startswith("CRYST1"):
        lines[0] = cryst1
    else:
        lines.insert(0, cryst1)
    pdb_path.write_text("\n".join(lines) + "\n")


def count_pdb_residues(pdb_path: Path) -> dict[str, int]:
    residues: set[tuple[str, str, str]] = set()
    for line in pdb_path.read_text().splitlines():
        if not (line.startswith("ATOM") or line.startswith("HETATM")):
            continue
        residue_name = line[17:20].strip()
        chain_id = line[21].strip() or "_"
        residue_id = line[22:26].strip()
        insertion_code = line[26].strip()
        residues.add((residue_name, chain_id, f"{residue_id}{insertion_code}"))

    counts: dict[str, int] = {}
    for residue_name, _, _ in residues:
        counts[residue_name] = counts.get(residue_name, 0) + 1
    return counts


def build_packmol_leap_script() -> str:
    return "\n".join(
        [
            "source leaprc.gaff2",
            "source leaprc.water.tip3p",
            "loadamberparams caffeine.frcmod",
            "CAF = loadmol2 caffeine.mol2",
            "sys = loadpdb packed.pdb",
            f"set sys box {{ {PACKMOL_BOX[0]:.3f} {PACKMOL_BOX[1]:.3f} {PACKMOL_BOX[2]:.3f} }}",
            "saveamberparm sys sys.prmtop sys.inpcrd",
            "savepdb sys sys.pdb",
            "quit",
        ]
    ) + "\n"


def load_topology_metadata(prmtop_path: Path):
    prmtop = AmberPrmtopFile(str(prmtop_path))
    topology = prmtop.topology

    elements: list[str] = []
    residue_names: list[str] = []
    residue_ids: list[str] = []
    atom_masses: list[float] = []
    atom_residue_local_index: list[int] = []
    residue_groups: dict[str, list[int]] = {}

    local_counts: dict[str, int] = {}
    for atom_index, atom in enumerate(topology.atoms()):
        residue_id = atom.residue.id
        residue_groups.setdefault(residue_id, []).append(atom_index)
        local_index = local_counts.get(residue_id, 0)
        local_counts[residue_id] = local_index + 1
        atom_residue_local_index.append(local_index)
        residue_names.append(atom.residue.name)
        residue_ids.append(residue_id)
        elements.append(atom.element.symbol if atom.element is not None else atom.name[0])
        if atom.element is not None:
            atom_masses.append(float(atom.element.mass.value_in_unit(unit.dalton)))
        else:
            atom_masses.append(0.0)

    atom_index_map = {atom: index for index, atom in enumerate(topology.atoms())}
    bonds = []
    for left, right in topology.bonds():
        bonds.append([atom_index_map[left], atom_index_map[right]])

    residue_name_map = {
        residue_id: residue_names[indices[0]]
        for residue_id, indices in residue_groups.items()
        if indices
    }

    return {
        "elements": elements,
        "residueNames": residue_names,
        "residueIds": residue_ids,
        "bonds": bonds,
        "residueGroups": residue_groups,
        "residueNameMap": residue_name_map,
        "atomMasses": atom_masses,
        "atomResidueLocalIndex": atom_residue_local_index,
        "totalMassDalton": float(sum(atom_masses)),
    }


def assign_charges(elements: list[str], residue_names: list[str], template_elements: list[str], template_charges: list[float]) -> list[float]:
    template_queue = list(zip(template_elements, template_charges))
    charges = []
    template_index = 0
    for element, residue in zip(elements, residue_names):
        if residue == "CAF":
            template_element, charge = template_queue[template_index % len(template_queue)]
            if template_element != element:
                raise RuntimeError(f"Caffeine template mismatch: expected {template_element}, got {element}")
            charges.append(round(charge, 4))
            template_index += 1
        elif residue in {"WAT", "HOH"}:
            charges.append(WATER_CHARGES.get(element, 0.0))
        else:
            charges.append(0.0)
    return charges


def gather_system_data(metadata: dict, positions: np.ndarray):
    return {
        "atoms": positions.tolist(),
        "elements": metadata["elements"],
        "residueNames": metadata["residueNames"],
        "residueIds": metadata["residueIds"],
        "bonds": metadata["bonds"],
    }


def count_residue_instances(metadata: dict) -> dict[str, int]:
    counts: dict[str, int] = {}
    for residue_id, residue_name in metadata["residueNameMap"].items():
        if metadata["residueGroups"].get(residue_id):
            counts[residue_name] = counts.get(residue_name, 0) + 1
    return counts


def box_lengths_from_vectors(vectors_angstrom: np.ndarray) -> np.ndarray:
    return np.asarray([np.linalg.norm(vectors_angstrom[i]) for i in range(3)], dtype=np.float64)


def scale_positions_to_box(positions_angstrom: np.ndarray, box_lengths_angstrom: np.ndarray, scale: float):
    center = box_lengths_angstrom * 0.5
    scaled_positions = (positions_angstrom - center) * scale + center
    scaled_box = box_lengths_angstrom * scale
    scaled_vectors = np.diag(scaled_box) * unit.angstrom
    return scaled_positions * unit.angstrom, scaled_box, scaled_vectors


def build_simulation(prmtop_path: Path, *, temperature_kelvin: float, pressure_bar: float | None):
    prmtop = AmberPrmtopFile(str(prmtop_path))
    system = prmtop.createSystem(
        nonbondedMethod=PME,
        nonbondedCutoff=1.0 * unit.nanometer,
        constraints=HBonds,
        rigidWater=True,
        ewaldErrorTolerance=1e-4,
    )
    if pressure_bar is not None:
        system.addForce(
            MonteCarloBarostat(
                pressure_bar * unit.bar,
                temperature_kelvin * unit.kelvin,
                BAROSTAT_INTERVAL,
            )
        )
    integrator = LangevinMiddleIntegrator(
        temperature_kelvin * unit.kelvin,
        FRICTION_PS / unit.picosecond,
        TIMESTEP_FS * unit.femtoseconds,
    )
    simulation = Simulation(prmtop.topology, system, integrator, Platform.getPlatformByName("CPU"))
    return prmtop, simulation


def capture_frame(simulation: Simulation, *, phase: str, frame_index: int, time_ps: float, total_mass_dalton: float) -> TrajectoryFrame:
    state = simulation.context.getState(getPositions=True, getEnergy=True)
    positions = np.asarray(state.getPositions(asNumpy=True).value_in_unit(unit.angstrom), dtype=np.float64)
    vectors = np.asarray(state.getPeriodicBoxVectors(asNumpy=True).value_in_unit(unit.angstrom), dtype=np.float64)
    box_lengths = box_lengths_from_vectors(vectors)
    volume = float(abs(np.linalg.det(vectors)))
    density = float(total_mass_dalton * 1.66053906660 / max(volume, 1e-6))
    potential = float(state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole))
    return TrajectoryFrame(
        phase=phase,
        frame_index=frame_index,
        time_ps=time_ps,
        positions_angstrom=positions,
        box_lengths_angstrom=box_lengths,
        volume_angstrom3=volume,
        density_g_cm3=density,
        potential_energy_kj_mol=potential,
    )


def run_protocol(prmtop_path: Path, inpcrd_path: Path, *, total_mass_dalton: float) -> ProtocolResult:
    inpcrd = AmberInpcrdFile(str(inpcrd_path))
    raw_positions = np.asarray(inpcrd.positions.value_in_unit(unit.angstrom), dtype=np.float64)
    raw_vectors = np.asarray(inpcrd.boxVectors.value_in_unit(unit.angstrom), dtype=np.float64)
    raw_box_lengths = box_lengths_from_vectors(raw_vectors)
    scaled_positions, _, scaled_vectors = scale_positions_to_box(raw_positions, raw_box_lengths, DILUTE_SCALE)

    frames: list[TrajectoryFrame] = []
    elapsed_ps = 0.0

    _, npt_simulation = build_simulation(prmtop_path, temperature_kelvin=TEMPERATURE_K, pressure_bar=PRESSURE_BAR)
    npt_simulation.context.setPositions(scaled_positions)
    npt_simulation.context.setPeriodicBoxVectors(*scaled_vectors)
    seed_frame = capture_frame(
        npt_simulation,
        phase="seed",
        frame_index=-1,
        time_ps=elapsed_ps,
        total_mass_dalton=total_mass_dalton,
    )
    npt_simulation.minimizeEnergy(maxIterations=MINIMIZE_ITERS)
    frames.append(
        capture_frame(
            npt_simulation,
            phase="min",
            frame_index=0,
            time_ps=elapsed_ps,
            total_mass_dalton=total_mass_dalton,
        )
    )

    npt_simulation.context.setVelocitiesToTemperature(TEMPERATURE_K * unit.kelvin)
    npt_frame_count = 0
    for step in range(0, NPT_STEPS, REPORT_STRIDE):
        advance = min(REPORT_STRIDE, NPT_STEPS - step)
        npt_simulation.step(advance)
        elapsed_ps += TIMESTEP_FS * advance / 1000.0
        npt_frame_count += 1
        frames.append(
            capture_frame(
                npt_simulation,
                phase="npt",
                frame_index=npt_frame_count,
                time_ps=elapsed_ps,
                total_mass_dalton=total_mass_dalton,
            )
        )

    npt_state = npt_simulation.context.getState(getPositions=True, getVelocities=True)
    npt_positions = npt_state.getPositions()
    npt_velocities = npt_state.getVelocities()
    npt_vectors = npt_state.getPeriodicBoxVectors()

    _, nvt_simulation = build_simulation(prmtop_path, temperature_kelvin=TEMPERATURE_K, pressure_bar=None)
    nvt_simulation.context.setPositions(npt_positions)
    nvt_simulation.context.setVelocities(npt_velocities)
    nvt_simulation.context.setPeriodicBoxVectors(*npt_vectors)
    nvt_frame_count = 0
    for step in range(0, NVT_STEPS, REPORT_STRIDE):
        advance = min(REPORT_STRIDE, NVT_STEPS - step)
        nvt_simulation.step(advance)
        elapsed_ps += TIMESTEP_FS * advance / 1000.0
        nvt_frame_count += 1
        frames.append(
            capture_frame(
                nvt_simulation,
                phase="nvt",
                frame_index=nvt_frame_count,
                time_ps=elapsed_ps,
                total_mass_dalton=total_mass_dalton,
            )
        )

    final_state = nvt_simulation.context.getState(getPositions=True, getEnergy=True, getForces=True)
    positions = np.asarray(final_state.getPositions(asNumpy=True).value_in_unit(unit.angstrom), dtype=np.float64)
    forces = np.asarray(
        final_state.getForces(asNumpy=True).value_in_unit(unit.kilojoule_per_mole / unit.nanometer),
        dtype=np.float64,
    )
    force_norms = np.linalg.norm(forces, axis=1)
    return ProtocolResult(
        frames=frames,
        seed_frame=seed_frame,
        final_positions_angstrom=positions,
        final_forces_kj_mol_nm=forces,
        final_potential_energy_kj_mol=float(final_state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)),
        force_rms_kj_mol_nm=float(np.sqrt(np.mean(np.sum(forces * forces, axis=1)))),
        force_p95_kj_mol_nm=float(np.percentile(force_norms, 95)),
        force_max_kj_mol_nm=float(force_norms.max()),
    )


def round_point(point: np.ndarray | list[float], digits: int = 4) -> list[float]:
    return [round(float(value), digits) for value in point]


def normalize_vector(vector: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vector))
    if norm <= 1e-12:
        return np.array([0.0, 0.0, 1.0], dtype=np.float64)
    return vector / norm


def midpoint(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    return (left + right) * 0.5


def principal_axes(points: np.ndarray) -> np.ndarray:
    if len(points) < 3:
        return np.eye(3, dtype=np.float64)
    centered = points - points.mean(axis=0, keepdims=True)
    _, _, vh = np.linalg.svd(centered, full_matrices=False)
    return vh


def radius_about_target(points: np.ndarray, target: np.ndarray) -> float:
    if len(points) == 0:
        return 1.0
    return float(max(np.linalg.norm(point - target) for point in points))


def camera_payload(
    *,
    positions: np.ndarray,
    subset_indices: list[int],
    target: np.ndarray,
    forward: np.ndarray,
    padding: float,
    near_factor: float,
    far_factor: float,
) -> dict:
    subset_points = positions[subset_indices] if subset_indices else positions
    return {
        "target": round_point(target),
        "forward": round_point(normalize_vector(forward)),
        "radius": round(radius_about_target(subset_points, target), 4),
        "padding": round(float(padding), 4),
        "nearFactor": round(float(near_factor), 4),
        "farFactor": round(float(far_factor), 4),
    }


def attach_frame_metadata(snapshot: dict, frame: TrajectoryFrame) -> dict:
    snapshot["phase"] = frame.phase
    snapshot["frame"] = frame.frame_index
    snapshot["timePs"] = round(frame.time_ps, 4)
    return snapshot


def residue_center(positions: np.ndarray, indices: list[int]) -> np.ndarray:
    return positions[indices].mean(axis=0)


def wrap_residues_to_box(positions: np.ndarray, residue_groups: dict[str, list[int]], box_lengths: np.ndarray) -> np.ndarray:
    wrapped = positions.copy()
    for indices in residue_groups.values():
        center = residue_center(positions, indices)
        shift = -np.floor(center / box_lengths) * box_lengths
        wrapped[indices] = positions[indices] + shift
    return wrapped


def center_wrapped_box(positions: np.ndarray, residue_groups: dict[str, list[int]], box_lengths: np.ndarray) -> np.ndarray:
    wrapped = wrap_residues_to_box(positions, residue_groups, box_lengths)
    return wrapped - box_lengths * 0.5


def wrap_residues_relative_to_focus(
    positions: np.ndarray,
    residue_groups: dict[str, list[int]],
    box_lengths: np.ndarray,
    focus_residue_id: str,
) -> np.ndarray:
    focus_center = residue_center(positions, residue_groups[focus_residue_id])
    local = positions.copy()
    for residue_id, indices in residue_groups.items():
        relative = positions[indices] - focus_center
        center = relative.mean(axis=0)
        center -= np.round(center / box_lengths) * box_lengths
        shift = center - relative.mean(axis=0)
        local[indices] = relative + shift
    return local


def filter_snapshot(
    positions: np.ndarray,
    elements: list[str],
    charges: list[float],
    bonds: list[list[int]],
    residue_names: list[str],
    residue_ids_numeric: list[int],
    keep_indices: list[int],
    *,
    focus_atom_indices: list[int] | None = None,
):
    keep_sorted = sorted(set(keep_indices))
    mapping = {old: new for new, old in enumerate(keep_sorted)}
    keep_set = set(keep_sorted)
    snapshot_bonds = [
        [mapping[left], mapping[right]]
        for left, right in bonds
        if left in keep_set and right in keep_set
    ]
    return {
        "atoms": [round_point(positions[index]) for index in keep_sorted],
        "elements": [elements[index] for index in keep_sorted],
        "charges": [round(float(charges[index]), 4) for index in keep_sorted],
        "bonds": snapshot_bonds,
        "residueNames": [residue_names[index] for index in keep_sorted],
        "residueIds": [residue_ids_numeric[index] for index in keep_sorted],
        "focusAtomIndices": [
            mapping[index]
            for index in (focus_atom_indices or [])
            if index in mapping
        ],
    }


def compute_focus_residue_id(
    frame: TrajectoryFrame,
    residue_groups: dict[str, list[int]],
    residue_name_map: dict[str, str],
) -> str:
    centered = center_wrapped_box(frame.positions_angstrom, residue_groups, frame.box_lengths_angstrom)
    best_residue = None
    best_distance = float("inf")
    for residue_id, indices in residue_groups.items():
        if residue_name_map.get(residue_id) != "CAF":
            continue
        center = residue_center(centered, indices)
        dist = float(np.linalg.norm(center))
        if dist < best_distance:
            best_distance = dist
            best_residue = residue_id
    if best_residue is None:
        raise RuntimeError("Could not locate a focus caffeine residue.")
    return best_residue


def build_ring_plane(positions: np.ndarray, residue_indices: list[int], aromatic_ring_atoms: list[int]):
    ring_indices = [residue_indices[offset] for offset in aromatic_ring_atoms if offset < len(residue_indices)]
    if len(ring_indices) < 3:
        return None
    ring_coords = positions[ring_indices]
    center = ring_coords.mean(axis=0)
    _, _, vh = np.linalg.svd(ring_coords - center, full_matrices=False)
    normal = vh[-1]
    normal /= np.linalg.norm(normal) + 1e-12
    return {
        "center": center,
        "normal": normal,
        "indices": ring_indices,
    }


def find_stacking_partners(
    positions: np.ndarray,
    residue_groups: dict[str, list[int]],
    residue_name_map: dict[str, str],
    focus_residue_id: str,
    aromatic_ring_atoms: list[int],
) -> list[dict]:
    focus_plane = build_ring_plane(positions, residue_groups[focus_residue_id], aromatic_ring_atoms)
    if focus_plane is None:
        return []

    partners = []
    for residue_id, indices in residue_groups.items():
        if residue_id == focus_residue_id or residue_name_map.get(residue_id) != "CAF":
            continue
        plane = build_ring_plane(positions, indices, aromatic_ring_atoms)
        if plane is None:
            continue
        delta = plane["center"] - focus_plane["center"]
        distance = float(np.linalg.norm(delta))
        if distance > 10.5:
            continue
        alignment = float(abs(np.dot(focus_plane["normal"], plane["normal"])))
        lateral = float(
            np.linalg.norm(delta - np.dot(delta, focus_plane["normal"]) * focus_plane["normal"])
        )
        score = alignment * math.exp(-((distance - 5.0) ** 2) / 12.0) * math.exp(-(lateral**2) / 18.0)
        partners.append(
            {
                "residueId": residue_id,
                "center": plane["center"],
                "normal": plane["normal"],
                "distance": distance,
                "alignment": alignment,
                "score": score,
            }
        )
    return sorted(partners, key=lambda item: item["score"], reverse=True)


def find_polar_contacts(
    positions: np.ndarray,
    residue_groups: dict[str, list[int]],
    residue_name_map: dict[str, str],
    elements: list[str],
    focus_residue_id: str,
    carbonyl_oxygen_indices: list[int],
) -> list[dict]:
    focus_indices = residue_groups[focus_residue_id]
    acceptor_indices = [
        focus_indices[offset]
        for offset in carbonyl_oxygen_indices
        if offset < len(focus_indices)
    ]
    contacts: list[dict] = []
    for residue_id, indices in residue_groups.items():
        if residue_name_map.get(residue_id) not in {"HOH", "WAT"}:
            continue
        oxygen_indices = [index for index in indices if elements[index] == "O"]
        hydrogen_indices = [index for index in indices if elements[index] == "H"]
        if len(oxygen_indices) != 1 or len(hydrogen_indices) < 2:
            continue
        oxygen_index = oxygen_indices[0]
        oxygen = positions[oxygen_index]
        for acceptor_index in acceptor_indices:
            acceptor = positions[acceptor_index]
            oo = float(np.linalg.norm(oxygen - acceptor))
            if oo > 3.6:
                continue
            for hydrogen_index in hydrogen_indices[:2]:
                hydrogen = positions[hydrogen_index]
                oh = float(np.linalg.norm(hydrogen - acceptor))
                if 1.35 <= oh <= 2.45:
                    contacts.append(
                        {
                            "acceptor": acceptor,
                            "hydrogen": hydrogen,
                            "oxygen": oxygen,
                            "score": oo + oh * 0.35,
                        }
                    )
    contacts.sort(key=lambda item: item["score"])
    return contacts[:10]


def build_water_shell(
    positions: np.ndarray,
    residue_groups: dict[str, list[int]],
    residue_name_map: dict[str, str],
    elements: list[str],
    max_radius: float,
) -> list[dict]:
    waters: list[dict] = []
    for residue_id, indices in residue_groups.items():
        if residue_name_map.get(residue_id) not in {"HOH", "WAT"}:
            continue
        oxygen_indices = [index for index in indices if elements[index] == "O"]
        hydrogen_indices = [index for index in indices if elements[index] == "H"]
        if len(oxygen_indices) != 1 or len(hydrogen_indices) < 2:
            continue
        oxygen = positions[oxygen_indices[0]]
        radius = float(np.linalg.norm(oxygen))
        if radius > max_radius:
            continue
        waters.append(
            {
                "radius": radius,
                "oxygen": oxygen,
                "hydrogens": [positions[index] for index in hydrogen_indices[:2]],
            }
        )
    waters.sort(key=lambda item: item["radius"])
    return waters


def build_trails(
    frames: list[TrajectoryFrame],
    residue_groups: dict[str, list[int]],
    residue_ids: list[str],
    *,
    use_centered_box: bool,
) -> list[dict]:
    trails: list[dict] = []
    for residue_id in residue_ids:
        points = []
        for frame in frames:
            if use_centered_box:
                coords = center_wrapped_box(frame.positions_angstrom, residue_groups, frame.box_lengths_angstrom)
            else:
                coords = wrap_residues_relative_to_focus(
                    frame.positions_angstrom,
                    residue_groups,
                    frame.box_lengths_angstrom,
                    residue_id,
                )
            points.append(round_point(residue_center(coords, residue_groups[residue_id])))
        trails.append({"points": points})
    return trails


def build_box_snapshot(
    *,
    scene_id: str,
    frame: TrajectoryFrame,
    metadata: dict,
    charges: list[float],
    focus_residue_id: str,
    residue_ids_numeric: list[int],
    reference_box_lengths: np.ndarray | None = None,
    trails: list[dict] | None = None,
):
    centered = center_wrapped_box(frame.positions_angstrom, metadata["residueGroups"], frame.box_lengths_angstrom)
    focus_indices = metadata["residueGroups"][focus_residue_id]
    focus_center = residue_center(centered, focus_indices)
    keep_indices = list(range(len(centered)))
    snapshot = filter_snapshot(
        centered,
        metadata["elements"],
        charges,
        metadata["bonds"],
        metadata["residueNames"],
        residue_ids_numeric,
        keep_indices,
        focus_atom_indices=focus_indices,
    )
    snapshot["id"] = scene_id
    snapshot["sourceIndices"] = keep_indices
    snapshot["anchors"] = {
        "scene_center": [0.0, 0.0, 0.0],
        "focus_center": round_point(focus_center),
    }
    snapshot["subsets"] = {
        "scene_all": {"indices": list(range(len(snapshot["atoms"])))},
        "scene_focus": {
            "indices": [
                index
                for index, atom in enumerate(snapshot["atoms"])
                if math.dist(atom, snapshot["anchors"]["focus_center"]) <= 10.5
            ]
        },
    }
    box = {"lengths": round_point(frame.box_lengths_angstrom)}
    if reference_box_lengths is not None:
        box["referenceLengths"] = round_point(reference_box_lengths)
    snapshot["box"] = box
    box_direction = normalize_vector(
        np.array(
            [frame.box_lengths_angstrom[0], frame.box_lengths_angstrom[1] * 0.72, frame.box_lengths_angstrom[2] * 1.08],
            dtype=np.float64,
        )
    )
    snapshot["camera"] = camera_payload(
        positions=centered,
        subset_indices=snapshot["subsets"]["scene_all"]["indices"],
        target=np.array(snapshot["anchors"]["scene_center"], dtype=np.float64),
        forward=box_direction,
        padding=1.08 if reference_box_lengths is None else 1.02,
        near_factor=0.05,
        far_factor=6.5,
    )
    if trails:
        snapshot["trails"] = trails
    return attach_frame_metadata(snapshot, frame)


def build_local_snapshot(
    *,
    scene_id: str,
    frame: TrajectoryFrame,
    metadata: dict,
    charges: list[float],
    focus_residue_id: str,
    residue_ids_numeric: list[int],
    aromatic_ring_atoms: list[int],
    carbonyl_oxygen_indices: list[int],
    caffeine_cutoff: float,
    water_cutoff: float,
    include_trails: list[dict] | None = None,
):
    local_positions = wrap_residues_relative_to_focus(
        frame.positions_angstrom,
        metadata["residueGroups"],
        frame.box_lengths_angstrom,
        focus_residue_id,
    )

    keep_indices: list[int] = []
    for residue_id, indices in metadata["residueGroups"].items():
        center = residue_center(local_positions, indices)
        radius = float(np.linalg.norm(center))
        residue_name = metadata["residueNameMap"][residue_id]
        cutoff = caffeine_cutoff if residue_name == "CAF" else water_cutoff
        if residue_id == focus_residue_id or radius <= cutoff:
            keep_indices.extend(indices)

    snapshot = filter_snapshot(
        local_positions,
        metadata["elements"],
        charges,
        metadata["bonds"],
        metadata["residueNames"],
        residue_ids_numeric,
        keep_indices,
        focus_atom_indices=metadata["residueGroups"][focus_residue_id],
    )
    snapshot["id"] = scene_id
    snapshot["sourceIndices"] = sorted(set(keep_indices))
    snapshot["anchors"] = {"focus_center": [0.0, 0.0, 0.0]}
    snapshot["subsets"] = {"scene_all": {"indices": list(range(len(snapshot["atoms"])))}, "scene_focus": {"indices": list(range(len(snapshot["atoms"])))}}  # snapshot is already directed

    local_residue_groups: dict[int, list[int]] = {}
    for atom_index, residue_id in enumerate(snapshot["residueIds"]):
        local_residue_groups.setdefault(residue_id, []).append(atom_index)
    local_residue_name_map = {
        residue_id: snapshot["residueNames"][indices[0]]
        for residue_id, indices in local_residue_groups.items()
    }
    local_focus_residue_id = snapshot["residueIds"][snapshot["focusAtomIndices"][0]]

    positions = np.asarray(snapshot["atoms"], dtype=np.float64)
    stack_partners = find_stacking_partners(
        positions,
        {str(key): value for key, value in local_residue_groups.items()},
        {str(key): value for key, value in local_residue_name_map.items()},
        str(local_focus_residue_id),
        aromatic_ring_atoms,
    )
    focus_plane = build_ring_plane(
        positions,
        local_residue_groups[local_focus_residue_id],
        aromatic_ring_atoms,
    )
    if focus_plane is not None:
        planes = [
            {
                "center": round_point(focus_plane["center"]),
                "normal": round_point(focus_plane["normal"]),
                "radius": 1.7,
                "residueId": int(local_focus_residue_id),
            }
        ]
        for partner in stack_partners[:2]:
            planes.append(
                {
                    "center": round_point(partner["center"]),
                    "normal": round_point(partner["normal"]),
                    "radius": 1.6,
                    "residueId": int(partner["residueId"]),
                }
            )
        snapshot["stackPlanes"] = planes
        snapshot["stackPairs"] = [
            {
                "start": round_point(focus_plane["center"]),
                "end": round_point(partner["center"]),
            }
            for partner in stack_partners[:2]
        ]
        snapshot["stackResidueIds"] = [int(local_focus_residue_id), *[int(partner["residueId"]) for partner in stack_partners[:2]]]

    contacts = find_polar_contacts(
        positions,
        {str(key): value for key, value in local_residue_groups.items()},
        {str(key): value for key, value in local_residue_name_map.items()},
        snapshot["elements"],
        str(local_focus_residue_id),
        carbonyl_oxygen_indices,
    )
    snapshot["polarContacts"] = [
        {
            "acceptor": round_point(contact["acceptor"]),
            "hydrogen": round_point(contact["hydrogen"]),
            "oxygen": round_point(contact["oxygen"]),
        }
        for contact in contacts
    ]

    waters = build_water_shell(
        positions,
        {str(key): value for key, value in local_residue_groups.items()},
        {str(key): value for key, value in local_residue_name_map.items()},
        snapshot["elements"],
        max_radius=6.4,
    )
    snapshot["waterMolecules"] = [
        {
            "oxygen": round_point(water["oxygen"]),
            "hydrogens": [round_point(hydrogen) for hydrogen in water["hydrogens"]],
        }
        for water in waters[:14]
    ]
    focus_residue_indices = set(local_residue_groups[local_focus_residue_id])
    bonded_midpoints = []
    for left, right in snapshot["bonds"]:
        if left not in focus_residue_indices or right not in focus_residue_indices:
            continue
        if snapshot["elements"][left] == "H" and snapshot["elements"][right] == "H":
            continue
        bonded_midpoints.append(midpoint(positions[left], positions[right]))
    bonded_midpoints.sort(key=lambda point: float(np.linalg.norm(point)))

    nonbonded_points = [midpoint(contact["acceptor"], contact["hydrogen"]) for contact in contacts[:6]]
    if focus_plane is not None:
        nonbonded_points.extend(midpoint(focus_plane["center"], partner["center"]) for partner in stack_partners[:2])

    snapshot["cuePoints"] = [
        *[
            {"point": round_point(point), "family": "bonded", "weight": round(1.0 - index * 0.08, 4)}
            for index, point in enumerate(bonded_midpoints[:6])
        ],
        *[
            {"point": round_point(point), "family": "nonbonded", "weight": round(1.0 - index * 0.1, 4)}
            for index, point in enumerate(nonbonded_points[:6])
        ],
    ]
    focus_points = np.asarray(snapshot["atoms"], dtype=np.float64)
    focus_forward = principal_axes(focus_points)[0]
    if focus_plane is not None:
        focus_forward = normalize_vector(focus_plane["normal"] * 0.72 + principal_axes(focus_points)[0] * 0.44)
    snapshot["camera"] = camera_payload(
        positions=focus_points,
        subset_indices=snapshot["subsets"]["scene_focus"]["indices"],
        target=np.array([0.0, 0.0, 0.0], dtype=np.float64),
        forward=focus_forward,
        padding=1.12,
        near_factor=0.05,
        far_factor=5.8,
    )
    if include_trails:
        snapshot["trails"] = include_trails
    return attach_frame_metadata(snapshot, frame)


def select_frame_window(frames: list[TrajectoryFrame], anchor_frame: TrajectoryFrame, count: int) -> list[TrajectoryFrame]:
    if not frames:
        return []
    anchor_index = next(
        (
            index
            for index, frame in enumerate(frames)
            if frame.phase == anchor_frame.phase and frame.frame_index == anchor_frame.frame_index
        ),
        len(frames) - 1,
    )
    half = max(1, count // 2)
    start = max(0, anchor_index - half)
    end = min(len(frames), start + count)
    start = max(0, end - count)
    return frames[start:end]


def merge_frame_windows(*windows: list[TrajectoryFrame]) -> list[TrajectoryFrame]:
    merged: list[TrajectoryFrame] = []
    seen: set[tuple[str, int]] = set()
    for window in windows:
        for frame in window:
            key = (frame.phase, frame.frame_index)
            if key in seen:
                continue
            seen.add(key)
            merged.append(frame)
    return merged


def select_motion_indices(snapshot: dict, page_id: str) -> list[int]:
    focus_indices = [int(index) for index in snapshot.get("focusAtomIndices", [])]
    residue_names = snapshot.get("residueNames", [])
    residue_ids = snapshot.get("residueIds", [])
    elements = snapshot.get("elements", [])
    atoms = np.asarray(snapshot.get("atoms", []), dtype=np.float64)

    water_residue_order: list[int] = []
    seen_water_residues: set[int] = set()
    if atoms.size:
        for atom_index, (residue_name, residue_id, element) in enumerate(zip(residue_names, residue_ids, elements)):
            if residue_name not in {"HOH", "WAT"} or element != "O" or residue_id in seen_water_residues:
                continue
            seen_water_residues.add(int(residue_id))
            water_residue_order.append(int(residue_id))
        water_residue_order.sort(
            key=lambda residue_id: float(
                np.linalg.norm(
                    residue_center(
                        atoms,
                        [index for index, rid in enumerate(residue_ids) if int(rid) == residue_id],
                    )
                )
            )
        )

    def residue_atom_indices(target_residue_ids: list[int]) -> list[int]:
        residue_id_set = set(target_residue_ids)
        return [
            int(atom_index)
            for atom_index, residue_id in enumerate(residue_ids)
            if int(residue_id) in residue_id_set
        ]

    if page_id == "A1_resolution":
        return focus_indices

    if page_id == "A2_forcefield":
        return focus_indices

    if page_id == "A3_nonuniformity":
        support_residue_ids = water_residue_order[:4]
        return residue_atom_indices(support_residue_ids)

    if page_id == "A4_ensemble":
        support_residue_ids = water_residue_order[:10]
        return residue_atom_indices(support_residue_ids)

    if page_id == "A5_readout":
        support_residue_ids = water_residue_order[:4]
        return focus_indices + residue_atom_indices(support_residue_ids)

    return []


def build_page_trajectory(
    *,
    page_id: str,
    snapshot: dict,
    frames: list[TrajectoryFrame],
    metadata: dict,
    focus_residue_id: str,
    mode: str,
) -> dict:
    source_indices = snapshot["sourceIndices"]
    focus_source_indices = set(snapshot.get("focusAtomIndices", []))
    page_frames = []
    primary_motion_indices = select_motion_indices(snapshot, page_id)
    page_kind = "analysis" if page_id == "A5_readout" else "close-up" if page_id in {"A2_forcefield", "A3_nonuniformity"} else "full-cell"
    box_mode = (
        "current+reference"
        if page_id == "A4_ensemble"
        else "current"
        if page_id in {"A1_resolution"}
        else "none"
    )

    for frame in frames:
        if mode == "local":
            transformed = wrap_residues_relative_to_focus(
                frame.positions_angstrom,
                metadata["residueGroups"],
                frame.box_lengths_angstrom,
                focus_residue_id,
            )
            anchors = {"focus_center": [0.0, 0.0, 0.0]}
        else:
            transformed = center_wrapped_box(frame.positions_angstrom, metadata["residueGroups"], frame.box_lengths_angstrom)
            anchors = {"scene_center": [0.0, 0.0, 0.0]}
            if focus_source_indices:
                focus_global_indices = [source_indices[index] for index in focus_source_indices]
                focus_center = residue_center(transformed, focus_global_indices)
                anchors["focus_center"] = round_point(focus_center)
        page_frames.append(
            {
                "phase": frame.phase,
                "frame": frame.frame_index,
                "timePs": round(frame.time_ps, 4),
                "atoms": [round_point(transformed[index]) for index in source_indices],
                "box": {"lengths": round_point(frame.box_lengths_angstrom)},
                "anchors": anchors,
            }
        )

    return {
        "id": page_id,
        "pageKind": page_kind,
        "boxMode": box_mode,
        "primaryMotionIndices": primary_motion_indices,
        "frameCount": len(page_frames),
        "frames": page_frames,
    }


def compute_metrics(
    frames: list[TrajectoryFrame],
    metadata: dict,
    focus_residue_id: str,
    aromatic_ring_atoms: list[int],
    carbonyl_oxygen_indices: list[int],
) -> list[dict]:
    metrics = []
    for frame in frames:
        local_positions = wrap_residues_relative_to_focus(
            frame.positions_angstrom,
            metadata["residueGroups"],
            frame.box_lengths_angstrom,
            focus_residue_id,
        )
        stack_partners = find_stacking_partners(
            local_positions,
            metadata["residueGroups"],
            metadata["residueNameMap"],
            focus_residue_id,
            aromatic_ring_atoms,
        )
        contacts = find_polar_contacts(
            local_positions,
            metadata["residueGroups"],
            metadata["residueNameMap"],
            metadata["elements"],
            focus_residue_id,
            carbonyl_oxygen_indices,
        )
        waters = build_water_shell(
            local_positions,
            metadata["residueGroups"],
            metadata["residueNameMap"],
            metadata["elements"],
            max_radius=6.0,
        )
        metrics.append(
            {
                "phase": frame.phase,
                "frame": frame.frame_index,
                "timePs": round(frame.time_ps, 4),
                "density": round(frame.density_g_cm3, 5),
                "volumeA3": round(frame.volume_angstrom3, 4),
                "caffeineNeighbors": len([partner for partner in stack_partners if partner["distance"] <= 10.0]),
                "packingScore": round(max([partner["score"] for partner in stack_partners] or [0.0]), 5),
                "hydrationContacts": len(contacts),
                "meanWaterDistance": round(
                    float(np.mean([water["radius"] for water in waters[:10]])) if waters else 0.0,
                    5,
                ),
            }
        )
    return metrics


def build_snapshot_highlights(snapshots: list[dict]) -> list[dict]:
    return [
        {
            "id": snapshot["id"],
            "phase": snapshot["phase"],
            "frame": snapshot["frame"],
            "timePs": snapshot["timePs"],
        }
        for snapshot in snapshots
    ]


def compute_caffeine_water_rdf(
    frames: list[TrajectoryFrame],
    metadata: dict,
    focus_residue_id: str,
) -> list[dict[str, float]]:
    if not frames:
        return []

    bin_count = 72
    max_radius = 10.0
    bin_width = max_radius / bin_count
    histogram = np.zeros(bin_count, dtype=np.float64)
    cumulative_counts = np.zeros(bin_count, dtype=np.float64)

    for frame in frames:
        local_positions = wrap_residues_relative_to_focus(
            frame.positions_angstrom,
            metadata["residueGroups"],
            frame.box_lengths_angstrom,
            focus_residue_id,
        )
        for residue_id, indices in metadata["residueGroups"].items():
            if metadata["residueNameMap"].get(residue_id) not in {"HOH", "WAT"}:
                continue
            oxygen_indices = [index for index in indices if metadata["elements"][index] == "O"]
            if len(oxygen_indices) != 1:
                continue
            r = float(np.linalg.norm(local_positions[oxygen_indices[0]]))
            if r >= max_radius:
                continue
            bin_index = min(bin_count - 1, int(r / bin_width))
            histogram[bin_index] += 1.0
            cumulative_counts[bin_index:] += 1.0

    histogram /= max(1, len(frames))
    cumulative_counts /= max(1, len(frames))
    tail = histogram[-12:]
    tail_mean = float(tail.mean()) if np.any(tail) else 1.0
    return [
        {
            "r": round((index + 0.5) * bin_width, 4),
            "g": round(float(value / max(tail_mean, 1e-6)), 5),
            "coordination": round(float(cumulative_counts[index]), 5),
        }
        for index, value in enumerate(histogram)
    ]


def main():
    template = build_caffeine_template()
    with tempfile.TemporaryDirectory(prefix="allatom-build-") as temp_dir:
        workdir = Path(temp_dir)
        parameterize_caffeine(workdir, template["mol"])
        export_caffeine_template_pdb(workdir)
        write_water_template_pdb(workdir / "water_template.pdb")
        run_packmol(workdir)
        prepend_cryst1_record(workdir / "packed.pdb", PACKMOL_BOX)
        packed_counts = count_pdb_residues(workdir / "packed.pdb")
        if packed_counts.get("CAF", 0) != CAFFEINE_COUNT or packed_counts.get("WAT", 0) != WATER_COUNT:
            raise RuntimeError(
                "Packmol did not place the requested molecule counts: "
                f"CAF={packed_counts.get('CAF', 0)} / {CAFFEINE_COUNT}, "
                f"WAT={packed_counts.get('WAT', 0)} / {WATER_COUNT}"
            )
        (workdir / "build.leap").write_text(build_packmol_leap_script())
        run_command([str(ENV_BIN / "tleap"), "-f", "build.leap"], workdir)

        metadata = load_topology_metadata(workdir / "sys.prmtop")
        residue_instance_counts = count_residue_instances(metadata)
        if residue_instance_counts.get("CAF", 0) != CAFFEINE_COUNT or residue_instance_counts.get("HOH", 0) != WATER_COUNT:
            raise RuntimeError(
                "Amber build changed the molecule counts: "
                f"CAF={residue_instance_counts.get('CAF', 0)} / {CAFFEINE_COUNT}, "
                f"HOH={residue_instance_counts.get('HOH', 0)} / {WATER_COUNT}"
            )
        protocol = run_protocol(
            workdir / "sys.prmtop",
            workdir / "sys.inpcrd",
            total_mass_dalton=metadata["totalMassDalton"],
        )

        system = gather_system_data(metadata, protocol.final_positions_angstrom)
        charges = assign_charges(
            metadata["elements"],
            metadata["residueNames"],
            template["elements"],
            template["charges"],
        )

        min_frames = [frame for frame in protocol.frames if frame.phase == "min"]
        npt_frames = [frame for frame in protocol.frames if frame.phase == "npt"]
        nvt_frames = [frame for frame in protocol.frames if frame.phase == "nvt"]
        if not min_frames or not npt_frames or len(nvt_frames) < 4:
            raise RuntimeError("The all-atom MD protocol did not produce enough trajectory frames.")

        focus_residue_id = compute_focus_residue_id(
            nvt_frames[-1],
            metadata["residueGroups"],
            metadata["residueNameMap"],
        )
        focus_indices = metadata["residueGroups"][focus_residue_id]
        molecule_data = {
            "atoms": [
                round_point(atom)
                for atom in wrap_residues_relative_to_focus(
                    nvt_frames[-1].positions_angstrom,
                    metadata["residueGroups"],
                    nvt_frames[-1].box_lengths_angstrom,
                    focus_residue_id,
                )[focus_indices]
            ],
            "elements": [metadata["elements"][index] for index in focus_indices],
            "bonds": [
                [left, right, bond_order]
                for left, right, bond_order in template["bonds"]
            ],
            "heavyAngles": template["heavyAngles"],
            "charges": [round(charges[index], 4) for index in focus_indices],
            "dihedralLabels": template["dihedralLabels"],
            "residueId": focus_residue_id,
        }

        residue_numeric_ids = {
            residue_id: idx
            for idx, residue_id in enumerate(sorted(set(metadata["residueIds"])), start=1)
        }
        residue_ids_numeric = [residue_numeric_ids[residue_id] for residue_id in metadata["residueIds"]]

        metrics = compute_metrics(
            protocol.frames,
            metadata,
            focus_residue_id,
            template["aromaticRingAtoms"],
            template["carbonylOxygenIndices"],
        )
        rdf = compute_caffeine_water_rdf(nvt_frames[-24:], metadata, focus_residue_id)

        stack_metric_frames = []
        contact_metric_frames = []
        for frame in nvt_frames:
            local_positions = wrap_residues_relative_to_focus(
                frame.positions_angstrom,
                metadata["residueGroups"],
                frame.box_lengths_angstrom,
                focus_residue_id,
            )
            stack_metric_frames.append(
                (
                    max(
                        [
                            partner["score"]
                            for partner in find_stacking_partners(
                                local_positions,
                                metadata["residueGroups"],
                                metadata["residueNameMap"],
                                focus_residue_id,
                                template["aromaticRingAtoms"],
                            )
                        ]
                        or [0.0]
                    ),
                    frame,
                )
            )
            contact_metric_frames.append(
                (
                    len(
                        find_polar_contacts(
                            local_positions,
                            metadata["residueGroups"],
                            metadata["residueNameMap"],
                            metadata["elements"],
                            focus_residue_id,
                            template["carbonylOxygenIndices"],
                        )
                    ),
                    frame,
                )
            )

        stack_frame = max(stack_metric_frames, key=lambda item: item[0])[1]
        contact_frame = max(contact_metric_frames, key=lambda item: item[0])[1]
        resolution_window_source = nvt_frames[-min(16, len(nvt_frames)) :]
        resolution_frame = resolution_window_source[len(resolution_window_source) // 2]
        npt_frame = npt_frames[min(len(npt_frames) - 1, max(1, int(len(npt_frames) * 0.72)))]
        nvt_frame = nvt_frames[min(len(nvt_frames) - 1, max(2, len(nvt_frames) // 3))]
        rdf_frame = nvt_frames[-2]

        overview_trail_residues = [focus_residue_id]
        centered_final = center_wrapped_box(
            nvt_frames[-1].positions_angstrom,
            metadata["residueGroups"],
            nvt_frames[-1].box_lengths_angstrom,
        )
        caffeine_centers = [
            (residue_id, residue_center(centered_final, indices))
            for residue_id, indices in metadata["residueGroups"].items()
            if metadata["residueNameMap"].get(residue_id) == "CAF"
        ]
        caffeine_centers.sort(key=lambda item: float(np.linalg.norm(item[1])))
        overview_trail_residues.extend([residue_id for residue_id, _ in caffeine_centers[3:12:3]])
        overview_trails = build_trails(nvt_frames[-6:], metadata["residueGroups"], overview_trail_residues[:4], use_centered_box=True)
        compression_trails = build_trails(
            [min_frames[0], npt_frames[len(npt_frames) // 2]],
            metadata["residueGroups"],
            overview_trail_residues[:4],
            use_centered_box=True,
        )

        snapshots = [
            build_box_snapshot(
                scene_id="A1_resolution",
                frame=resolution_frame,
                metadata=metadata,
                charges=charges,
                focus_residue_id=focus_residue_id,
                residue_ids_numeric=residue_ids_numeric,
            ),
            build_local_snapshot(
                scene_id="A2_forcefield",
                frame=stack_frame,
                metadata=metadata,
                charges=charges,
                focus_residue_id=focus_residue_id,
                residue_ids_numeric=residue_ids_numeric,
                aromatic_ring_atoms=template["aromaticRingAtoms"],
                carbonyl_oxygen_indices=template["carbonylOxygenIndices"],
                caffeine_cutoff=8.8,
                water_cutoff=5.8,
            ),
            build_local_snapshot(
                scene_id="A3_nonuniformity",
                frame=contact_frame,
                metadata=metadata,
                charges=charges,
                focus_residue_id=focus_residue_id,
                residue_ids_numeric=residue_ids_numeric,
                aromatic_ring_atoms=template["aromaticRingAtoms"],
                carbonyl_oxygen_indices=template["carbonylOxygenIndices"],
                caffeine_cutoff=8.4,
                water_cutoff=7.0,
            ),
            build_box_snapshot(
                scene_id="A4_ensemble",
                frame=nvt_frame,
                metadata=metadata,
                charges=charges,
                focus_residue_id=focus_residue_id,
                residue_ids_numeric=residue_ids_numeric,
                reference_box_lengths=min_frames[0].box_lengths_angstrom,
                trails=overview_trails,
            ),
            build_local_snapshot(
                scene_id="A5_readout",
                frame=rdf_frame,
                metadata=metadata,
                charges=charges,
                focus_residue_id=focus_residue_id,
                residue_ids_numeric=residue_ids_numeric,
                aromatic_ring_atoms=template["aromaticRingAtoms"],
                carbonyl_oxygen_indices=template["carbonylOxygenIndices"],
                caffeine_cutoff=7.4,
                water_cutoff=6.6,
            ),
        ]
        trajectory_pages = [
            build_page_trajectory(
                page_id="A1_resolution",
                snapshot=snapshots[0],
                frames=select_frame_window(nvt_frames, resolution_frame, 14),
                metadata=metadata,
                focus_residue_id=focus_residue_id,
                mode="box",
            ),
            build_page_trajectory(
                page_id="A2_forcefield",
                snapshot=snapshots[1],
                frames=select_frame_window(nvt_frames, stack_frame, 12),
                metadata=metadata,
                focus_residue_id=focus_residue_id,
                mode="local",
            ),
            build_page_trajectory(
                page_id="A3_nonuniformity",
                snapshot=snapshots[2],
                frames=select_frame_window(nvt_frames, contact_frame, 12),
                metadata=metadata,
                focus_residue_id=focus_residue_id,
                mode="local",
            ),
            build_page_trajectory(
                page_id="A4_ensemble",
                snapshot=snapshots[3],
                frames=merge_frame_windows(
                    [protocol.seed_frame, min_frames[0]],
                    select_frame_window(npt_frames, npt_frame, 6),
                    select_frame_window(nvt_frames, nvt_frame, 8),
                ),
                metadata=metadata,
                focus_residue_id=focus_residue_id,
                mode="box",
            ),
            build_page_trajectory(
                page_id="A5_readout",
                snapshot=snapshots[4],
                frames=select_frame_window(nvt_frames, rdf_frame, 12),
                metadata=metadata,
                focus_residue_id=focus_residue_id,
                mode="local",
            ),
        ]
        snapshot_highlights = build_snapshot_highlights(snapshots)

        final_centered = center_wrapped_box(
            nvt_frames[-1].positions_angstrom,
            metadata["residueGroups"],
            nvt_frames[-1].box_lengths_angstrom,
        )
        focus_center = residue_center(final_centered, focus_indices)

        system_data = {
            "caffeineCount": residue_instance_counts.get("CAF", 0),
            "waterCount": residue_instance_counts.get("HOH", 0),
            "soluteAtomCount": sum(1 for residue_name in metadata["residueNames"] if residue_name == "CAF"),
            "atomCount": len(system["atoms"]),
            "atoms": [round_point(atom) for atom in final_centered],
            "elements": metadata["elements"],
            "types": [1 if element == "C" else 2 if element == "N" else 3 if element == "O" else 4 for element in metadata["elements"]],
            "bonds": metadata["bonds"],
            "charges": [round(charge, 4) for charge in charges],
            "focusAtomIndices": focus_indices,
            "residueNames": metadata["residueNames"],
            "residueIds": residue_ids_numeric,
            "anchors": {"scene_center": [0.0, 0.0, 0.0], "focus_center": round_point(focus_center)},
            "subsets": {
                "scene_all": {"indices": list(range(len(final_centered)))},
                "scene_focus": {
                    "indices": [
                        index
                        for index, atom in enumerate(final_centered)
                        if float(np.linalg.norm(atom - focus_center)) <= 10.5
                    ]
                },
            },
            "snapshots": snapshots,
        }

        page_selections = [
            {"id": "A1_resolution", "metric": "stable_production_window", "phase": resolution_frame.phase, "frame": resolution_frame.frame_index, "timePs": round(resolution_frame.time_ps, 4)},
            {"id": "A2_forcefield", "metric": "max_packing_score", "phase": stack_frame.phase, "frame": stack_frame.frame_index, "timePs": round(stack_frame.time_ps, 4)},
            {"id": "A3_nonuniformity", "metric": "max_hydration_contacts", "phase": contact_frame.phase, "frame": contact_frame.frame_index, "timePs": round(contact_frame.time_ps, 4)},
            {"id": "A4_ensemble", "metric": "prepared_thermal_window", "phase": nvt_frame.phase, "frame": nvt_frame.frame_index, "timePs": round(nvt_frame.time_ps, 4)},
            {"id": "A5_readout", "metric": "local_readout_frame", "phase": rdf_frame.phase, "frame": rdf_frame.frame_index, "timePs": round(rdf_frame.time_ps, 4)},
        ]

        final_density = float(nvt_frames[-1].density_g_cm3)
        density_std = float(np.std([frame.density_g_cm3 for frame in nvt_frames]))
        compression_ratio = float(nvt_frames[-1].volume_angstrom3 / min_frames[0].volume_angstrom3)
        packing_metric_max = max(point["caffeineNeighbors"] for point in metrics)
        packing_score_max = max(point["packingScore"] for point in metrics)
        hydration_metric_max = max(point["hydrationContacts"] for point in metrics)

        validation = combine_checks(
            "allatom",
            {
                "residueCounts": {
                    "passed": residue_instance_counts.get("CAF", 0) == CAFFEINE_COUNT and residue_instance_counts.get("HOH", 0) == WATER_COUNT,
                    "expected": EXPECTED_RESIDUE_COUNTS,
                    "observed": {
                        "CAF": residue_instance_counts.get("CAF", 0),
                        "HOH": residue_instance_counts.get("HOH", 0),
                    },
                },
                "bondLengths": validate_bond_lengths(system_data["atoms"], metadata["elements"], metadata["bonds"]),
                "nonbondedContacts": validate_nonbonded_contacts(system_data["atoms"], metadata["elements"], metadata["bonds"]),
                "energy": validate_energy(
                    protocol.force_rms_kj_mol_nm,
                    protocol.final_potential_energy_kj_mol,
                    force_p95=protocol.force_p95_kj_mol_nm,
                    force_max=protocol.force_max_kj_mol_nm,
                ),
                "trajectorySelection": validate_trajectory_selection(
                    len(protocol.frames) - 1,
                    len(protocol.frames),
                ),
                "densitySanity": {
                    "passed": TARGET_DENSITY_RANGE[0] <= final_density <= TARGET_DENSITY_RANGE[1],
                    "finalDensity": round(final_density, 5),
                    "targetRange": list(TARGET_DENSITY_RANGE),
                },
                "compression": {
                    "passed": compression_ratio <= 0.82,
                    "volumeRatioFinalToInitial": round(compression_ratio, 5),
                },
                "nvtStability": {
                    "passed": density_std <= MAX_NVT_DENSITY_STD,
                    "densityStd": round(density_std, 6),
                    "maxDensityStd": MAX_NVT_DENSITY_STD,
                },
                "productionVisibility": {
                    "passed": hydration_metric_max >= 2,
                    "maxCaffeineNeighbors": packing_metric_max,
                    "maxPackingScore": round(packing_score_max, 5),
                    "maxHydrationContacts": hydration_metric_max,
                },
            },
        )
        write_validation_report("allatom", validation)
        if ALLOW_FAILED_VALIDATION:
            print("Validation warnings are being tolerated for this exploratory all-atom run.")
        else:
            ensure_validation_passed(validation)

        (OUT_DIR / "molecule.json").write_text(json.dumps(molecule_data, indent=2))
        (OUT_DIR / "system.json").write_text(json.dumps(system_data, indent=2))
        (OUT_DIR / "trajectory.json").write_text(json.dumps({"pages": trajectory_pages}, indent=2))
        (OUT_DIR / "metrics.json").write_text(
            json.dumps(
                {
                    "trajectory": metrics,
                    "highlights": snapshot_highlights,
                    "pageSelections": page_selections,
                    "summary": {
                        "density": {
                            "final": round(final_density, 5),
                            "stdNvt": round(density_std, 6),
                        },
                        "box": {
                            "minimized": round_point(min_frames[0].box_lengths_angstrom),
                            "production": round_point(nvt_frames[-1].box_lengths_angstrom),
                        },
                    },
                },
                indent=2,
            )
        )
        (OUT_DIR / "rdf.json").write_text(json.dumps(rdf, indent=2))

        print("Wrote trajectory-backed all-atom assets:")
        print(f"  caffeine molecules: {residue_instance_counts.get('CAF', 0)}")
        print(f"  water molecules: {residue_instance_counts.get('HOH', 0)}")
        print(f"  total atoms: {system_data['atomCount']}")
        print(f"  minimized box (A): {round(float(min_frames[0].box_lengths_angstrom[0]), 2)} x {round(float(min_frames[0].box_lengths_angstrom[1]), 2)} x {round(float(min_frames[0].box_lengths_angstrom[2]), 2)}")
        print(f"  production box (A): {round(float(nvt_frames[-1].box_lengths_angstrom[0]), 2)} x {round(float(nvt_frames[-1].box_lengths_angstrom[1]), 2)} x {round(float(nvt_frames[-1].box_lengths_angstrom[2]), 2)}")
        print(f"  production density (g/cm^3): {round(float(nvt_frames[-1].density_g_cm3), 4)}")


if __name__ == "__main__":
    main()
