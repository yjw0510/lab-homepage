"""Build a proper 36bp all-atom dsDNA using MDNA and export for the visualization pipeline.

MDNA generates a correct antiparallel duplex from sequence, minimizes it,
and exports PDB. We then extract positions, topology, bonds, and CG bead
mapping using the canonical register (strand1[k] pairs with strand2[N-1-k]).
"""
from __future__ import annotations

import json
from pathlib import Path
from collections import defaultdict

import numpy as np

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
ROOT = SCRIPTS_DIR.parent
DATA = ROOT / "public" / "data" / "dna"

SEQUENCE = "CGCGAATTCGCGCGCGAATTCGCGCGCGAATTCGCG"  # 36 bp

PURINE_BASES = {"DA", "DG"}
BASE_HEAVY = {
    "purine": {"N9", "C8", "N7", "C5", "C6", "N6", "O6", "N1", "C2", "N2", "N3", "C4"},
    "pyrimidine": {"N1", "C2", "O2", "N3", "C4", "N4", "O4", "C5", "C6", "C7"},
}

COVALENT_RADII = {"C": 0.77, "N": 0.70, "O": 0.66, "P": 1.07, "H": 0.31, "S": 1.05}
BOND_TOLERANCE = 0.45


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


def build_and_export():
    import mdna
    import mdtraj as md

    print(f"  Building {len(SEQUENCE)}bp dsDNA with MDNA...")
    dna = mdna.make(sequence=SEQUENCE)
    dna.minimize()

    pdb_path = Path("/tmp/dna_mdna.pdb")
    dna.save_pdb(str(pdb_path))
    traj = dna.get_traj()

    pos_nm = traj.xyz[0]  # nm
    pos_ang = (pos_nm * 10).astype(np.float32)  # Å
    center = pos_ang.mean(axis=0)
    pos_centered = pos_ang - center

    n_atoms = traj.n_atoms
    elements = [a.element.symbol for a in traj.topology.atoms]
    atom_names = [a.name for a in traj.topology.atoms]
    residue_names = [a.residue.name for a in traj.topology.atoms]
    residue_ids = [a.residue.resSeq for a in traj.topology.atoms]
    chain_ids = [str(a.residue.chain.index) for a in traj.topology.atoms]

    print(f"  {n_atoms} atoms, {traj.n_residues} residues, {traj.n_chains} chains")
    from collections import Counter
    print(f"  Elements: {dict(Counter(elements))}")

    # Infer bonds
    print("  Inferring bonds...")
    bonds = infer_bonds(pos_centered, elements)
    print(f"  {len(bonds)} bonds")

    # --- CG mapping: canonical register ---
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
        return pos_centered[idx].mean(axis=0)

    bp_coms = np.array([0.5 * (base_centroid(r1) + base_centroid(r2)) for r1, r2 in pairs], dtype=np.float32)
    bp_atom_groups = []
    for r1, r2 in pairs:
        atoms1 = [a.index for a in r1.atoms]
        atoms2 = [a.index for a in r2.atoms]
        bp_atom_groups.append(atoms1 + atoms2)

    consec = [float(np.linalg.norm(bp_coms[k + 1] - bp_coms[k])) for k in range(len(bp_coms) - 1)]
    print(f"  CG beads: {len(bp_coms)}, consecutive: min={min(consec):.2f}, mean={np.mean(consec):.2f}, max={max(consec):.2f} Å")
    print(f"  Overlapping: {sum(1 for d in consec if d < 2)}, Gaps: {sum(1 for d in consec if d > 8)}")

    # --- Export ---
    aa_dir = DATA / "aa"
    cg_dir = DATA / "cg"
    aa_dir.mkdir(parents=True, exist_ok=True)
    cg_dir.mkdir(parents=True, exist_ok=True)

    pos_centered.tofile(aa_dir / "positions.bin")
    json.dump({
        "elements": elements,
        "bonds": bonds,
        "atomNames": atom_names,
        "residueNames": residue_names,
        "residueIds": residue_ids,
        "chainIds": chain_ids,
    }, open(aa_dir / "topology.json", "w"))

    bp_coms.tofile(cg_dir / "bp_beads.bin")
    json.dump({
        "nBP": len(bp_coms),
        "bpAtomGroups": bp_atom_groups,
        "method": "MDNA_canonical_register_base_centroid_midpoint",
    }, open(cg_dir / "bp_mapping.json", "w"))

    print(f"  Saved aa/positions.bin ({pos_centered.nbytes} bytes)")
    print(f"  Saved aa/topology.json")
    print(f"  Saved cg/bp_beads.bin ({bp_coms.nbytes} bytes)")
    print(f"  Saved cg/bp_mapping.json")

    return {
        "positions": pos_centered,
        "elements": elements,
        "atom_names": atom_names,
        "bonds": bonds,
        "residue_names": residue_names,
        "residue_ids": residue_ids,
        "chain_ids": chain_ids,
        "cg_mapping": [{"bead_id": k, "chain": "A", "resname": "", "resid": k, "atom_indices": bp_atom_groups[k]} for k in range(len(bp_coms))],
        "cg_bead_positions": bp_coms,
        "monomer_map": bp_atom_groups,
    }


if __name__ == "__main__":
    print("Building 36bp dsDNA with MDNA...")
    data = build_and_export()
    n = len(data["positions"])
    assert n > 1000, f"Expected >1000 atoms, got {n}"
    # MDNA exports heavy atoms only; H can be added later with PDBFixer if needed
    assert len(data["bonds"]) > 1000, f"Too few bonds: {len(data['bonds'])}"
    print("  ✓ All checks passed")
