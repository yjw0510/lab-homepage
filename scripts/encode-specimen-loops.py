"""Encode the staged specimen frames into the source ladder the page offers.

The ladder, and why each rung is there:

  2048 AV1 10-bit   what almost every visitor lands on. The plate renders at 842 CSS px on a
                    1920 viewport, so a 2x display asks for 1684 device pixels and was being
                    handed 1024. crf 44 is set from the hardest specimen in the set, a dense
                    periodic lattice, where it holds VMAF 97.6 and CAMBI 0.24; the easy ones
                    land near 99.9 at a third of the bytes.
  1024 H.264        the floor, and the file the site already shipped. Safari decodes AV1 in
                    hardware only, so Intel, M1 and M2 Macs and every iPhone before the 15 Pro
                    land here and get exactly what they get today. A source that is selected
                    and then fails to decode is never retried, so the last rung has to be the
                    one that cannot fail.

There is no middle H.264 rung and no HEVC rung. A 1536 H.264 tier measured larger than the
2048 AV1 tier it would sit beside and would have added about 90 MB to a repository whose git
directory is already 685 MB with no LFS, where binaries are kept forever. HEVC only reaches
Apple hardware that predates AV1, which is the population the floor already serves.

The `codecs` parameter is read back out of each encoded file rather than written by hand. A
string that promises more than the file delivers is fatal under the HTML source-selection
algorithm, and a string that is too vague makes the browser guess.

  python scripts/encode-specimen-loops.py [--stage /tmp/specimen-bake] [--only woven-cof]
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = ROOT / "public" / "renders"
MANIFEST = OUT_ROOT / "manifest.json"
GENERATED = ROOT / "src" / "lib" / "loopSources.generated.ts"

AV1_PARAMS = "enable-variance-boost=1:enable-qm=1:qm-min=0:film-grain=0"

RUNGS = [
    # name,        edge, encoder args
    ("2048.av1", 2048, ["-c:v", "libsvtav1", "-crf", "44", "-preset", "0",
                        "-svtav1-params", AV1_PARAMS, "-pix_fmt", "yuv420p10le"]),
]

FF = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"

AV1_TIER = {0: "M", 1: "H"}
H264_PROFILE_IDC = {"Baseline": 66, "Constrained Baseline": 66, "Main": 77, "High": 100}


def probe(path: Path) -> dict:
    fields = "stream=codec_name,profile,level,width,height,pix_fmt"
    out = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0",
                          "-show_entries", fields, "-of", "json", str(path)],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)["streams"][0]


def codecs_string(stream: dict) -> str:
    """The RFC 6381 parameter for this exact file."""
    if stream["codec_name"] == "av1":
        depth = 10 if "10" in stream["pix_fmt"] else 8
        # av01.<profile>.<seq_level_idx><tier>.<bitdepth>
        return f"av01.0.{int(stream['level']):02d}{AV1_TIER[0]}.{depth:02d}"
    if stream["codec_name"] == "h264":
        idc = H264_PROFILE_IDC[stream["profile"]]
        # avc1.<profile_idc><constraint_flags><level_idc>, each one byte of hex
        return f"avc1.{idc:02x}00{int(stream['level']):02x}"
    raise SystemExit(f"no codecs string rule for {stream['codec_name']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", default="/tmp/specimen-bake")
    parser.add_argument("--source-edge", type=int, default=2048)
    parser.add_argument("--only", action="append")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text())
    fps = manifest["fps"]
    slugs = args.only or list(manifest["systems"])
    ladder: dict[str, dict[str, list[dict]]] = {}

    for slug in slugs:
        ladder[slug] = {}
        for theme in manifest["backgrounds"]:
            frames = Path(args.stage) / f"{slug}-{theme}-{args.source_edge}"
            assert frames.is_dir(), f"missing staged frames: {frames}"
            rungs = []
            for name, edge, encoder in RUNGS:
                destination = OUT_ROOT / slug / f"loop-{theme}-{name}.mp4"
                scale = [] if edge == args.source_edge else \
                    ["-vf", f"scale={edge}:-2:flags=lanczos"]
                subprocess.run([FF, "-y", "-v", "error", "-framerate", str(fps),
                                "-i", str(frames / "%04d.png"), *scale, *encoder,
                                "-movflags", "+faststart", str(destination)], check=True)
                stream = probe(destination)
                rungs.append({
                    "src": f"/renders/{slug}/{destination.name}",
                    "codecs": codecs_string(stream),
                    "width": stream["width"],
                    "height": stream["height"],
                    "bytes": destination.stat().st_size,
                })
                print(f"  {slug} {theme} {name}: {rungs[-1]['bytes'] / 1048576:.2f} MB "
                      f"{stream['width']}x{stream['height']} {rungs[-1]['codecs']}", flush=True)
            # The floor is the file that already shipped; it is not re-encoded.
            floor = OUT_ROOT / slug / f"loop-{theme}.mp4"
            stream = probe(floor)
            rungs.append({
                "src": f"/renders/{slug}/{floor.name}",
                "codecs": codecs_string(stream),
                "width": stream["width"],
                "height": stream["height"],
                "bytes": floor.stat().st_size,
            })
            ladder[slug][theme] = rungs

    body = json.dumps(ladder, indent=2, sort_keys=True)
    GENERATED.write_text(
        "// Generated by scripts/encode-specimen-loops.py. Do not edit.\n"
        "//\n"
        "// Each rung's `codecs` parameter was read back out of the encoded file, because a\n"
        "// string that promises more than the file delivers makes the browser select that\n"
        "// source and then fail, with no retry.\n\n"
        "export interface LoopRung {\n"
        "  src: string;\n  codecs: string;\n  width: number;\n  height: number;\n  bytes: number;\n"
        "}\n\n"
        f"export const LOOP_LADDER: Record<string, Record<string, LoopRung[]>> = {body};\n")
    total = sum(r["bytes"] for s in ladder.values() for t in s.values() for r in t)
    print(f"\n{GENERATED.relative_to(ROOT)} written; ladder totals {total / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
