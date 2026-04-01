"""Generate a dense DNA melt for the mesoscale multiscale visualization.

Many short double-stranded CG chains are scattered at random positions and
orientations, then relaxed via energy minimization + NVT Langevin dynamics
inside a soft spherical wall.  The result is a dense, randomly coiled polymer
melt — much more realistic than the old parallel-bundle layout.

Run with:
  conda run -n research-md python scripts/generate-meso-data.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from openmm import (
    Context,
    CustomExternalForce,
    CustomNonbondedForce,
    HarmonicAngleForce,
    HarmonicBondForce,
    LangevinMiddleIntegrator,
    LocalEnergyMinimizer,
    Platform,
    System,
    unit,
)

from multiscale_validation import (
    combine_checks,
    ensure_validation_passed,
    validate_dna_topology,
    validate_meso_geometry,
    write_validation_report,
)


ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "data" / "multiscale" / "meso"
OUT_DIR.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(7)

DUPLEX_COUNT = 8
BP_PER_DUPLEX = 96
RISE = 3.35
HELIX_RADIUS = 9.8
TWIST = math.radians(34.0)
PLACEMENT_RADIUS = 40.0
CONFINE_RADIUS = 85.0
CONFINE_STIFFNESS = 5.0
ANGLE_STIFFNESS = 160.0
RELAX_STEPS = 800
TEMPERATURE = 120.0


def normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm < 1e-8:
        return np.array([0.0, 0.0, 1.0], dtype=np.float64)
    return vec / norm


def orthonormal_frame(tangent: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    trial = np.array([0.0, 0.0, 1.0], dtype=np.float64)
    if abs(float(np.dot(trial, tangent))) > 0.92:
        trial = np.array([0.0, 1.0, 0.0], dtype=np.float64)
    normal = normalize(np.cross(tangent, trial))
    binormal = normalize(np.cross(tangent, normal))
    return normal, binormal


def random_positions() -> list[tuple[np.ndarray, np.ndarray]]:
    result = []
    for _ in range(DUPLEX_COUNT):
        direction = normalize(RNG.normal(size=3))
        r = PLACEMENT_RADIUS * RNG.uniform(0.1, 1.0) ** (1.0 / 3.0)
        center = direction * r * RNG.uniform(0.3, 1.0)
        chain_direction = normalize(RNG.normal(size=3))
        result.append((center, chain_direction))
    return result


def build_helix_axis(center: np.ndarray, direction: np.ndarray) -> np.ndarray:
    """Nearly straight axis with very gentle curvature to look like real DNA."""
    points = []
    tangent = normalize(direction)
    current = center - tangent * (RISE * (BP_PER_DUPLEX - 1) * 0.5)
    for _ in range(BP_PER_DUPLEX):
        points.append(current.copy())
        tangent = normalize(tangent + RNG.normal(scale=0.012, size=3))
        current = current + tangent * RISE
    return np.asarray(points, dtype=np.float64)


def build_duplex_beads() -> tuple[list[list[float]], list[list[int]], list[int], list[int], list[int], list[int], list[int]]:
    placements = random_positions()
    bead_positions: list[list[float]] = []
    bead_bonds: list[list[int]] = []
    duplex_ids: list[int] = []
    strand_ids: list[int] = []
    base_pair_ids: list[int] = []
    paired_indices: list[int] = []
    strand_positions: list[int] = []

    for duplex_index, (center, direction) in enumerate(placements):
        axis = build_helix_axis(center, direction)
        prev_left = None
        prev_right = None
        for bp_index, axis_point in enumerate(axis):
            if bp_index == 0:
                tangent = normalize(axis[min(1, len(axis) - 1)] - axis[0])
            elif bp_index == len(axis) - 1:
                tangent = normalize(axis[-1] - axis[-2])
            else:
                tangent = normalize(axis[bp_index + 1] - axis[bp_index - 1])
            normal, binormal = orthonormal_frame(tangent)
            phase = bp_index * TWIST + duplex_index * 0.35
            radial = normal * math.cos(phase) + binormal * math.sin(phase)
            left = axis_point + radial * HELIX_RADIUS
            right = axis_point - radial * HELIX_RADIUS
            left_index = len(bead_positions)
            bead_positions.append([round(float(value), 4) for value in left])
            duplex_ids.append(duplex_index)
            strand_ids.append(duplex_index * 2)
            base_pair_ids.append(duplex_index * BP_PER_DUPLEX + bp_index)
            paired_indices.append(left_index + 1)
            strand_positions.append(bp_index)
            right_index = len(bead_positions)
            bead_positions.append([round(float(value), 4) for value in right])
            duplex_ids.append(duplex_index)
            strand_ids.append(duplex_index * 2 + 1)
            base_pair_ids.append(duplex_index * BP_PER_DUPLEX + bp_index)
            paired_indices.append(left_index)
            strand_positions.append(bp_index)

            bead_bonds.append([left_index, right_index])
            if prev_left is not None:
                bead_bonds.append([prev_left, left_index])
                bead_bonds.append([prev_right, right_index])
            prev_left = left_index
            prev_right = right_index

    return bead_positions, bead_bonds, duplex_ids, strand_ids, base_pair_ids, paired_indices, strand_positions


def relax_beads(beads: np.ndarray, bonds: list[list[int]]) -> np.ndarray:
    system = System()
    for _ in range(len(beads)):
        system.addParticle(2.2)

    bond_force = HarmonicBondForce()
    seen = set()
    for left, right in bonds:
        key = tuple(sorted((left, right)))
        if key in seen:
            continue
        seen.add(key)
        dist = float(np.linalg.norm(beads[left] - beads[right]))
        stiffness = 320.0 if abs(left - right) == 1 else 260.0
        bond_force.addBond(left, right, dist * unit.angstrom, stiffness * unit.kilojoule_per_mole / unit.nanometer**2)
    system.addForce(bond_force)

    angle_force = HarmonicAngleForce()
    for duplex_index in range(DUPLEX_COUNT):
        offset = duplex_index * BP_PER_DUPLEX * 2
        for strand_offset in (0, 1):
            strand = [offset + 2 * bp_index + strand_offset for bp_index in range(BP_PER_DUPLEX)]
            for i in range(len(strand) - 2):
                angle_force.addAngle(
                    strand[i],
                    strand[i + 1],
                    strand[i + 2],
                    math.radians(170.0),
                    ANGLE_STIFFNESS * unit.kilojoule_per_mole / unit.radian**2,
                )
    system.addForce(angle_force)

    nonbonded = CustomNonbondedForce(
        "4*epsilon*((sigma/r)^12 - 0.45*(sigma/r)^6);"
        "sigma=0.65;"
        "epsilon=0.18"
    )
    nonbonded.setNonbondedMethod(CustomNonbondedForce.CutoffNonPeriodic)
    nonbonded.setCutoffDistance(1.8 * unit.nanometer)
    for _ in range(len(beads)):
        nonbonded.addParticle([])
    for left, right in seen:
        nonbonded.addExclusion(left, right)
    for duplex_index in range(DUPLEX_COUNT):
        offset = duplex_index * BP_PER_DUPLEX * 2
        for strand_offset in (0, 1):
            strand = [offset + 2 * bp_index + strand_offset for bp_index in range(BP_PER_DUPLEX)]
            for i in range(len(strand) - 2):
                nonbonded.addExclusion(strand[i], strand[i + 2])
    system.addForce(nonbonded)

    wall = CustomExternalForce(
        "k * step(r - r0) * (r - r0)^2;"
        "r = sqrt(x*x + y*y + z*z)"
    )
    wall.addGlobalParameter("k", CONFINE_STIFFNESS)
    wall.addGlobalParameter("r0", CONFINE_RADIUS * 0.1)
    for i in range(len(beads)):
        wall.addParticle(i, [])
    system.addForce(wall)

    integrator = LangevinMiddleIntegrator(TEMPERATURE * unit.kelvin, 1.0 / unit.picosecond, 1.5 * unit.femtoseconds)
    context = Context(system, integrator, Platform.getPlatformByName("CPU"))
    context.setPositions(beads * unit.angstrom)
    LocalEnergyMinimizer.minimize(context, 10.0, 800)
    integrator.step(RELAX_STEPS)
    LocalEnergyMinimizer.minimize(context, 5.0, 600)
    state = context.getState(getPositions=True)
    return np.asarray(state.getPositions(asNumpy=True).value_in_unit(unit.angstrom), dtype=np.float64)


def orthogonalize(primary: np.ndarray, fallback: np.ndarray) -> np.ndarray:
    vector = primary - np.dot(primary, fallback) * fallback
    if np.linalg.norm(vector) < 1e-8:
        return normalize(np.cross(fallback, np.array([0.0, 0.0, 1.0], dtype=np.float64)))
    return normalize(vector)


def build_atomistic_segment(
    beads: np.ndarray,
    strand_ids: list[int],
    paired_indices: list[int],
    strand_positions: list[int],
    local_indices: list[int],
) -> tuple[list[list[float]], list[str], list[list[int]], list[list[int]], list[str]]:
    atoms: list[list[float]] = []
    elements: list[str] = []
    atom_names: list[str] = []
    bonds: list[list[int]] = []
    monomer_map: list[list[int]] = [[] for _ in range(len(beads))]
    local_set = set(local_indices)
    strand_lookup = {(strand_ids[index], strand_positions[index]): index for index in local_indices}
    backbone_terms: dict[int, tuple[int, int]] = {}

    def add_atom(point: np.ndarray, element: str, name: str) -> int:
        atoms.append([round(float(value), 4) for value in point])
        elements.append(element)
        atom_names.append(name)
        return len(atoms) - 1

    for bead_index in local_indices:
        bead = beads[bead_index]
        pair = beads[paired_indices[bead_index]]
        inward = normalize(pair - bead)
        outward = -inward

        prev_index = strand_lookup.get((strand_ids[bead_index], strand_positions[bead_index] - 1))
        next_index = strand_lookup.get((strand_ids[bead_index], strand_positions[bead_index] + 1))
        if prev_index is not None and next_index is not None:
            tangent = normalize(beads[next_index] - beads[prev_index])
        elif next_index is not None:
            tangent = normalize(beads[next_index] - bead)
        elif prev_index is not None:
            tangent = normalize(bead - beads[prev_index])
        else:
            tangent = np.array([0.0, 0.0, 1.0], dtype=np.float64)
        lateral = orthogonalize(np.cross(tangent, outward), tangent)

        # Backbone offsets derived from 1BNA crystal structure (averaged DG + DC)
        phosphate = bead
        op1 = bead + outward * 1.35 - tangent * 0.15 + lateral * 0.43
        op2 = bead - outward * 0.21 - tangent * 0.17 - lateral * 1.41
        o5 = bead - outward * 0.55 + tangent * 1.44 + lateral * 0.39
        c5 = bead - outward * 0.43 + tangent * 1.95 + lateral * 1.70
        c4_sugar = bead - outward * 1.23 + tangent * 3.21 + lateral * 1.71
        c3 = bead - outward * 0.96 + tangent * 4.16 + lateral * 0.56
        o3 = bead - outward * 0.37 + tangent * 5.37 + lateral * 1.00
        c1 = bead - outward * 3.30 + tangent * 3.86 + lateral * 0.95

        # Base ring offsets from 1BNA DC (pyrimidine 6-membered ring)
        n_base = bead - outward * 4.58 + tangent * 3.17 + lateral * 0.47
        c2 = bead - outward * 5.86 + tangent * 3.55 + lateral * 0.70
        n3 = bead - outward * 6.86 + tangent * 2.92 + lateral * 0.07
        c4_base = bead - outward * 6.61 + tangent * 1.93 - lateral * 0.79
        c5b = bead - outward * 5.31 + tangent * 1.52 - lateral * 1.06
        c6 = bead - outward * 4.27 + tangent * 2.17 - lateral * 0.40

        phosphate_i = add_atom(phosphate, "P", "P")
        op1_i = add_atom(op1, "O", "OP1")
        op2_i = add_atom(op2, "O", "OP2")
        o5_i = add_atom(o5, "O", "O5'")
        c5_i = add_atom(c5, "C", "C5'")
        c4_sugar_i = add_atom(c4_sugar, "C", "C4'")
        c3_i = add_atom(c3, "C", "C3'")
        o3_i = add_atom(o3, "O", "O3'")
        c1_i = add_atom(c1, "C", "C1'")
        n_base_i = add_atom(n_base, "N", "N1")
        c2_i = add_atom(c2, "C", "C2")
        n3_i = add_atom(n3, "N", "N3")
        c4_base_i = add_atom(c4_base, "C", "C4")
        c5b_i = add_atom(c5b, "C", "C5")
        c6_i = add_atom(c6, "C", "C6")

        monomer_indices = [
            phosphate_i,
            op1_i,
            op2_i,
            o5_i,
            c5_i,
            c4_sugar_i,
            c3_i,
            o3_i,
            c1_i,
            n_base_i,
            c2_i,
            n3_i,
            c4_base_i,
            c5b_i,
            c6_i,
        ]
        monomer_map[bead_index] = monomer_indices

        bonds.extend(
            [
                [phosphate_i, op1_i],
                [phosphate_i, op2_i],
                [phosphate_i, o5_i],
                [o5_i, c5_i],
                [c5_i, c4_sugar_i],
                [c4_sugar_i, c3_i],
                [c4_sugar_i, c1_i],
                [c3_i, o3_i],
                [c1_i, n_base_i],
                [n_base_i, c2_i],
                [c2_i, n3_i],
                [n3_i, c4_base_i],
                [c4_base_i, c5b_i],
                [c5b_i, c6_i],
                [c6_i, n_base_i],
            ]
        )

        backbone_terms[bead_index] = (phosphate_i, o3_i)

    for bead_index in local_indices:
        next_index = strand_lookup.get((strand_ids[bead_index], strand_positions[bead_index] + 1))
        if next_index is None or next_index not in local_set:
            continue
        _, o3_i = backbone_terms[bead_index]
        next_p_i, _ = backbone_terms[next_index]
        bonds.append([o3_i, next_p_i])

    return atoms, elements, bonds, monomer_map, atom_names


def compute_centers(beads: np.ndarray, duplex_ids: list[int]) -> dict[int, np.ndarray]:
    centers: dict[int, np.ndarray] = {}
    for duplex_id in sorted(set(duplex_ids)):
        indices = [index for index, current in enumerate(duplex_ids) if current == duplex_id]
        centers[duplex_id] = beads[indices].mean(axis=0)
    return centers


def build_subset_metadata(
    beads: np.ndarray,
    duplex_ids: list[int],
    strand_ids: list[int],
    base_pair_ids: list[int],
    strand_positions: list[int],
) -> tuple[dict[str, dict], dict[str, list[float]], int]:
    centers = compute_centers(beads, duplex_ids)
    bundle_center = beads.mean(axis=0)
    central_duplex = min(centers, key=lambda duplex_id: float(np.linalg.norm(centers[duplex_id] - bundle_center)))
    local_min = BP_PER_DUPLEX // 2 - 8
    local_max = BP_PER_DUPLEX // 2 + 8
    local_segment = [
        index
        for index, duplex_id in enumerate(duplex_ids)
        if duplex_id == central_duplex and local_min <= strand_positions[index] <= local_max
    ]
    local_center = beads[local_segment].mean(axis=0)

    reference_index = min(
        range(len(beads)),
        key=lambda index: float(
            np.linalg.norm(beads[index] - centers[duplex_ids[index]]) + abs(strand_positions[index] - BP_PER_DUPLEX / 2) * 0.05
        ),
    )
    reference_point = beads[reference_index]
    correlation_subset = [
        index
        for index in range(len(beads))
        if float(np.linalg.norm(beads[index] - reference_point)) <= 46.0
    ]

    subsets = {
        "bundle_overview": {"indices": list(range(len(beads)))},
        "local_duplex_segment": {"indices": local_segment},
        "pair_correlation_neighborhood": {"indices": correlation_subset},
    }
    anchors = {
        "bundle_center": [round(float(value), 4) for value in bundle_center],
        "local_duplex_center": [round(float(value), 4) for value in local_center],
        "pair_reference_center": [round(float(value), 4) for value in reference_point],
    }
    return subsets, anchors, reference_index


def main():
    beads, bead_bonds, duplex_ids, strand_ids, base_pair_ids, paired_indices, strand_positions = build_duplex_beads()
    relaxed_beads = relax_beads(np.asarray(beads, dtype=np.float64), bead_bonds)
    subsets, anchors, reference_index = build_subset_metadata(
        relaxed_beads,
        duplex_ids,
        strand_ids,
        base_pair_ids,
        strand_positions,
    )
    atoms, elements, atom_bonds, monomer_map, atom_names = build_atomistic_segment(
        relaxed_beads,
        strand_ids,
        paired_indices,
        strand_positions,
        subsets["local_duplex_segment"]["indices"],
    )

    validation = combine_checks(
        "meso",
        {
            "mesoGeometry": validate_meso_geometry(
                [[float(v) for v in bead] for bead in relaxed_beads.tolist()],
                duplex_ids,
                BP_PER_DUPLEX,
                min_center_distance=2.0,
            ),
            "dnaTopology": validate_dna_topology(
                strand_ids,
                duplex_ids,
                base_pair_ids,
                bead_bonds,
                BP_PER_DUPLEX,
            ),
        },
    )
    write_validation_report("meso", validation)
    ensure_validation_passed(validation)

    polymer_data = {
        "atoms": atoms,
        "elements": elements,
        "atomNames": atom_names,
        "bonds": atom_bonds,
        "monomerMap": monomer_map,
        "beadPositions": [[round(float(value), 4) for value in bead] for bead in relaxed_beads.tolist()],
        "beadBonds": bead_bonds,
        "nMonomers": len(relaxed_beads),
        "monomerType": "dna_melt",
        "duplexCount": DUPLEX_COUNT,
        "bpPerDuplex": BP_PER_DUPLEX,
        "strandIds": strand_ids,
        "duplexIds": duplex_ids,
        "basePairIds": base_pair_ids,
        "pairedBeadIndices": paired_indices,
        "strandPositions": strand_positions,
        "anchors": anchors,
        "subsets": subsets,
        "referenceBeadIndex": reference_index,
    }

    frames_data = {
        "beadCount": len(relaxed_beads),
        "beads": [[round(float(value), 4) for value in bead] for bead in relaxed_beads.tolist()],
        "bonds": bead_bonds,
        "duplexIds": duplex_ids,
        "strandIds": strand_ids,
        "basePairIds": base_pair_ids,
        "anchors": anchors,
        "subsets": subsets,
        "referenceIndex": reference_index,
    }

    (OUT_DIR / "polymer.json").write_text(json.dumps(polymer_data, indent=2))
    (OUT_DIR / "frames.json").write_text(json.dumps(frames_data, indent=2))

    print("Wrote validated mesoscale DNA melt:")
    print(f"  duplexes: {DUPLEX_COUNT}")
    print(f"  base pairs / duplex: {BP_PER_DUPLEX}")
    print(f"  beads: {len(relaxed_beads)}")
    print(f"  placement radius: {PLACEMENT_RADIUS} Å")
    print(f"  confinement radius: {CONFINE_RADIUS} Å")


if __name__ == "__main__":
    main()
