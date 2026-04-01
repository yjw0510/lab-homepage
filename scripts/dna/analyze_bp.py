"""Purely topological bp assignment: trace backbone graph, identify 5' ends, pair antiparallel."""
import json, numpy as np
from collections import defaultdict

aa_pos = np.fromfile("public/data/dna/aa/positions.bin", dtype=np.float32).reshape(-1, 3)
topo = json.load(open("public/data/dna/aa/topology.json"))
center = aa_pos.mean(axis=0)
centered = aa_pos - center

# Build atom bond graph
atom_adj = defaultdict(set)
for i, j in topo["bonds"]:
    atom_adj[i].add(j)
    atom_adj[j].add(i)

# Group atoms by residue
res_of_atom = {}
atoms_of_res = defaultdict(list)
for i in range(len(topo["elements"])):
    key = (topo["chainIds"][i], topo["residueIds"][i])
    res_of_atom[i] = key
    atoms_of_res[key].append(i)

# Residue backbone graph (inter-residue same-chain bonds)
res_adj = defaultdict(set)
for i, j in topo["bonds"]:
    ri, rj = res_of_atom[i], res_of_atom[j]
    if ri != rj and ri[0] == rj[0]:
        res_adj[ri].add(rj)
        res_adj[rj].add(ri)

def trace(start, chain_id):
    path = [start]
    visited = {start}
    cur = start
    while True:
        nexts = [n for n in res_adj[cur] if n not in visited and n[0] == chain_id]
        if not nexts:
            break
        cur = nexts[0]
        visited.add(cur)
        path.append(cur)
    return path

def heavy_com(res_key):
    atoms = atoms_of_res[res_key]
    heavy = [i for i in atoms if topo["elements"][i] != "H"]
    if not heavy:
        heavy = atoms
    return centered[heavy].mean(axis=0)

# Find ends and identify 5' (no P) vs 3' (has P)
paths = {}
for chain_id in ["A", "B"]:
    chain_res = [r for r in res_adj if r[0] == chain_id]
    ends = [r for r in chain_res if len([n for n in res_adj[r] if n[0] == chain_id]) == 1]
    for end in ends:
        has_P = any(topo["atomNames"][i] == "P" for i in atoms_of_res[end])
        label = "3-prime" if has_P else "5-prime"
        print(f"  Chain {chain_id} end resid={end[1]}: has_P={has_P} -> {label}")

    five_prime = [e for e in ends if not any(topo["atomNames"][i] == "P" for i in atoms_of_res[e])]
    if five_prime:
        paths[chain_id] = trace(five_prime[0], chain_id)
        print(f"  Chain {chain_id} traced from 5-prime: {len(paths[chain_id])} residues")
        print(f"    resids: {[r[1] for r in paths[chain_id][:4]]} ... {[r[1] for r in paths[chain_id][-4:]]}")

# Antiparallel pairing: A[k] with B[35-k]
path_A = paths["A"]
path_B = paths["B"]

bp_coms = []
for k in range(36):
    a_com = heavy_com(path_A[k])
    b_com = heavy_com(path_B[35 - k])
    bp_coms.append(0.5 * (a_com + b_com))

bp_coms = np.array(bp_coms)
consec = [float(np.linalg.norm(bp_coms[k + 1] - bp_coms[k])) for k in range(35)]
pair_dists = [float(np.linalg.norm(heavy_com(path_A[k]) - heavy_com(path_B[35 - k]))) for k in range(36)]

print(f"\n=== 36 BP CG BEADS (topological assignment) ===")
print(f"Consecutive: min={min(consec):.2f}, mean={np.mean(consec):.2f}, max={max(consec):.2f}")
print(f"Pair distances: min={min(pair_dists):.1f}, mean={np.mean(pair_dists):.1f}, max={max(pair_dists):.1f}")
print(f"Overlapping (< 2): {sum(1 for d in consec if d < 2)}")
print(f"Gaps (> 8): {sum(1 for d in consec if d > 8)}")

for k in range(35):
    flag = ""
    if consec[k] < 2:
        flag = " *** OVERLAP"
    if consec[k] > 8:
        flag = " *** GAP"
    print(f"  BP {k:>2}->{k+1:>2}: consec={consec[k]:>6.2f}  pair_d={pair_dists[k]:>6.1f}{flag}")

# Export
bp_coms.astype(np.float32).tofile("public/data/dna/cg/bp_beads.bin")
# Also export the atom indices per bp for the frontend
bp_atom_groups = []
for k in range(36):
    a_atoms = atoms_of_res[path_A[k]]
    b_atoms = atoms_of_res[path_B[35 - k]]
    bp_atom_groups.append(a_atoms + b_atoms)
json.dump({"bpAtomGroups": bp_atom_groups, "nBP": 36}, open("public/data/dna/cg/bp_mapping.json", "w"))
print(f"\nExported cg/bp_beads.bin ({bp_coms.nbytes} bytes) and cg/bp_mapping.json")
