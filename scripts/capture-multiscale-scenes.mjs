import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { chromium } from "playwright";

const ROOT = process.cwd();
const CHECKLIST_PATH = path.join(ROOT, "docs", "multiscale-scene-checklist.yaml");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "multiscale-scenes");
const STILL_DIR = path.join(ARTIFACT_DIR, "still");
const MOTION_DIR = path.join(ARTIFACT_DIR, "motion");
const TRACE_DIR = path.join(ARTIFACT_DIR, "traces");
const VIDEO_DIR = path.join(ARTIFACT_DIR, "videos");
const REPORT_DIR = path.join(ARTIFACT_DIR, "reports");

function inferStepProgress(scene, defaults) {
  if (typeof scene.stepProgress === "number") return scene.stepProgress;
  const windows = Object.values(scene.timingWindows ?? {}).filter(
    (value) => Array.isArray(value) && value.length === 2,
  );
  if (windows.length === 0) return defaults.stepProgress ?? 0.5;
  const midpoint = windows.reduce((sum, [start, end]) => sum + (start + end) / 2, 0) / windows.length;
  return Math.max(0, Math.min(0.98, midpoint));
}

function sceneWaitMs(scene, defaults, key, fallback) {
  const value = scene?.[key] ?? defaults?.[key];
  return typeof value === "number" ? value : fallback;
}

async function ensureDebugApi(page) {
  await page.waitForFunction(() => typeof window.__multiscaleDebug?.jumpToScene === "function", undefined, {
    timeout: 30_000,
  });
}

