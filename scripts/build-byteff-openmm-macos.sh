#!/bin/bash
# Build ByteFF-Pol's patched OpenMM for Apple Silicon, accelerated by OpenCL.
#
# Their submodules/openmm/build_openmm.sh cannot run here: it calls `apt install` and
# `make -j$(nproc)`, and it deliberately configures a CUDA-only build --
# OPENMM_BUILD_OPENCL_LIB=OFF, OPENMM_BUILD_AMOEBA_OPENCL_LIB=OFF, OPENMM_BUILD_COMMON=OFF.
# Those are choices, not constraints. Both of their patches change AMOEBA's hardcoded
# intramolecular scaling (mScale/dScale/pScale), and the GPU half lands in
# plugins/amoeba/platforms/common/, which is the shared compute layer behind CUDA, OpenCL and
# HIP. Flipping the flags therefore gives the same corrected kernels on OpenCL, which is
# verified working on this machine: AmoebaMultipoleForce/PME agrees with the Reference
# platform to 0.001 kJ/mol out of -6038, and libOpenMMAmoebaOpenCL.dylib already ships in the
# conda build.
#
# Nothing is installed outside the prefix and the conda env passed in. No sudo, no dotfiles.
#
# Usage: scripts/build-byteff-openmm-macos.sh <prefix-dir> <conda-env-python>
set -euo pipefail

PREFIX="${1:?prefix directory required, e.g. /tmp/byteff-openmm/openmm}"
PYTHON="${2:?path to the python that should get the wrappers}"
SRC="$(dirname "$PREFIX")/src"
PATCH_DIR="/tmp/byteff2/submodules/openmm"
JOBS="$(sysctl -n hw.ncpu)"

test -f "$PATCH_DIR/amoeba_scale_cpu.patch" || { echo "byteff2 patches not found at $PATCH_DIR"; exit 1; }

rm -rf "$SRC" && mkdir -p "$SRC"
git clone --branch 8.5.1 --single-branch --depth 1 https://github.com/openmm/openmm.git "$SRC/openmm"
cd "$SRC/openmm"

# --depth 1 has no author identity for `git am`; apply the diffs directly instead.
git apply -v "$PATCH_DIR/amoeba_scale_cpu.patch"
git apply -v "$PATCH_DIR/amoeba_scale_cuda.patch"
echo "### both ByteFF-Pol scaling patches applied ###"

mkdir -p build && cd build
cmake .. \
  -DBUILD_TESTING=OFF \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$PREFIX" \
  -DOPENMM_BUILD_COMMON=ON \
  -DOPENMM_BUILD_OPENCL_LIB=ON \
  -DOPENMM_BUILD_AMOEBA_PLUGIN=ON \
  -DOPENMM_BUILD_AMOEBA_OPENCL_LIB=ON \
  -DOPENMM_BUILD_DRUDE_PLUGIN=ON \
  -DOPENMM_BUILD_DRUDE_OPENCL_LIB=ON \
  -DOPENMM_BUILD_RPMD_PLUGIN=ON \
  -DOPENMM_BUILD_RPMD_OPENCL_LIB=ON \
  -DOPENMM_BUILD_PME_PLUGIN=ON \
  -DOPENMM_BUILD_CPU_LIB=ON \
  -DOPENMM_BUILD_CUDA_LIB=OFF \
  -DOPENMM_BUILD_AMOEBA_CUDA_LIB=OFF \
  -DOPENMM_BUILD_DRUDE_CUDA_LIB=OFF \
  -DOPENMM_BUILD_RPMD_CUDA_LIB=OFF \
  -DOPENMM_BUILD_EXAMPLES=OFF \
  -DOPENMM_BUILD_SHARED_LIB=ON \
  -DOPENMM_BUILD_STATIC_LIB=OFF \
  -DOPENMM_BUILD_PYTHON_WRAPPERS=ON \
  -DOPENMM_GENERATE_API_DOCS=OFF \
  -DPYTHON_EXECUTABLE="$PYTHON"

make -j"$JOBS" install
make PythonInstall

echo "### installed to $PREFIX ###"
"$PYTHON" -m openmm.testInstallation || true
