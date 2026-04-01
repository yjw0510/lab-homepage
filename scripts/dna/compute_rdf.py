"""Compute the radial distribution function g(r) from a CG trajectory.

Averages pairwise bead-bead distance histograms over all trajectory frames.
Exports bins, g(r) values, and detected shell radii.
"""

from __future__ import annotations

import numpy as np
from scipy.signal import find_peaks


def compute_rdf(
    frames: np.ndarray,
    n_bins: int = 80,
    max_r: float | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute average g(r) from trajectory frames.

    Args:
        frames: shape (n_frames, n_beads, 3) in Angstrom
        n_bins: number of histogram bins
        max_r: maximum radius in Angstrom (auto-detected if None)

    Returns:
        (bin_centers, g_r) both shape (n_bins,)
    """
    n_frames, n_beads, _ = frames.shape
    if max_r is None:
        # Use half the max extent of the first frame
        extent = frames[0].max(axis=0) - frames[0].min(axis=0)
        max_r = float(extent.max()) * 0.45

    bin_edges = np.linspace(0, max_r, n_bins + 1)
    bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])
    dr = bin_edges[1] - bin_edges[0]
    g_r_sum = np.zeros(n_bins, dtype=np.float64)

    for frame_i in range(n_frames):
        pos = frames[frame_i]
        # Compute all pairwise distances
        # For ~2300 beads this is ~2.6M pairs — manageable
        diffs = pos[:, np.newaxis, :] - pos[np.newaxis, :, :]
        dists = np.sqrt((diffs**2).sum(axis=-1))

        # Only upper triangle (avoid double counting and self)
        upper = dists[np.triu_indices(n_beads, k=1)]
        hist, _ = np.histogram(upper, bins=bin_edges)

        # Normalize: g(r) = hist / (N_pairs * shell_volume * number_density)
        # For a finite non-periodic system, use empirical normalization
        n_pairs = n_beads * (n_beads - 1) / 2
        for bin_i in range(n_bins):
            r = bin_centers[bin_i]
            shell_vol = 4.0 * np.pi * r**2 * dr
            if shell_vol > 0 and n_pairs > 0:
                # Normalize relative to uniform distribution within the system volume
                # Approximate volume as sphere enclosing all beads
                radii = np.linalg.norm(pos, axis=1)
                r_max_system = float(radii.max()) * 1.05
                system_vol = (4.0 / 3.0) * np.pi * r_max_system**3
                rho = n_beads / system_vol
                ideal_count = n_pairs * shell_vol * rho / (n_beads / 2)
                if ideal_count > 0:
                    g_r_sum[bin_i] += hist[bin_i] / ideal_count

    g_r = g_r_sum / n_frames
    # Smooth slightly to reduce noise
    kernel = np.array([0.1, 0.2, 0.4, 0.2, 0.1])
    g_r = np.convolve(g_r, kernel, mode="same")

    return bin_centers.astype(np.float32), g_r.astype(np.float32)


def find_shell_radii(bin_centers: np.ndarray, g_r: np.ndarray) -> list[float]:
    """Find peak positions in g(r) — these are the correlation shell radii."""
    # Skip the first few bins (too close, noisy)
    start = 3  # skip only the first few bins (too close / noise)
    peaks, properties = find_peaks(g_r[start:], height=0.15, distance=2, prominence=0.05)
    peaks = peaks + start  # shift back

    radii = [float(bin_centers[p]) for p in peaks[:4]]  # at most 4 shells
    return radii


def compute_and_export_rdf(
    frames: np.ndarray,
    reference_index: int,
    n_bins: int = 80,
) -> dict:
    """Compute g(r), find shells, and return export-ready data."""
    bin_centers, g_r = compute_rdf(frames, n_bins=n_bins)
    shell_radii = find_shell_radii(bin_centers, g_r)
    max_r = float(bin_centers[-1])

    print(f"  RDF bins: {n_bins}, max_r: {max_r:.1f} Å")
    print(f"  Shell radii: {[f'{r:.1f}' for r in shell_radii]}")
    print(f"  g(r) range: [{float(g_r.min()):.3f}, {float(g_r.max()):.3f}]")

    return {
        "bin_centers": bin_centers,
        "g_r": g_r,
        "shell_radii": shell_radii,
        "max_radius": max_r,
        "n_bins": n_bins,
        "reference_index": reference_index,
    }


if __name__ == "__main__":
    from build_cg_melt import build_cg_melt
    from cg_dynamics import run_cg_dynamics

    print("Testing RDF computation (short trajectory)...")
    melt = build_cg_melt()
    frames = run_cg_dynamics(
        melt["positions"], melt["bead_bonds"],
        melt["duplex_count"], melt["bp_per_duplex"],
        total_steps=6000, save_every=1000,
    )
    rdf = compute_and_export_rdf(frames, melt["reference_index"])
    assert len(rdf["bin_centers"]) == 80
    assert len(rdf["g_r"]) == 80
    assert rdf["max_radius"] > 0
    print("  All checks passed.")
