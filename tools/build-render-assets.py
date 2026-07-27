"""Bake the Blender/Cycles multiscale renders into web deliverables for this site.

Source of truth is the render project's transparent RGBA masters
(`final-renders/<id>/frames/*.png` and `still.png`). Because `bloom_glow` is off for
every system, those masters are clean straight-alpha images, so a render can be
recomposited over an arbitrary flat colour with no seam. We composite over the two
site background tokens, which is what makes the subject read as floating directly on
the page instead of sitting inside a black rectangle.

    python tools/build-render-assets.py [--only <id>] [--frames-limit N]

Writes public/renders/<slug>/{poster,loop}-{light,dark}.* plus manifest.json.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

RENDER_ROOT = Path(
    "/Users/yjw0510/Desktop/projects/rendering/molecular-backgrounds/final-renders"
)
OUT_ROOT = Path(__file__).resolve().parent.parent / "public" / "renders"

# DESIGN.md §1 background tokens. Compositing over these exactly is what removes the
# plate edge; a pure-black composite would show a rectangle against #100F0F.
BACKGROUNDS = {"light": (0xF5, 0xF5, 0xF5), "dark": (0x10, 0x0F, 0x0F)}

LOOP_EDGE = 1024
POSTER_EDGE = 1280
FPS = 24
# Per-system H.264 quality. Dense subjects (thousands of textured beads) cost far more
# bits at the same CRF, so the two mesoscale systems are given a coarser setting to keep
# any single loop under roughly 4 MB.
CRF = 26
CRF_BY_SLUG = {"capsid": 31, "dendrimer": 29, "double-gyroid": 28, "woven-cof": 28}

# tier + web slug per render id (tiers per the render project's SPEC.md §3 table)
SYSTEMS = [
    ("01_cof505", "dft", "woven-cof"),
    ("02_knot", "dft", "molecular-knot"),
    ("03_buckycatcher", "mlff", "buckycatcher"),
    ("04_dwcnt", "mlff", "nanotube"),
    ("05_pd30l60", "allatom", "goldberg-cage"),
    ("06_pamam_g5", "allatom", "dendrimer"),
    ("07_gyroid", "meso", "double-gyroid"),
    ("08_capsid", "meso", "capsid"),
]


def composite_square(src: Path, bg: tuple[int, int, int], edge: int) -> Image.Image:
    """Composite a straight-alpha master over `bg`, pad to square, resize to `edge`."""
    with Image.open(src) as im:
        im = im.convert("RGBA")
        flat = Image.alpha_composite(Image.new("RGBA", im.size, (*bg, 255)), im).convert("RGB")
    side = max(flat.size)
    canvas = Image.new("RGB", (side, side), bg)
    canvas.paste(flat, ((side - flat.width) // 2, (side - flat.height) // 2))
    return canvas.resize((edge, edge), Image.LANCZOS)


def _bake_frame(job: tuple[str, str, str, int]) -> None:
    src, light_dir, dark_dir, index = job
    for mode, out_dir in (("light", light_dir), ("dark", dark_dir)):
        composite_square(Path(src), BACKGROUNDS[mode], LOOP_EDGE).save(
            Path(out_dir) / f"{index:04d}.png", compress_level=1
        )


def run_ffmpeg(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], check=True)


def encode_loop(frames_dir: Path, out_stem: Path, crf: int) -> None:
    """H.264 only. This is a repo-size and simplicity decision, not a quality one: at
    the shipped operating point a matched VP9 encode measures about 7% smaller and
    0.4 dB better (capsid light, 96 frames: vp9 crf52 = 3.65 MB / 23.78 dB against
    x264 crf31 = 3.95 MB / 23.34 dB). H.264 alone avoids a second ladder and is
    universally decodable; the efficiency left on the table is small enough to pay.

    Deliberately left UNTAGGED for colour. Measured in Chrome against a `#100F0F` field,
    the untagged stream decodes the backdrop to (15,15,15) — one level off the token, which
    is invisible. Tagging full-range BT.709 (or sRGB transfer) makes Chrome apply a transfer
    conversion that crushes the same backdrop to (0,0,0) and draws a hard rectangle where the
    plate meets the page. Do not "fix" this by adding colour metadata."""
    run_ffmpeg(
        ["-framerate", str(FPS), "-i", str(frames_dir / "%04d.png"),
         "-c:v", "libx264", "-crf", str(crf), "-preset", "slow", "-pix_fmt", "yuv420p",
         "-profile:v", "high", "-movflags", "+faststart", "-an",
         str(out_stem.with_suffix(".mp4"))]
    )


def build_system(render_id: str, slug: str, frames_limit: int | None) -> dict:
    src_dir = RENDER_ROOT / render_id
    out_dir = OUT_ROOT / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    frames = sorted(src_dir.glob("frames/[0-9][0-9][0-9][0-9].png"))
    if frames_limit:
        frames = frames[:frames_limit]

    # The poster is frame 0 of the loop, not the separate `still.png` hero render. The two
    # masters have different aspect ratios, so squaring them independently scales the
    # subject differently and the loop visibly pops when it crossfades in over the poster.
    for mode, bg in BACKGROUNDS.items():
        poster = composite_square(frames[0], bg, POSTER_EDGE)
        poster.save(out_dir / f"poster-{mode}.webp", quality=82, method=6)
        poster.resize((640, 640), Image.LANCZOS).save(
            out_dir / f"poster-{mode}-sm.webp", quality=80, method=6
        )

    with tempfile.TemporaryDirectory() as tmp:
        light_dir = Path(tmp) / "light"
        dark_dir = Path(tmp) / "dark"
        light_dir.mkdir()
        dark_dir.mkdir()
        jobs = [(str(f), str(light_dir), str(dark_dir), i) for i, f in enumerate(frames)]
        with ProcessPoolExecutor(max_workers=8) as pool:
            list(pool.map(_bake_frame, jobs, chunksize=2))
        crf = CRF_BY_SLUG.get(slug, CRF)
        encode_loop(light_dir, out_dir / "loop-light", crf)
        encode_loop(dark_dir, out_dir / "loop-dark", crf)

    sizes = {p.name: p.stat().st_size for p in sorted(out_dir.iterdir())}
    print(f"[{slug}] {len(frames)} frames -> {sum(sizes.values()) / 1e6:.1f} MB", flush=True)
    return {"bytes": sizes, "frames": len(frames)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--frames-limit", type=int)
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        print("ffmpeg not on PATH", file=sys.stderr)
        return 1

    targets = [s for s in SYSTEMS if not args.only or s[0] == args.only or s[2] == args.only]
    manifest = {
        "loopEdge": LOOP_EDGE,
        "posterEdge": POSTER_EDGE,
        "fps": FPS,
        "backgrounds": {k: "#%02x%02x%02x" % v for k, v in BACKGROUNDS.items()},
        "systems": {},
    }
    for render_id, tier, slug in targets:
        result = build_system(render_id, slug, args.frames_limit)
        manifest["systems"][slug] = {"renderId": render_id, "tier": tier, **result}

    if not args.only:
        (OUT_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    total = sum(sum(s["bytes"].values()) for s in manifest["systems"].values())
    print(f"total {total / 1e6:.1f} MB across {len(manifest['systems'])} systems")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
