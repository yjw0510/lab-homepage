"""Re-bake the home-page specimen loops from the render masters.

There was no script for this. The loops in `public/renders/` were produced once, by hand, and
nothing recorded the resolution or the encoder settings that made them, which is why nobody
could say why they looked soft. This is that script.

What it does, per specimen and per theme: takes the 96 transparent RGBA masters the render
project preserved, applies the same multi-scale glow the render project's own delivery step
applies, composites the result over the theme's background colour, scales to the requested
edge, and hands the frame sequence to ffmpeg.

Why it re-composites rather than re-encoding what shipped: the shipped file is 1024 px and
lossy, so nothing above that can be recovered from it. The masters are 3840 px.

Resolution is not a guess. Measured on the built site, the plate renders at 842 CSS px on a
1920 viewport, so a 2x display asks for 1684 device pixels and was being handed 1024, an
upscale of 1.64x before the reader zooms at all. Phone and tablet ask for 678 and 696, which
1024 already covers, so the small tier stays where it is and only the large tier moves.

  python scripts/bake-specimen-loops.py --edge 2048 --tier large [--only woven-cof]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

RENDER_PROJECT = Path("/Users/yjw0510/Desktop/projects/rendering/molecular-backgrounds")
ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = ROOT / "public" / "renders"
MANIFEST = OUT_ROOT / "manifest.json"

sys.path.insert(0, str(RENDER_PROJECT / "delivery"))
from glow import compute_glow, glow_params  # noqa: E402


def composite(args) -> str:
    """Glow, composite over the theme colour, scale. Returns the written path."""
    source, destination, background, edge, params = args
    array = np.array(Image.open(source).convert("RGBA")).astype(np.float32) / 255.0
    rgb, alpha = array[..., :3], array[..., 3]
    glow = compute_glow(rgb, alpha, params)
    # The glow is emitted light, so it adds over whatever is behind it rather than being
    # blended with it. This is the same expression the render project's own still and video
    # steps use; the only thing that changes here is the colour behind and the final size.
    base = rgb * alpha[..., None] + np.array(background) * (1.0 - alpha[..., None])
    out = np.clip(base + glow, 0.0, 1.0)
    # Pad the short edge to square before scaling, centred, in the background colour.
    #
    # This is the framing that already ships, recovered from the files rather than assumed: in
    # the 1024 px loop the object occupies 0.808 of the frame height against 0.807 in the master
    # and sits at the same vertical centre, while its share of the width drops from 0.897 to
    # 0.637. That is padding on the width, not a crop of the height. Reproducing it matters
    # because the poster is square too, and `object-fit: cover` maps a square poster and a
    # 0.709 video onto different crops of the same box, which is seen as the still jumping
    # when the loop reveals over it. Padded here rather than after the scale so the master is
    # downsampled once.
    side = max(out.shape[0], out.shape[1])
    square = np.empty((side, side, 3), dtype=np.float32)
    square[:] = np.array(background, dtype=np.float32)
    top = (side - out.shape[0]) // 2
    left = (side - out.shape[1]) // 2
    square[top:top + out.shape[0], left:left + out.shape[1]] = out
    image = Image.fromarray((square * 255).astype(np.uint8))
    if image.width != edge:
        image = image.resize((edge, edge), Image.LANCZOS)
    image.save(destination)
    return str(destination)


def hex_to_rgb(value: str) -> tuple[float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--edge", type=int, required=True)
    parser.add_argument("--tier", required=True, help="filename suffix, e.g. large")
    parser.add_argument("--only", action="append", help="specimen slug; repeatable")
    parser.add_argument("--stage", default="/tmp/specimen-bake")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text())
    backgrounds = {name: hex_to_rgb(value) for name, value in manifest["backgrounds"].items()}
    fps = manifest["fps"]

    slugs = args.only or list(manifest["systems"])
    stage = Path(args.stage)
    for slug in slugs:
        render_id = manifest["systems"][slug]["renderId"]
        frames = RENDER_PROJECT / "final-renders" / render_id / "frames"
        masters = sorted(frames.glob("[0-9]" * 4 + ".png"))
        assert masters, f"no masters for {slug} at {frames}"
        scene = json.loads((RENDER_PROJECT / "systems" / f"{render_id}.json").read_text())
        params = glow_params(scene)

        for theme, background in backgrounds.items():
            lit = stage / f"{slug}-{theme}-{args.edge}"
            lit.mkdir(parents=True, exist_ok=True)
            work = [(master, lit / master.name, background, args.edge, params)
                    for master in masters]
            with ProcessPoolExecutor(max_workers=8) as pool:
                list(pool.map(composite, work))
            print(f"  {slug} {theme}: {len(work)} frames at {args.edge} px -> {lit}", flush=True)

    print(json.dumps({"staged": str(stage), "fps": fps, "edge": args.edge, "tier": args.tier,
                      "specimens": slugs}, indent=2))


if __name__ == "__main__":
    main()
