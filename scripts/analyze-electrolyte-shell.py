"""What is in the Li+ first solvation shell, by species.

The generator's single carbonyl-oxygen coordination number is not the quantity the
literature quotes. A Li+ first shell in a carbonate electrolyte is a mixture: carbonyl
oxygens from EC and EMC, some ester oxygens, and anion fluorines whenever the ion pair is
in contact. Counting only carbonyl oxygens gave 3.09 and looked like a failure against a
target band written for the total.

Reads the trajectory the generator saved, so it costs nothing to re-run:
  /Users/yjw0510/miniconda3/envs/research-md/bin/python scripts/analyze-electrolyte-shell.py [workdir]
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from openmm.app import AmberPrmtopFile

FIRST_SHELL_NM = 0.28

# The two structural claims a Li+ solvation scene actually makes, and what the literature
# says they should be at 1 M in a carbonate solvent. Distance and density are the easy
# observables; these two are the ones that separate a usable model from a pretty picture.
TARGET_TOTAL_COORDINATION = (3.6, 4.8)
TARGET_CIP_FRACTION = (0.15, 0.45)     # 1 M is predominantly solvent-separated
TARGET_EC_ENRICHMENT = 1.2             # EC coordinates Li+ preferentially over linear carbonate


def main() -> None:
    work = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/elyte-40k")
    data = np.load(work / "electrolyte.npz")
    positions, box = data["positions"], data["box_nm"]
    prmtop = AmberPrmtopFile(str(work / "system.prmtop"))

    li_idx: list[int] = []
    # Every atom Li+ could plausibly coordinate, tagged by what it belongs to.
    partners: dict[str, list[int]] = defaultdict(list)
    for residue in prmtop.topology.residues():
        name = residue.name.strip().upper()
        bonds = list(residue.bonds())
        for atom in residue.atoms():
            symbol = atom.element.symbol if atom.element else ""
            if symbol == "Li":
                li_idx.append(atom.index)
            elif symbol == "O" and name in {"EC", "EMC"}:
                # One heavy-atom bond means the carbonyl oxygen; two means an ester oxygen.
                degree = len([b for b in bonds if atom in (b[0], b[1])])
                partners[f"{name}-carbonyl" if degree == 1 else f"{name}-ester"].append(atom.index)
            elif symbol == "F" and name == "PF6":
                partners["PF6-F"].append(atom.index)

    li = np.array(li_idx)
    counts: dict[str, float] = {}
    contact_pair_frames = np.zeros(len(positions))
    for label, idx in partners.items():
        arr = np.array(idx)
        total = 0.0
        for f, frame in enumerate(positions):
            delta = frame[arr][None, :, :] - frame[li][:, None, :]
            delta -= box * np.round(delta / box)
            within = np.linalg.norm(delta, axis=2) < FIRST_SHELL_NM
            total += within.sum()
            if label == "PF6-F":
                contact_pair_frames[f] = (within.any(axis=1)).mean()
        counts[label] = total / (len(positions) * len(li))

    solvent_o = sum(v for k, v in counts.items() if k.endswith(("carbonyl", "ester")))
    report = {
        "firstShellCutoffAngstrom": FIRST_SHELL_NM * 10,
        "liCount": int(len(li)),
        "frames": int(len(positions)),
        "perLi": {k: round(v, 3) for k, v in sorted(counts.items())},
        "solventOxygenTotal": round(solvent_o, 3),
        "totalCoordination": round(solvent_o + counts.get("PF6-F", 0.0), 3),
        "contactIonPairFraction": round(float(contact_pair_frames.mean()), 3),
    }
    # EC is 33% of the solvent molecules but is known to be enriched in the Li+ shell.
    ec = counts.get("EC-carbonyl", 0.0)
    emc = counts.get("EMC-carbonyl", 0.0)
    if ec + emc > 0:
        report["ecFractionOfCarbonylShell"] = round(ec / (ec + emc), 3)
        report["ecFractionOfBulkMolecules"] = round(962 / (962 + 1900), 3)

    enrichment = (report.get("ecFractionOfCarbonylShell", 0.0)
                  / max(report.get("ecFractionOfBulkMolecules", 1.0), 1e-9))
    report["ecEnrichment"] = round(enrichment, 3)
    report["checks"] = {
        "totalCoordination": bool(TARGET_TOTAL_COORDINATION[0] <= report["totalCoordination"]
                                  <= TARGET_TOTAL_COORDINATION[1]),
        "contactIonPairFraction": bool(TARGET_CIP_FRACTION[0] <= report["contactIonPairFraction"]
                                       <= TARGET_CIP_FRACTION[1]),
        "ecEnrichment": bool(enrichment >= TARGET_EC_ENRICHMENT),
    }
    report["passed"] = bool(all(report["checks"].values()))

    (work / "electrolyte-shell.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["passed"]:
        print("\nThe shell composition does not match experiment. Distance and density can be "
              "right while the model still over-pairs the ion and misses solvent selectivity; "
              "do not put shell-composition or ion-pairing numbers on the page from this run.")


if __name__ == "__main__":
    main()
