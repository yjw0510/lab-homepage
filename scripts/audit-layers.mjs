// What a flat screenshot cannot tell you.
//
// Two things a PNG hides. First, a page is a stack: elements overlap, blend, sit at opacity
// below 1, and cover each other. A reviewer reading pixels sees the composite and cannot say
// which layer produced it, nor that something is painted and then buried. Second, a dense scene
// carries more information per pixel than a 1x capture resolves, so judging it from the full
// frame is judging a thumbnail.
//
// This pass answers both. It samples `document.elementFromPoint` on a grid inside every visible
// element — the browser's own hit-test, which is the ground truth for paint order — and it
// re-renders the densest regions of each scene at 3x through a screenshot clip.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.BASE ?? "http://localhost:3000";
const ROOT = process.env.EVIDENCE ?? ".superloopy/sessions/20260804-visual-code-audit/evidence";
const SHOTS = path.join(ROOT, "shots");
const LAYERS = path.join(ROOT, "layers");
const ZOOM = path.join(ROOT, "shots-zoom");
for (const d of [LAYERS, ZOOM]) fs.mkdirSync(d, { recursive: true });

const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const SCENES = [["dft", 0], ["dft", 1], ["mlff", 0], ["mlff", 1],
                ["allatom", 0], ["allatom", 1], ["meso", 0], ["meso", 1]];
const CONTENT = process.env.SCENES_ONLY ? [] : ["", "/people", "/publications", "/research-topics", "/news", "/funding",
                 "/contact", "/multiscale/dft", "/multiscale/mlff", "/multiscale/allatom",
                 "/multiscale/meso", "/publications/2025-acetic-acid-scw-mlip"];

/** Zoom factor for the crops. 3x on a 1x capture is a real re-render, not an upscale. */
const ZOOM_SCALE = 3;
/** Densest regions to crop per capture. */
const CROPS = 4;
/** Grid the density map is computed on. */
const TILE = 8;

