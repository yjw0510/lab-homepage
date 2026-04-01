"""Build atomistic DNA using MDNA and export for the visualization pipeline.

MDNA generates a proper 36bp antiparallel dsDNA duplex from sequence,
minimizes it, and exports PDB-compatible coordinates. CG mapping uses
the canonical register (strand1[k] pairs with strand2[N-1-k]) with
base-centroid midpoints as bead positions.
"""
from __future__ import annotations
from pathlib import Path
from typing import Any
import numpy as np

# Covalent radii in nm (converted from Å ÷ 10)
COVALENT_RADII = {"C": 0.077, "N": 0.070, "O": 0.066, "P": 0.107, "H": 0.031, "S": 0.105}
BOND_TOLERANCE = 0.045
PURINE_BASES = {"DA", "DG"}
BASE_HEAVY = {
    "purine": {"N9", "C8", "N7", "C5", "C6", "N6", "O6", "N1", "C2", "N2", "N3", "C4"},
    "pyrimidine": {"N1", "C2", "O2", "N3", "C4", "N4", "O4", "C5", "C6", "C7"},
}
SEQUENCE = "CGCGAATTCGCGCGCGAATTCGCGCGCGAATTCGCG"


def infer_bonds(positions: np.ndarray, elements: list[str]) -> list[list[int]]:
    n = len(positions)
    bonds = []
    for i in range(n):
        ri = COVALENT_RADII.get(elements[i], 0.77)
        for j in range(i + 1, n):
            rj = COVALENT_RADII.get(elements[j], 0.77)
            if np.linalg.norm(positions[i] - positions[j]) < ri + rj + BOND_TOLERANCE:
                bonds.append([i, j])
    return bonds


def extract_atomistic_data(**_kwargs: Any) -> dict[str, Any]:
    """Build 36bp dsDNA with MDNA and extract all data for the pipeline."""
    import mdna

    print(f"  Building {len(SEQUENCE)}bp dsDNA with MDNA...")
    dna = mdna.make(sequence=SEQUENCE)
    dna.minimize()
    traj = dna.get_traj()

    pos_nm = traj.xyz[0].astype(np.float32)  # keep in nm
    center = pos_nm.mean(axis=0)
    positions = pos_nm - center

    elements = [a.element.symbol for a in traj.topology.atoms]
    atom_names = [a.name for a in traj.topology.atoms]
    residue_names = [a.residue.name for a in traj.topology.atoms]
    residue_ids = [a.residue.resSeq for a in traj.topology.atoms]
    chain_ids = [str(a.residue.chain.index) for a in traj.topology.atoms]

    print(f"  {len(positions)} atoms, {traj.n_residues} residues, {traj.n_chains} chains")

    bonds = infer_bonds(positions, elements)
    print(f"  {len(bonds)} bonds")

    # CG mapping: canonical register
    chains = list(traj.topology.chains)
    strand1 = list(chains[0].residues)
    strand2 = list(chains[1].residues)
    pairs = list(zip(strand1, reversed(strand2)))

    def base_centroid(residue):
        kind = "purine" if residue.name in PURINE_BASES else "pyrimidine"
        keep = BASE_HEAVY[kind]
        idx = [a.index for a in residue.atoms if a.name.strip() in keep]
        if not idx:
            idx = [a.index for a in residue.atoms if a.element.symbol != "H"]
        return positions[idx].mean(axis=0)

    cg_bead_positions = np.array(
        [0.5 * (base_centroid(r1) + base_centroid(r2)) for r1, r2 in pairs],
        dtype=np.float32,
    )
    monomer_map = [[a.index for a in r1.atoms] + [a.index for a in r2.atoms] for r1, r2 in pairs]
    cg_mapping = [
        {"bead_id": k, "chain": "A", "resname": pairs[k][0].name, "resid": k, "atom_indices": monomer_map[k]}
        for k in range(len(pairs))
    ]

    consec = [float(np.linalg.norm(cg_bead_positions[k + 1] - cg_bead_positions[k])) for k in range(len(cg_bead_positions) - 1)]
    print(f"  CG: {len(cg_bead_positions)} beads, consecutive: min={min(consec):.2f}, mean={np.mean(consec):.2f}, max={max(consec):.2f} Å")

    return {
        "positions": positions,
        "elements": elements,
        "atom_names": atom_names,
        "bonds": bonds,
        "residue_names": residue_names,
        "residue_ids": residue_ids,
        "chain_ids": chain_ids,
        "cg_mapping": cg_mapping,
        "cg_bead_positions": cg_bead_positions,
        "monomer_map": monomer_map,
    }


if __name__ == "__main__":
    print("Testing MDNA adapter...")
    data = extract_atomistic_data()
    assert len(data["positions"]) > 1000
    assert len(data["bonds"]) > 1000
    assert len(data["cg_bead_positions"]) == 36
    print("  ✓ All checks passed")
