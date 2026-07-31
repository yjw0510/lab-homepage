"""Turn the ByteFF-Pol run into the multiscale all-atom asset.

Topology and per-frame positions come out separately: topology as JSON, positions as a
quantized binary blob.

Two runs feed this. The 2.4 ns production run (npt.dcd, one frame per picosecond) is where
the coordination statistics come from, because a mean and a block error need nanoseconds.
The dense restart (fine.dcd, one frame per 50 fs) is where the drawn frames come from,
because motion needs frames closer together than the molecules move. A picosecond apart,
consecutive configurations share almost nothing to the eye and playback reads as a slideshow.

Positions are stored as uint16 rather than float32. The scene spans a few nanometres, so
16 bits resolves under 0.0001 nm, four orders finer than the thermal displacement between
frames, and the asset halves.

  /Users/yjw0510/miniconda3/envs/byteff2/bin/python scripts/build-electrolyte-asset.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from MDAnalysis.coordinates.DCD import DCDReader

ROOT = Path(__file__).resolve().parent.parent
RUN = Path("/tmp/elyte-byteff")
OUT = ROOT / "public" / "data" / "multiscale" / "allatom"

# The order system.top lists them, which is the order the coordinates are in.
LAYOUT = [("EMC", 476, 15), ("EC", 241, 10), ("PF6", 68, 7), ("LI", 68, 1)]
CARBONYL_OFFSET = 4          # verified: 1.22 A from the carbonyl carbon in both carbonates
# 200 keyframes 0.15 ps apart, 30 ps of trajectory, interpolated at playback into a loop that
# runs 20 s forward and 20 s back regardless of what frame rate the browser achieves.
#
# The frame count is set by what the asset may weigh, and the encoding is what makes 200 of
# them affordable. Absolute uint16 at this many frames is 12 MB; stored as int8 differences it
# is 6. The grid is chosen against the measured worst case: over 12 ps no atom moves more than
# 3.738 A across a 0.15 ps step, so 0.0035 nm per unit uses 107 of the 127 available and leaves
# a fifth in reserve. One unit is 0.035 A, about a pixel of the whole-cell view.
#
# Playback interpolates between keyframes. Measured against the trajectory it skips, linear
# interpolation at this spacing is off by 0.24 A on average, a seventh of a carbon radius, and
# is what buys 20 s out of an asset that holds 200 configurations.
FRAMES = 200
FRAME_STRIDE = 3
DELTA_NM = 0.0035
FIRST_SHELL_NM = 0.28


def species_topology(name: str) -> tuple[list[str], list[list[int]]]:
    """Elements and intramolecular bonds for one species, from the files the run used."""
    gro = (RUN / "working" / f"{name}.gro").read_text().splitlines()
    elements = [line[10:15].strip() for line in gro[2:-1]]
    bonds: list[list[int]] = []
    section = None
    for line in (RUN / "working" / f"{name}.itp").read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith("["):
            section = stripped.strip("[] ").lower()
            continue
        if section != "bonds" or not stripped or stripped.startswith(";"):
            continue
        parts = stripped.split()
        if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
            bonds.append([int(parts[0]) - 1, int(parts[1]) - 1])
    return elements, bonds


def main() -> None:
    reader = DCDReader(str(RUN / "results" / "fine70.dcd"))
    picks = np.arange(FRAMES) * FRAME_STRIDE
    assert picks[-1] < len(reader), (picks[-1], len(reader))

    elements: list[str] = []
    residue_names: list[str] = []
    residue_ids: list[int] = []
    bonds: list[list[int]] = []
    carbonyl: list[int] = []
    lithium: list[int] = []
    anion_p: list[int] = []
    cursor = 0
    residue = 0
    for name, count, size in LAYOUT:
        species_elements, species_bonds = species_topology(name)
        assert len(species_elements) == size, (name, len(species_elements), size)
        for _ in range(count):
            elements.extend(species_elements)
            residue_names.extend([name] * size)
            residue_ids.extend([residue] * size)
            bonds.extend([[a + cursor, b + cursor] for a, b in species_bonds])
            if name in ("EC", "EMC"):
                carbonyl.append(cursor + CARBONYL_OFFSET)
            elif name == "LI":
                lithium.append(cursor)
            elif name == "PF6":
                anion_p.append(cursor + 1)
            cursor += size
            residue += 1
    assert cursor == 10094, cursor

    frames = []
    for index in picks:
        ts = reader[int(index)]
        frames.append(ts.positions.copy() / 10.0)      # A -> nm
    positions = np.array(frames, dtype=np.float64)
    box = reader[int(picks[0])].dimensions[:3].copy() / 10.0    # the cell is frozen for this run

    # Coordination is counted here, on the raw periodic coordinates with a minimum-image
    # test, and never after the recentering below. Wrapping every molecule toward one focus
    # ion is right for drawing that ion and wrong for every other one: ions near a box face
    # lose real neighbours and read as under-coordinated.
    carbonyl_idx = np.array(carbonyl)
    li_idx = np.array(lithium)
    per_frame = np.zeros((len(positions), len(li_idx)), dtype=int)
    for f, frame in enumerate(positions):
        delta = frame[carbonyl_idx][None, :, :] - frame[li_idx][:, None, :]
        delta -= box * np.round(delta / box)
        per_frame[f] = (np.linalg.norm(delta, axis=2) < FIRST_SHELL_NM).sum(axis=1)
    counts = per_frame.mean(axis=0)
    focus_li = int(li_idx[int(np.argmin(np.abs(counts - counts.mean())))])

    # Wrap every molecule to the periodic image nearest the focus ion and centre on it, so the
    # scene is whole rather than sliced by the box face. The shift is solved once, on the first
    # frame, and reused for all of them: solved per frame, a molecule sitting on a box face
    # flips image between consecutive frames and teleports across the cell mid-playback.
    residue_atoms: dict[int, list[int]] = {}
    for atom, rid in enumerate(residue_ids):
        residue_atoms.setdefault(rid, []).append(atom)
    groups = [np.array(v) for v in residue_atoms.values()]
    anchor = positions[0][focus_li].copy()
    for group in groups:
        shift = np.round((positions[0][group].mean(axis=0) - anchor) / box) * box
        positions[:, group] -= shift
    positions -= anchor

    # The first shell of the focus ion, measured on the first exported frame.
    delta = positions[0][carbonyl_idx] - positions[0][focus_li]
    shell_residues = sorted({residue_ids[int(i)] for i in carbonyl_idx[np.linalg.norm(delta, axis=1) < FIRST_SHELL_NM]})
    shell_atoms = sorted(a for r in shell_residues for a in residue_atoms[r])

    # Mean and spread come from the whole equilibrated production trajectory, not the exported
    # frames: 4.5 ps is a fine window to watch and far too short to average a coordination number.
    run = json.loads(Path("/tmp/elyte-byteff/coordination.json").read_text())

    # Snap every frame to one grid first, so the differences below are exact integers on it and
    # replaying them cannot drift no matter how many frames are accumulated.
    lo = float(positions.min())
    grid = np.rint((positions - lo) / DELTA_NM).astype(np.int32)
    error = np.abs(grid * DELTA_NM + lo - positions).max()
    assert error <= DELTA_NM, error

    base = grid[0]
    assert base.max() < 65536, base.max()
    deltas = np.diff(grid, axis=0)
    assert np.abs(deltas).max() <= 127, ("delta overflows int8", int(np.abs(deltas).max()))

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "electrolyte-frames.bin").write_bytes(
        base.astype("<u2").tobytes() + deltas.astype(np.int8).tobytes())
    topology = {
        "source": "ByteFF-Pol (polarizable, GNN-parameterized), OpenMM/OpenCL, NPT 298 K",
        "composition": {name: count for name, count, _ in LAYOUT},
        "atomCount": cursor,
        "frameCount": len(positions),
        "framePs": round(FRAME_STRIDE * 0.05, 3),
        "quantization": {"offsetNm": lo, "scaleNm": DELTA_NM, "maxErrorNm": float(error),
                         "encoding": "uint16 base frame followed by int8 per-frame differences"},
        "boxNm": [round(float(v), 4) for v in box],
        "elements": elements,
        "residueNames": residue_names,
        "residueIds": residue_ids,
        "bonds": bonds,
        "focusLithium": focus_li,
        "focusShellAtoms": shell_atoms,
        "focusShellResidues": [residue_names[residue_atoms[r][0]] for r in shell_residues],
        "carbonylOxygens": carbonyl,
        "anionPhosphorus": anion_p,
        "lithium": lithium,
        # Carbonyl oxygens only. The 4.09 quoted elsewhere is the total including anion
        # fluorines, which is a different quantity; these two must not be conflated.
        "coordination": {
            "criterionNm": FIRST_SHELL_NM,
            "perFrame": per_frame.tolist(),
            "mean": round(float(run["meanCoordination"]), 3),
            "blockError": round(float(run["blockError"]), 3),
            "histogram": run["histogram"],
            "ionFrames": run["ionFrames"],
        },
    }
    (OUT / "electrolyte.json").write_text(json.dumps(topology) + "\n")
    print(json.dumps({k: v for k, v in topology.items()
                      if k not in ("elements", "residueNames", "residueIds", "bonds",
                                   "carbonylOxygens", "anionPhosphorus", "lithium",
                                   "focusShellAtoms")}, indent=2))
    print(f"  frames.bin {(OUT / 'electrolyte-frames.bin').stat().st_size / 1e6:.2f} MB, "
          f"topology {(OUT / 'electrolyte.json').stat().st_size / 1e6:.2f} MB")
    print(f"  focus Li+ {focus_li}, shell: {topology['focusShellResidues']}")

    # What must not happen is a molecule flipping periodic image mid-loop. That shows up as a
    # displacement of order the box length, so the guard sits well above thermal motion (a
    # hydrogen reaches 2 A between frames) and well below one image (48 A).
    step = np.linalg.norm(np.diff(positions, axis=0), axis=2).max()
    print(f"  largest single-atom step between frames {step * 10:.3f} A, "
          f"largest delta {int(np.abs(deltas).max())} of 127 units")
    assert step < 1.0, step


if __name__ == "__main__":
    main()
