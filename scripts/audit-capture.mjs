// Capture every page and scene at both viewports, both themes, both locales, and probe the
// live DOM for the things a screenshot alone cannot prove: typography-ladder compliance,
// off-token colour, overflow, clipping, and tap-target size.
//
// Writes PNGs to <EVIDENCE>/shots and one JSON per capture to <EVIDENCE>/probes.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const ROOT = process.env.EVIDENCE
  ?? ".superloopy/sessions/20260804-visual-code-audit/evidence";
const SHOTS = path.join(ROOT, "shots");
const PROBES = path.join(ROOT, "probes");
for (const d of [SHOTS, PROBES]) fs.mkdirSync(d, { recursive: true });

const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const THEMES = ["dark", "light"];
const LANGS = ["en", "ko"];

const CONTENT_ROUTES = [
  "", "/people", "/publications", "/research-topics", "/news", "/funding", "/contact",
  "/multiscale/dft", "/multiscale/mlff", "/multiscale/allatom", "/multiscale/meso",
  "/publications/2025-acetic-acid-scw-mlip",
];
const SCENES = [
  ["dft", 0], ["dft", 1], ["mlff", 0], ["mlff", 1],
  ["allatom", 0], ["allatom", 1], ["meso", 0], ["meso", 1],
];

// The declared ladder from DESIGN.md section 2. Anything outside it is an escape.
const LADDER = { 900: "display", 800: "title", 700: "heading", 600: "lead", 500: "mono-meta", 430: "body", 400: "body-dark", 300: "quiet" };

/** Everything the page can tell us about itself that a picture cannot. */
const PROBE = () => {
  const out = {
    weights: {}, offLadder: [], tinyLight: [], overflowX: false,
    clipped: [], smallTargets: [], offToken: [], contrastRisk: [], counts: {},
  };
  const root = getComputedStyle(document.documentElement);
  const tokenHex = new Set();
  for (const name of [
    "--background", "--foreground", "--primary", "--accent-ink", "--primary-foreground",
    "--card", "--muted", "--muted-foreground", "--border", "--border-strong",
    "--accent", "--accent-foreground", "--surface-raised", "--surface-sunken",
    "--lv-dft", "--lv-mlff", "--lv-aa", "--lv-meso",
    "--lv-dft-text", "--lv-mlff-text",
  ]) {
    const v = root.getPropertyValue(name).trim();
    if (v) tokenHex.add(v.toLowerCase());
  }

  const doc = document.documentElement;
  out.overflowX = doc.scrollWidth > doc.clientWidth + 1;
  out.scroll = { w: doc.scrollWidth, cw: doc.clientWidth };

  const hasText = (el) => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  };

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    if (hasText(el)) {
      const w = parseInt(cs.fontWeight, 10);
      const size = parseFloat(cs.fontSize);
      out.weights[w] = (out.weights[w] ?? 0) + 1;
      const desc = `${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? "").toString().split(/\s+/).slice(0, 3).join(".")}`;
      // DESIGN.md: the ladder is 900/800/700/600/500/430/400/300. Anything else is an escape.
      if (![900, 800, 700, 600, 500, 430, 400, 300].includes(w)) {
        out.offLadder.push({ w, size, desc, text: el.textContent.trim().slice(0, 40) });
      }
      // DESIGN.md: "300 is forbidden below 21px."
      if (w <= 300 && size < 21) out.tinyLight.push({ w, size, desc, text: el.textContent.trim().slice(0, 40) });
      // Text wider or taller than its own box with hidden overflow is clipped copy.
      if (cs.overflow !== "visible" && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
        if (!el.closest("[data-allow-scroll]") && cs.overflowY !== "auto" && cs.overflowX !== "auto" && cs.overflowY !== "scroll" && cs.overflowX !== "scroll") {
          out.clipped.push({ desc, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, text: el.textContent.trim().slice(0, 50) });
        }
      }
      const color = cs.color.trim().toLowerCase();
      if (color && !tokenHex.has(color)) out.offToken.push({ prop: "color", value: cs.color, desc });
    }
    if ((el.tagName === "BUTTON" || el.tagName === "A" || el.getAttribute("role") === "button")
        && r.width > 0 && (r.width < 40 || r.height < 40)) {
      out.smallTargets.push({ desc: el.tagName + " " + (el.textContent.trim().slice(0, 24) || el.getAttribute("aria-label") || ""), w: Math.round(r.width), h: Math.round(r.height) });
    }
    // Anything painted past the right edge of the viewport.
    if (r.right > window.innerWidth + 2 && cs.position !== "fixed") {
      out.contrastRisk.push({ kind: "past-right-edge", desc: el.tagName.toLowerCase(), right: Math.round(r.right), vw: window.innerWidth });
    }
  }
  const dedupe = (arr, key) => {
    const seen = new Set(); const keep = [];
    for (const x of arr) { const k = key(x); if (!seen.has(k)) { seen.add(k); keep.push(x); } }
    return keep;
  };
  out.offToken = dedupe(out.offToken, (x) => x.value).slice(0, 25);
  out.clipped = dedupe(out.clipped, (x) => x.desc + x.text).slice(0, 25);
  out.smallTargets = dedupe(out.smallTargets, (x) => x.desc).slice(0, 25);
  out.offLadder = dedupe(out.offLadder, (x) => x.w + x.desc).slice(0, 25);
  out.tinyLight = dedupe(out.tinyLight, (x) => x.desc + x.text).slice(0, 25);
  out.contrastRisk = dedupe(out.contrastRisk, (x) => x.desc + x.right).slice(0, 15);
  out.counts = {
    offLadder: out.offLadder.length, tinyLight: out.tinyLight.length,
    clipped: out.clipped.length, smallTargets: out.smallTargets.length,
    offToken: out.offToken.length, pastRight: out.contrastRisk.length,
  };
  return out;
};

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader",
         "--use-gl=angle", "--enable-unsafe-swiftshader",
         // The home hero is a video loop behind a poster. Without this it never leaves the
         // poster, and a reviewer reading the capture cannot tell a stalled loop from a still.
         "--autoplay-policy=no-user-gesture-required"],
});

