// Content sliced by a boundary that is not its own.
//
// The earlier probe only compared an element against itself (`scrollWidth > clientWidth`), which
// catches text overflowing the box it lives in. It cannot see the case where the box is fine and
// something ABOVE it does the cutting: an ancestor with `overflow: hidden`, or an `<svg>` whose
// viewBox crops everything outside it. In the second case no DOM element reports anything at all,
// so a glyph half outside a schematic's left edge is invisible to every DOM measurement — which
// is exactly how a sliced "U" in U_LJ survived a 160-capture audit.
//
// So: for every painted element, walk up to the nearest clipping ancestor and compare rectangles.
// Report how many pixels stick out on each side.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT
  ?? ".superloopy/sessions/20260804-visual-code-audit/evidence/probes/CLIPPING.md";

const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const ROUTES = ["", "/people", "/publications", "/research-topics", "/news", "/funding", "/contact",
                "/multiscale/dft", "/multiscale/mlff", "/multiscale/allatom", "/multiscale/meso",
                "/publications/2025-acetic-acid-scw-mlip"];
const SCENES = [["dft", 0], ["dft", 1], ["mlff", 0], ["mlff", 1],
                ["allatom", 0], ["allatom", 1], ["meso", 0], ["meso", 1]];

/** A slice this thin is antialiasing or a rounding edge, not lost content. */
const TOLERANCE = 1.5;

const PROBE = (tol) => {
  const out = [];

  const describe = (el) => {
    const cls = (el.className?.baseVal ?? el.className ?? "").toString()
      .split(/\s+/).filter(Boolean).slice(0, 3).join(".");
    const id = el.id ? `#${el.id}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls ? "." + cls : ""}`;
  };

  /** The first ancestor that actually crops: overflow != visible, or the SVG viewport itself. */
  const clipper = (el) => {
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      // An <svg> always crops to its viewport unless overflow is explicitly opened up.
      if (node.tagName.toLowerCase() === "svg" && cs.overflow !== "visible") return node;
      if (cs.overflow !== "visible" || cs.clipPath !== "none") return node;
      node = node.parentElement;
    }
    return null;
  };

  // KaTeX renders every formula twice: a visual `.katex-html` tree and a MathML tree that is
  // deliberately clipped away for assistive technology. `.sr-only` is the same idea in CSS.
  // Both are clipped by construction and are not lost content.
  const hidden = (el) =>
    el.closest(".katex-mathml, .sr-only, [aria-hidden='true']") !== null ||
    ["math", "semantics", "annotation", "mrow", "mi", "mo", "mn", "ms", "mtext", "msub", "msup",
     "msubsup", "mfrac", "msqrt", "munder", "mover", "munderover", "mtable", "mtr", "mtd",
     "mpadded", "mspace", "mstyle"].includes(el.tagName.toLowerCase());

  const painted = (el) => {
    if (hidden(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
    const tag = el.tagName.toLowerCase();
    // Things that carry ink. Containers are skipped: a wrapper poking out of a scroller is
    // normal, a glyph or a stroke poking out of one is not.
    if (["text", "tspan", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "image", "use"].includes(tag)) return true;
    if (el.childElementCount === 0) {
      for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll("body *")) {
    if (!painted(el)) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const clip = clipper(el);
    if (!clip) continue;
    const cb = clip.getBoundingClientRect();
    if (cb.width < 1 || cb.height < 1) continue;
    // A scroll container legitimately holds content beyond its box on the scroll axis.
    const cs = getComputedStyle(clip);
    const scrollsX = cs.overflowX === "auto" || cs.overflowX === "scroll";
    const scrollsY = cs.overflowY === "auto" || cs.overflowY === "scroll";

    const left = scrollsX ? 0 : cb.left - box.left;
    const right = scrollsX ? 0 : box.right - cb.right;
    const top = scrollsY ? 0 : cb.top - box.top;
    const bottom = scrollsY ? 0 : box.bottom - cb.bottom;
    const worst = Math.max(left, right, top, bottom);
    if (worst <= tol) continue;
    // How much of the element is actually lost, so a 2px nick ranks below a halved glyph.
    const visibleW = Math.max(0, Math.min(box.right, cb.right) - Math.max(box.left, cb.left));
    const visibleH = Math.max(0, Math.min(box.bottom, cb.bottom) - Math.max(box.top, cb.top));
    const lostShare = 1 - (visibleW * visibleH) / (box.width * box.height);

    out.push({
      el: describe(el),
      clippedBy: describe(clip),
      text: (el.textContent ?? "").trim().slice(0, 46),
      sides: {
        left: +Math.max(0, left).toFixed(1), right: +Math.max(0, right).toFixed(1),
        top: +Math.max(0, top).toFixed(1), bottom: +Math.max(0, bottom).toFixed(1),
      },
      worst: +worst.toFixed(1),
      lostPct: +(lostShare * 100).toFixed(1),
    });
  }
  out.sort((a, b) => b.lostPct - a.lostPct || b.worst - a.worst);
  return out.slice(0, 40);
};

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--use-gl=angle",
         "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});

const rows = [];
for (const theme of ["dark", "light"]) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport });
    await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* pre-nav */ } }, theme);
    for (const lang of ["en", "ko"]) {
      for (const route of ROUTES) {
        const page = await ctx.newPage();
        const id = `${theme}-${vpName}-${lang}-${(route || "/home").replace(/\//g, "_").replace(/^_/, "")}`;
        try {
          await page.goto(`${BASE}/${lang}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForTimeout(3500);
          for (const hit of await page.evaluate(PROBE, TOLERANCE)) rows.push({ id, ...hit });
        } catch (e) { console.log(`FAIL ${id}: ${e.message.split("\n")[0]}`); }
        await page.close().catch(() => {});
      }
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/${lang}/multiscale`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForFunction(() => typeof window.__multiscaleDebug?.jumpToScene === "function", undefined, { timeout: 60000 });
        for (const [level, step] of SCENES) {
          await page.evaluate(([l, s]) => window.__multiscaleDebug.jumpToScene(l, s, 0.8), [level, step]);
          await page.waitForTimeout(5000);
          const id = `${theme}-${vpName}-${lang}-scene-${level}${step}`;
          for (const hit of await page.evaluate(PROBE, TOLERANCE)) rows.push({ id, ...hit });
        }
      } catch (e) { console.log(`FAIL scenes ${theme}/${vpName}/${lang}: ${e.message.split("\n")[0]}`); }
      await page.close().catch(() => {});
    }
    await ctx.close().catch(() => {});
  }
}
await browser.close();

