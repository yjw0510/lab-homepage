"""Build a proper 36bp B-DNA by applying the helical screw transform to 1bna.

1. Load 1bna.pdb (12bp Dickerson dodecamer)
2. Compute helical axis from P-atom midpoints
3. Apply screw transform to generate 2 additional 12bp copies
4. Write combined PDB with proper chain/residue numbering
5. Add hydrogens with PDBFixer
6. Energy-minimize with OpenMM Amber14
7. Export minimized structure
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.spatial.transform import Rotation

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
PDB_PATH = SCRIPTS_DIR / "1bna.pdb"


def fire_minimize(simulation, max_iter=2000, f_tol=5.0, dt_start=0.001, dt_max=0.01):
    """FIRE (Fast Inertial Relaxation Engine) minimizer via OpenMM CustomIntegrator.

    More robust than L-BFGS for molecular systems with large initial forces
    (e.g., junction clashes). Adapts timestep and mixes velocity toward the
    force direction.

    Bitzek et al., PRL 97, 170201 (2006).
    """
    from openmm.openmm import CustomIntegrator
    from openmm import unit
    import copy

    n_atoms = simulation.topology.getNumAtoms()

    # FIRE parameters
    n_min = 5           # steps before dt increase
    f_inc = 1.1         # dt increase factor
    f_dec = 0.5         # dt decrease factor
    alpha_start = 0.1   # initial mixing parameter
    f_alpha = 0.99      # alpha decrease factor

    # Get initial state
    state = simulation.context.getState(getPositions=True, getVelocities=True, getForces=True)
    positions = state.getPositions(asNumpy=True).value_in_unit(unit.nanometer)
    forces = state.getForces(asNumpy=True).value_in_unit(unit.kilojoule_per_mole / unit.nanometer)
    velocities = np.zeros_like(positions)

    dt = dt_start  # ps
    alpha = alpha_start
    n_pos = 0  # steps since last P < 0
    masses = np.array([
        simulation.system.getParticleMass(i).value_in_unit(unit.dalton)
        for i in range(n_atoms)
    ])[:, np.newaxis]

    for step in range(max_iter):
        # Power: P = F · v
        P = np.sum(forces * velocities)

        if P > 0:
            # Mix velocity toward force direction
            f_norm = np.sqrt(np.sum(forces**2))
            v_norm = np.sqrt(np.sum(velocities**2))
            if f_norm > 1e-10:
                velocities = (1 - alpha) * velocities + alpha * (v_norm / f_norm) * forces
            n_pos += 1
            if n_pos > n_min:
                dt = min(dt * f_inc, dt_max)
                alpha *= f_alpha
        else:
            # Reset: zero velocity, decrease dt
            velocities[:] = 0
            dt *= f_dec
            alpha = alpha_start
            n_pos = 0

        # Velocity Verlet step
        velocities += 0.5 * dt * forces / masses
        positions += dt * velocities

        # Apply new positions, get new forces
        simulation.context.setPositions(positions * unit.nanometer)
        state = simulation.context.getState(getForces=True, getEnergy=True)
        forces = state.getForces(asNumpy=True).value_in_unit(unit.kilojoule_per_mole / unit.nanometer)

        velocities += 0.5 * dt * forces / masses

        # Check convergence: RMS force
        rms_f = np.sqrt(np.mean(forces**2))
        if step % 200 == 0:
            e = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
            print(f"      FIRE step {step}: E={e:.0f} kJ/mol, RMS force={rms_f:.1f}, dt={dt:.5f}")
        if rms_f < f_tol:
            e = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
            print(f"      FIRE converged at step {step}: E={e:.0f} kJ/mol, RMS force={rms_f:.2f}")
            return

    e = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
    print(f"      FIRE reached max_iter={max_iter}: E={e:.0f} kJ/mol, RMS force={rms_f:.2f}")


def build_36bp_dna(pdb_path: Path = PDB_PATH) -> dict:
    import MDAnalysis as mda
    from pdbfixer import PDBFixer
    from openmm.app import PDBFile, ForceField, Simulation, NoCutoff
    from openmm.openmm import LangevinMiddleIntegrator
    from openmm import unit

    # --- Load 1bna ---
    u = mda.Universe(str(pdb_path))
    dna = u.select_atoms("nucleic")
    chain_A = dna.select_atoms("segid A")
    chain_B = dna.select_atoms("segid B")
    print(f"  1bna: {dna.n_atoms} heavy atoms, chains A({chain_A.n_atoms}) + B({chain_B.n_atoms})")

    # --- Compute helical axis ---
    p_A = chain_A.select_atoms("name P").positions
    p_B = chain_B.select_atoms("name P").positions
    n_mid = min(len(p_A), len(p_B))
    midpoints = np.array([0.5 * (p_A[k] + p_B[-(k + 1)]) for k in range(n_mid)])
    center = midpoints.mean(axis=0)
    _, _, vh = np.linalg.svd(midpoints - center)
    axis = vh[0]
    if axis[2] < 0:
        axis = -axis

    # B-DNA helical parameters
    twist_deg = 360.0 / 10.5  # ~34.3°/bp
    rise = 3.32  # Å/bp

    def screw(positions: np.ndarray, n_steps: int) -> np.ndarray:
        shift = positions - center
        rot = Rotation.from_rotvec(np.radians(twist_deg * n_steps) * axis)
        return (rot.apply(shift) + center + axis * rise * n_steps).astype(np.float32)

    # --- Stack 3 copies ---
    pos_all = np.vstack([screw(dna.positions, -12), dna.positions, screw(dna.positions, +12)])
    pos_all -= pos_all.mean(axis=0)  # center at origin
    z_ext = float(pos_all[:, 2].max() - pos_all[:, 2].min())
    print(f"  3× stacked: {len(pos_all)} atoms, Z extent: {z_ext:.1f} Å")

    # --- Write PDB ---
    # Write all chain A residues (copies 0,1,2) as one continuous chain,
    # then TER, then all chain B. This ensures PDBFixer sees continuous
    # backbone and adds the missing P atoms at the copy junctions.
    lines = []
    idx = 1
    max_resid = int(max(chain_A.residues.resids.max(), chain_B.residues.resids.max()))

    for chain_label, chain_sel in [("A", chain_A), ("B", chain_B)]:
        for copy_i in range(3):
            for res in chain_sel.residues:
                new_resid = copy_i * max_resid + int(res.resid)
                for atom in res.atoms:
                    local_in_dna = int(np.where(dna.indices == atom.index)[0][0])
                    gi = copy_i * dna.n_atoms + local_in_dna
                    x, y, z = pos_all[gi]
                    name = atom.name
                    padded = f" {name:<3s}" if len(name) < 4 else name
                    lines.append(
                        f"ATOM  {idx:5d} {padded:4s} {res.resname:>3s} {chain_label}{new_resid:4d}    "
                        f"{x:8.3f}{y:8.3f}{z:8.3f}  1.00  0.00           {atom.element:>2s}"
                    )
                    idx += 1
        lines.append("TER")
    lines.append("END")

    raw_pdb = Path("/tmp/dna36_raw.pdb")
    raw_pdb.write_text("\n".join(lines))
    print(f"  Raw PDB: {idx - 1} atoms → {raw_pdb}")

    # --- PDBFixer: add H ---
    fixer = PDBFixer(filename=str(raw_pdb))
    fixer.findMissingResidues()
    fixer.findMissingAtoms()
    fixer.addMissingAtoms()
    fixer.addMissingHydrogens(7.0)
    n_total = fixer.topology.getNumAtoms()
    elems = Counter(a.element.symbol for a in fixer.topology.atoms())
    print(f"  With H: {n_total} atoms — {dict(elems)}")

    # --- Minimize ---
    # Use implicit solvent (GBn2) to screen electrostatics — prevents collapse
    # of the charged phosphate backbone in vacuum.
    print("  Minimizing with Amber14 + implicit solvent (GBn2)...")
    ff = ForceField("amber14-all.xml", "implicit/gbn2.xml")
    system = ff.createSystem(fixer.topology, nonbondedMethod=NoCutoff)
    integ = LangevinMiddleIntegrator(300 * unit.kelvin, 1 / unit.picosecond, 0.002 * unit.picoseconds)
    sim = Simulation(fixer.topology, system, integ)
    sim.context.setPositions(fixer.positions)

    state = sim.context.getState(getEnergy=True)
    e_before = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
    print(f"    Energy before: {e_before:.0f} kJ/mol")

    # Stage 1: L-BFGS to quickly resolve the worst clashes
    sim.minimizeEnergy(maxIterations=500)
    state = sim.context.getState(getEnergy=True)
    e_mid = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
    print(f"    After L-BFGS (500 iter): {e_mid:.0f} kJ/mol")

    # Stage 2: FIRE for robust final convergence (conservative dt for biomolecules)
    fire_minimize(sim, max_iter=2000, f_tol=5.0, dt_start=0.0002, dt_max=0.002)
    state = sim.context.getState(getEnergy=True, getPositions=True)
    e_after = state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole)
    pos_min = np.array(state.getPositions(asNumpy=True).value_in_unit(unit.angstrom), dtype=np.float32)
    ext = pos_min.max(axis=0) - pos_min.min(axis=0)
    br = float(np.linalg.norm(pos_min - pos_min.mean(axis=0), axis=1).max())
    print(f"    Energy after:  {e_after:.0f} kJ/mol")
    print(f"    Extent: {ext.round(1)} Å, bounding r: {br:.1f} Å")

    # Sanity: didn't blow up
    assert e_after < e_before, "Energy did not decrease"
    assert br < 200, f"Structure exploded: bounding r = {br:.1f} Å"
    assert ext[2] > 80, f"Z extent too short after minimization: {ext[2]:.1f} Å"

    # Save minimized PDB
    min_pdb = Path("/tmp/dna36_minimized.pdb")
    with open(min_pdb, "w") as f:
        PDBFile.writeFile(sim.topology, state.getPositions(), f)
    print(f"  ✓ Saved {min_pdb}")

    # Extract data for export
    elements = [a.element.symbol for a in sim.topology.atoms()]
    atom_names = [a.name for a in sim.topology.atoms()]
    residue_names = [a.residue.name for a in sim.topology.atoms()]
    residue_ids = [a.residue.index for a in sim.topology.atoms()]
    chain_ids = [a.residue.chain.id for a in sim.topology.atoms()]

    return {
        "positions": pos_min,
        "elements": elements,
        "atom_names": atom_names,
        "residue_names": residue_names,
        "residue_ids": residue_ids,
        "chain_ids": chain_ids,
        "n_atoms": len(pos_min),
        "topology": sim.topology,
        "pdb_path": str(min_pdb),
    }


if __name__ == "__main__":
    print("Building 36bp B-DNA...")
    result = build_36bp_dna()
    n = result["n_atoms"]
    elems = Counter(result["elements"])
    print(f"\nFinal: {n} atoms — {dict(elems)}")
    print(f"  H atoms: {elems.get('H', 0)} ({100*elems.get('H',0)/n:.1f}%)")
    assert elems.get("H", 0) > 0, "No hydrogens added!"
    print("  ✓ All checks passed")
