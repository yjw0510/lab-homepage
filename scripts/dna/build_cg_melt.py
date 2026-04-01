"""Build a CG linear polymer melt: 80-bead chains in a PBC box, NPT equilibrated.

Each chain = one 80-bead linear polymer (one bead per base pair).
No duplex structure — this is a CG representation where the double helix
has been coarse-grained into a single backbone chain.

100 chains × 80 beads = 8000 beads total.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
from openmm import (
    Context,
    CustomNonbondedForce,
    HarmonicAngleForce,
    HarmonicBondForce,
    LangevinMiddleIntegrator,
    LocalEnergyMinimizer,
    MonteCarloBarostat,
    Platform,
    System,
    Vec3,
    unit,
)

RNG = np.random.default_rng(42)

N_CHAINS = 100
BEADS_PER_CHAIN = 80    # one bead per bp, linear chain
BOND_LENGTH = 0.34      # nm (3.4 Å B-DNA rise per bp)
BOND_K = 400.0          # kJ/mol/nm²
ANGLE_THETA0 = 170.0    # degrees (nearly straight, slight flexibility)
ANGLE_K = 80.0          # kJ/mol/rad²

INITIAL_BOX_SIDE = 25.0   # nm (250 Å)
TEMPERATURE = 300.0        # K
PRESSURE = 1.0             # atm
NPT_EQUIL_STEPS = 50000


def normalize(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    return v / n if n > 1e-8 else np.array([0, 0, 1.0])


def build_single_chain(center: np.ndarray, direction: np.ndarray) -> np.ndarray:
    """Build one 80-bead linear chain along a random direction."""
    positions = np.zeros((BEADS_PER_CHAIN, 3))
    tangent = normalize(direction)
    current = center - tangent * (BOND_LENGTH * (BEADS_PER_CHAIN - 1) * 0.5)

    for k in range(BEADS_PER_CHAIN):
        positions[k] = current
        if k < BEADS_PER_CHAIN - 1:
            tangent = normalize(tangent + RNG.normal(scale=0.05, size=3))
            current = current + tangent * BOND_LENGTH

    return positions


def pack_chains(box_side: float) -> tuple[np.ndarray, list[list[int]]]:
    """Place N_CHAINS linear chains at random positions in a PBC box."""
    all_positions = []
    all_bonds = []
    offset = 0

    for _ in range(N_CHAINS):
        center = RNG.uniform(0, box_side, size=3)
        direction = normalize(RNG.normal(size=3))
        chain_pos = build_single_chain(center, direction)
        chain_pos = chain_pos % box_side  # wrap into box

        all_positions.append(chain_pos)
        for k in range(BEADS_PER_CHAIN - 1):
            all_bonds.append([offset + k, offset + k + 1])
        offset += BEADS_PER_CHAIN

    return np.vstack(all_positions), all_bonds


def build_openmm_system(positions: np.ndarray, bonds: list[list[int]], box_side: float) -> System:
    """Build OpenMM system: harmonic bonds, angle stiffness, soft repulsion, barostat."""
    n_beads = len(positions)
    system = System()
    for _ in range(n_beads):
        system.addParticle(100.0)  # CG mass in amu

    box_nm = box_side
    system.setDefaultPeriodicBoxVectors(
        Vec3(box_nm, 0, 0), Vec3(0, box_nm, 0), Vec3(0, 0, box_nm),
    )

    # Harmonic bonds
    bond_force = HarmonicBondForce()
    seen: set[tuple[int, int]] = set()
    for i, j in bonds:
        key = tuple(sorted((i, j)))
        if key in seen:
            continue
        seen.add(key)
        delta = positions[i] - positions[j]
        delta -= box_side * np.round(delta / box_side)
        dist = float(np.linalg.norm(delta))
        bond_force.addBond(i, j, dist, BOND_K)
    bond_force.setUsesPeriodicBoundaryConditions(True)
    system.addForce(bond_force)

    # Angle stiffness for chain stiffness
    angle_force = HarmonicAngleForce()
    for chain_i in range(N_CHAINS):
        base = chain_i * BEADS_PER_CHAIN
        for k in range(BEADS_PER_CHAIN - 2):
            angle_force.addAngle(
                base + k, base + k + 1, base + k + 2,
                math.radians(ANGLE_THETA0),
                ANGLE_K,
            )
    angle_force.setUsesPeriodicBoundaryConditions(True)
    system.addForce(angle_force)

    # Soft Gaussian repulsion
    soft_nb = CustomNonbondedForce("epsilon*exp(-0.5*(r/sigma)^2)")
    soft_nb.addGlobalParameter("epsilon", 2.0)
    soft_nb.addGlobalParameter("sigma", 0.30)  # nm
    soft_nb.setNonbondedMethod(CustomNonbondedForce.CutoffPeriodic)
    soft_nb.setCutoffDistance(1.0)
    for _ in range(n_beads):
        soft_nb.addParticle([])
    for i, j in seen:
        soft_nb.addExclusion(i, j)
    # 1-3 exclusions along chains
    for chain_i in range(N_CHAINS):
        base = chain_i * BEADS_PER_CHAIN
        for k in range(BEADS_PER_CHAIN - 2):
            soft_nb.addExclusion(base + k, base + k + 2)
    system.addForce(soft_nb)

    # Barostat
    system.addForce(MonteCarloBarostat(PRESSURE * unit.atmospheres, TEMPERATURE * unit.kelvin, 25))

    return system


def build_cg_melt() -> dict[str, Any]:
    """Build and NPT-equilibrate a CG linear polymer melt."""
    box_side = INITIAL_BOX_SIDE
    n_beads = N_CHAINS * BEADS_PER_CHAIN
    print(f"  Packing {N_CHAINS} × {BEADS_PER_CHAIN}-bead linear chains in {box_side:.0f} nm box...")

    positions, bonds = pack_chains(box_side)
    print(f"  {n_beads} beads, {len(bonds)} bonds")

    system = build_openmm_system(positions, bonds, box_side)

    integrator = LangevinMiddleIntegrator(
        TEMPERATURE * unit.kelvin, 1.0 / unit.picosecond, 0.005 * unit.picoseconds,
    )
    integrator.setRandomNumberSeed(20260330)

    context = Context(system, integrator, Platform.getPlatformByName("CPU"))
    context.setPositions(positions * unit.nanometer)

    print("  Energy minimization...")
    LocalEnergyMinimizer.minimize(context, 10.0, 500)

    print(f"  NPT equilibration ({NPT_EQUIL_STEPS} steps)...")
    integrator.step(NPT_EQUIL_STEPS)

    state = context.getState(getPositions=True)
    final_pos = np.array(state.getPositions(asNumpy=True).value_in_unit(unit.nanometer), dtype=np.float32)

    box_vecs = state.getPeriodicBoxVectors()
    final_box = [
        float(box_vecs[0][0].value_in_unit(unit.nanometer)),
        float(box_vecs[1][1].value_in_unit(unit.nanometer)),
        float(box_vecs[2][2].value_in_unit(unit.nanometer)),
    ]
    print(f"  Final box: {[round(b, 2) for b in final_box]} nm")

    # Wrap and center
    for d in range(3):
        final_pos[:, d] = final_pos[:, d] % final_box[d] - final_box[d] / 2

    # Subsets and anchors
    bundle_center = final_pos.mean(axis=0)
    ref_idx = int(np.argmin(np.linalg.norm(final_pos - bundle_center, axis=1)))

    subsets = {
        "all_beads": {"indices": list(range(n_beads))},
        "bundle_overview": {"indices": list(range(n_beads))},
    }
    anchors = {
        "bundle_center": [round(float(v), 4) for v in bundle_center],
        "pair_reference_center": [round(float(v), 4) for v in final_pos[ref_idx]],
    }

    # Chain IDs (one per chain, no duplex/strand distinction)
    chain_ids = []
    for c in range(N_CHAINS):
        chain_ids.extend([c] * BEADS_PER_CHAIN)

    return {
        "positions": final_pos,
        "bead_bonds": bonds,
        "duplex_ids": chain_ids,      # reuse field name for per-chain coloring
        "strand_ids": chain_ids,       # same as chain_ids (no strands in linear CG)
        "base_pair_ids": list(range(n_beads)),
        "paired_indices": list(range(n_beads)),
        "strand_positions": [k % BEADS_PER_CHAIN for k in range(n_beads)],
        "subsets": subsets,
        "anchors": anchors,
        "reference_index": ref_idx,
        "duplex_count": N_CHAINS,
        "bp_per_duplex": BEADS_PER_CHAIN,
        "box_dimensions": final_box,
    }


if __name__ == "__main__":
    print("Testing CG linear polymer melt (PBC + NPT)...")
    data = build_cg_melt()
    n = len(data["positions"])
    expected = N_CHAINS * BEADS_PER_CHAIN
    assert n == expected, f"Expected {expected} beads, got {n}"
    assert len(data["bead_bonds"]) == N_CHAINS * (BEADS_PER_CHAIN - 1)
    print(f"  {n} beads, {len(data['bead_bonds'])} bonds, box {data['box_dimensions']}")
    print("  ✓ All checks passed.")