const group = {};
for (const r of rows) {
  const k = `${r.el}|${r.clippedBy}|${r.text}`;
  (group[k] ??= []).push(r);
}
const entries = Object.entries(group)
  .map(([k, xs]) => ({ k, xs, lost: Math.max(...xs.map((x) => x.lostPct)), worst: Math.max(...xs.map((x) => x.worst)) }))
  .sort((a, b) => b.lost - a.lost || b.worst - a.worst);

const L = [`# Clipped by an ancestor — ${rows.length} hits across ${new Set(rows.map((r) => r.id)).size} captures\n`];
L.push(`Content whose painted box falls outside its nearest clipping ancestor: an element with`);
L.push(`\`overflow\` other than visible, a \`clip-path\`, or an \`<svg>\` viewport. Scroll containers are`);
L.push(`excluded on their scroll axis. Slices under ${TOLERANCE}px are ignored as antialiasing.\n`);
L.push(`This is the class of defect the per-element overflow check could not see: the element's own`);
L.push(`box is intact, and for an SVG viewBox nothing in the DOM reports anything at all.\n`);
L.push(`| lost | worst side | element | clipped by | text | captures |`);
L.push(`|---|---|---|---|---|---|`);
for (const e of entries.slice(0, 60)) {
  const x = e.xs[0];
  const side = Object.entries(x.sides).filter(([, v]) => v > 0).map(([s, v]) => `${s} ${v}px`).join(", ");
  L.push(`| ${e.lost}% | ${side} | \`${x.el}\` | \`${x.clippedBy}\` | ${x.text.replace(/\|/g, "\\|") || "—"} | ${e.xs.length} |`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, L.join("\n"));
console.log(L.slice(0, 8).join("\n"));
console.log(`\n${rows.length} hits, ${entries.length} distinct. wrote ${OUT}`);
console.log(entries.slice(0, 12).map((e) => `${e.lost}% ${e.xs[0].el} <- ${e.xs[0].clippedBy} "${e.xs[0].text}" (${e.xs.length}x)`).join("\n"));
