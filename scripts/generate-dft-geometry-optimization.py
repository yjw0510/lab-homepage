#!/usr/bin/env python3
"""Generate a reproducible DFT geometry-optimization trajectory for D2."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from ase import Atoms
from ase.calculators.calculator import Calculator, all_changes
from ase.io.trajectory import Trajectory
from ase.optimize import BFGS
from ase.units import Bohr, Hartree
from pyscf import dft, gto, lib
from scipy.spatial.transform import Rotation


class PySCFB3LYPCalculator(Calculator):
    implemented_properties = ["energy", "forces"]

    def __init__(self) -> None:
        super().__init__()
        self._density_matrix: np.ndarray | None = None

    def calculate(
        self,
        atoms: Atoms | None = None,
        properties: list[str] | None = None,
        system_changes: list[str] | None = None,
    ) -> None:
        super().calculate(atoms, properties, system_changes or all_changes)
        if self.atoms is None:
            raise RuntimeError("PySCF calculator requires an ASE Atoms object.")

        molecule = gto.M(
            atom=[
                (symbol, tuple(position))
                for symbol, position in zip(
                    self.atoms.get_chemical_symbols(),
                    self.atoms.get_positions(),
                    strict=True,
                )
            ],
            basis="6-31g*",
            unit="Angstrom",
            charge=0,
            spin=0,
            verbose=0,
        )
        mean_field = dft.RKS(molecule).density_fit()
        mean_field.xc = "b3lyp"
        mean_field.grids.level = 1
        mean_field.conv_tol = 1e-8
        mean_field.max_cycle = 80

        energy_hartree = mean_field.kernel(dm0=self._density_matrix)
        if not mean_field.converged:
            raise RuntimeError("PySCF SCF did not converge during geometry optimization.")

        self._density_matrix = mean_field.make_rdm1()
        gradient_hartree_per_bohr = mean_field.nuc_grad_method().kernel()
        forces_ev_per_angstrom = -gradient_hartree_per_bohr * Hartree / Bohr

        self.results = {
            "energy": float(energy_hartree * Hartree),
            "forces": np.asarray(forces_ev_per_angstrom),
        }


def distort_initial_geometry(coordinates: np.ndarray) -> np.ndarray:
    """Apply a visible, coherent warp while preserving the molecular graph."""

    distorted = np.asarray(coordinates, dtype=float).copy()
    distorted -= distorted.mean(axis=0)

    x = distorted[:, 0].copy()
    y = distorted[:, 1].copy()

    distorted[:, 0] = 1.09 * x + 0.07 * y
    distorted[:, 1] = 0.91 * y
    distorted[:, 2] += 0.88 * np.sin(0.72 * x) + 0.44 * np.cos(0.58 * y)

    radial = np.sqrt(x * x + y * y)
    peripheral = radial > np.quantile(radial, 0.72)
    distorted[peripheral, 2] += 0.36 * np.sign(x[peripheral] + 0.2)
    return distorted


def align_frames(frames: list[dict[str, object]], elements: list[str]) -> None:
    final_coordinates = np.asarray(frames[-1]["atoms"], dtype=float)
    heavy = np.asarray([element != "H" for element in elements])
    final_center = final_coordinates[heavy].mean(axis=0)
    final_reference = final_coordinates[heavy] - final_center

    for frame in frames:
        coordinates = np.asarray(frame["atoms"], dtype=float)
        forces = np.asarray(frame["forcesEvA"], dtype=float)
        center = coordinates[heavy].mean(axis=0)
        mobile_reference = coordinates[heavy] - center
        rotation, _ = Rotation.align_vectors(final_reference, mobile_reference)
        frame["atoms"] = np.round(rotation.apply(coordinates - center), 6).tolist()
        frame["forcesEvA"] = np.round(rotation.apply(forces), 6).tolist()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=12)
    parser.add_argument("--fmax", type=float, default=0.08)
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("public/data/multiscale/allatom/molecule.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/multiscale/dft/geometry-optimization.json"),
    )
    parser.add_argument(
        "--trajectory",
        type=Path,
        default=Path("artifacts/dft-geometry-optimization.traj"),
    )
    parser.add_argument(
        "--reuse-trajectory",
        action="store_true",
        help="Build the JSON asset from an existing ASE trajectory without rerunning DFT.",
    )
    parser.add_argument(
        "--resume-trajectory",
        action="store_true",
        help="Continue optimization from the final frame of an existing ASE trajectory.",
    )
    args = parser.parse_args()

    lib.num_threads(4)
    source = json.loads(args.source.read_text())
    elements = list(source["elements"])
    initial_coordinates = distort_initial_geometry(np.asarray(source["atoms"], dtype=float))

    frames: list[dict[str, object]] = []

    def append_frame(frame_atoms: Atoms) -> None:
        energy_ev = float(frame_atoms.get_potential_energy())
        forces = np.asarray(frame_atoms.get_forces(), dtype=float)
        coordinates = np.asarray(frame_atoms.get_positions(), dtype=float)
        if frames and np.allclose(coordinates, np.asarray(frames[-1]["atoms"]), atol=1e-10):
            return
        magnitudes = np.linalg.norm(forces, axis=1)
        frames.append(
            {
                "iteration": len(frames),
                "energyHa": energy_ev / Hartree,
                "energyEv": energy_ev,
                "maxForceEvA": float(magnitudes.max()),
                "rmsForceEvA": float(np.sqrt(np.mean(magnitudes * magnitudes))),
                "atoms": coordinates.tolist(),
                "forcesEvA": forces.tolist(),
            }
        )
        print(
            f"iter={len(frames) - 1:02d} "
            f"E={energy_ev / Hartree:.10f} Ha "
            f"max|F|={magnitudes.max():.5f} eV/A",
            flush=True,
        )

    historical_frames = list(Trajectory(str(args.trajectory), mode="r")) if (
        args.reuse_trajectory or args.resume_trajectory
    ) else []

    if args.reuse_trajectory:
        for frame_atoms in historical_frames:
            append_frame(frame_atoms)
    else:
        if args.resume_trajectory:
            for frame_atoms in historical_frames:
                append_frame(frame_atoms)
            atoms = historical_frames[-1].copy()
            trajectory_path = args.trajectory.with_name(
                f"{args.trajectory.stem}-resume{args.trajectory.suffix}"
            )
        else:
            atoms = Atoms(symbols=elements, positions=initial_coordinates)
            trajectory_path = args.trajectory
        atoms.calc = PySCFB3LYPCalculator()
        optimizer = BFGS(
            atoms,
            trajectory=str(trajectory_path),
            logfile="-",
            maxstep=0.14,
        )
        optimizer.attach(lambda: append_frame(atoms), interval=1)
        optimizer.run(fmax=args.fmax, steps=args.steps)
        append_frame(atoms)

    align_frames(frames, elements)
    minimum_energy = min(float(frame["energyHa"]) for frame in frames)
    initial_energy = float(frames[0]["energyHa"])
    hartree_to_kcal_mol = 627.509474
    for frame in frames:
        energy_hartree = float(frame["energyHa"])
        frame["relativeEnergyKcalMol"] = (
            energy_hartree - minimum_energy
        ) * hartree_to_kcal_mol
        frame["energyDropKcalMol"] = (
            energy_hartree - initial_energy
        ) * hartree_to_kcal_mol

    output = {
        "system": "caffeine",
        "formula": "C8H10N4O2",
        "method": "RKS/B3LYP",
        "basis": "6-31G*",
        "engine": "PySCF 2.12.1",
        "densityFitting": True,
        "integrationGridLevel": 1,
        "optimizer": "ASE BFGS",
        "maximumStepAngstrom": 0.14,
        "targetMaxForceEvA": args.fmax,
        "initialDistortion": {
            "description": "Anisotropic in-plane strain plus a coherent out-of-plane warp.",
            "maximumDisplacementAngstrom": float(
                np.linalg.norm(
                    initial_coordinates - np.asarray(source["atoms"], dtype=float),
                    axis=1,
                ).max()
            ),
        },
        "converged": bool(frames[-1]["maxForceEvA"] <= args.fmax),
        "elements": elements,
        "bonds": source["bonds"],
        "bondOrders": source.get("bondOrders", [1.0] * len(source["bonds"])),
        "frames": frames,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(f"Wrote {len(frames)} frames to {args.output}", flush=True)


if __name__ == "__main__":
    main()
