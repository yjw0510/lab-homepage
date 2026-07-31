"""Equilibrate 1 M LiPF6 in EC:EMC (3:7 w/w) and report whether it looks like the real thing.

Phase 1 of the all-atom electrolyte asset: run the MD and validate it. No web asset is
written here, because the schema is worthless if the structure is wrong.

Run with the research-md environment, which carries AmberTools and packmol:
  /Users/yjw0510/miniconda3/envs/research-md/bin/python scripts/generate-electrolyte-md.py

Force field: GAFF2 with AM1-BCC charges for EC, EMC and PF6-, Joung-Cheatham for Li+, with
ionic charges scaled to 0.8. Fixed-charge models overbind Li+ to carbonyl oxygen and
overestimate contact-ion pairs; charge scaling is the standard, citable way to stand in for
electronic polarisation in carbonate electrolytes. It is a correction, not a fix: transport
coefficients from this model are not to be trusted, and the validation below only claims the
structure. A polarizable or ML force field is the real answer if dynamics ever matter here.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from openmm import LangevinMiddleIntegrator, MonteCarloBarostat, NonbondedForce, Platform, unit
from openmm.app import PME, AmberInpcrdFile, AmberPrmtopFile, HBonds, Simulation
from rdkit import Chem
from rdkit.Chem import AllChem

ROOT = Path(__file__).resolve().parent.parent
ENV_BIN = Path(sys.executable).resolve().parent
WORK = Path(os.environ.get("ELYTE_WORKDIR", "/tmp/electrolyte-md"))
OUT = ROOT / "public" / "data" / "multiscale" / "allatom"

MOLAR_MASS = {"LiPF6": 151.9, "EC": 88.06, "EMC": 104.10}
ATOMS_PER = {"LiPF6": 7, "EC": 10, "EMC": 15}
SALT_MOLARITY = 1.0
EC_MASS_FRACTION = 0.3          # EC:EMC 3:7 by weight
PACKING_DENSITY = 1.20          # g/cm3, close enough to start; NPT sets the final cell
TARGET_ATOMS = int(os.environ.get("ELYTE_TARGET_ATOMS", "40000"))


def solve_composition(target_atoms: int) -> tuple[float, dict[str, int]]:
    """Box edge and molecule counts for 1 M LiPF6 in EC:EMC 3:7 at the target atom count."""
    edge = 40.0
    counts: dict[str, int] = {}
    for _ in range(200):
        volume_l = edge ** 3 * 1e-27
        salt = round(SALT_MOLARITY * volume_l * 6.02214076e23)
        solvent_mass = edge ** 3 * 1e-24 * PACKING_DENSITY * 6.02214076e23 - salt * MOLAR_MASS["LiPF6"]
        ec = round(EC_MASS_FRACTION * solvent_mass / MOLAR_MASS["EC"])
        emc = round((1 - EC_MASS_FRACTION) * solvent_mass / MOLAR_MASS["EMC"])
        atoms = salt * ATOMS_PER["LiPF6"] + ec * ATOMS_PER["EC"] + emc * ATOMS_PER["EMC"]
        counts = {"LI": salt, "PF6": salt, "EC": ec, "EMC": emc}
        edge *= (target_atoms / max(atoms, 1)) ** (1 / 3) * 0.5 + 0.5
    return edge, counts


BOX_A, COUNTS = solve_composition(TARGET_ATOMS)
SPECIES = {
    # name: (SMILES, formal charge)
    "PF6": ("F[P-](F)(F)(F)(F)F", -1),
    "EC": ("C1COC(=O)O1", 0),
    "EMC": ("CCOC(=O)OC", 0),
}
IONIC_CHARGE_SCALE = 0.8
IONIC_RESIDUES = {"LI", "PF6"}

TEMPERATURE_K = 298.15
PRESSURE_BAR = 1.0
TIMESTEP_FS = 2.0          # safe with HBonds constrained, halves the cost
MINIMIZE_ITERS = 2000
NPT_STEPS = int(os.environ.get("ELYTE_NPT_STEPS", "75000"))   # 150 ps, compress to density
NVT_STEPS = int(os.environ.get("ELYTE_NVT_STEPS", "100000"))   # 200 ps, sample structure
FRAME_STRIDE = 1000

# Literature targets. Density of 1 M LiPF6 in EC:EMC 3:7 sits near 1.2 g/cm3; the Li+-O
# first-shell distance is consistently ~2.0 A with a coordination number near 4.
TARGET_DENSITY = (1.13, 1.28)
TARGET_LI_O_PEAK = (1.85, 2.20)
# Carbonyl oxygens only, which is not the total first-shell coordination the literature
# quotes. See analyze-electrolyte-shell.py for the decomposition and the real checks.
TARGET_LI_O_CARBONYL_CN = (2.4, 3.6)
FIRST_SHELL_NM = 0.28


def run(args: list[str], cwd: Path, stdin: Path | None = None) -> None:
    with (stdin.open() if stdin else open(os.devnull)) as handle:
        proc = subprocess.run(args, cwd=str(cwd), stdin=handle, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"{args[0]} failed:\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}")


def build_species(work: Path) -> None:
    """SDF, not PDB. A PDB carries no bond orders, so antechamber's bondtype guesses and
    refuses every one of these anions with a frozen-atom-type error."""
    for name, (smiles, charge) in SPECIES.items():
        mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
        AllChem.EmbedMolecule(mol, randomSeed=20260730)
        AllChem.MMFFOptimizeMolecule(mol, maxIters=4000)
        writer = Chem.SDWriter(str(work / f"{name}.sdf"))
        writer.write(mol)
        writer.close()
        run([str(ENV_BIN / "antechamber"), "-i", f"{name}.sdf", "-fi", "sdf",
             "-o", f"{name}.mol2", "-fo", "mol2", "-c", "bcc", "-nc", str(charge),
             "-at", "gaff2", "-rn", name, "-pf", "y"], work)
        run([str(ENV_BIN / "parmchk2"), "-i", f"{name}.mol2", "-f", "mol2",
             "-o", f"{name}.frcmod", "-s", "gaff2"], work)
        missing = [l for l in (work / f"{name}.frcmod").read_text().splitlines() if "ATTN" in l]
        if missing:
            raise RuntimeError(f"{name}: GAFF2 is missing parameters:\n" + "\n".join(missing))
        # tleap writes the template with the atom names the mol2 uses, so the packed PDB and
        # the library agree without any renaming.
        (work / f"{name}_tpl.leap").write_text(
            f"source leaprc.gaff2\nloadamberparams {name}.frcmod\n"
            f"{name} = loadmol2 {name}.mol2\nsavepdb {name} {name}_tpl.pdb\nquit\n")
        run([str(ENV_BIN / "tleap"), "-f", f"{name}_tpl.leap"], work)


def write_li_template(path: Path) -> None:
    path.write_text("ATOM      1 LI   LI  A   1       0.000   0.000   0.000  1.00  0.00          LI\nTER\nEND\n")


def pack(work: Path) -> None:
    lines = ["seed 20260730", "tolerance 2.2", "nloop 400", "maxit 40", "movebadrandom",
             "filetype pdb", "output packed.pdb", ""]
    for name, count in COUNTS.items():
        template = "LI_tpl.pdb" if name == "LI" else f"{name}_tpl.pdb"
        lines += [f"structure {template}", f"  number {count}",
                  f"  inside box 1.0 1.0 1.0 {BOX_A - 1:.2f} {BOX_A - 1:.2f} {BOX_A - 1:.2f}",
                  "end structure", ""]
    (work / "packmol.inp").write_text("\n".join(lines))
    run([str(ENV_BIN / "packmol")], work, stdin=work / "packmol.inp")


def build_topology(work: Path) -> None:
    script = ["source leaprc.gaff2", "loadOff atomic_ions.lib",
              "loadamberparams frcmod.ionsjc_tip3p"]
    for name in SPECIES:
        script += [f"loadamberparams {name}.frcmod", f"{name} = loadmol2 {name}.mol2"]
    script += ["sys = loadpdb packed.pdb",
               f"set sys box {{ {BOX_A:.3f} {BOX_A:.3f} {BOX_A:.3f} }}",
               "saveamberparm sys system.prmtop system.inpcrd", "quit"]
    (work / "build.leap").write_text("\n".join(script) + "\n")
    run([str(ENV_BIN / "tleap"), "-f", "build.leap"], work)


def scale_ionic_charges(system, prmtop) -> int:
    """Stand in for electronic polarisation. Fixed-charge carbonate electrolytes overbind
    Li+ and overcount contact-ion pairs; reduced ionic charges are the standard correction."""
    nonbonded = next(f for f in system.getForces() if isinstance(f, NonbondedForce))
    touched = 0
    for atom in prmtop.topology.atoms():
        if atom.residue.name.strip().upper().rstrip("+") not in IONIC_RESIDUES:
            continue
        charge, sigma, epsilon = nonbonded.getParticleParameters(atom.index)
        nonbonded.setParticleParameters(atom.index, charge * IONIC_CHARGE_SCALE, sigma, epsilon)
        touched += 1
    return touched


def li_oxygen_structure(positions_nm: np.ndarray, box_nm: np.ndarray,
                        li_idx: np.ndarray, o_idx: np.ndarray, bins: int = 240):
    """Li+-O radial distribution and running coordination number, minimum image."""
    r_max = 0.8  # nm
    edges = np.linspace(0.0, r_max, bins + 1)
    counts = np.zeros(bins)
    for frame in positions_nm:
        for li in li_idx:
            delta = frame[o_idx] - frame[li]
            delta -= box_nm * np.round(delta / box_nm)
            counts += np.histogram(np.linalg.norm(delta, axis=1), bins=edges)[0]
    centers = 0.5 * (edges[1:] + edges[:-1])
    shell_volume = 4.0 / 3.0 * np.pi * (edges[1:] ** 3 - edges[:-1] ** 3)
    density = len(o_idx) / np.prod(box_nm)
    rdf = counts / (len(positions_nm) * len(li_idx) * shell_volume * density)
    cn = np.cumsum(counts) / (len(positions_nm) * len(li_idx))
    return centers, rdf, cn


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    print(f"workdir {WORK}")
    build_species(WORK)
    write_li_template(WORK / "LI_tpl.pdb")
    pack(WORK)
    build_topology(WORK)

    prmtop = AmberPrmtopFile(str(WORK / "system.prmtop"))
    inpcrd = AmberInpcrdFile(str(WORK / "system.inpcrd"))
    system = prmtop.createSystem(nonbondedMethod=PME, nonbondedCutoff=1.0 * unit.nanometer,
                                 constraints=HBonds, rigidWater=False)
    scaled = scale_ionic_charges(system, prmtop)
    print(f"atoms {system.getNumParticles()}, ionic charges scaled on {scaled} atoms "
          f"(x{IONIC_CHARGE_SCALE})")

    system.addForce(MonteCarloBarostat(PRESSURE_BAR * unit.bar, TEMPERATURE_K * unit.kelvin, 25))
    integrator = LangevinMiddleIntegrator(TEMPERATURE_K * unit.kelvin, 1.0 / unit.picosecond,
                                         TIMESTEP_FS * unit.femtoseconds)
    platform = Platform.getPlatformByName(os.environ.get("ELYTE_PLATFORM", "CPU"))
    sim = Simulation(prmtop.topology, system, integrator, platform)
    sim.context.setPositions(inpcrd.positions)
    print(f"platform {sim.context.getPlatform().getName()}")

    sim.minimizeEnergy(maxIterations=MINIMIZE_ITERS)
    total_mass = sum(system.getParticleMass(i).value_in_unit(unit.dalton)
                     for i in range(system.getNumParticles()))

    def density_now() -> float:
        vectors = sim.context.getState().getPeriodicBoxVectors(asNumpy=True).value_in_unit(unit.nanometer)
        volume_cm3 = np.prod(np.diag(vectors)) * 1e-21
        return total_mass / 6.02214076e23 / volume_cm3

    sim.context.setVelocitiesToTemperature(TEMPERATURE_K * unit.kelvin)
    print(f"NPT {NPT_STEPS * TIMESTEP_FS / 1000:.0f} ps ...", flush=True)
    sim.step(NPT_STEPS)
    npt_density = density_now()

    # Freeze the cell before sampling structure so the frames share one box.
    for index, force in enumerate(system.getForces()):
        if isinstance(force, MonteCarloBarostat):
            system.removeForce(index)
            break
    sim.context.reinitialize(preserveState=True)

    print(f"NVT {NVT_STEPS * TIMESTEP_FS / 1000:.0f} ps ...", flush=True)
    frames, energies = [], []
    for _ in range(NVT_STEPS // FRAME_STRIDE):
        sim.step(FRAME_STRIDE)
        state = sim.context.getState(getPositions=True, getEnergy=True)
        frames.append(state.getPositions(asNumpy=True).value_in_unit(unit.nanometer))
        energies.append(state.getPotentialEnergy().value_in_unit(unit.kilojoule_per_mole))
    positions = np.array(frames)
    box_nm = np.diag(sim.context.getState().getPeriodicBoxVectors(asNumpy=True)
                     .value_in_unit(unit.nanometer))

    atoms = list(prmtop.topology.atoms())
    li_idx = np.array([a.index for a in atoms if a.element is not None and a.element.symbol == "Li"])
    # Carbonyl oxygens only: the C=O oxygen is what Li+ coordinates, not the two ester
    # oxygens, so a blanket oxygen selection would smear the first shell.
    carbonyl = []
    for residue in prmtop.topology.residues():
        if residue.name.strip().upper() not in {"EC", "EMC"}:
            continue
        for atom in residue.atoms():
            if atom.element is None or atom.element.symbol != "O":
                continue
            if len([b for b in residue.bonds() if atom in (b[0], b[1])]) == 1:
                carbonyl.append(atom.index)
    o_idx = np.array(carbonyl)

    centers, rdf, cn = li_oxygen_structure(positions, box_nm, li_idx, o_idx)
    window = (centers > 0.15) & (centers < 0.30)
    peak_nm = float(centers[window][np.argmax(rdf[window])])
    # Integrate to the conventional 2.8 A first-shell cutoff rather than to a located minimum.
    # Searching for the minimum picked noise 0.37 A off the peak on a short run, and the fixed
    # cutoff is what the Li+ coordination numbers in the literature are quoted against.
    cn_first = float(np.interp(FIRST_SHELL_NM, centers, cn))

    report = {
        "composition": COUNTS,
        "atomCount": system.getNumParticles(),
        "forceField": "GAFF2 / AM1-BCC, Joung-Cheatham Li+, ionic charges x%.2f" % IONIC_CHARGE_SCALE,
        "boxNm": [round(float(v), 4) for v in box_nm],
        "densityGCm3": round(npt_density, 4),
        "liCount": int(len(li_idx)),
        "carbonylOxygenCount": int(len(o_idx)),
        "liOPeakAngstrom": round(peak_nm * 10, 3),
        "liOFirstShellCutoffAngstrom": FIRST_SHELL_NM * 10,
        "liOCoordinationNumber": round(cn_first, 3),
        "potentialEnergyMeanKjMol": round(float(np.mean(energies)), 1),
        "potentialEnergyStdKjMol": round(float(np.std(energies)), 1),
        "frames": int(len(positions)),
    }
    checks = {
        "density": bool(TARGET_DENSITY[0] <= npt_density <= TARGET_DENSITY[1]),
        "liOPeak": bool(TARGET_LI_O_PEAK[0] <= peak_nm * 10 <= TARGET_LI_O_PEAK[1]),
        "liOCarbonylCoordination": bool(TARGET_LI_O_CARBONYL_CN[0] <= cn_first <= TARGET_LI_O_CARBONYL_CN[1]),
    }
    report["checks"] = checks
    report["passed"] = bool(all(checks.values()))

    np.savez_compressed(WORK / "electrolyte.npz", positions=positions, box_nm=box_nm,
                        rdf_r_nm=centers, rdf=rdf, rdf_cn=cn)
    (WORK / "electrolyte-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["passed"]:
        print("\nFAILED the structural targets above. The parameters are wrong, not the render.")
        sys.exit(1)


if __name__ == "__main__":
    main()
