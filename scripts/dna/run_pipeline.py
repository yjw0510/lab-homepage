"""Multiscale teaching-asset pipeline orchestrator.

Runs the full pipeline: mapping motif → generic polymer melt → dynamics
→ binary export → periodic-boundary RDF.
Usage:
    conda run -n research-md python scripts/dna/run_pipeline.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
OUT_DIR = ROOT / "public" / "data" / "dna"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

EXPECTED_FRAME_COUNT = 500
NOMINAL_DURATION_NS = 1.0
SAVED_INTERVAL_PS = 2.0


def main() -> None:
    start = time.time()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: atomistic mapping motif
    print("\n[1/5] Building the MDNA 36-bp atomistic mapping motif...")
    from dna.adapter import extract_atomistic_data
    aa_data = extract_atomistic_data()

    # Step 2: independent generic CG teaching system
    print("\n[2/5] Building the 100 × 80-bead generic polymer melt...")
    from dna.build_cg_melt import build_cg_melt
    cg_melt = build_cg_melt()

    # Step 3: CG dynamics
    print(
        "\n[3/5] Running periodic CG Langevin dynamics "
        f"({EXPECTED_FRAME_COUNT} frames; {NOMINAL_DURATION_NS:g} ns nominal)..."
    )
    from dna.cg_dynamics import run_cg_dynamics, validate_trajectory
    cg_trajectory = run_cg_dynamics(
        cg_melt["positions"],
        cg_melt["bead_bonds"],
        cg_melt["duplex_count"],
        cg_melt["bp_per_duplex"],
        cg_melt.get("box_dimensions"),
    )
    print(
        f"  Trajectory: {cg_trajectory.shape} "
        f"({cg_trajectory.nbytes / 1024 / 1024:.1f} MB)"
    )
    validate_trajectory(
        cg_trajectory,
        cg_melt["bead_bonds"],
        cg_melt["positions"],
        cg_melt.get("box_dimensions"),
    )
    print("  Trajectory validation passed.")
    if cg_trajectory.shape[0] != EXPECTED_FRAME_COUNT:
        raise RuntimeError(
            "The declared teaching trajectory must contain "
            f"{EXPECTED_FRAME_COUNT} frames; got {cg_trajectory.shape[0]}."
        )

    # Step 4: export the public coordinate/topology contract. The RDF files are
    # initialized here and replaced by the rigorous PBC calculation in step 5.
    print("\n[4/5] Exporting binary coordinate and topology assets...")
    from dna.export_assets import export_all, verify_assets
    export_all(
        aa_data,
        cg_melt,
        cg_trajectory,
        None,
        OUT_DIR,
        trajectory_metadata={
            "nominal_duration_ns": NOMINAL_DURATION_NS,
            "saved_interval_ps": SAVED_INTERVAL_PS,
            "integrator": "LangevinMiddleIntegrator",
        },
    )

    # Step 5: run the declared full-trajectory minimum-image/PBC RDF analysis.
    # compute_rdf_pbc.py updates rdf.bin, rdf/meta.json, and the RDF asset shape.
    print("\n[5/5] Computing full-trajectory g(r) with periodic boundaries...")
    from dna.compute_rdf_pbc import main as compute_rdf_pbc
    compute_rdf_pbc()

    manifest_path = OUT_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["analysis"]["rdf"].update({
        "status": "complete",
        "frames_analyzed": int(cg_trajectory.shape[0]),
    })
    manifest["assets"]["rdf"]["provenance"].update({
        "status": "complete",
        "frames_analyzed": int(cg_trajectory.shape[0]),
    })
    manifest_path.write_text(json.dumps(manifest, indent=2))

    rdf_meta_path = OUT_DIR / "rdf" / "meta.json"
    rdf_meta = json.loads(rdf_meta_path.read_text())
    rdf_meta.update({
        "method": "scipy.spatial.cKDTree.count_neighbors",
        "periodicBoundaryConditions": True,
        "script": "scripts/dna/compute_rdf_pbc.py",
    })
    rdf_meta_path.write_text(json.dumps(rdf_meta, indent=2))

    verify_assets(OUT_DIR, manifest)

    elapsed = time.time() - start
    n_beads = len(cg_melt["positions"])
    n_frames = cg_trajectory.shape[0]
    print(f"\nPipeline complete in {elapsed:.1f}s")
    print(f"  AA atoms: {len(aa_data['positions'])}")
    print(f"  CG beads: {n_beads}")
    print(f"  CG frames: {n_frames}")
    print(f"  RDF bins: {manifest['assets']['rdf']['shape'][0]}")
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
