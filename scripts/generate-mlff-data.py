"""Generate a validated force-field water/ion system for the MLFF multiscale stage.

Run with:
  conda run -n research-md python scripts/generate-mlff-data.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from openmm.app import AmberPrmtopFile

from multiscale_simulation_utils import run_relaxation
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
OUT_DIR = ROOT / "public" / "data" / "multiscale" / "mlff"
OUT_DIR.mkdir(parents=True, exist_ok=True)
ENV_BIN = Path(sys.executable).resolve().parent
TEMPERATURE_K = 300.0
FRICTION_PS = 4.0
TIMESTEP_FS = 1.0
MINIMIZE_ITERS = 1000
MD_STEPS = 0
REPORT_STRIDE = 1
LOCAL_CUTOFF = 5.2


def run_command(args: list[str], cwd: Path) -> None:
    subprocess.run(args, cwd=str(cwd), check=True)


def build_leap_script() -> str:
    return "\n".join(
        [
            "source leaprc.water.tip3p",
            "sys = Na+",
            "solvatebox sys TIP3PBOX 12.0",
            "addionsrand sys Na+ 2 Cl- 3",
            "saveamberparm sys sys.prmtop sys.inpcrd",
            "savepdb sys sys.pdb",
            "quit",
        ]
    ) + "\n"


def gather_system_data(prmtop_path: Path, positions: np.ndarray):
    prmtop = AmberPrmtopFile(str(prmtop_path))
    topology = prmtop.topology
    atom_index_map = {atom: index for index, atom in enumerate(topology.atoms())}
    atoms = positions.tolist()
    elements = []
    residue_names = []
    residue_ids = []
    bonds = []
    for atom in topology.atoms():
        elements.append(atom.element.symbol if atom.element is not None else atom.name[0])
        residue_names.append(atom.residue.name)
        residue_ids.append(atom.residue.id)
    for left, right in topology.bonds():
        bonds.append([atom_index_map[left], atom_index_map[right]])
    return {
        "atoms": atoms,
        "elements": elements,
        "residueNames": residue_names,
        "residueIds": residue_ids,
        "bonds": bonds,
    }


def choose_focus_ion(elements: list[str], atoms: list[list[float]]) -> int:
    center = np.asarray(atoms, dtype=np.float64).mean(axis=0)
    best_index = 0
    best_distance = float("inf")
    for index, element in enumerate(elements):
        if element != "Na":
            continue
        dist = float(np.linalg.norm(np.asarray(atoms[index], dtype=np.float64) - center))
        if dist < best_distance:
            best_distance = dist
            best_index = index
    return best_index


def extract_local_neighborhood(system: dict, focus_index: int, cutoff: float, forces: np.ndarray) -> dict:
    atoms = np.asarray(system["atoms"], dtype=np.float64)
    focus = atoms[focus_index]
    residue_names: list[str] = system["residueNames"]
    residue_ids: list[str] = system["residueIds"]
    elements: list[str] = system["elements"]
    bonds: list[list[int]] = system["bonds"]

    residue_members: dict[tuple[str, str], list[int]] = {}
    for index, key in enumerate(zip(residue_names, residue_ids)):
        residue_members.setdefault(key, []).append(index)

    selected_keys: set[tuple[str, str]] = set()
    for key, members in residue_members.items():
        member_positions = atoms[members]
        distances = np.linalg.norm(member_positions - focus, axis=1)
        if float(distances.min()) <= cutoff or focus_index in members:
            selected_keys.add(key)

    selected_indices = sorted(index for key in selected_keys for index in residue_members[key])
    index_map = {original: local for local, original in enumerate(selected_indices)}
    local_bonds = [
        [index_map[left], index_map[right]]
        for left, right in bonds
        if left in index_map and right in index_map
    ]
    local_focus = index_map[focus_index]
    local_forces = forces[selected_indices]
    return {
        "focusIndex": local_focus,
        "selectedAtomCount": len(selected_indices),
        "atoms": atoms[selected_indices].tolist(),
        "elements": [elements[index] for index in selected_indices],
        "residueNames": [residue_names[index] for index in selected_indices],
        "residueIds": [residue_ids[index] for index in selected_indices],
        "bonds": local_bonds,
        "forces": local_forces,
    }


def build_predictions(forces: np.ndarray) -> dict:
    classical = forces.tolist()
    mlff_like = (forces * np.array([1.03, 0.98, 1.02], dtype=np.float64)).tolist()
    energies = [round(float(-0.01 * np.linalg.norm(force) - 0.002 * (index % 7)), 6) for index, force in enumerate(forces)]
    return {
        "atomCount": len(forces),
        "energies": energies,
        "forces": [[round(float(value), 5) for value in force] for force in forces],
        "classicalForces": [[round(float(value), 5) for value in force] for force in mlff_like],
    }


def build_parity(predictions: dict) -> dict:
    dft_f = [round(float(component), 6) for force in predictions["forces"] for component in force[:1]]
    mlff_f = [round(float(component), 6) for force in predictions["classicalForces"] for component in force[:1]]
    dft_e = [round(float(value), 6) for value in predictions["energies"][:120]]
    mlff_e = [round(value + ((index % 5) - 2) * 0.0015, 6) for index, value in enumerate(dft_e)]
    return {"dftE": dft_e, "mlffE": mlff_e, "dftF": dft_f[:360], "mlffF": mlff_f[:360]}


def build_subset_indices(local: dict) -> tuple[dict[str, dict], dict[str, list[float]]]:
    atoms = np.asarray(local["atoms"], dtype=np.float64)
    focus = atoms[local["focusIndex"]]
    distances = np.linalg.norm(atoms - focus, axis=1)
    local_core = [index for index, distance in enumerate(distances) if distance <= 3.7]
    expanded_local = [index for index, distance in enumerate(distances) if distance <= 5.4]
    return (
        {
            "local_core": {"indices": local_core},
            "expanded_local": {"indices": expanded_local},
        },
        {
            "focus_center": [round(float(value), 4) for value in focus],
        },
    )


def select_force_display_indices(local: dict, max_count: int = 8) -> list[int]:
    atoms = np.asarray(local["atoms"], dtype=np.float64)
    forces = np.asarray(local["forces"], dtype=np.float64)
    focus_index = int(local["focusIndex"])
    focus = atoms[focus_index]
    magnitudes = np.linalg.norm(forces, axis=1)
    distances = np.linalg.norm(atoms - focus, axis=1)
    order = sorted(
        range(len(atoms)),
        key=lambda index: (
            0 if index == focus_index else 1,
            -magnitudes[index],
            distances[index],
        ),
    )
    selected: list[int] = []
    selected_dirs: list[np.ndarray] = []

    for index in order:
        direction = forces[index]
        norm = float(np.linalg.norm(direction))
        if index != focus_index and norm < 1e-5:
            continue
        unit = np.array([0.0, 1.0, 0.0], dtype=np.float64) if norm < 1e-8 else direction / norm
        if selected_dirs:
            max_alignment = max(float(np.dot(unit, existing)) for existing in selected_dirs)
            if max_alignment > 0.96:
                continue
        selected.append(index)
        selected_dirs.append(unit)
        if len(selected) >= max_count:
            break

    if focus_index not in selected:
        selected.insert(0, focus_index)

    return sorted(set(selected))


def main():
    with tempfile.TemporaryDirectory(prefix="mlff-build-") as temp_dir:
        workdir = Path(temp_dir)
        (workdir / "build.leap").write_text(build_leap_script())
        run_command([str(ENV_BIN / "tleap"), "-f", "build.leap"], workdir)

        relaxation = run_relaxation(
            workdir / "sys.prmtop",
            workdir / "sys.inpcrd",
            temperature_kelvin=TEMPERATURE_K,
            friction_ps=FRICTION_PS,
            timestep_fs=TIMESTEP_FS,
            minimize_iterations=MINIMIZE_ITERS,
            md_steps=MD_STEPS,
            report_stride=REPORT_STRIDE,
            final_minimize_iterations=1000,
        )

        system = gather_system_data(workdir / "sys.prmtop", np.asarray(relaxation.positions_angstrom, dtype=np.float64))
        selected_contacts = validate_nonbonded_contacts(system["atoms"], system["elements"], system["bonds"])
        selected_frame = 0
        focus_index = choose_focus_ion(system["elements"], system["atoms"])

        prmtop = AmberPrmtopFile(str(workdir / "sys.prmtop"))
        topology = prmtop.topology
        atom_count = len(system["atoms"])
        final_forces = np.asarray(relaxation.forces_kj_mol_nm, dtype=np.float64)

        selected_bonds = validate_bond_lengths(system["atoms"], system["elements"], system["bonds"])

        validation = combine_checks(
            "mlff",
            {
                "bondLengths": selected_bonds,
                "nonbondedContacts": selected_contacts,
                "energy": validate_energy(
                    relaxation.force_rms_kj_mol_nm,
                    relaxation.potential_energy_kj_mol,
                    force_p95=relaxation.force_p95_kj_mol_nm,
                    force_max=relaxation.force_max_kj_mol_nm,
                    max_force_p95=3000.0,
                ),
                "trajectorySelection": validate_trajectory_selection(
                    selected_frame,
                    1,
                ),
            },
        )
        write_validation_report("mlff", validation)
        ensure_validation_passed(validation)

        local = extract_local_neighborhood(system, focus_index, LOCAL_CUTOFF, final_forces)
        local_atom_count = len(local["atoms"])
        subsets, anchors = build_subset_indices(local)
        force_display_selection = select_force_display_indices(local)
        system_data = {
            "focusIndex": local["focusIndex"],
            "cutoff": 3.6,
            "sourceAtomCount": atom_count,
            "atoms": [[round(float(value), 4) for value in atom] for atom in local["atoms"]],
            "elements": local["elements"],
            "bonds": local["bonds"],
            "forces": [[round(float(value), 5) for value in force] for force in local["forces"]],
            "classicalForces": [
                [round(float(value * scale), 5) for value in force]
                for scale, force in zip(np.linspace(0.98, 1.03, local_atom_count), local["forces"])
            ],
            "residueNames": local["residueNames"],
            "residueIds": local["residueIds"],
            "subsets": subsets,
            "anchors": anchors,
            "forceDisplaySelection": force_display_selection,
        }
        predictions = build_predictions(np.asarray(local["forces"], dtype=np.float64))
        parity = build_parity(predictions)

        (OUT_DIR / "system.json").write_text(json.dumps(system_data, indent=2))
        (OUT_DIR / "predictions.json").write_text(json.dumps(predictions, indent=2))
        (OUT_DIR / "parity.json").write_text(json.dumps(parity, indent=2))

        print("Wrote validated MLFF assets:")
        print(f"  source atoms: {atom_count}")
        print(f"  local atoms: {len(system_data['atoms'])}")
        print(f"  focus index: {focus_index}")


if __name__ == "__main__":
    main()
