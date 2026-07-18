import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const BASE_URL = process.env.RESEARCH_BASE_URL ?? "http://localhost:3000";
const EVIDENCE_DIR = path.join(ROOT, ".superloopy", "evidence", "dft-visuals");
const VIEWPORTS = [
  { width: 1440, height: 1024 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const SCENES = [
  { id: "01-dft-select", step: 0 },
  { id: "02-dft-pes", step: 1 },
  { id: "03-dft-kohn-sham", step: 2 },
  { id: "04-dft-scf", step: 3 },
  { id: "05-dft-recipe", step: 4 },
  { id: "06-dft-outputs", step: 5 },
  { id: "07-dft-labels", step: 6 },
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

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  cases: [],
};

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
        window.__multiscaleDebug?.jumpToScene("dft", step, 0.5, null);
        window.scrollTo(0, 0);
      }, scene);
      await page.waitForSelector(".dft-mechanism", { state: "visible", timeout: 30_000 });
      await page
        .locator('[data-testid="multiscale-dft-loading"]')
        .waitFor({ state: "hidden", timeout: 30_000 })
        .catch(() => {});
      await page.waitForTimeout(500);

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
        const toolbarButton = document.querySelector(
          'button[aria-label="뷰어 도구"]',
        );
        const surface = document.querySelector(
          '[data-testid="multiscale-render-surface"]',
        );
        const mechanism = document.querySelector(".dft-mechanism");
        const mechanismWrapper = mechanism?.parentElement ?? null;
        const moleculeRegion = surface?.firstElementChild ?? null;
        const mechanismContent =
          mechanism?.querySelector(":scope > div, :scope > section") ?? null;
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

        const smallTargets = [...document.querySelectorAll(
          'button, a[href], [role="button"]',
        )]
          .filter(visible)
          .map((element) => ({
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
              element.tagName,
            ...rect(element),
          }))
          .filter(({ width, height }) => width < 24 || height < 24);

        const titleRect = title ? rect(title) : null;
        const toolbarRect = toolbarButton ? rect(toolbarButton) : null;
        const moleculeRect = moleculeRegion ? rect(moleculeRegion) : null;
        const mechanismRect = mechanismWrapper ? rect(mechanismWrapper) : null;
        const contentRect = mechanismContent ? rect(mechanismContent) : null;

        return {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          documentWidth: document.documentElement.scrollWidth,
          titleRect,
          toolbarRect,
          moleculeRect,
          mechanismRect,
          contentRect,
          internalOverflow,
          smallTargets,
        };
      });

      const closedCollision =
        metrics.titleRect &&
        metrics.toolbarRect &&
        intersects(metrics.titleRect, metrics.toolbarRect);
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
      await page
        .locator('[data-testid="multiscale-visual-panel"]')
        .screenshot({ path: panelPath, animations: "disabled", caret: "hide" });

      let openCollision = false;
      let toolbarPath = null;
      if (viewport.width < 768) {
        await page.getByRole("button", { name: "뷰어 도구" }).click();
        await page.waitForTimeout(250);
        const openToolbar = await page.evaluate(() => {
          const title = document.querySelector('[data-testid="multiscale-scene-title"]');
          const expanded = document.querySelector(
            '[data-testid="mobile-viewer-toolbar-tray"]',
          );
          if (!title || !expanded) return null;
          const a = title.getBoundingClientRect();
          const b = expanded.getBoundingClientRect();
          return {
            title: {
              left: a.left,
              top: a.top,
              right: a.right,
              bottom: a.bottom,
            },
            toolbar: {
              left: b.left,
              top: b.top,
              right: b.right,
              bottom: b.bottom,
            },
          };
        });
        openCollision =
          openToolbar &&
          intersects(openToolbar.title, openToolbar.toolbar);
        toolbarPath = path.join(EVIDENCE_DIR, `${slug}-toolbar-open.png`);
        await page.screenshot({
          path: toolbarPath,
          animations: "disabled",
          caret: "hide",
        });
        await page.getByRole("button", { name: "뷰어 도구" }).click();
      }

      const visualPanel = page.locator('[data-testid="multiscale-visual-panel"]');
      const interactionArtifacts = [];
      const interactionOverflow = [];
      if (scene.step === 0 && viewport.width < 768) {
        for (const label of ["결합이 생기거나 끊어질 때", "전하가 이동할 때", "스핀·오비탈 상태가 중요할 때"]) {
          await visualPanel.getByRole("button", { name: label }).click();
          const target = path.join(
            EVIDENCE_DIR,
            `${slug}-${interactionArtifacts.length + 1}.png`,
          );
          await visualPanel.screenshot({
            path: target,
            animations: "disabled",
            caret: "hide",
          });
          interactionArtifacts.push(path.relative(ROOT, target));
          interactionOverflow.push(
            ...(await page.evaluate(() => {
              const panel = document.querySelector(".dft-mechanism > div");
              if (!panel) return [];
              return panel.scrollWidth > panel.clientWidth || panel.scrollHeight > panel.clientHeight
                ? [`${panel.clientWidth}x${panel.clientHeight}->${panel.scrollWidth}x${panel.scrollHeight}`]
                : [];
            })),
          );
        }
      }
      if (scene.step === 4) {
        for (const label of ["함수형", "기저함수", "전하·스핀"]) {
          await visualPanel.getByRole("button", { name: new RegExp(label) }).click();
          const target = path.join(
            EVIDENCE_DIR,
            `${slug}-${interactionArtifacts.length + 1}.png`,
          );
          await visualPanel.screenshot({
            path: target,
            animations: "disabled",
            caret: "hide",
          });
          interactionArtifacts.push(path.relative(ROOT, target));
          interactionOverflow.push(
            ...(await page.evaluate(() => {
              const panel = document.querySelector(".dft-mechanism > div");
              if (!panel) return [];
              return panel.scrollWidth > panel.clientWidth || panel.scrollHeight > panel.clientHeight
                ? [`${panel.clientWidth}x${panel.clientHeight}->${panel.scrollWidth}x${panel.scrollHeight}`]
                : [];
            })),
          );
        }
      }
      if (scene.step === 5) {
        for (const label of ["전자 밀도", "HOMO", "LUMO"]) {
          await visualPanel.getByRole("button", { name: new RegExp(label) }).click();
          await page.waitForTimeout(250);
          const target = path.join(
            EVIDENCE_DIR,
            `${slug}-${interactionArtifacts.length + 1}.png`,
          );
          await visualPanel.screenshot({
            path: target,
            animations: "disabled",
            caret: "hide",
          });
          interactionArtifacts.push(path.relative(ROOT, target));
          interactionOverflow.push(
            ...(await page.evaluate(() => {
              const panel = document.querySelector(".dft-mechanism > div");
              if (!panel) return [];
              return panel.scrollWidth > panel.clientWidth || panel.scrollHeight > panel.clientHeight
                ? [`${panel.clientWidth}x${panel.clientHeight}->${panel.scrollWidth}x${panel.scrollHeight}`]
                : [];
            })),
          );
        }
      }

      const checks = {
        noHorizontalOverflow:
          metrics.documentWidth <= metrics.viewport.width,
        noSmallTargets: metrics.smallTargets.length === 0,
        titleClearWhenToolbarClosed: !closedCollision,
        titleClearWhenToolbarOpen: !openCollision,
        moleculeAndMechanismStackVertically: Boolean(verticalSeparation),
        mechanismContentNotClipped: Boolean(mechanismContained),
        noHiddenInternalOverflow: metrics.internalOverflow.length === 0,
        noInteractionOverflow: interactionOverflow.length === 0,
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

      process.stdout.write(
        `${pass ? "PASS" : "FAIL"} ${slug} ${JSON.stringify(checks)}\n`,
      );
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
