"""Compute rigorous g(r) from the full CG trajectory with PBC.

Uses scipy.spatial.cKDTree.count_neighbors with boxsize for periodic
wrapping — runs the pair search in compiled code and counts all bins
in one tree traversal per frame.

Overwrites public/data/dna/rdf/rdf.bin and rdf/meta.json.

Usage:
    python scripts/dna/compute_rdf_pbc.py
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
from scipy.signal import find_peaks
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "public" / "data" / "dna"


def rdf_ckdtree(
    traj: np.ndarray,
    box: np.ndarray,
    dr: float = 0.06,
    r_max: float | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute g(r) via cKDTree with PBC.

    Args:
        traj: (n_frames, n_atoms, 3)
        box: (3,) box lengths
        dr: bin width in same units as traj
        r_max: maximum radius; default = 0.5 * min(box)

    Returns:
        (bin_centers, g_r)
    """
    traj = np.asarray(traj, dtype=np.float64, order="C")
    n_frames, n_atoms, _ = traj.shape
    box = np.asarray(box, dtype=np.float64)

    if r_max is None:
        r_max = 0.5 * float(box.min())

    edges = np.arange(0.0, r_max + dr, dr)
    if edges[-1] < r_max:
        edges = np.append(edges, r_max)

    shell_vol = (4.0 / 3.0) * np.pi * (edges[1:] ** 3 - edges[:-1] ** 3)
    counts = np.zeros(len(shell_vol), dtype=np.float64)
    ideal = np.zeros(len(shell_vol), dtype=np.float64)

    V = float(box[0] * box[1] * box[2])
    t0 = time.time()

    for f in range(n_frames):
        x = traj[f] % box  # wrap into [0, L)
        tree = cKDTree(x, boxsize=box)

        c = tree.count_neighbors(tree, edges[1:], cumulative=False)
        c = c.astype(np.float64)
        c[0] -= n_atoms  # remove self-pairs
        c *= 0.5  # ordered → unique pairs

        counts += c
        ideal += (n_atoms * (n_atoms - 1) / (2.0 * V)) * shell_vol

        if (f + 1) % 50 == 0 or f == 0:
            elapsed = time.time() - t0
            eta = elapsed / (f + 1) * (n_frames - f - 1)
            print(f"  frame {f + 1}/{n_frames}  ({elapsed:.0f}s elapsed, ~{eta:.0f}s left)")

    g = counts / ideal
    r = 0.5 * (edges[:-1] + edges[1:])
    return r.astype(np.float32), g.astype(np.float32)


def main():
    print("Computing rigorous g(r) with PBC (cKDTree)...")

    manifest = json.loads((DATA / "manifest.json").read_text())
    box_dims = manifest["system"]["box_dimensions"]
    box = np.array(box_dims, dtype=np.float64)
    print(f"  Box: {box} nm")

    shape = manifest["assets"]["cg_trajectory"]["shape"]
    n_frames, n_beads = shape[0], shape[1]
    traj = np.fromfile(str(DATA / "cg" / "trajectory.bin"), dtype=np.float32).reshape(n_frames, n_beads, 3)
    print(f"  Trajectory: {traj.shape} ({traj.nbytes / 1024 / 1024:.0f} MB)")

    ref_idx = manifest["camera"]["referenceBeadIndex"]

    t0 = time.time()
    bin_centers, g_r = rdf_ckdtree(traj, box, dr=0.06)
    elapsed = time.time() - t0
    print(f"  Total: {elapsed:.1f}s")

    # Find shell peaks
    peaks, _ = find_peaks(g_r[3:], height=0.15, distance=3, prominence=0.05)
    peaks = peaks + 3
    shell_radii = [float(bin_centers[p]) for p in peaks[:4]]

    n_bins = len(bin_centers)
    max_r = float(bin_centers[-1])
    print(f"  Bins: {n_bins}, max_r: {max_r:.2f} nm, dr: {bin_centers[1]-bin_centers[0]:.4f} nm")
    print(f"  g(r) range: [{float(g_r.min()):.4f}, {float(g_r.max()):.4f}]")
    print(f"  Shell radii: {[f'{r:.3f}' for r in shell_radii]} nm")

    # Save rdf.bin
    rdf_dir = DATA / "rdf"
    rdf_dir.mkdir(parents=True, exist_ok=True)
    interleaved = np.column_stack([bin_centers, g_r]).astype(np.float32)
    interleaved.tofile(str(rdf_dir / "rdf.bin"))
    print(f"  Wrote rdf.bin: {interleaved.nbytes} bytes ({n_bins} bins)")

    # Save meta.json
    meta = {
        "shellRadii": shell_radii,
        "nBins": n_bins,
        "maxRadius": max_r,
        "referenceIndex": ref_idx,
        "boxDimensions": box_dims,
        "nFrames": n_frames,
        "nBeads": n_beads,
    }
    (rdf_dir / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"  Wrote meta.json")

    # Update manifest rdf shape
    manifest["assets"]["rdf"]["shape"] = [n_bins, 2]
    manifest["assets"]["rdf"]["byteLength"] = interleaved.nbytes
    (DATA / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"  Updated manifest.json")

    print("Done.")


if __name__ == "__main__":
    main()
