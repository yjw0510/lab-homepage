"""Checklist-driven validation for multiscale scenes.

Usage:
  conda run -n research-md python scripts/validate_research_scenes.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import yaml
from PIL import Image
from skimage import color, feature, measure


ROOT = Path(__file__).resolve().parent.parent
CHECKLIST_PATH = ROOT / "docs" / "multiscale-scene-checklist.yaml"
ARTIFACT_DIR = ROOT / "artifacts" / "multiscale-scenes"
REPORT_DIR = ARTIFACT_DIR / "reports"
DATA_ROOT = ROOT / "public" / "data" / "multiscale"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def pair_key(a: str, b: str) -> tuple[str, str]:
    return tuple(sorted((a, b)))


def distance(a: list[float] | np.ndarray, b: list[float] | np.ndarray) -> float:
    return float(np.linalg.norm(np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)))


def adjacency_from_bonds(bonds: list[list[int]], atom_count: int) -> list[set[int]]:
    adjacency = [set() for _ in range(atom_count)]
    for left, right, *_ in bonds:
        adjacency[left].add(right)
        adjacency[right].add(left)
    return adjacency


def get_level_data(level: str) -> dict[str, Any]:
    if level == "meso":
        # DNA pipeline assets (Phase 1 output)
        dna_root = ROOT / "public" / "data" / "dna"
        manifest = load_json(dna_root / "manifest.json")
        cg_topo = load_json(dna_root / "cg" / "topology.json")
        aa_topo = load_json(dna_root / "aa" / "topology.json")
        # Build a polymer-compatible dict from DNA manifest for existing checks
        return {
            "polymer": {
                "beadPositions": manifest.get("camera", {}).get("beadPositions", []),
                "beadBonds": cg_topo.get("beadBonds", []),
                "duplexIds": cg_topo.get("duplexIds", []),
                "strandIds": cg_topo.get("strandIds", []),
                "basePairIds": cg_topo.get("basePairIds", []),
                "pairedBeadIndices": cg_topo.get("pairedBeadIndices", []),
                "atoms": aa_topo.get("elements", []),
                "subsets": manifest.get("subsets", {}),
                "anchors": manifest.get("anchors", {}),
                "referenceBeadIndex": manifest.get("camera", {}).get("referenceBeadIndex"),
                "nMonomers": cg_topo.get("nBeads", 0),
                "duplexCount": cg_topo.get("duplexCount", 0),
                "bpPerDuplex": cg_topo.get("bpPerDuplex", 0),
            },
            "validation": {"status": "passed"},
        }
    if level == "allatom":
        return {
            "system": load_json(DATA_ROOT / "allatom" / "system.json"),
            "validation": load_json(DATA_ROOT / "allatom" / "validation.json"),
        }
    if level == "mlff":
        return {
            "system": load_json(DATA_ROOT / "mlff" / "system.json"),
            "validation": load_json(DATA_ROOT / "mlff" / "validation.json"),
        }
    if level == "dft":
        return {
            "molecule": load_json(DATA_ROOT / "dft" / "molecule.json"),
            "frontier": load_json(DATA_ROOT / "dft" / "frontier-orbitals.json"),
            "density": load_json(DATA_ROOT / "dft" / "density-evolution.json"),
            "scf": load_json(DATA_ROOT / "dft" / "scf.json"),
        }
    raise KeyError(level)


def get_subset_indices(data: dict[str, Any], subset: str | None, total_count: int) -> list[int]:
    if subset:
        indices = data.get("subsets", {}).get(subset, {}).get("indices")
        if isinstance(indices, list) and indices:
            return [int(index) for index in indices]
    return list(range(total_count))


def masked_image(path: Path) -> tuple[np.ndarray, np.ndarray]:
    image = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0
    occupancy = np.linalg.norm(image, axis=2) > 0.09
    return image, occupancy


def scene_interior(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    x0 = int(width * 0.08)
    x1 = int(width * 0.92)
    y0 = int(height * 0.08)
    y1 = int(height * 0.84)
    return image[y0:y1, x0:x1]


def color_mask(image: np.ndarray, family: str) -> np.ndarray:
    red = image[..., 0]
    green = image[..., 1]
    blue = image[..., 2]
    if family == "cyan":
        return (blue > 0.45) & (green > 0.45) & (red < 0.45)
    if family == "light_blue":
        return (blue > 0.35) & (green > 0.35) & (red < 0.5)
    if family == "amber":
        return (red > 0.55) & (green > 0.35) & (blue < 0.35)
    if family == "purple":
        return (red > 0.35) & (blue > 0.45) & (green < 0.45)
    if family == "red":
        return (red > 0.5) & (green < 0.35) & (blue < 0.35)
    if family == "blue":
        return (blue > 0.5) & (red < 0.35)
    return np.zeros(image.shape[:2], dtype=bool)


def angular_spread_from_mask(image: np.ndarray, family: str) -> float:
    mask = color_mask(image, family)
    if mask.sum() < 20:
        return 0.0
    ys, xs = np.nonzero(mask)
    centered = np.column_stack([xs - xs.mean(), ys - ys.mean()])
    cov = np.cov(centered.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    principal = eigvecs[:, int(np.argmax(eigvals))]
    base_angle = math.degrees(math.atan2(principal[1], principal[0]))
    edges = feature.canny(mask.astype(np.float32), sigma=1.2)
    gy, gx = np.gradient(edges.astype(np.float32))
    orientations = np.degrees(np.arctan2(gy[edges], gx[edges]))
    if orientations.size == 0:
        return 0.0
    wrapped = ((orientations - base_angle + 90.0) % 180.0) - 90.0
    return float(np.std(wrapped))


def run_image_check(scene: dict[str, Any], image: np.ndarray, occupancy: np.ndarray, check: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    kind = check["type"]
    details: dict[str, Any] = {"type": kind}
    if kind == "occupancy":
        fraction = float(occupancy.mean())
        details["fraction"] = round(fraction, 6)
        passed = fraction >= check.get("minFraction", 0) and fraction <= check.get("maxFraction", 1)
        return passed, details
    if kind == "centroid":
        ys, xs = np.nonzero(occupancy)
        if xs.size == 0:
            return False, {"type": kind, "reason": "no occupied pixels"}
        cx = float(xs.mean() / occupancy.shape[1])
        cy = float(ys.mean() / occupancy.shape[0])
        details["x"] = round(cx, 6)
        details["y"] = round(cy, 6)
        x0, x1 = check["xRange"]
        y0, y1 = check["yRange"]
        return x0 <= cx <= x1 and y0 <= cy <= y1, details
    if kind.startswith("edge-density"):
        interior = scene_interior(image)
        edges = feature.canny(color.rgb2gray(interior), sigma=1.4)
        density = float(edges.mean())
        details["density"] = round(density, 6)
        if kind == "edge-density-min":
            return density >= check["minDensity"], details
        return density <= check["maxDensity"], details
    if kind == "component-count-max":
        labels = measure.label(occupancy, connectivity=2)
        component_count = int(labels.max())
        details["components"] = component_count
        return component_count <= check["max"], details
    if kind == "color-presence":
        mask = color_mask(image, check["colorFamily"])
        fraction = float(mask.mean())
        details["fraction"] = round(fraction, 6)
        return fraction >= check["minFraction"], details
    if kind == "arrow-orientation-spread":
        spread = angular_spread_from_mask(image, check["colorFamily"])
        details["stdDeg"] = round(spread, 4)
        return spread >= check["minStdDeg"], details
    raise ValueError(f"Unsupported image check type: {kind}")


def count_heavy_angles(system: dict[str, Any], indices: list[int]) -> int:
    adjacency = adjacency_from_bonds(system.get("bonds", []), len(system.get("atoms", [])))
    elements = system.get("elements", [])
    active = set(indices)
    count = 0
    for center in indices:
        if elements[center] == "H":
            continue
        neighbors = [index for index in adjacency[center] if index in active and elements[index] != "H"]
        for left_idx in range(len(neighbors)):
            for right_idx in range(left_idx + 1, len(neighbors)):
                count += 1
    return count


def count_dihedrals(system: dict[str, Any], indices: list[int]) -> int:
    adjacency = adjacency_from_bonds(system.get("bonds", []), len(system.get("atoms", [])))
    active = set(indices)
    count = 0
    for b in indices:
        for c in adjacency[b]:
            if c not in active:
                continue
            for a in adjacency[b]:
                if a == c or a not in active:
                    continue
                for d in adjacency[c]:
                    if d in {a, b} or d not in active:
                        continue
                    count += 1
    return count // 2


def count_polar_contacts(system: dict[str, Any], indices: list[int]) -> int:
    atoms = system["atoms"]
    elements = system["elements"]
    residue_ids = system.get("residueIds", list(range(len(atoms))))
    contacts = 0
    active = list(indices)
    for i, left in enumerate(active):
        for right in active[i + 1 :]:
            if residue_ids[left] == residue_ids[right]:
                continue
            pair = pair_key(elements[left], elements[right])
            if pair not in {("H", "O"), ("H", "N"), ("N", "O")}:
                continue
            if distance(atoms[left], atoms[right]) <= 3.4:
                contacts += 1
    return contacts


def direction_std_deg(vectors: np.ndarray) -> float:
    if len(vectors) < 2:
        return 0.0
    norms = np.linalg.norm(vectors, axis=1)
    vectors = vectors[norms > 1e-6]
    if len(vectors) < 2:
        return 0.0
    unit = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)
    dots = np.clip(unit @ unit.T, -1.0, 1.0)
    angles = np.degrees(np.arccos(dots[np.triu_indices(len(unit), k=1)]))
    return float(np.std(angles))


def run_numeric_check(scene: dict[str, Any], level_data: dict[str, Any], check: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    kind = check["type"]
    details: dict[str, Any] = {"type": kind}
    level = scene["level"]

    if level == "meso":
        polymer = level_data["polymer"]
        subset = get_subset_indices(polymer, check.get("subset") or scene.get("visibleSubset"), len(polymer["beadPositions"]))
        if kind == "metadata-present":
            missing = [key for key in check["keys"] if key not in polymer]
            details["missing"] = missing
            return len(missing) == 0, details
        if kind == "subset-size-min":
            details["count"] = len(subset)
            return len(subset) >= check["min"], details
        if kind == "dna-local-bonded-segment":
            active = set(subset)
            backbone = 0
            rung = 0
            for left, right in polymer["beadBonds"]:
                if left not in active or right not in active:
                    continue
                same_strand = polymer["strandIds"][left] == polymer["strandIds"][right]
                same_pair = polymer["basePairIds"][left] == polymer["basePairIds"][right]
                if same_strand:
                    backbone += 1
                elif same_pair:
                    rung += 1
            details["backboneBonds"] = backbone
            details["rungBonds"] = rung
            return backbone >= check["minBackboneBonds"] and rung >= check["minRungBonds"], details
        if kind == "mapping-coverage-min":
            covered = sum(1 for bead_index in subset if polymer["monomerMap"][bead_index])
            fraction = covered / max(len(subset), 1)
            details["fraction"] = round(fraction, 6)
            return fraction >= check["minFraction"], details
        if kind == "dna-duplex-count-min":
            duplex_count = len(set(polymer["duplexIds"]))
            details["duplexCount"] = duplex_count
            return duplex_count >= check["min"], details
        if kind == "reference-index-present":
            reference = polymer.get("referenceBeadIndex")
            details["referenceIndex"] = reference
            return isinstance(reference, int), details
        if kind == "atom-count-min":
            count = len(polymer.get("atoms", []))
            details["count"] = count
            return count >= check["min"], details

    if level in {"allatom", "mlff"}:
        system = level_data["system"]
        subset = get_subset_indices(system, check.get("subset") or scene.get("visibleSubset"), len(system["atoms"]))
        if kind == "metadata-present":
            missing = [key for key in check["keys"] if key not in system]
            details["missing"] = missing
            return len(missing) == 0, details
        if kind == "subset-size-min":
            details["count"] = len(subset)
            return len(subset) >= check["min"], details
        if kind == "residue-count-min":
            residue_name = check["residueName"]
            residue_count = sum(1 for name in (system.get("residueNames") or []) if name == residue_name)
            details["count"] = residue_count
            return residue_count >= check["min"], details
        if kind == "heavy-angle-count-min":
            angle_count = count_heavy_angles(system, subset)
            details["angleCount"] = angle_count
            return angle_count >= check["min"], details
        if kind == "dihedral-labels-present":
            dihedral_count = count_dihedrals(system, subset)
            details["dihedralCount"] = dihedral_count
            return dihedral_count >= len(check.get("labels", [])), details
        if kind == "polar-contact-count-min":
            contact_count = count_polar_contacts(system, subset)
            details["polarContacts"] = contact_count
            return contact_count >= check["min"], details
        if kind == "focus-index-valid":
            focus_index = int(system.get("focusIndex", -1))
            details["focusIndex"] = focus_index
            return 0 <= focus_index < len(system["atoms"]), details
        if kind == "nonzero-force-count-min":
            force_indices = system.get("forceDisplaySelection") or subset
            forces = np.asarray([system["forces"][index] for index in force_indices], dtype=np.float64)
            count = int(np.sum(np.linalg.norm(forces, axis=1) > 1e-5))
            details["count"] = count
            return count >= check["min"], details
        if kind == "arrow-direction-std-min":
            force_indices = system.get("forceDisplaySelection") or subset
            forces = np.asarray([system["forces"][index] for index in force_indices], dtype=np.float64)
            std_deg = direction_std_deg(forces)
            details["stdDeg"] = round(std_deg, 4)
            return std_deg >= check["minStdDeg"], details
        if kind == "atom-count-min":
            details["count"] = len(system["atoms"])
            return len(system["atoms"]) >= check["min"], details

    if level == "dft":
        density = level_data["density"]
        molecule = level_data["molecule"]
        frontier = level_data["frontier"]
        if kind == "metadata-present":
            details["skipped"] = True
            details["reason"] = "subset metadata is not used for Mol* DFT assets"
            return True, details
        if kind == "dft-residual-fixed-isovalue":
            levels = [float(snapshot.get("residualLevel", 0.0)) for snapshot in density["snapshots"][:-1]]
            baseline = float(density.get("fixedResidualIsovalue", levels[0] if levels else 0.0))
            details["baseline"] = round(baseline, 8)
            details["maxDeviation"] = round(max((abs(level - baseline) for level in levels), default=0.0), 8)
            return all(abs(level - baseline) < 1e-8 for level in levels), details
        if kind == "dft-residual-area-ratio-min":
            areas = [
                len(snapshot["positive"]["vertices"]) + len(snapshot["negative"]["vertices"])
                for snapshot in density["snapshots"]
                if snapshot["positive"]["vertices"] or snapshot["negative"]["vertices"]
            ]
            if len(areas) < 2:
                details["areas"] = areas
                return False, details
            ratio = areas[-1] / max(areas[0], 1)
            details["ratio"] = round(ratio, 6)
            return ratio >= check["minRatio"], details
        if kind == "dft-homo-nonempty":
            count = len(frontier["homoIsosurface"]["positive"]["vertices"]) + len(frontier["homoIsosurface"]["negative"]["vertices"])
            details["vertexCount"] = count
            return count > 0, details
        if kind == "dft-lumo-nonempty":
            count = len(frontier["lumoIsosurface"]["positive"]["vertices"]) + len(frontier["lumoIsosurface"]["negative"]["vertices"])
            details["vertexCount"] = count
            return count > 0, details
        if kind == "dft-final-density-nonempty":
            count = len(density["finalDensity"]["mesh"]["vertices"])
            details["vertexCount"] = count
            return count > 0, details
        if kind == "atom-count-min":
            count = len(molecule["atoms"])
            details["count"] = count
            return count >= check["min"], details

    raise ValueError(f"Unsupported numeric check {kind} for level {level}")


def main() -> None:
    checklist = yaml.safe_load(CHECKLIST_PATH.read_text())
    manifest = load_json(ARTIFACT_DIR / "manifest.json")
    manifest_by_scene = {scene["sceneId"]: scene for scene in manifest["scenes"]}
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    summary = {
      "checklist": str(CHECKLIST_PATH),
      "artifacts": str(ARTIFACT_DIR),
      "generatedAt": manifest.get("generatedAt"),
      "passed": True,
      "scenes": [],
    }

    for scene in checklist["scenes"]:
        manifest_entry = manifest_by_scene.get(scene["sceneId"])
        if manifest_entry is None:
            raise RuntimeError(f"Missing screenshot manifest entry for {scene['sceneId']}")
        level_data = get_level_data(scene["level"])
        image, occupancy = masked_image(Path(manifest_entry["screenshotPath"]))
        scene_report = {
            "sceneId": scene["sceneId"],
            "passed": True,
            "captureError": manifest_entry.get("captureError"),
            "numericChecks": [],
            "imageChecks": [],
        }
        if manifest_entry.get("captureError"):
            scene_report["passed"] = False
        numeric_checks = [*(checklist.get("defaults", {}).get("numericChecks", [])), *(scene.get("numericChecks", []))]
        image_checks = [*(checklist.get("defaults", {}).get("imageChecks", [])), *(scene.get("imageChecks", []))]

        for check in numeric_checks:
            passed, details = run_numeric_check(scene, level_data, check)
            details["passed"] = passed
            scene_report["numericChecks"].append(details)
            if not passed:
                scene_report["passed"] = False

        for check in image_checks:
            passed, details = run_image_check(scene, image, occupancy, check)
            details["passed"] = passed
            scene_report["imageChecks"].append(details)
            if not passed:
                scene_report["passed"] = False

        summary["passed"] = summary["passed"] and scene_report["passed"]
        summary["scenes"].append(scene_report)
        (REPORT_DIR / f"{scene['sceneId']}.json").write_text(json.dumps(scene_report, indent=2))

    (REPORT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps({"passed": summary["passed"], "sceneCount": len(summary["scenes"])}, indent=2))
    if not summary["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
