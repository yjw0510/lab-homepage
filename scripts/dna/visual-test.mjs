/**
 * Interactive visual testing for DNA pages.
 * Takes a screenshot of a specific meso step with optional interactions.
 *
 * Usage:
 *   node scripts/dna/visual-test.mjs [step] [action]
 *   node scripts/dna/visual-test.mjs 0          # screenshot step 0
 *   node scripts/dna/visual-test.mjs 2 zoom-in  # step 2 after zoom
 *   node scripts/dna/visual-test.mjs all        # all 6 steps
 */

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "dna-visual-tests");
const BASE_URL = process.env.RESEARCH_BASE_URL ?? "http://localhost:3000";

async function ensureDebugApi(page) {
  await page.waitForFunction(
    () => typeof window.__multiscaleDebug?.jumpToScene === "function",
    undefined,
    { timeout: 30_000 },
  );
}

async function captureStep(page, step, suffix = "") {
  await page.evaluate(
    ({ step }) => {
      window.__multiscaleDebug?.jumpToScene("meso", step, 0.5, null);
    },
    { step },
  );
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__multiscaleDebug?.reset());
  await page.waitForTimeout(400);

  const filename = `meso-step${step}${suffix ? `-${suffix}` : ""}.png`;
  const filepath = path.join(OUT_DIR, filename);

  // Capture the render surface
  const surface = page.locator('[data-testid="multiscale-render-surface"]');
  const fallback = page.locator('[data-testid="multiscale-visual-panel"]');
  const target = (await surface.count()) > 0 ? surface : fallback;
  await target.waitFor({ state: "visible", timeout: 60_000 });
  const box = await target.boundingBox();
  if (box) {
    await page.screenshot({
      path: filepath,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      timeout: 120_000,
    });
  } else {
    await page.screenshot({ path: filepath });
  }

  // Also capture full page for context
  await page.screenshot({
    path: path.join(OUT_DIR, `meso-step${step}${suffix ? `-${suffix}` : ""}-full.png`),
  });

  return filepath;
}

async function main() {
  const args = process.argv.slice(2);
  const stepArg = args[0] ?? "all";
  const action = args[1] ?? null;

  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-angle=swiftshader",
      "--use-gl=angle",
      "--enable-unsafe-swiftshader",
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });

  try {
    await page.goto(`${BASE_URL}/ko/multiscale`, { waitUntil: "networkidle" });
    await ensureDebugApi(page);
    await page.locator('[data-testid="multiscale-visual-panel"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });

    const steps = stepArg === "all" ? [0, 1, 2, 3, 4, 5] : [parseInt(stepArg, 10)];

    for (const step of steps) {
      const filepath = await captureStep(page, step);
      console.log(`Step ${step}: ${filepath}`);

      // Optional actions after capture
      if (action === "zoom-in") {
        await page.evaluate(() => window.__multiscaleDebug?.zoomIn());
        await page.waitForTimeout(200);
        await captureStep(page, step, "zoomed");
        console.log(`Step ${step} (zoomed): captured`);
      } else if (action === "fit") {
        await page.evaluate(() => window.__multiscaleDebug?.fit());
        await page.waitForTimeout(200);
        await captureStep(page, step, "fit");
        console.log(`Step ${step} (fit): captured`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
