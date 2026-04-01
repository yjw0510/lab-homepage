"""DNA asset pipeline orchestrator.

Runs the full pipeline: adapter → CG melt → CG dynamics → RDF → export.
Usage:
    conda run -n research-md python scripts/dna/run_pipeline.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
OUT_DIR = ROOT / "public" / "data" / "dna"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> None:
    start = time.time()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Atomistic adapter
    print("\n[1/5] Loading atomistic DNA from 1bna.pdb...")
    from dna.adapter import extract_atomistic_data
    aa_data = extract_atomistic_data()

    # Step 2: CG melt builder
    print("\n[2/5] Building CG DNA melt...")
    from dna.build_cg_melt import build_cg_melt
    cg_melt = build_cg_melt()

    # Step 3: CG dynamics
    print("\n[3/5] Running CG Langevin dynamics (120 frames)...")
    from dna.cg_dynamics import run_cg_dynamics, validate_trajectory
    cg_trajectory = run_cg_dynamics(
        cg_melt["positions"],
        cg_melt["bead_bonds"],
        cg_melt["duplex_count"],
        cg_melt["bp_per_duplex"],
        cg_melt.get("box_dimensions"),
    )
    print(f"  Trajectory: {cg_trajectory.shape} ({cg_trajectory.nbytes / 1024 / 1024:.1f} MB)")
    validate_trajectory(cg_trajectory, cg_melt["bead_bonds"], cg_melt["positions"], cg_melt.get("box_dimensions"))
    print("  Trajectory validation passed.")

    # Step 4: RDF computation
    print("\n[4/5] Computing g(r) from CG trajectory...")
    from dna.compute_rdf import compute_and_export_rdf
    rdf_data = compute_and_export_rdf(cg_trajectory, cg_melt["reference_index"])

    # Step 5: Export binary assets
    print("\n[5/5] Exporting binary assets...")
    from dna.export_assets import export_all, verify_assets
    manifest = export_all(aa_data, cg_melt, cg_trajectory, rdf_data, OUT_DIR)
    verify_assets(OUT_DIR, manifest)

    elapsed = time.time() - start
    n_beads = len(cg_melt["positions"])
    n_frames = cg_trajectory.shape[0]
    print(f"\nPipeline complete in {elapsed:.1f}s")
    print(f"  AA atoms: {len(aa_data['positions'])}")
    print(f"  CG beads: {n_beads}")
    print(f"  CG frames: {n_frames}")
    print(f"  RDF bins: {len(rdf_data['bin_centers'])}")
    print(f"  Output: {OUT_DIR}")

    # List generated files
    total_bytes = 0
    for path in sorted(OUT_DIR.rglob("*")):
        if path.is_file():
            size = path.stat().st_size
            total_bytes += size
            rel = path.relative_to(OUT_DIR)
            print(f"  {rel}: {size / 1024:.1f} KB")
    print(f"  Total: {total_bytes / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