const LAYER_PROBE = () => {
  const out = {
    stacking: [], overlaps: [], occluded: [], translucent: [], blended: [],
    invisible: [], counts: {},
  };
  const seen = new Map();
  const els = [...document.querySelectorAll("body *")];

  const isAncestor = (a, b) => a !== b && a.contains(b);
  const describe = (el) => {
    const cls = (el.className?.baseVal ?? el.className ?? "").toString().split(/\s+/).filter(Boolean).slice(0, 4).join(".");
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
  };

  for (const el of els) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const onScreen = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
    if (!onScreen) continue;

    const op = parseFloat(cs.opacity);
    const blend = cs.mixBlendMode;
    const z = cs.zIndex;
    const text = (el.textContent ?? "").trim().slice(0, 40);

    // Anything that establishes its own stacking context changes what can cover what.
    if (z !== "auto" || cs.isolation === "isolate" || (op < 1 && op > 0) || blend !== "normal"
        || cs.position === "fixed" || cs.transform !== "none" || cs.filter !== "none") {
      out.stacking.push({ desc: describe(el), z, opacity: op, blend, position: cs.position,
                          transform: cs.transform === "none" ? undefined : "yes",
                          filter: cs.filter === "none" ? undefined : cs.filter });
    }
    if (op < 1 && op > 0) out.translucent.push({ desc: describe(el), opacity: op, text });
    if (blend !== "normal") out.blended.push({ desc: describe(el), blend, text });
    // Present, sized, and painting nothing a reader can see.
    if (op === 0 || cs.visibility === "hidden") {
      out.invisible.push({ desc: describe(el), opacity: op, visibility: cs.visibility, text,
                           animation: cs.animationName === "none" ? undefined : cs.animationName });
    }

    // Hit-test the element's own area. If the browser hands back something that is neither this
    // element nor inside it, this element is covered there.
    //
    // `pointer-events: none` removes an element from hit testing while it keeps painting, so the
    // test answers with whatever is behind it. The scene title card is exactly this: painted over
    // the Mol* canvas, invisible to elementFromPoint. Record the value so the analysis can tell
    // "covered" from "not hit-testable", instead of reporting every overlay as buried.
    //
    // Sample inside getClientRects(), not the bounding box. A wrapped inline span's bounding box
    // is the union across its line boxes and covers the empty gutter at the end of each line, so
    // sampling it reports every wrapped author name as occluded by its own neighbour.
    if (text) {
      const pts = [];
      for (const cr of el.getClientRects()) {
        if (cr.width < 2 || cr.height < 2) continue;
        for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.25, 0.5, 0.75]) {
          pts.push([cr.left + cr.width * fx, cr.top + cr.height * fy]);
        }
      }
      let covered = 0; let tested = 0; let coverer = null;
      for (const [x, y] of pts) {
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        tested += 1;
        const hit = document.elementFromPoint(x, y);
        if (!hit) continue;
        if (hit === el || el.contains(hit) || isAncestor(hit, el)) continue;
        covered += 1; coverer = hit;
      }
      // Most of the element's own painted area has to be answering with something else.
      if (tested >= 6 && covered / tested >= 0.7 && coverer) {
        const key = describe(el) + "|" + describe(coverer);
        if (!seen.has(key)) {
          seen.set(key, true);
          out.occluded.push({ desc: describe(el), text, coveredPoints: covered, tested,
                              pointerEvents: cs.pointerEvents,
                              coveredBy: describe(coverer),
                              covererOpacity: parseFloat(getComputedStyle(coverer).opacity) });
        }
      }
    }
  }

  // Sibling rectangles that intersect. Ancestor/descendant nesting is normal; unrelated boxes
  // sharing pixels is where a collision hides.
  // Block-level boxes only. An inline element that wraps has a bounding box spanning the full
  // column width on every line it touches, which intersects everything beside it without a
  // single glyph colliding.
  const boxes = els.filter((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (cs.display.startsWith("inline") && e.getClientRects().length > 1) return false;
    // Layout containers are not collision candidates; anything covering half the viewport is a
    // shell, and every child of the page will cross it.
    if (r.width * r.height > innerWidth * innerHeight * 0.5) return false;
    return r.width > 24 && r.height > 16 && cs.display !== "none" && cs.visibility !== "hidden"
      && r.top < innerHeight && r.bottom > 0 && (e.textContent ?? "").trim().length > 0;
  }).slice(0, 400);
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i], b = boxes[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      const area = ix * iy;
      if (area < 200) continue;
      const aA = ra.width * ra.height, aB = rb.width * rb.height;
      // One box geometrically inside the other is layering, not collision: the sticky nav sits
      // over a container the page pulls up under it with a negative margin, and every nav item
      // then "overlaps" the whole page at share 1. Require the two to genuinely cross.
      const contains = (p, q) => p.left <= q.left + 1 && p.top <= q.top + 1
        && p.right >= q.right - 1 && p.bottom >= q.bottom - 1;
      if (contains(ra, rb) || contains(rb, ra)) continue;
      const share = area / Math.min(aA, aB);
      if (share < 0.25) continue;
      out.overlaps.push({ a: describe(a), b: describe(b), area: Math.round(area),
                          share: +share.toFixed(2),
                          aText: (a.textContent ?? "").trim().slice(0, 30),
                          bText: (b.textContent ?? "").trim().slice(0, 30) });
    }
  }
  const cap = (arr, n) => arr.slice(0, n);
  out.stacking = cap(out.stacking, 40);
  out.overlaps = cap(out.overlaps.sort((x, y) => y.share - x.share), 25);
  out.occluded = cap(out.occluded, 25);
  out.translucent = cap(out.translucent, 30);
  out.blended = cap(out.blended, 20);
  out.invisible = cap(out.invisible, 20);
  out.counts = { stacking: out.stacking.length, overlaps: out.overlaps.length,
                 occluded: out.occluded.length, translucent: out.translucent.length,
                 blended: out.blended.length, invisible: out.invisible.length };
  return out;
};

/**
 * Where the information is.
 *
 * Local gradient magnitude per tile: a flat wash scores near zero, a ball-and-stick molecule or a
 * dense label cluster scores high. Returns the densest tiles as viewport-space rectangles, merged
 * so two adjacent hot tiles become one crop rather than two overlapping ones.
 */
