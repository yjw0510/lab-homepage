"""Li+ first-shell composition from the ByteFF-Pol run, on the same metrics as the GAFF2 one.

Same 2.8 A cutoff and same definitions as analyze-electrolyte-shell.py so the two force
fields are directly comparable. The point of the comparison is the pair that fixed-charge
GAFF2 failed: contact-ion-pair fraction and EC selectivity.

  /Users/yjw0510/miniconda3/envs/byteff2/bin/python scripts/analyze-byteff-shell.py [n_frames]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from MDAnalysis.coordinates.DCD import DCDReader

RUN = Path("/tmp/elyte-byteff")
FIRST_SHELL_NM = 0.28

# Box layout, in the order system.top lists them. Carbonyl oxygen sits at offset 4 in both
# carbonate templates, which the .gro files confirm: EC atom 5 is 1.22 A from atom 4.
LAYOUT = [("EMC", 476, 15), ("EC", 241, 10), ("PF6", 68, 7), ("LI", 68, 1)]
CARBONYL_OFFSET = 4
PF6_F_OFFSETS = (0, 2, 3, 4, 5, 6)


def indices() -> dict[str, np.ndarray]:
    out: dict[str, list[int]] = {"EC-carbonyl": [], "EMC-carbonyl": [], "PF6-F": [], "LI": []}
    start = 0
    for name, count, size in LAYOUT:
        for m in range(count):
            base = start + m * size
            if name in ("EC", "EMC"):
                out[f"{name}-carbonyl"].append(base + CARBONYL_OFFSET)
            elif name == "PF6":
                out["PF6-F"].extend(base + o for o in PF6_F_OFFSETS)
            else:
                out["LI"].append(base)
        start += count * size
    assert start == 10094, start
    return {k: np.array(v) for k, v in out.items()}


def main() -> None:
    n_frames = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    idx = indices()
    li = idx["LI"]
    reader = DCDReader(str(RUN / "results" / "npt.dcd"))
    frames = [ts.positions.copy() / 10.0 for ts in reader[-n_frames:]]   # A -> nm
    boxes = [ts.dimensions[:3].copy() / 10.0 for ts in reader[-n_frames:]]

    counts: dict[str, float] = {}
    cip = np.zeros(len(frames))
    for label in ("EC-carbonyl", "EMC-carbonyl", "PF6-F"):
        arr = idx[label]
        total = 0.0
        for f, (pos, box) in enumerate(zip(frames, boxes)):
            delta = pos[arr][None, :, :] - pos[li][:, None, :]
            delta -= box * np.round(delta / box)
            within = np.linalg.norm(delta, axis=2) < FIRST_SHELL_NM
            total += within.sum()
            if label == "PF6-F":
                cip[f] = within.any(axis=1).mean()
        counts[label] = total / (len(frames) * len(li))

    ec, emc = counts["EC-carbonyl"], counts["EMC-carbonyl"]
    ec_bulk = 241 / (241 + 476)
    report = {
        "forceField": "ByteFF-Pol (polarizable, GNN-parameterized)",
        "frames": len(frames),
        "boxNm": [round(float(v), 3) for v in boxes[-1]],
        "perLi": {k: round(v, 3) for k, v in counts.items()},
        "solventOxygenTotal": round(ec + emc, 3),
        "totalCoordination": round(ec + emc + counts["PF6-F"], 3),
        "contactIonPairFraction": round(float(cip.mean()), 3),
        "ecFractionOfCarbonylShell": round(ec / (ec + emc), 3),
        "ecFractionOfBulkMolecules": round(ec_bulk, 3),
        "ecEnrichment": round((ec / (ec + emc)) / ec_bulk, 3),
    }
    (RUN / "shell.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
