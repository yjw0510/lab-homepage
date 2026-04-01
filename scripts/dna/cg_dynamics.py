"""Run CG Langevin dynamics for the linear polymer melt.

Produces an ultrafine trajectory (many frames) for smooth playback.
Uses PBC with the same force field as build_cg_melt.py.
"""

from __future__ import annotations

import math

import numpy as np
from openmm import (
    Context,
    CustomNonbondedForce,
    HarmonicAngleForce,
    HarmonicBondForce,
    LangevinMiddleIntegrator,
    LocalEnergyMinimizer,
    Platform,
    System,
    Vec3,
    unit,
)

TEMPERATURE = 300.0
FRICTION = 1.0
TIMESTEP = 0.005      # nm (5 fs)
TOTAL_STEPS = 200000  # shorter but dump more often
SAVE_EVERY = 400      # → 500 frames for smooth playback
# 500 frames × 8000 beads × 3 × 4 bytes = 46 MB (acceptable)


def build_cg_system_pbc(
    positions: np.ndarray,
    bonds: list[list[int]],
    box_dimensions: list[float],
    n_chains: int,
    beads_per_chain: int,
) -> System:
    n_beads = len(positions)
    system = System()
    for _ in range(n_beads):
        system.addParticle(100.0)

    bx, by, bz = box_dimensions
    system.setDefaultPeriodicBoxVectors(Vec3(bx, 0, 0), Vec3(0, by, 0), Vec3(0, 0, bz))

    bond_force = HarmonicBondForce()
    seen: set[tuple[int, int]] = set()
    box_arr = np.array(box_dimensions)
    for i, j in bonds:
        key = tuple(sorted((i, j)))
        if key in seen:
            continue
        seen.add(key)
        delta = positions[i] - positions[j]
        delta -= box_arr * np.round(delta / box_arr)
        dist = float(np.linalg.norm(delta))
        bond_force.addBond(i, j, dist, 400.0)
    bond_force.setUsesPeriodicBoundaryConditions(True)
    system.addForce(bond_force)

    angle_force = HarmonicAngleForce()
    for chain_i in range(n_chains):
        base = chain_i * beads_per_chain
        for k in range(beads_per_chain - 2):
            angle_force.addAngle(base + k, base + k + 1, base + k + 2, math.radians(170.0), 80.0)
    angle_force.setUsesPeriodicBoundaryConditions(True)
    system.addForce(angle_force)

    soft_nb = CustomNonbondedForce("epsilon*exp(-0.5*(r/sigma)^2)")
    soft_nb.addGlobalParameter("epsilon", 2.0)
    soft_nb.addGlobalParameter("sigma", 0.30)
    soft_nb.setNonbondedMethod(CustomNonbondedForce.CutoffPeriodic)
    soft_nb.setCutoffDistance(1.0)
    for _ in range(n_beads):
        soft_nb.addParticle([])
    for i, j in seen:
        soft_nb.addExclusion(i, j)
    for chain_i in range(n_chains):
        base = chain_i * beads_per_chain
        for k in range(beads_per_chain - 2):
            soft_nb.addExclusion(base + k, base + k + 2)
    system.addForce(soft_nb)

    return system


def run_cg_dynamics(
    positions: np.ndarray,
    bonds: list[list[int]],
    duplex_count: int,
    bp_per_duplex: int,
    box_dimensions: list[float] | None = None,
    *,
    total_steps: int = TOTAL_STEPS,
    save_every: int = SAVE_EVERY,
) -> np.ndarray:
    """Run CG dynamics, return trajectory in nm (same units as input)."""
    n_beads = len(positions)
    n_chains = duplex_count
    beads_per_chain = bp_per_duplex

    if box_dimensions is None:
        ext = positions.max(axis=0) - positions.min(axis=0)
        box_dimensions = [float(e * 1.1 + 2) for e in ext]

    system = build_cg_system_pbc(positions, bonds, box_dimensions, n_chains, beads_per_chain)

    integrator = LangevinMiddleIntegrator(
        TEMPERATURE * unit.kelvin, FRICTION / unit.picosecond, TIMESTEP * unit.picoseconds,
    )
    integrator.setRandomNumberSeed(20260330)

    context = Context(system, integrator, Platform.getPlatformByName("CPU"))
    # Shift from centered (±box/2) to box coords (0..box)
    shifted = positions.copy()
    for d in range(3):
        shifted[:, d] += box_dimensions[d] / 2
    context.setPositions(shifted * unit.nanometer)

    LocalEnergyMinimizer.minimize(context, 10.0, 200)
    integrator.step(5000)  # brief pre-equilibration

    n_frames = total_steps // save_every
    frames = np.zeros((n_frames, n_beads, 3), dtype=np.float32)
    box_arr = np.array(box_dimensions)

    for fi in range(n_frames):
        integrator.step(save_every)
        state = context.getState(getPositions=True)
        pos = np.array(state.getPositions(asNumpy=True).value_in_unit(unit.nanometer), dtype=np.float32)
        for d in range(3):
            pos[:, d] = pos[:, d] % box_arr[d] - box_arr[d] / 2
        frames[fi] = pos

    return frames


def validate_trajectory(
    frames: np.ndarray,
    bonds: list[list[int]],
    initial_positions: np.ndarray,
    box_dimensions: list[float] | None = None,
) -> None:
    n_frames = frames.shape[0]
    assert n_frames > 0
    box = np.array(box_dimensions) if box_dimensions else None
    for fi in [0, n_frames // 2, n_frames - 1]:
        pos = frames[fi]
        for i, j in bonds[:50]:
            delta = pos[i] - pos[j]
            if box is not None:
                delta -= box * np.round(delta / box)
            d = float(np.linalg.norm(delta))
            assert d < 5.0, f"Bond {i}-{j} = {d:.1f} nm at frame {fi}"


if __name__ == "__main__":
    from build_cg_melt import build_cg_melt
    print("Testing CG linear polymer dynamics (short)...")
    melt = build_cg_melt()
    frames = run_cg_dynamics(
        melt["positions"], melt["bead_bonds"],
        melt["duplex_count"], melt["bp_per_duplex"],
        melt.get("box_dimensions"),
        total_steps=2000, save_every=400,
    )
    print(f"  Trajectory: {frames.shape}")
    validate_trajectory(frames, melt["bead_bonds"], melt["positions"], melt.get("box_dimensions"))
    print("  ✓ OK")