async function denseRegions(pngPath, vw, vh, count) {
  const { data, info } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const tw = Math.floor(w / TILE), th = Math.floor(h / TILE);
  const score = [];
  for (let ty = 0; ty < TILE; ty += 1) {
    for (let tx = 0; tx < TILE; tx += 1) {
      let sum = 0, n = 0;
      for (let y = ty * th + 1; y < (ty + 1) * th - 1; y += 2) {
        for (let x = tx * tw + 1; x < (tx + 1) * tw - 1; x += 2) {
          const i = y * w + x;
          sum += Math.abs(data[i] - data[i + 1]) + Math.abs(data[i] - data[i + w]);
          n += 1;
        }
      }
      score.push({ tx, ty, v: n ? sum / n : 0 });
    }
  }
  score.sort((a, b) => b.v - a.v);
  const picked = [];
  for (const s of score) {
    if (picked.length >= count) break;
    if (picked.some((p) => Math.abs(p.tx - s.tx) <= 1 && Math.abs(p.ty - s.ty) <= 1)) continue;
    picked.push(s);
  }
  // One tile is small; widen to a 2x2 block around it so the crop carries context.
  return picked.map((p) => {
    const cw = Math.round((vw / TILE) * 2), chh = Math.round((vh / TILE) * 2);
    const x = Math.max(0, Math.min(vw - cw, Math.round((p.tx - 0.5) * (vw / TILE))));
    const y = Math.max(0, Math.min(vh - chh, Math.round((p.ty - 0.5) * (vh / TILE))));
    return { x, y, width: cw, height: chh, density: +p.v.toFixed(2) };
  });
}

const LAUNCH = {
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--use-gl=angle",
         "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
};

const index = [];
for (const theme of ["dark", "light"]) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    // One browser per theme x viewport. At deviceScaleFactor 3 with a live WebGL scene the
    // renderer has died mid-run; a fresh process per block means a crash costs one block, not
    // the pass.
    const browser = await chromium.launch(LAUNCH);
    // Scene captures are re-rendered at ZOOM_SCALE so a crop is real detail, not an upscale.
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: ZOOM_SCALE });
    await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* pre-nav origin */ } }, theme);
    const lang = "en";

    for (const route of CONTENT) {
      const slug = (route || "/home").replace(/\//g, "_").replace(/^_/, "");
      const id = `${theme}-${vpName}-${lang}-${slug}`;
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/${lang}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(5000);
        const layers = await page.evaluate(LAYER_PROBE);
        fs.writeFileSync(path.join(LAYERS, `${id}.json`), JSON.stringify(layers, null, 1));
        index.push({ id, surface: "content", ...layers.counts });
        console.log(`${id.padEnd(46)} overlap:${layers.counts.overlaps} occluded:${layers.counts.occluded} translucent:${layers.counts.translucent} blend:${layers.counts.blended} invisible:${layers.counts.invisible}`);
      } catch (e) { console.log(`FAIL ${id}: ${e.message.split("\n")[0]}`); }
      await page.close().catch(() => {});
    }

    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/${lang}/multiscale`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForFunction(() => typeof window.__multiscaleDebug?.jumpToScene === "function", undefined, { timeout: 60000 });
      for (const [level, step] of SCENES) {
        const id = `${theme}-${vpName}-${lang}-scene-${level}${step}`;
        await page.evaluate(([l, s]) => window.__multiscaleDebug.jumpToScene(l, s, 0.8), [level, step]);
        await page.waitForTimeout(7000);
        const layers = await page.evaluate(LAYER_PROBE);
        fs.writeFileSync(path.join(LAYERS, `${id}.json`), JSON.stringify(layers, null, 1));

        const flat = path.join(SHOTS, `${id}.png`);
        if (fs.existsSync(flat)) {
          const regions = await denseRegions(flat, viewport.width, viewport.height, CROPS);
          for (const [k, clip] of regions.entries()) {
            await page.screenshot({
              path: path.join(ZOOM, `${id}-z${k}.png`),
              clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height },
            });
          }
          layers.zoomRegions = regions;
          fs.writeFileSync(path.join(LAYERS, `${id}.json`), JSON.stringify(layers, null, 1));
        }
        index.push({ id, surface: "instrument", ...layers.counts });
        console.log(`${id.padEnd(46)} overlap:${layers.counts.overlaps} occluded:${layers.counts.occluded} translucent:${layers.counts.translucent} blend:${layers.counts.blended} invisible:${layers.counts.invisible}`);
      }
    } catch (e) { console.log(`FAIL scenes ${theme}/${vpName}: ${e.message.split("\n")[0]}`); }
    await page.close().catch(() => {});
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
fs.writeFileSync(path.join(ROOT, "layer-index.json"), JSON.stringify(index, null, 1));
const t = (k) => index.reduce((s, r) => s + (r[k] ?? 0), 0);
console.log(`\n${index.length} layer probes. totals  overlaps ${t("overlaps")}  occluded ${t("occluded")}  translucent ${t("translucent")}  blended ${t("blended")}  invisible ${t("invisible")}`);
console.log(`zoom crops: ${fs.readdirSync(ZOOM).length} at ${ZOOM_SCALE}x`);
