// Mobile render check with a FRESH browser context per scene, loading
// /multiscale?step=N directly (as a real user would) rather than jumping
// through every scene in one long-lived session. This isolates whether the
// blank Molstar panel in the sweep capture was software-WebGL context
// exhaustion or a genuine mobile render failure.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3111";
const OUT = path.join(process.cwd(), ".superloopy/evidence/frontend/multiscale-pass3/after/mobile-isolated");

// global step -> label
const STEPS = [
  { g: 0, label: "dft-flagship" },
  { g: 1, label: "dft-scf" },
  { g: 2, label: "mlff-flagship" },
  { g: 3, label: "allatom-flagship" },
  { g: 4, label: "allatom-forcefield" },
  { g: 5, label: "meso-flagship" },
  { g: 6, label: "meso-rdf" },
];

const GL_ARGS = [
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "--use-angle=swiftshader",
  "--use-gl=angle",
  "--enable-unsafe-swiftshader",
];

await fs.mkdir(OUT, { recursive: true });
const report = [];

for (const { g, label } of STEPS) {
  const browser = await chromium.launch({ args: GL_ARGS });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/en/multiscale?step=${g}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[data-testid="multiscale-stage-shell"]').waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(7000); // single-scene warmup + settle

  const gg = String(g + 1).padStart(2, "0");
  const panel = page.locator('[data-testid="multiscale-visual-panel"]');
  await panel.screenshot({ path: path.join(OUT, `${gg}-${label}.png`) });

  // Heuristic: does the visual panel contain a live canvas with drawn pixels?
  const canvasInfo = await page.evaluate(() => {
    const panelEl = document.querySelector('[data-testid="multiscale-visual-panel"]');
    const canvases = Array.from(panelEl?.querySelectorAll("canvas") ?? []);
    return canvases.map((c) => ({ w: c.width, h: c.height }));
  });
  const glErrors = errors.filter((e) => /WebGL|context/i.test(e)).length;
  report.push({ g: g + 1, label, canvases: canvasInfo.length, canvasInfo, glErrors });
  process.stdout.write(`  ${gg} ${label} canvases=${canvasInfo.length} glErrors=${glErrors}\n`);

  await browser.close();
}

await fs.writeFile(path.join(OUT, "_report.json"), JSON.stringify(report, null, 2));
console.log("MOBILE ISOLATED CAPTURE COMPLETE");
