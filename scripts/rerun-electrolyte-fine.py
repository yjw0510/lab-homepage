"""Re-open the ByteFF-Pol box at the end of its 2.4 ns run and re-sample it densely.

The production run wrote one frame per picosecond, which is the right cadence for averaging
a coordination number and the wrong one for showing motion: molecules translate several
tenths of an angstrom and rotate 10-20 degrees between consecutive frames, so playback reads
as a slideshow of unrelated configurations. This restarts from the last frame and writes
every 50 fs instead, twenty times finer.

The box is frozen for the sampling segment so every exported frame shares one cell, which is
what the browser asset assumes.

  BYTEFF2_PLATFORM=OpenCL /Users/yjw0510/miniconda3/envs/byteff2/bin/python \
      scripts/rerun-electrolyte-fine.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, "/tmp/byteff2")

import numpy as np
import openmm as omm
import openmm.app as app
import openmm.unit as ou
from MDAnalysis.coordinates.DCD import DCDReader

from byteff2.toolkit.openmmtool import generate_openmm_system
from byteff2.toolkit.protocol import DensityProtocol

RUN = Path("/tmp/elyte-byteff")
OUT = RUN / "results" / os.environ.get("ELYTE_OUT", "fine.dcd")
TIMESTEP_FS = 2
EQUILIBRATE_PS = 20      # velocities are re-drawn on restart; let them re-couple
SAMPLE_PS = int(os.environ.get("ELYTE_SAMPLE_PS", "20"))
REPORT_FS = 50           # 0.05 ps -> 400 frames over the sampling segment


def simulation(top, system, temperature: float) -> app.Simulation:
    for i in range(system.getNumForces()):
        force = system.getForce(i)
        force.setForceGroup(
            1 if isinstance(force, (omm.AmoebaMultipoleForce, omm.NonbondedForce,
                                    omm.CustomNonbondedForce)) else 0)
    integrator = omm.MTSLangevinIntegrator(
        temperature * ou.kelvin, 0.1 / ou.picosecond, TIMESTEP_FS * ou.femtoseconds,
        [(0, 2), (1, 1)])
    platform = omm.Platform.getPlatformByName(os.environ.get("BYTEFF2_PLATFORM", "OpenCL"))
    if platform.getName() != "OpenCL":
        platform.setPropertyDefaultValue("Precision", "mixed")
    return app.Simulation(top.topology, system, integrator, platform)


def main() -> None:
    config = json.loads((RUN / "config.json").read_text())
    protocol = DensityProtocol(config)
    nonbonded_params = protocol.generate_ff_params(config["smiles"])

    reader = DCDReader(str(RUN / "results" / "npt.dcd"))
    last = reader[len(reader) - 1]
    positions = last.positions.copy() / 10.0                 # A -> nm
    box_nm = last.dimensions[:3].copy() / 10.0
    print(f"restart from frame {len(reader) - 1} of {len(reader)}, box {box_nm}")

    top, system = generate_openmm_system(
        str(RUN / "params" / "system.top"), nonbonded_params,
        omm.Vec3(*box_nm) * ou.nanometer)

    temperature = config["temperature"]
    barostat = omm.MonteCarloBarostat(1.0 * ou.atmospheres, temperature * ou.kelvin, 12)
    system.addForce(barostat)
    sim = simulation(top, system, temperature)
    sim.context.setPeriodicBoxVectors(*(np.diag(box_nm) * ou.nanometer))
    sim.context.setPositions(positions * ou.nanometer)
    sim.context.setVelocitiesToTemperature(temperature * ou.kelvin)

    steps = lambda ps: int(ps * 1000 / TIMESTEP_FS)
    print(f"NPT re-equilibration {EQUILIBRATE_PS} ps ...", flush=True)
    sim.step(steps(EQUILIBRATE_PS))

    # Freeze the cell so every sampled frame shares one box.
    state = sim.context.getState(getPositions=True, getVelocities=True)
    for index, force in enumerate(system.getForces()):
        if isinstance(force, omm.MonteCarloBarostat):
            system.removeForce(index)
            break
    sim.context.reinitialize()
    sim.context.setPeriodicBoxVectors(*state.getPeriodicBoxVectors())
    sim.context.setPositions(state.getPositions())
    sim.context.setVelocities(state.getVelocities())

    sim.reporters.append(app.DCDReporter(str(OUT), steps(REPORT_FS / 1000),
                                         enforcePeriodicBox=False))
    sim.reporters.append(app.StateDataReporter(
        sys.stdout, steps(2), step=True, temperature=True, density=True, speed=True))
    print(f"NVT sampling {SAMPLE_PS} ps at {REPORT_FS} fs/frame ...", flush=True)
    sim.step(steps(SAMPLE_PS))

    frames = len(DCDReader(str(OUT)))
    final_box = np.diag(sim.context.getState().getPeriodicBoxVectors(asNumpy=True)
                        .value_in_unit(ou.nanometer))
    print(json.dumps({"dcd": str(OUT), "frames": frames, "framePs": REPORT_FS / 1000,
                      "boxNm": [round(float(v), 4) for v in final_box]}, indent=2))
    assert frames >= SAMPLE_PS * 1000 / REPORT_FS - 1, frames


if __name__ == "__main__":
    main()
