"""Export all DNA pipeline data as binary assets + JSON manifest.

Binary format: raw little-endian Float32, no headers.
Shape information is in the manifest. This enables zero-copy
`new Float32Array(arrayBuffer)` on the frontend.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


def write_float32_bin(data: np.ndarray, path: Path) -> int:
    """Write array as raw Float32 binary. Returns byte count."""
    flat = data.astype(np.float32).ravel()
    flat.tofile(str(path))
    return flat.nbytes


def export_all(
    aa_data: dict[str, Any],
    cg_melt: dict[str, Any],
    cg_trajectory: np.ndarray,
    rdf_data: dict[str, Any],
    out_dir: Path,
) -> dict:
    """Export all assets and return the manifest dict."""
    aa_dir = out_dir / "aa"
    cg_dir = out_dir / "cg"
    rdf_dir = out_dir / "rdf"
    aa_dir.mkdir(parents=True, exist_ok=True)
    cg_dir.mkdir(parents=True, exist_ok=True)
    rdf_dir.mkdir(parents=True, exist_ok=True)

    n_atoms = len(aa_data["positions"])
    n_beads = len(cg_melt["positions"])
    n_frames = cg_trajectory.shape[0]
    n_bins = len(rdf_data["bin_centers"])

    assets: dict[str, dict] = {}

    # --- Atomistic assets ---
    aa_pos_bytes = write_float32_bin(aa_data["positions"], aa_dir / "positions.bin")
    assets["aa_positions"] = {
        "path": "aa/positions.bin",
        "dtype": "float32",
        "shape": [n_atoms, 3],
        "byteLength": aa_pos_bytes,
        "unit": "angstrom",
    }

    aa_topology = {
        "elements": aa_data["elements"],
        "bonds": aa_data["bonds"],
        "atomNames": aa_data["atom_names"],
        "residueNames": aa_data["residue_names"],
        "residueIds": aa_data["residue_ids"],
        "chainIds": aa_data["chain_ids"],
    }
    (aa_dir / "topology.json").write_text(json.dumps(aa_topology))

    # --- CG assets ---
    cg_pos_bytes = write_float32_bin(cg_melt["positions"], cg_dir / "positions.bin")
    assets["cg_positions"] = {
        "path": "cg/positions.bin",
        "dtype": "float32",
        "shape": [n_beads, 3],
        "byteLength": cg_pos_bytes,
        "unit": "angstrom",
    }

    cg_traj_bytes = write_float32_bin(cg_trajectory, cg_dir / "trajectory.bin")
    assets["cg_trajectory"] = {
        "path": "cg/trajectory.bin",
        "dtype": "float32",
        "shape": [n_frames, n_beads, 3],
        "byteLength": cg_traj_bytes,
        "unit": "angstrom",
    }

    cg_topology = {
        "nBeads": n_beads,
        "beadBonds": cg_melt["bead_bonds"],
        "strandIds": cg_melt["strand_ids"],
        "duplexIds": cg_melt["duplex_ids"],
        "basePairIds": cg_melt["base_pair_ids"],
        "pairedBeadIndices": cg_melt["paired_indices"],
        "duplexCount": cg_melt["duplex_count"],
        "bpPerDuplex": cg_melt["bp_per_duplex"],
    }
    (cg_dir / "topology.json").write_text(json.dumps(cg_topology))

    # CG mapping (monomer map from AA adapter)
    mapping = {
        "monomerMap": aa_data["monomer_map"],
        "cgMapping": aa_data["cg_mapping"],
    }
    (cg_dir / "mapping.json").write_text(json.dumps(mapping))

    # --- RDF assets ---
    rdf_interleaved = np.column_stack([
        rdf_data["bin_centers"],
        rdf_data["g_r"],
    ]).astype(np.float32)
    rdf_bytes = write_float32_bin(rdf_interleaved, rdf_dir / "rdf.bin")
    assets["rdf"] = {
        "path": "rdf/rdf.bin",
        "dtype": "float32",
        "shape": [n_bins, 2],
        "byteLength": rdf_bytes,
        "layout": "interleaved_r_g",
    }

    rdf_meta = {
        "shellRadii": rdf_data["shell_radii"],
        "nBins": n_bins,
        "maxRadius": rdf_data["max_radius"],
        "referenceIndex": rdf_data["reference_index"],
    }
    (rdf_dir / "meta.json").write_text(json.dumps(rdf_meta))

    # --- Camera data (compatible with ThreeStageCamera) ---
    # This section provides the same format as polymer.json so the existing
    # centerMesoScheduleData() function can work without modification.
    camera_data = {
        "beadPositions": [[round(float(v), 4) for v in pos] for pos in cg_melt["positions"]],
        "atoms": [[round(float(v), 4) for v in pos] for pos in aa_data["positions"]],
        "anchors": cg_melt["anchors"],
        "subsets": cg_melt["subsets"],
        "referenceBeadIndex": cg_melt["reference_index"],
    }

    # --- Manifest ---
    manifest = {
        "version": 1,
        "generated": datetime.now(timezone.utc).isoformat(),
        "pipeline": "scripts/dna/run_pipeline.py",
        "system": {
            "name": "dna_duplex_melt",
            "duplex_count": cg_melt["duplex_count"],
            "bp_per_duplex": cg_melt["bp_per_duplex"],
            "aa_source": "1bna.pdb (Dickerson dodecamer)",
            "box_dimensions": cg_melt.get("box_dimensions"),
        },
        "assets": assets,
        "topology": {
            "aa": "aa/topology.json",
            "cg": "cg/topology.json",
            "mapping": "cg/mapping.json",
            "rdf_meta": "rdf/meta.json",
        },
        "camera": camera_data,
        "subsets": cg_melt["subsets"],
        "anchors": cg_melt["anchors"],
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    return manifest


def verify_assets(out_dir: Path, manifest: dict) -> None:
    """Verify all binary assets match manifest declarations."""
    for name, asset in manifest["assets"].items():
        path = out_dir / asset["path"]
        assert path.exists(), f"Missing asset: {path}"
        actual_size = path.stat().st_size
        expected_size = asset["byteLength"]
        assert actual_size == expected_size, (
            f"{name}: expected {expected_size} bytes, got {actual_size}"
        )
        # Round-trip check
        data = np.fromfile(str(path), dtype=np.float32)
        expected_count = 1
        for dim in asset["shape"]:
            expected_count *= dim
        assert len(data) == expected_count, (
            f"{name}: expected {expected_count} floats, got {len(data)}"
        )
    print("  All asset integrity checks passed.")