const index = [];
/**
 * Settle, then shoot.
 *
 * The wait is not decoration. Measured on the home hero: at 1200ms neither the poster nor the
 * loop has painted and the plate captures as an empty rectangle, which reads as a broken page
 * rather than a slow one. Posters are in by 6000ms. Every media-bearing route gets that budget
 * so a reviewer is never shown a defect the harness invented.
 */
async function capture(page, id, waitMs = 6000) {
  // Navigation waits on domcontentloaded, not networkidle. With autoplay enabled the hero
  // loop streams continuously and Next's route prefetches abort under a static export, so
  // the network never goes quiet and every route burned its full 60s timeout for no shot.
  //
  // The hold is the whole settle. An earlier version awaited `img.decode()` on every image
  // first; lazy images below the fold never load, their decode never settles, and the
  // evaluate hung forever on the first route.
  await page.waitForTimeout(waitMs);
  const shot = path.join(SHOTS, `${id}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  const probe = await page.evaluate(PROBE);
  fs.writeFileSync(path.join(PROBES, `${id}.json`), JSON.stringify(probe, null, 1));
  index.push({ id, shot, probe: path.join(PROBES, `${id}.json`), counts: probe.counts, overflowX: probe.overflowX });
  const c = probe.counts;
  console.log(`${id.padEnd(52)} ladder:${c.offLadder} tiny:${c.tinyLight} clip:${c.clipped} tap:${c.smallTargets} tok:${c.offToken} xscroll:${probe.overflowX ? "YES" : "-"}`);
}

for (const theme of THEMES) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => {
      try { localStorage.setItem("theme", t); } catch { /* first-party storage may be blocked */ }
    }, theme);
    for (const lang of LANGS) {
      for (const route of CONTENT_ROUTES) {
        const page = await ctx.newPage();
        const url = `${BASE}/${lang}${route}`;
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
          const slug = (route || "/home").replace(/\//g, "_").replace(/^_/, "");
          await capture(page, `${theme}-${vpName}-${lang}-${slug}`);
        } catch (e) {
          console.log(`FAIL ${url}: ${e.message.split("\n")[0]}`);
        }
        await page.close();
      }
      // The instrument: drive each scene through the page's own debug API.
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/${lang}/multiscale`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForFunction(() => typeof window.__multiscaleDebug?.jumpToScene === "function", undefined, { timeout: 60000 });
        for (const [level, step] of SCENES) {
          await page.evaluate(([l, s]) => window.__multiscaleDebug.jumpToScene(l, s, 0.8), [level, step]);
          await capture(page, `${theme}-${vpName}-${lang}-scene-${level}${step}`, 4500);
        }
      } catch (e) {
        console.log(`FAIL scenes ${lang}/${theme}/${vpName}: ${e.message.split("\n")[0]}`);
      }
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(ROOT, "capture-index.json"), JSON.stringify(index, null, 1));

const tally = (k) => index.reduce((s, r) => s + (r.counts?.[k] ?? 0), 0);
console.log(`\n${index.length} captures.  totals  ladder ${tally("offLadder")}  tinyLight ${tally("tinyLight")}  clipped ${tally("clipped")}  smallTargets ${tally("smallTargets")}  offToken ${tally("offToken")}  pastRight ${tally("pastRight")}  xscrollPages ${index.filter((r) => r.overflowX).length}`);
