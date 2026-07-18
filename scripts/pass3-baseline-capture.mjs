// Pass-3 baseline capture: drive the in-page debug API to screenshot all 27
// multiscale steps at mobile (390) and desktop (1280). Evidence-only.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3111";
const OUT = process.env.OUT_DIR ||
  path.join(process.cwd(), ".superloopy/evidence/frontend/multiscale-pass3/baseline");

// global step -> [levelId, localStep]
const LEVELS = [
  ["dft", 2], ["mlff", 1], ["allatom", 2], ["meso", 2],
];
const STEPS = [];
{
  let g = 0;
  for (const [lvl, n] of LEVELS) {
    for (let s = 0; s < n; s++) STEPS.push({ g: g++, lvl, s });
  }
}

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

async function capture(vp) {
  const browser = await chromium.launch({
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-angle=swiftshader",
      "--use-gl=angle",
      "--enable-unsafe-swiftshader",
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/en/multiscale?step=0`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // wait for debug API + stage
  await page.waitForFunction(() => typeof window.__multiscaleDebug?.jumpToScene === "function", null, { timeout: 60000 });
  await page.locator('[data-testid="multiscale-stage-shell"]').waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(6000); // first WebGL warmup (swiftshader is slow)

  const dir = path.join(OUT, vp.name);
  await fs.mkdir(dir, { recursive: true });
  const report = [];

  for (const { g, lvl, s } of STEPS) {
    await page.evaluate(([lvl, s]) => window.__multiscaleDebug.jumpToScene(lvl, s, 0.8), [lvl, s]);
    await page.waitForTimeout(2800); // camera + scene settle (software WebGL)
    const gg = String(g + 1).padStart(2, "0");
    const file = path.join(dir, `${gg}-${lvl}-${s}.png`);
    try {
      await page.screenshot({ path: file, fullPage: vp.name === "mobile", timeout: 15000 });
    } catch {
      // fullPage capture can fail on very tall pages under software WebGL
      await page.screenshot({ path: file, timeout: 15000 });
    }
    // measure horizontal overflow + panel height
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const panel = document.querySelector('[data-testid="multiscale-visual-panel"]');
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        overflowX: doc.scrollWidth > doc.clientWidth + 1,
        panelH: panel ? Math.round(panel.getBoundingClientRect().height) : null,
        docH: doc.scrollHeight,
      };
    });
    report.push({ g: g + 1, lvl, s, ...metrics });
    process.stdout.write(`  [${vp.name}] ${gg} ${lvl}/${s} overflowX=${metrics.overflowX} panelH=${metrics.panelH} docH=${metrics.docH}\n`);
  }

  await fs.writeFile(path.join(dir, "_metrics.json"), JSON.stringify({ errors: [...new Set(errors)].slice(0, 40), report }, null, 2));
  await browser.close();
  return { vp: vp.name, errorCount: new Set(errors).size };
}

for (const vp of VIEWPORTS) {
  console.log(`\n== capturing ${vp.name} (${vp.width}px) ==`);
  const r = await capture(vp);
  console.log(`   done ${r.vp}, unique console errors: ${r.errorCount}`);
}
console.log("\nBASELINE CAPTURE COMPLETE");
