"""Validation helpers for multiscale-stage generated assets.

The validation layer is intentionally strict: generated assets should fail
export when they violate obvious physical sanity checks.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np


ROOT = Path(__file__).resolve().parent.parent / "public" / "data" / "multiscale"

# Conservative hard floors for nonbonded contacts in angstroms.
PAIR_MIN_DISTANCES = {
    tuple(sorted(("H", "H"))): 1.10,
    tuple(sorted(("H", "O"))): 1.15,
    tuple(sorted(("H", "N"))): 1.15,
    tuple(sorted(("H", "C"))): 1.15,
    tuple(sorted(("O", "O"))): 2.05,
    tuple(sorted(("O", "N"))): 1.95,
    tuple(sorted(("O", "C"))): 1.85,
    tuple(sorted(("N", "N"))): 1.85,
    tuple(sorted(("N", "C"))): 1.80,
    tuple(sorted(("C", "C"))): 1.75,
    tuple(sorted(("Na", "O"))): 1.90,
    tuple(sorted(("Na", "H"))): 1.55,
    tuple(sorted(("Na", "Na"))): 2.40,
    tuple(sorted(("Cl", "O"))): 2.05,
    tuple(sorted(("Cl", "H"))): 1.60,
    tuple(sorted(("Cl", "Cl"))): 2.80,
}

BOND_RANGE = {
    tuple(sorted(("H", "O"))): (0.85, 1.15),
    tuple(sorted(("H", "N"))): (0.85, 1.15),
    tuple(sorted(("H", "C"))): (0.90, 1.20),
    tuple(sorted(("C", "C"))): (1.15, 1.75),
    tuple(sorted(("C", "N"))): (1.15, 1.70),
    tuple(sorted(("C", "O"))): (1.10, 1.60),
    tuple(sorted(("N", "N"))): (1.10, 1.60),
    tuple(sorted(("O", "P"))): (1.35, 1.85),
    tuple(sorted(("P", "O"))): (1.35, 1.85),
    tuple(sorted(("P", "C"))): (1.55, 1.95),
}


@dataclass
class ValidationError(RuntimeError):
    level: str
    reason: str

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"[{self.level}] {self.reason}"


def pair_key(a: str, b: str) -> tuple[str, str]:
    return tuple(sorted((a, b)))


def distance(a: Iterable[float], b: Iterable[float]) -> float:
    ax, ay, az = a
    bx, by, bz = b
    dx = ax - bx
    dy = ay - by
    dz = az - bz
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def adjacency_from_bonds(bonds: list[list[int]], atom_count: int) -> list[set[int]]:
    adjacency = [set() for _ in range(atom_count)]
    for left, right, *_ in bonds:
        adjacency[left].add(right)
        adjacency[right].add(left)
    return adjacency


def graph_separation(adjacency: list[set[int]], start: int, limit: int = 3) -> dict[int, int]:
    frontier = {start}
    visited = {start: 0}
    for depth in range(1, limit + 1):
        next_frontier: set[int] = set()
        for node in frontier:
            next_frontier.update(adjacency[node])
        next_frontier.difference_update(visited)
        if not next_frontier:
            break
        for node in next_frontier:
            visited[node] = depth
        frontier = next_frontier
    return visited


def validate_bond_lengths(
    atoms: list[list[float]],
    elements: list[str],
    bonds: list[list[int]],
) -> dict:
    failures = []
    lengths: list[float] = []
    for left, right, *_ in bonds:
        pair = pair_key(elements[left], elements[right])
        lower, upper = BOND_RANGE.get(pair, (0.8, 2.2))
        value = distance(atoms[left], atoms[right])
        lengths.append(value)
        if value < lower or value > upper:
            failures.append(
                {
                    "atoms": [left, right],
                    "elements": [elements[left], elements[right]],
                    "distance": round(value, 4),
                    "range": [lower, upper],
                }
            )
    return {
        "passed": len(failures) == 0,
        "count": len(bonds),
        "min": round(min(lengths), 4) if lengths else None,
        "max": round(max(lengths), 4) if lengths else None,
        "failures": failures[:24],
    }


def validate_nonbonded_contacts(
    atoms: list[list[float]],
    elements: list[str],
    bonds: list[list[int]],
) -> dict:
    adjacency = adjacency_from_bonds(bonds, len(atoms))
    nearest: list[dict] = []
    hard_failures = []
    for index, atom in enumerate(atoms):
        excluded = graph_separation(adjacency, index, limit=3)
        for other_index in range(index + 1, len(atoms)):
            if other_index in excluded:
                continue
            value = distance(atom, atoms[other_index])
            pair = pair_key(elements[index], elements[other_index])
            minimum = PAIR_MIN_DISTANCES.get(pair, 1.35)
            entry = {
                "atoms": [index, other_index],
                "elements": [elements[index], elements[other_index]],
                "distance": round(value, 4),
                "minimum": minimum,
            }
            if len(nearest) < 16:
                nearest.append(entry)
                nearest.sort(key=lambda item: item["distance"])
            elif value < nearest[-1]["distance"]:
                nearest[-1] = entry
                nearest.sort(key=lambda item: item["distance"])
            if value < minimum:
                hard_failures.append(entry)
    return {
        "passed": len(hard_failures) == 0,
        "nearest": nearest,
        "failures": hard_failures[:24],
    }


def validate_energy(
    force_rms: float,
    potential_energy_kj_mol: float | None = None,
    *,
    force_p95: float | None = None,
    force_max: float | None = None,
    max_force_rms: float = 1800.0,
    max_force_p95: float = 2200.0,
    max_force_max: float = 8000.0,
) -> dict:
    passed = force_rms <= max_force_rms and math.isfinite(force_rms)
    if force_p95 is not None:
        passed = passed and force_p95 <= max_force_p95 and math.isfinite(force_p95)
    if force_max is not None:
        passed = passed and force_max <= max_force_max and math.isfinite(force_max)
    return {
        "passed": passed,
        "forceRms": round(force_rms, 6),
        "maxForceRms": max_force_rms,
        "forceP95": None if force_p95 is None else round(force_p95, 6),
        "maxForceP95": max_force_p95,
        "forceMax": None if force_max is None else round(force_max, 6),
        "maxForceMax": max_force_max,
        "potentialEnergyKJMol": None if potential_energy_kj_mol is None else round(potential_energy_kj_mol, 6),
    }


def validate_meso_geometry(
    bead_positions: list[list[float]],
    duplex_ids: list[int],
    bp_per_duplex: int,
    min_center_distance: float = 8.0,
) -> dict:
    bead_count = len(bead_positions)
    duplex_count = len(set(duplex_ids))
    centers: dict[int, np.ndarray] = {}
    for duplex_id in set(duplex_ids):
        coords = np.asarray([bead_positions[i] for i, current in enumerate(duplex_ids) if current == duplex_id], dtype=np.float64)
        centers[duplex_id] = coords.mean(axis=0)

    center_distances = []
    keys = sorted(centers)
    for i, left in enumerate(keys):
        for right in keys[i + 1 :]:
            center_distances.append(float(np.linalg.norm(centers[left] - centers[right])))

    return {
        "passed": duplex_count >= 6 and bp_per_duplex >= 48 and bead_count >= 300 and (min(center_distances) if center_distances else 999) > min_center_distance,
        "duplexCount": duplex_count,
        "bpPerDuplex": bp_per_duplex,
        "beadCount": bead_count,
        "minCenterDistance": round(min(center_distances), 4) if center_distances else None,
    }


def validate_dna_topology(
    strand_ids: list[int],
    duplex_ids: list[int],
    base_pair_ids: list[int],
    bead_bonds: list[list[int]],
    bp_per_duplex: int,
) -> dict:
    bead_count = len(strand_ids)
    adjacency = adjacency_from_bonds(bead_bonds, bead_count)
    duplex_to_strands: dict[int, set[int]] = {}
    backbone_bonds = 0
    rung_bonds = 0
    cross_duplex_bonds = 0
    isolated = 0
    seen_pairs: set[tuple[int, int]] = set()

    for idx, (strand_id, duplex_id) in enumerate(zip(strand_ids, duplex_ids)):
        duplex_to_strands.setdefault(duplex_id, set()).add(strand_id)
        if len(adjacency[idx]) == 0:
            isolated += 1

    for left, right in bead_bonds:
        pair = tuple(sorted((left, right)))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        if duplex_ids[left] != duplex_ids[right]:
            cross_duplex_bonds += 1
            continue
        same_strand = strand_ids[left] == strand_ids[right]
        if same_strand:
            backbone_bonds += 1
        else:
            if base_pair_ids[left] == base_pair_ids[right]:
                rung_bonds += 1
            else:
                cross_duplex_bonds += 1

    duplex_count = len(duplex_to_strands)
    expected_rungs = duplex_count * bp_per_duplex
    expected_backbone = duplex_count * 2 * max(0, bp_per_duplex - 1)
    strand_ok = all(len(strands) == 2 for strands in duplex_to_strands.values())
    passed = (
        strand_ok
        and isolated == 0
        and cross_duplex_bonds == 0
        and rung_bonds == expected_rungs
        and backbone_bonds == expected_backbone
    )
    return {
        "passed": passed,
        "duplexCount": duplex_count,
        "expectedRungBonds": expected_rungs,
        "rungBonds": rung_bonds,
        "expectedBackboneBonds": expected_backbone,
        "backboneBonds": backbone_bonds,
        "isolatedBeads": isolated,
        "crossDuplexBonds": cross_duplex_bonds,
        "twoStrandsPerDuplex": strand_ok,
    }


def validate_trajectory_selection(frame_index: int, total_frames: int, equil_fraction: float = 0.4) -> dict:
    min_index = int(total_frames * equil_fraction)
    return {
        "passed": frame_index >= min_index,
        "selectedFrame": frame_index,
        "totalFrames": total_frames,
        "minimumEquilibratedFrame": min_index,
    }


def combine_checks(level: str, checks: dict) -> dict:
    passed = all(value.get("passed", True) for value in checks.values())
    return {
        "level": level,
        "passed": passed,
        "checks": checks,
    }


def ensure_validation_passed(report: dict) -> None:
    if report.get("passed", False):
        return
    checks = report.get("checks", {})
    failures = [name for name, value in checks.items() if not value.get("passed", True)]
    raise ValidationError(str(report.get("level", "unknown")), f"Validation failed for: {', '.join(failures)}")


def write_validation_report(level: str, report: dict) -> None:
    out_path = ROOT / level / "validation.json"
    out_path.write_text(json.dumps(report, indent=2))