async function ensureResearchLocators(page) {
  await page.locator('[data-testid="multiscale-stage-shell"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('[data-testid="multiscale-visual-panel"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('[data-testid="multiscale-right-rail"]').waitFor({ state: "visible", timeout: 30_000 });
}

async function screenshotLocator(locator, targetPath, animations = "disabled") {
  await locator.screenshot({
    path: targetPath,
    animations,
    caret: "hide",
  });
}

/* ── Pixel analysis helpers ── */

const COLOR_FAMILIES = {
  cyan: { hMin: 165, hMax: 200, sMin: 0.3 },
  amber: { hMin: 25, hMax: 55, sMin: 0.3 },
  purple: { hMin: 255, hMax: 295, sMin: 0.3 },
  red: { hMin: 345, hMax: 360, sMin: 0.3, hMin2: 0, hMax2: 15 },
  blue: { hMin: 200, hMax: 255, sMin: 0.3 },
  light_blue: { hMin: 190, hMax: 220, sMin: 0.2 },
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function matchesColorFamily(r, g, b, family) {
  const [h, s] = rgbToHsl(r, g, b);
  if (s < family.sMin) return false;
  if (h >= family.hMin && h <= family.hMax) return true;
  if (family.hMin2 !== undefined && h >= family.hMin2 && h <= family.hMax2) return true;
  return false;
}

async function analyzeImage(imagePath, page) {
  const buf = await fs.readFile(imagePath);
  const b64 = buf.toString("base64");
  return page.evaluate(async (b64Data) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:image/png;base64,${b64Data}`;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const totalPixels = width * height;
    let nonBlack = 0;
    let weightedX = 0, weightedY = 0, weightedSum = 0;
    const colorBuckets = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = r + g + b;
      if (brightness > 30) {
        nonBlack++;
        const px = (i / 4) % width;
        const py = Math.floor((i / 4) / width);
        weightedX += px * brightness;
        weightedY += py * brightness;
        weightedSum += brightness;
      }
      // Pack RGB for color analysis
      colorBuckets[i / 4] = [r, g, b];
    }
    return {
      width,
      height,
      totalPixels,
      nonBlack,
      occupancy: nonBlack / totalPixels,
      centroidX: weightedSum > 0 ? weightedX / weightedSum / width : 0.5,
      centroidY: weightedSum > 0 ? weightedY / weightedSum / height : 0.5,
      // Return raw pixel data summary for color analysis
      pixelSample: { totalPixels, nonBlack },
    };
  }, b64);
}

async function analyzeColorPresence(imagePath, page, colorFamilyName) {
  const family = COLOR_FAMILIES[colorFamilyName];
  if (!family) return { fraction: 0, pass: false };
  const buf = await fs.readFile(imagePath);
  const b64 = buf.toString("base64");
  const familyJson = JSON.stringify(family);
  return page.evaluate(async ({ b64Data, familyStr }) => {
    const family = JSON.parse(familyStr);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:image/png;base64,${b64Data}`;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const totalPixels = width * height;
    let matchCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      if (max === min) continue;
      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (s < family.sMin) continue;
      let h = 0;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      h *= 360;
      if (h >= family.hMin && h <= family.hMax) { matchCount++; continue; }
      if (family.hMin2 !== undefined && h >= family.hMin2 && h <= family.hMax2) { matchCount++; }
    }
    return { fraction: matchCount / totalPixels, matchCount, totalPixels };
  }, { b64Data: b64, familyStr: familyJson });
}

function evaluateImageChecks(checks, stats, colorResults) {
  const results = [];
  for (const check of checks) {
    if (check.type === "occupancy") {
      const pass = stats.occupancy >= (check.minFraction ?? 0) && stats.occupancy <= (check.maxFraction ?? 1);
      results.push({ type: "occupancy", pass, actual: stats.occupancy.toFixed(4), min: check.minFraction, max: check.maxFraction });
    } else if (check.type === "centroid") {
      const xPass = stats.centroidX >= check.xRange[0] && stats.centroidX <= check.xRange[1];
      const yPass = stats.centroidY >= check.yRange[0] && stats.centroidY <= check.yRange[1];
      results.push({ type: "centroid", pass: xPass && yPass, actualX: stats.centroidX.toFixed(3), actualY: stats.centroidY.toFixed(3) });
    } else if (check.type === "color-presence") {
      const cr = colorResults[check.colorFamily];
      const pass = cr ? cr.fraction >= (check.minFraction ?? 0) : false;
      results.push({ type: "color-presence", pass, colorFamily: check.colorFamily, actual: cr?.fraction?.toFixed(5) ?? "N/A", min: check.minFraction });
    }
  }
  return results;
}

async function main() {
  const checklist = yaml.load(await fs.readFile(CHECKLIST_PATH, "utf8"));
  const viewport = checklist.viewport ?? { width: 1440, height: 1024 };
  const defaults = checklist.defaults ?? {};
  const baseUrl = process.env.RESEARCH_BASE_URL ?? "http://localhost:3000";
  const levelFilter = process.env.RESEARCH_LEVEL ?? "";
  const route = checklist.canonicalRoute ?? "/ko/multiscale";
  const canonicalUrl = new URL(route, baseUrl).toString();
  const scenes = (checklist.scenes ?? []).filter((scene) => !levelFilter || scene.level === levelFilter);

  await Promise.all([
    fs.mkdir(ARTIFACT_DIR, { recursive: true }),
    fs.mkdir(STILL_DIR, { recursive: true }),
    fs.mkdir(MOTION_DIR, { recursive: true }),
    fs.mkdir(TRACE_DIR, { recursive: true }),
    fs.mkdir(VIDEO_DIR, { recursive: true }),
    fs.mkdir(REPORT_DIR, { recursive: true }),
  ]);

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
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: VIDEO_DIR,
      size: viewport,
    },
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    route,
    viewport,
    scenes: [],
  };

  try {
    await page.goto(canonicalUrl, { waitUntil: "networkidle" });
    await ensureDebugApi(page);
    await ensureResearchLocators(page);

    for (const scene of scenes) {
      const stepProgress = inferStepProgress(scene, defaults);
      const sceneDirName = scene.sceneId.replace(/[^\w.-]+/g, "_");
      const stableViewportPath = path.join(STILL_DIR, `${sceneDirName}.viewport.png`);
      const stableVisualPath = path.join(STILL_DIR, `${sceneDirName}.visual.png`);
      const stableRailPath = path.join(STILL_DIR, `${sceneDirName}.rail.png`);
      const motionBase = path.join(MOTION_DIR, sceneDirName);
      const tracePath = path.join(TRACE_DIR, `${sceneDirName}.zip`);
      const motionFrames = [];

      if (typeof context.tracing.startChunk === "function") {
        await context.tracing.startChunk({ title: scene.sceneId });
      }

      await page.evaluate(
        ({ level, stepIndex, stepProgress: nextProgress }) => {
          window.__multiscaleDebug?.jumpToScene(level, stepIndex, nextProgress, null);
        },
        {
          level: scene.level,
          stepIndex: scene.stepIndex,
          stepProgress,
        },
      );
      await page.waitForTimeout(sceneWaitMs(scene, defaults, "preResetWaitMs", 200));
      await page.evaluate(() => {
        window.__multiscaleDebug?.reset();
      });
      await page.waitForTimeout(sceneWaitMs(scene, defaults, "postResetWaitMs", 250));

      let captureError = null;
      try {
        const stageShell = page.locator('[data-testid="multiscale-stage-shell"]');
        const visualPanel = page.locator('[data-testid="multiscale-visual-panel"]');
        const rightRail = page.locator('[data-testid="multiscale-right-rail"]');
        await ensureResearchLocators(page);

        // Stable deterministic captures for layout review.
        await screenshotLocator(stageShell, stableViewportPath, "disabled");
        await screenshotLocator(visualPanel, stableVisualPath, "disabled");
        await screenshotLocator(rightRail, stableRailPath, "disabled");

        // Motion-aware captures for trajectory/animation review.
        const motionOffsetsMs = [0, 900, 1800];
        for (const [index, delayMs] of motionOffsetsMs.entries()) {
          if (delayMs > 0) await page.waitForTimeout(delayMs - (motionOffsetsMs[index - 1] ?? 0));
          const pathForFrame = `${motionBase}.f${index + 1}.png`;
          await screenshotLocator(visualPanel, pathForFrame, "allow");
          motionFrames.push({ delayMs, path: pathForFrame });
        }
      } catch (error) {
        captureError = error instanceof Error ? error.message : String(error);
        await page.screenshot({ path: stableViewportPath });
      } finally {
        if (typeof context.tracing.stopChunk === "function") {
          await context.tracing.stopChunk({ path: tracePath });
        }
      }

      const debugState = await page.evaluate(() => window.__multiscaleDebug?.getState?.() ?? null);
      const metrics = await page.evaluate(() => window.__multiscaleDebug?.getMetrics?.() ?? null);
      manifest.scenes.push({
        sceneId: scene.sceneId,
        level: scene.level,
        stepIndex: scene.stepIndex,
        stepProgress,
        stableViewportPath,
        stableVisualPath,
        stableRailPath,
        motionFrames,
        tracePath,
        debugState,
        metrics,
        captureError,
      });
    }

    /* ── Post-capture evaluation ── */
    process.stdout.write("\n── Image Check Results ──\n");
    const checkSummary = { total: 0, passed: 0, failed: 0 };

    for (const entry of manifest.scenes) {
      const scene = scenes.find((s) => s.sceneId === entry.sceneId);
      if (!scene) continue;
      const imageChecks = [...(defaults.imageChecks ?? []), ...(scene.imageChecks ?? [])];
      if (imageChecks.length === 0) continue;

      let stats = null;
      try {
        stats = await analyzeImage(entry.stableVisualPath, page);
      } catch { /* image may not exist if capture failed */ }
      if (!stats) continue;

      // Gather color presence analysis for any color-presence checks
      const colorFamilies = [...new Set(imageChecks.filter((c) => c.type === "color-presence").map((c) => c.colorFamily))];
      const colorResults = {};
      for (const cf of colorFamilies) {
        try {
          colorResults[cf] = await analyzeColorPresence(entry.stableVisualPath, page, cf);
        } catch {}
      }

      const results = evaluateImageChecks(imageChecks, stats, colorResults);
      entry.imageCheckResults = results;

      for (const r of results) {
        checkSummary.total++;
        if (r.pass) {
          checkSummary.passed++;
          process.stdout.write(`  ✓ ${entry.sceneId} / ${r.type}${r.colorFamily ? ` (${r.colorFamily})` : ""}: ${r.actual ?? "ok"}\n`);
        } else {
          checkSummary.failed++;
          process.stdout.write(`  ✗ ${entry.sceneId} / ${r.type}${r.colorFamily ? ` (${r.colorFamily})` : ""}: ${r.actual ?? "N/A"} (expected ${r.min ?? ""}–${r.max ?? ""})\n`);
        }
      }
    }

    process.stdout.write(`\nChecks: ${checkSummary.passed}/${checkSummary.total} passed, ${checkSummary.failed} failed\n`);
  } finally {
    try {
      await context.tracing.stop({ path: path.join(TRACE_DIR, "session.zip") });
    } catch {}
    await browser.close();
  }

  await fs.writeFile(path.join(ARTIFACT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  process.stdout.write(`Captured ${manifest.scenes.length} scenes to ${ARTIFACT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
