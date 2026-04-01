"""Compute CG bead positions from the MDNA-built all-atom structure.

Uses the canonical register: strand1[k] pairs with strand2[N-1-k].
Base-pair bead = midpoint of the two base-heavy-atom centroids.
Coordinates are in the same frame as the AA positions (nm, centered at origin).
"""
import json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "public" / "data" / "dna"

PURINE_BASES = {"DA", "DG"}
BASE_HEAVY = {
    "purine": {"N9", "C8", "N7", "C5", "C6", "N6", "O6", "N1", "C2", "N2", "N3", "C4"},
    "pyrimidine": {"N1", "C2", "O2", "N3", "C4", "N4", "O4", "C5", "C6", "C7"},
}


def main():
    pos = np.fromfile(DATA / "aa" / "positions.bin", dtype=np.float32).reshape(-1, 3)
    topo = json.load(open(DATA / "aa" / "topology.json"))
    n_atoms = len(topo["elements"])

    # Group atoms by (chain, resid)
    residues: dict[tuple[str, int], list[int]] = {}
    for i in range(n_atoms):
        key = (topo["chainIds"][i], topo["residueIds"][i])
        if key not in residues:
            residues[key] = []
        residues[key].append(i)

    # Separate chains
    chain0_keys = sorted([k for k in residues if k[0] == "0"], key=lambda k: k[1])
    chain1_keys = sorted([k for k in residues if k[0] == "1"], key=lambda k: k[1])
    print(f"  Chain 0: {len(chain0_keys)} residues, Chain 1: {len(chain1_keys)} residues")

    n_bp = min(len(chain0_keys), len(chain1_keys))

    def base_centroid(res_key: tuple[str, int]) -> np.ndarray:
        atoms = residues[res_key]
        resname = topo["residueNames"][atoms[0]]
        kind = "purine" if resname in PURINE_BASES else "pyrimidine"
        keep = BASE_HEAVY[kind]
        idx = [i for i in atoms if topo["atomNames"][i].strip() in keep]
        if not idx:
            idx = [i for i in atoms if topo["elements"][i] != "H"]
        if not idx:
            idx = atoms
        return pos[idx].mean(axis=0)

    # Canonical register: chain0[k] pairs with chain1[N-1-k] (antiparallel)
    bp_coms = np.zeros((n_bp, 3), dtype=np.float32)
    bp_atom_groups = []
    for k in range(n_bp):
        c0 = base_centroid(chain0_keys[k])
        c1 = base_centroid(chain1_keys[n_bp - 1 - k])
        bp_coms[k] = 0.5 * (c0 + c1)
        bp_atom_groups.append(residues[chain0_keys[k]] + residues[chain1_keys[n_bp - 1 - k]])

    consec = [float(np.linalg.norm(bp_coms[k + 1] - bp_coms[k])) for k in range(n_bp - 1)]
    pair_dists = [float(np.linalg.norm(
        base_centroid(chain0_keys[k]) - base_centroid(chain1_keys[n_bp - 1 - k])
    )) for k in range(n_bp)]

    print(f"  {n_bp} bp beads")
    print(f"  Consecutive: min={min(consec):.3f}, mean={np.mean(consec):.3f}, max={max(consec):.3f} nm")
    print(f"  Pair distances: min={min(pair_dists):.2f}, mean={np.mean(pair_dists):.2f}, max={max(pair_dists):.2f} nm")
    print(f"  Overlapping (< 0.2 nm): {sum(1 for d in consec if d < 0.2)}")

    bp_coms.tofile(DATA / "cg" / "bp_beads.bin")
    json.dump(
        {"nBP": n_bp, "bpAtomGroups": bp_atom_groups, "method": "MDNA_canonical_register_base_centroid_midpoint"},
        open(DATA / "cg" / "bp_mapping.json", "w"),
    )
    print(f"  Saved cg/bp_beads.bin ({bp_coms.nbytes} bytes)")


if __name__ == "__main__":
    print("Computing bp CG beads from MDNA AA structure...")
    main()
