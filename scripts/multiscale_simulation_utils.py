"""Shared simulation helpers for multiscale-stage data generation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from openmm import LangevinMiddleIntegrator, Platform, unit
from openmm.app import AmberInpcrdFile, AmberPrmtopFile, HBonds, PDBFile, PME, Simulation


@dataclass
class RelaxationResult:
    positions_angstrom: np.ndarray
    forces_kj_mol_nm: np.ndarray
    potential_energy_kj_mol: float
    force_rms_kj_mol_nm: float
    force_p95_kj_mol_nm: float
    force_max_kj_mol_nm: float
    trajectory_angstrom: list[np.ndarray]


def random_rotation_matrix(rng: np.random.Generator) -> np.ndarray:
    u1, u2, u3 = rng.random(3)
    q1 = math.sqrt(1 - u1) * math.sin(2 * math.pi * u2)
    q2 = math.sqrt(1 - u1) * math.cos(2 * math.pi * u2)
    q3 = math.sqrt(u1) * math.sin(2 * math.pi * u3)
    q4 = math.sqrt(u1) * math.cos(2 * math.pi * u3)
    return np.asarray(
        [
            [1 - 2 * (q3 * q3 + q4 * q4), 2 * (q2 * q3 - q1 * q4), 2 * (q2 * q4 + q1 * q3)],
            [2 * (q2 * q3 + q1 * q4), 1 - 2 * (q2 * q2 + q4 * q4), 2 * (q3 * q4 - q1 * q2)],
            [2 * (q2 * q4 - q1 * q3), 2 * (q3 * q4 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3)],
        ],
        dtype=np.float64,
    )


def apply_transform(points: np.ndarray, rotation: np.ndarray, translation: Iterable[float]) -> np.ndarray:
    translated = points @ rotation.T
    return translated + np.asarray(list(translation), dtype=np.float64)


def run_relaxation(
    prmtop_path: Path,
    inpcrd_path: Path,
    *,
    temperature_kelvin: float,
    friction_ps: float,
    timestep_fs: float,
    minimize_iterations: int,
    md_steps: int,
    report_stride: int,
    final_minimize_iterations: int = 1000,
) -> RelaxationResult:
    prmtop = AmberPrmtopFile(str(prmtop_path))
    inpcrd = AmberInpcrdFile(str(inpcrd_path))
    system = prmtop.createSystem(
        nonbondedMethod=PME,
        nonbondedCutoff=1.0 * unit.nanometer,
        constraints=HBonds,
        rigidWater=True,
        ewaldErrorTolerance=1e-4,
    )
    integrator = LangevinMiddleIntegrator(
        temperature_kelvin * unit.kelvin,
        friction_ps / unit.picosecond,
        timestep_fs * unit.femtoseconds,
    )
    simulation = Simulation(prmtop.topology, system, integrator, Platform.getPlatformByName("CPU"))
    simulation.context.setPositions(inpcrd.positions)
    if inpcrd.boxVectors is not None:
        simulation.context.setPeriodicBoxVectors(*inpcrd.boxVectors)

    simulation.minimizeEnergy(maxIterations=minimize_iterations)

    trajectory: list[np.ndarray] = []
    if md_steps > 0:
        simulation.context.setVelocitiesToTemperature(temperature_kelvin * unit.kelvin)
        for step in range(0, md_steps, report_stride):
            simulation.step(min(report_stride, md_steps - step))
            state = simulation.context.getState(getPositions=True)
            coords = state.getPositions(asNumpy=True).value_in_unit(unit.angstrom)
            trajectory.append(np.asarray(coords, dtype=np.float64))

    if final_minimize_iterations > 0:
        simulation.minimizeEnergy(maxIterations=final_minimize_iterations)

    final_state = simulation.context.getState(getPositions=True, getEnergy=True, getForces=True)
    positions = np.asarray(final_state.getPositions(asNumpy=True).value_in_unit(unit.angstrom), dtype=np.float64)
    forces = np.asarray(final_state.getForces(asNumpy=True).value_in_unit(unit.kilojoule_per_mole / unit.nanometer), dtype=np.float64)
    force_rms = float(np.sqrt(np.mean(np.sum(forces * forces, axis=1))))
    force_norms = np.linalg.norm(forces, axis=1)
    force_p95 = float(np.percentile(force_norms, 95))
    force_max = float(force_norms.max())
    potential = float(final_state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole))
    return RelaxationResult(
        positions_angstrom=positions,
        forces_kj_mol_nm=forces,
        potential_energy_kj_mol=potential,
        force_rms_kj_mol_nm=force_rms,
        force_p95_kj_mol_nm=force_p95,
        force_max_kj_mol_nm=force_max,
        trajectory_angstrom=trajectory,
    )


def save_pdb_from_positions(prmtop_path: Path, positions_angstrom: np.ndarray, out_path: Path) -> None:
    prmtop = AmberPrmtopFile(str(prmtop_path))
    with out_path.open("w") as handle:
        PDBFile.writeFile(prmtop.topology, positions_angstrom * unit.angstrom, handle, keepIds=True)
