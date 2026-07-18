import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const BASE_URL = process.env.RESEARCH_BASE_URL ?? "http://localhost:3000";
const EVIDENCE_DIR = path.join(ROOT, ".superloopy", "evidence", "meso-visuals");
const VIEWPORTS = [
  { width: 1440, height: 1024 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const SCENES = [
  { id: "22-meso-select", step: 0 },
  { id: "23-meso-mapping", step: 1 },
  { id: "24-meso-interactions", step: 2 },
  { id: "25-meso-langevin", step: 3 },
  { id: "26-meso-collective", step: 4 },
  { id: "27-meso-characterize", step: 5 },
];

function intersects(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

await fs.mkdir(EVIDENCE_DIR, { recursive: true });
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
const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, cases: [] };
let failed = false;

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/ko/multiscale`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => typeof window.__multiscaleDebug?.jumpToScene === "function",
      undefined,
      { timeout: 30_000 },
    );

    for (const scene of SCENES) {
      await page.evaluate(({ step }) => {
        window.__multiscaleDebug?.jumpToScene("meso", step, 0.5, null);
        window.scrollTo(0, 0);
      }, scene);
      await page.waitForSelector(".meso-mechanism", { state: "visible", timeout: 30_000 });
      await page.waitForTimeout(650);

      const metrics = await page.evaluate(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return {
            left: value.left,
            top: value.top,
            right: value.right,
            bottom: value.bottom,
            width: value.width,
            height: value.height,
          };
        };
        const visible = (element) => {
          const style = window.getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0 &&
            box.width > 0 &&
            box.height > 0
          );
        };
        const title = document.querySelector('[data-testid="multiscale-scene-title"]');
        const toolbarButton = document.querySelector('button[aria-label="뷰어 도구"]');
        const surface = document.querySelector('[data-testid="multiscale-render-surface"]');
        const mechanism = document.querySelector(".meso-mechanism");
        const mechanismWrapper = mechanism?.parentElement ?? null;
        const moleculeRegion = surface?.firstElementChild ?? null;
        const mechanismContent = mechanism?.firstElementChild ?? null;
        const internalOverflow = mechanism
          ? [...mechanism.querySelectorAll("*")]
              .filter(visible)
              .filter(
                (element) =>
                  element.scrollWidth > element.clientWidth + 1 ||
                  element.scrollHeight > element.clientHeight + 1,
              )
              .filter((element) => !element.classList.contains("katex-mathml"))
              .filter((element) => {
                const style = window.getComputedStyle(element);
                return style.overflowX === "hidden" || style.overflowY === "hidden";
              })
              .map((element) => ({
                tag: element.tagName,
                className: element.className?.toString().slice(0, 100) ?? "",
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
              }))
          : [];
        const textNodes = mechanism
          ? [...mechanism.querySelectorAll("p, span, button, h3, h4")]
              .filter((element) => visible(element) && !element.closest(".katex"))
              .map((element) => Number.parseFloat(window.getComputedStyle(element).fontSize))
              .filter(Number.isFinite)
          : [];
        const smallTargets = [...document.querySelectorAll('button, a[href], [role="button"]')]
          .filter(visible)
          .map((element) => ({
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
              element.tagName,
            ...rect(element),
          }))
          .filter(({ width, height }) => width < 24 || height < 24);
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          titleRect: title ? rect(title) : null,
          toolbarRect: toolbarButton ? rect(toolbarButton) : null,
          moleculeRect: moleculeRegion ? rect(moleculeRegion) : null,
          mechanismRect: mechanismWrapper ? rect(mechanismWrapper) : null,
          contentRect: mechanismContent ? rect(mechanismContent) : null,
          internalOverflow,
          minimumMechanismFont: textNodes.length ? Math.min(...textNodes) : 0,
          smallTargets,
        };
      });

      const closedCollision =
        metrics.titleRect && metrics.toolbarRect && intersects(metrics.titleRect, metrics.toolbarRect);
      const verticalSeparation =
        viewport.width >= 768 ||
        (metrics.moleculeRect &&
          metrics.mechanismRect &&
          metrics.moleculeRect.bottom <= metrics.mechanismRect.top + 1);
      const mechanismContained =
        metrics.contentRect &&
        metrics.mechanismRect &&
        metrics.contentRect.top >= metrics.mechanismRect.top - 1 &&
        metrics.contentRect.bottom <= metrics.mechanismRect.bottom + 1;

      const slug = `${viewport.width}x${viewport.height}-${scene.id}`;
      const panelPath = path.join(EVIDENCE_DIR, `${slug}.png`);
      await page.locator('[data-testid="multiscale-visual-panel"]').screenshot({
        path: panelPath,
        animations: "disabled",
        caret: "hide",
      });

      let openCollision = false;
      let toolbarPath = null;
      if (viewport.width < 768) {
        await page.getByRole("button", { name: "뷰어 도구" }).click();
        await page.waitForTimeout(200);
        const openToolbar = await page.evaluate(() => {
          const title = document.querySelector('[data-testid="multiscale-scene-title"]');
          const expanded = document.querySelector('[data-testid="mobile-viewer-toolbar-tray"]');
          if (!title || !expanded) return null;
          return {
            title: title.getBoundingClientRect().toJSON(),
            toolbar: expanded.getBoundingClientRect().toJSON(),
          };
        });
        openCollision = openToolbar && intersects(openToolbar.title, openToolbar.toolbar);
        toolbarPath = path.join(EVIDENCE_DIR, `${slug}-toolbar-open.png`);
        await page.screenshot({ path: toolbarPath, animations: "disabled", caret: "hide" });
        await page.getByRole("button", { name: "뷰어 도구" }).click();
      }

      const interactionArtifacts = [];
      const interactionOverflow = [];
      if (scene.step === 2) {
        const visualPanel = page.locator('[data-testid="multiscale-visual-panel"]');
        for (const label of ["^결합$", "^결합각$", "^Gaussian 반발$"]) {
          await visualPanel.getByRole("tab", { name: new RegExp(label) }).click();
          const overflow = await page.evaluate(() => {
            const panel = document.querySelector(".meso-mechanism > div");
            if (!panel) return [];
            return panel.scrollWidth > panel.clientWidth || panel.scrollHeight > panel.clientHeight
              ? [`${panel.clientWidth}x${panel.clientHeight}->${panel.scrollWidth}x${panel.scrollHeight}`]
              : [];
          });
          interactionOverflow.push(...overflow);
          const target = path.join(
            EVIDENCE_DIR,
            `${slug}-${interactionArtifacts.length + 1}.png`,
          );
          await visualPanel.screenshot({ path: target, animations: "disabled", caret: "hide" });
          interactionArtifacts.push(path.relative(ROOT, target));
        }
      }

      const checks = {
        noHorizontalOverflow: metrics.documentWidth <= metrics.viewport.width,
        noSmallTargets: metrics.smallTargets.length === 0,
        titleClearWhenToolbarClosed: !closedCollision,
        titleClearWhenToolbarOpen: !openCollision,
        moleculeAndMechanismStackVertically: Boolean(verticalSeparation),
        mechanismContentNotClipped: Boolean(mechanismContained),
        noHiddenInternalOverflow: metrics.internalOverflow.length === 0,
        noInteractionOverflow: interactionOverflow.length === 0,
        mechanismTextAtLeast12px: metrics.minimumMechanismFont >= 12,
      };
      const pass = Object.values(checks).every(Boolean);
      if (!pass) failed = true;
      report.cases.push({
        viewport,
        scene: scene.id,
        pass,
        checks,
        metrics,
        interactionOverflow,
        artifacts: [
          path.relative(ROOT, panelPath),
          ...(toolbarPath ? [path.relative(ROOT, toolbarPath)] : []),
          ...interactionArtifacts,
        ],
      });
      process.stdout.write(`${pass ? "PASS" : "FAIL"} ${slug} ${JSON.stringify(checks)}\n`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const reportPath = path.join(EVIDENCE_DIR, "report.json");
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
process.stdout.write(`Report: ${path.relative(ROOT, reportPath)}\n`);
if (failed) process.exitCode = 1;
