import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const cli = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.length ? value.join("=") : "1"];
  }),
);
if (cli.get("eight-pages") === "1") {
  await import("./capture-multiscale-eight-pages.mjs");
  process.exit(process.exitCode ?? 0);
}
const option = (cliKey, environmentKey, fallback) =>
  cli.get(cliKey) ?? process.env[environmentKey] ?? fallback;
const BASE_URL = option("base-url", "RESEARCH_BASE_URL", "http://localhost:3000");
const RUN_ID = option("run-id", "MLFF_QA_RUN_ID", new Date().toISOString().replace(/[:.]/g, "-"));
const PASS_ID = option("pass", "MLFF_QA_PASS", "final");
const NOTE = option("note", "MLFF_QA_NOTE", "");
const DEEP_CHECKS = option("deep", "MLFF_QA_DEEP", "0") === "1";
const ALLOW_FAILURE = option("allow-failure", "MLFF_QA_ALLOW_FAILURE", "0") === "1";
const MOTION_MODE = option("motion", "MLFF_QA_MOTION", "reduce");
if (!["reduce", "no-preference"].includes(MOTION_MODE)) {
  throw new Error(`Unsupported motion mode: ${MOTION_MODE}`);
}
const EVIDENCE_DIR = path.join(ROOT, "artifacts", "mlff-schematic-qa", RUN_ID, `pass-${PASS_ID}`);

const ALL_VIEWPORTS = [
  { id: "desktop", width: 1440, height: 1024 },
  { id: "390", width: 390, height: 844 },
  { id: "430", width: 430, height: 932 },
];
const ALL_SCENES = [
  { id: "overview", step: 0, expectedViewports: ["dataset", "pes"] },
  { id: "inside", step: 1, expectedViewports: ["local", "forces"] },
];

function requestedValues(raw, fallback) {
  if (!raw || raw === "all") return fallback;
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

const viewportIds = new Set(requestedValues(option("viewports", "MLFF_QA_VIEWPORTS", "all"), ALL_VIEWPORTS.map(({ id }) => id)));
const sceneIds = new Set(requestedValues(option("scenes", "MLFF_QA_SCENES", "all"), ALL_SCENES.map(({ id }) => id)));
const languages = requestedValues(option("langs", "MLFF_QA_LANGS", "all"), ["ko", "en"]);
const viewports = ALL_VIEWPORTS.filter(({ id }) => viewportIds.has(id));
const scenes = ALL_SCENES.filter(({ id }) => sceneIds.has(id));

function intersects(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

async function screenshot(locator, targetPath) {
  await locator.screenshot({
    path: targetPath,
    animations: MOTION_MODE === "no-preference" ? "allow" : "disabled",
    caret: "hide",
  });
}

async function comparePngs(page, firstPath, secondPath, threshold = 6) {
  const [first, second] = await Promise.all([
    fs.readFile(firstPath, "base64"),
    fs.readFile(secondPath, "base64"),
  ]);
  return page.evaluate(async ({ firstData, secondData, pixelThreshold }) => {
    const load = (source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `data:image/png;base64,${source}`;
    });
    const [a, b] = await Promise.all([load(firstData), load(secondData)]);
    if (a.width !== b.width || a.height !== b.height) {
      return { sameDimensions: false, widthA: a.width, heightA: a.height, widthB: b.width, heightB: b.height };
    }
    const canvas = document.createElement("canvas");
    canvas.width = a.width;
    canvas.height = a.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(a, 0, 0);
    const firstPixels = context.getImageData(0, 0, a.width, a.height).data;
    context.clearRect(0, 0, a.width, a.height);
    context.drawImage(b, 0, 0);
    const secondPixels = context.getImageData(0, 0, b.width, b.height).data;
    let changedPixels = 0;
    let accumulatedDifference = 0;
    let maximumDifference = 0;
    const pixelCount = a.width * a.height;
    for (let offset = 0; offset < firstPixels.length; offset += 4) {
      const difference = Math.max(
        Math.abs(firstPixels[offset] - secondPixels[offset]),
        Math.abs(firstPixels[offset + 1] - secondPixels[offset + 1]),
        Math.abs(firstPixels[offset + 2] - secondPixels[offset + 2]),
        Math.abs(firstPixels[offset + 3] - secondPixels[offset + 3]),
      );
      accumulatedDifference += difference;
      maximumDifference = Math.max(maximumDifference, difference);
      if (difference > pixelThreshold) changedPixels += 1;
    }
    return {
      sameDimensions: true,
      width: a.width,
      height: a.height,
      changedPixels,
      changedFraction: changedPixels / pixelCount,
      meanDifference: accumulatedDifference / pixelCount,
      maximumDifference,
      threshold: pixelThreshold,
    };
  }, { firstData: first, secondData: second, pixelThreshold: threshold });
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
  runId: RUN_ID,
  passId: PASS_ID,
  note: NOTE,
  deepChecks: DEEP_CHECKS,
  motionMode: MOTION_MODE,
  cases: [],
};
let failed = false;

try {
  for (const language of languages) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: MOTION_MODE });
      await page.goto(`${BASE_URL}/${language}/multiscale`, { waitUntil: "networkidle" });
      await page.waitForFunction(
        () => typeof window.__multiscaleDebug?.jumpToScene === "function",
        undefined,
        { timeout: 30_000 },
      );

      for (const scene of scenes) {
        await page.evaluate(({ step }) => {
          window.__multiscaleDebug?.jumpToScene("mlff", step, 0.5, null);
          window.scrollTo(0, 0);
        }, scene);
        await page.waitForSelector(".mlff-schematic-stage", { state: "visible", timeout: 30_000 });
        await page.waitForFunction(() => {
          const regions = [...document.querySelectorAll("[data-mlff-viewport]")];
          return regions.length === 2 && regions.every((region) =>
            region.getAttribute("data-ready") === "true" || region.getAttribute("data-error") === "true"
          );
        }, undefined, { timeout: 45_000 });
        await page.waitForTimeout(500);

        const metrics = await page.evaluate(({ expectedViewports, motionMode }) => {
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

          const visualPanel = document.querySelector('[data-testid="multiscale-visual-panel"]');
          const stage = document.querySelector(".mlff-schematic-stage");
          const title = document.querySelector('[data-testid="multiscale-scene-title"]');
          const panels = stage ? [...stage.querySelectorAll("[data-mlff-panel]")] : [];
          const regions = stage ? [...stage.querySelectorAll("[data-mlff-viewport]")] : [];
          const fontTargets = visualPanel
            ? [...visualPanel.querySelectorAll("h1,h2,h3,h4,p,button,a,span,dt,dd")]
                .filter((element) => {
                  if (!visible(element) || element.closest(".sr-only") || element.closest(".katex")) return false;
                  return Boolean(element.textContent?.replace(/\s+/g, " ").trim());
                })
                .map((element) => ({
                  text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 100) ?? "",
                  size: Number.parseFloat(window.getComputedStyle(element).fontSize),
                }))
                .filter(({ size }) => Number.isFinite(size))
            : [];
          const clippedText = panels.flatMap((panel) => {
            const panelRect = rect(panel);
            return [...panel.querySelectorAll("h4,p,span")]
              .filter((element) => {
                if (!visible(element) || element.closest(".katex") || element.closest(".sr-only")) return false;
                return Boolean(element.textContent?.replace(/\s+/g, " ").trim());
              })
              .map((element) => ({ element, box: rect(element) }))
              .filter(({ box }) =>
                box.left < panelRect.left - 2 ||
                box.right > panelRect.right + 2 ||
                box.top < panelRect.top - 2 ||
                box.bottom > panelRect.bottom + 2
              )
              .map(({ element, box }) => ({
                panel: panel.getAttribute("data-mlff-panel"),
                text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 100) ?? "",
                box,
                panelRect,
              }));
          });
          const legacySelectors = [
            ".mlff-mechanism",
            '[data-testid="mlff-mechanism"]',
            '[data-legacy-mlff="true"]',
          ];
          const visibleLegacy = legacySelectors.flatMap((selector) =>
            [...document.querySelectorAll(selector)].filter(visible).map((element) => ({
              selector,
              className: element.className?.toString().slice(0, 120) ?? "",
            })),
          );
          const visibleCameraControls = [
            ...document.querySelectorAll('[data-testid="multiscale-camera-controls"], [data-testid="mobile-viewer-toolbar-tray"]'),
          ].filter(visible);
          const regionDetails = regions.map((region) => ({
            variant: region.getAttribute("data-mlff-viewport"),
            ready: region.getAttribute("data-ready"),
            error: region.getAttribute("data-error"),
            autoRotate: region.getAttribute("data-auto-rotate"),
            interactive: region.getAttribute("data-interactive"),
            pointerEvents: window.getComputedStyle(region).pointerEvents,
            rect: rect(region),
          }));
          const variants = regionDetails.map(({ variant }) => variant);
          const expectedVariantsPresent = expectedViewports.every((variant) => variants.includes(variant));
          const strayCanvases = stage
            ? [...stage.querySelectorAll("canvas")].filter((canvas) => !canvas.closest("[data-mlff-viewport]"))
            : [];
          const messagePulses = stage ? [...stage.querySelectorAll(".mlff-exact-message-pulse")] : [];
          const messageFlashes = stage ? [...stage.querySelectorAll(".mlff-exact-center-flash")] : [];
          const messageHalos = stage ? [...stage.querySelectorAll(".mlff-exact-center-halo")] : [];
          const animationDetails = (elements) => elements.map((element) => {
            const style = window.getComputedStyle(element);
            return {
              animationName: style.animationName,
              animationDuration: style.animationDuration,
              animationDelay: style.animationDelay,
            };
          });
          const labelDetail = (selector) => {
            const element = stage?.querySelector(selector);
            if (!element) return null;
            return {
              text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
              fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
              rect: rect(element),
            };
          };
          const projectedGraph = stage?.querySelector("[data-mlff-projected-graph]");
          const messageOverlay = stage?.querySelector("[data-mlff-message-overlay]");
          const cutoffShell = projectedGraph?.querySelector("[data-mlff-cutoff-shell]");
          const clippedSignals = projectedGraph?.querySelector("[data-mlff-cutoff-clipped-signals]");
          const centerAnchor = projectedGraph?.querySelector("[data-mlff-center-anchor]");
          const numberAttribute = (element, name) => Number.parseFloat(element?.getAttribute(name) ?? "NaN");
          const centerCoordinates = centerAnchor
            ? { x: numberAttribute(centerAnchor, "cx"), y: numberAttribute(centerAnchor, "cy") }
            : null;
          const projectedEdges = projectedGraph
            ? [...projectedGraph.querySelectorAll("g[data-neighbor-index]")].map((group) => {
                const edge = group.querySelector("[data-mlff-message-edge]");
                const anchor = group.querySelector("[data-mlff-neighbor-anchor]");
                const sourceError = edge && anchor
                  ? Math.hypot(
                      numberAttribute(edge, "x1") - numberAttribute(anchor, "cx"),
                      numberAttribute(edge, "y1") - numberAttribute(anchor, "cy"),
                    )
                  : Number.POSITIVE_INFINITY;
                const centerError = edge && centerCoordinates
                  ? Math.hypot(
                      numberAttribute(edge, "x2") - centerCoordinates.x,
                      numberAttribute(edge, "y2") - centerCoordinates.y,
                    )
                  : Number.POSITIVE_INFINITY;
                const sourceInsideProjectedCutoff = cutoffShell && anchor && typeof cutoffShell.isPointInFill === "function"
                  ? cutoffShell.isPointInFill(new DOMPoint(
                      numberAttribute(anchor, "cx"),
                      numberAttribute(anchor, "cy"),
                    ))
                  : false;
                return {
                  neighborIndex: group.getAttribute("data-neighbor-index"),
                  distanceAngstrom: Number.parseFloat(group.getAttribute("data-distance-angstrom") ?? "NaN"),
                  sourceError,
                  centerError,
                  sourceInsideProjectedCutoff,
                };
              })
            : [];
          const animatedEndpointErrors = motionMode === "no-preference"
            ? messagePulses.map((pulse) => {
                const group = pulse.closest("g[data-neighbor-index]");
                const source = group?.querySelector("[data-mlff-neighbor-anchor]");
                const target = projectedGraph?.querySelector("[data-mlff-center-anchor]");
                const animation = pulse.getAnimations()[0];
                if (!group || !source || !target || !animation) {
                  return { sourceError: Number.POSITIVE_INFINITY, centerError: Number.POSITIVE_INFINITY };
                }
                const centerOf = (element) => {
                  const box = element.getBoundingClientRect();
                  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
                };
                const originalTime = animation.currentTime;
                const originalPlayState = animation.playState;
                const timing = animation.effect?.getTiming();
                const delay = Number(timing?.delay ?? 0);
                const duration = Number(timing?.duration ?? 0);
                animation.pause();
                animation.currentTime = delay + duration * 0.23;
                const pulseAtSource = centerOf(pulse);
                const sourceCenter = centerOf(source);
                animation.currentTime = delay + duration * 0.64;
                const pulseAtCenter = centerOf(pulse);
                const targetCenter = centerOf(target);
                if (originalTime !== null) animation.currentTime = originalTime;
                if (originalPlayState === "running") animation.play();
                return {
                  sourceError: Math.hypot(pulseAtSource.x - sourceCenter.x, pulseAtSource.y - sourceCenter.y),
                  centerError: Math.hypot(pulseAtCenter.x - targetCenter.x, pulseAtCenter.y - targetCenter.y),
                };
              })
            : [];

          return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            documentWidth: document.documentElement.scrollWidth,
            visualClientWidth: visualPanel?.clientWidth ?? 0,
            visualScrollWidth: visualPanel?.scrollWidth ?? 0,
            titleRect: title ? rect(title) : null,
            firstPanelRect: panels[0] ? rect(panels[0]) : null,
            panelRects: panels.map((panel) => ({ name: panel.getAttribute("data-mlff-panel"), ...rect(panel) })),
            clippedText,
            minimumVisibleFont: fontTargets.length ? Math.min(...fontTargets.map(({ size }) => size)) : 0,
            smallestText: [...fontTargets].sort((a, b) => a.size - b.size).slice(0, 12),
            visibleLegacy,
            visibleCameraControlCount: visibleCameraControls.length,
            regionDetails,
            expectedVariantsPresent,
            strayCanvasCount: strayCanvases.length,
            neighborMessageSignal: {
              overlayCount: stage?.querySelectorAll("[data-mlff-message-overlay]").length ?? 0,
              pulseCount: messagePulses.length,
              flashCount: messageFlashes.length,
              haloCount: messageHalos.length,
              pulses: animationDetails(messagePulses),
              flashes: animationDetails(messageFlashes),
              centerLabel: labelDetail("[data-mlff-center-atom-label]"),
              cutoffLabel: labelDetail("[data-mlff-cutoff-label]"),
              projectedEdges,
              animatedEndpointErrors,
              maximumAnimatedEndpointError: animatedEndpointErrors.length
                ? Math.max(...animatedEndpointErrors.flatMap(({ sourceError, centerError }) => [sourceError, centerError]))
                : null,
              cutoffAngstrom: Number.parseFloat(messageOverlay?.getAttribute("data-cutoff-angstrom") ?? "NaN"),
              lengthUnit: messageOverlay?.getAttribute("data-length-unit") ?? null,
              cutoffBoundarySampleCount: cutoffShell?.getAttribute("d")?.match(/[ML]/g)?.length ?? 0,
              signalsClippedToProjectedCutoff: clippedSignals?.getAttribute("clip-path")?.includes("mlff-exact-cutoff-clip") ?? false,
              maximumEndpointError: projectedEdges.length
                ? Math.max(...projectedEdges.flatMap(({ sourceError, centerError }) => [sourceError, centerError]))
                : null,
            },
          };
        }, { expectedViewports: scene.expectedViewports, motionMode: MOTION_MODE });

        const slug = `${language}-${viewport.width}x${viewport.height}-${scene.id}`;
        const mainPath = path.join(EVIDENCE_DIR, `${slug}.png`);
        const visualPanel = page.locator('[data-testid="multiscale-visual-panel"]');
        const stage = page.locator(".mlff-schematic-stage");
        await screenshot(visualPanel, mainPath);

        let motionComparison = null;
        let dragComparison = null;
        const deepArtifacts = [];
        if (DEEP_CHECKS) {
          const frameAPath = path.join(EVIDENCE_DIR, `${slug}-frame-a.png`);
          const frameBPath = path.join(EVIDENCE_DIR, `${slug}-frame-b.png`);
          await screenshot(stage, frameAPath);
          await page.waitForTimeout(MOTION_MODE === "no-preference" ? 850 : 2_500);
          await screenshot(stage, frameBPath);
          motionComparison = await comparePngs(page, frameAPath, frameBPath);
          deepArtifacts.push(frameAPath, frameBPath);

          if (MOTION_MODE === "reduce") {
            const regions = page.locator("[data-mlff-viewport]");
            const regionComparisons = [];
            for (let index = 0; index < await regions.count(); index += 1) {
              const region = regions.nth(index);
              await region.scrollIntoViewIfNeeded();
              const beforeDragPath = path.join(EVIDENCE_DIR, `${slug}-viewport-${index}-before-drag.png`);
              const afterDragPath = path.join(EVIDENCE_DIR, `${slug}-viewport-${index}-after-drag.png`);
              await screenshot(region, beforeDragPath);
              const box = await region.boundingBox();
              if (!box) continue;
              const centerX = box.x + box.width / 2;
              const centerY = box.y + box.height / 2;
              await page.mouse.move(centerX, centerY);
              await page.mouse.down();
              await page.mouse.move(centerX + Math.min(70, box.width * 0.2), centerY + Math.min(45, box.height * 0.16), { steps: 8 });
              await page.mouse.up();
              await page.waitForTimeout(125);
              await screenshot(region, afterDragPath);
              regionComparisons.push(await comparePngs(page, beforeDragPath, afterDragPath));
              deepArtifacts.push(beforeDragPath, afterDragPath);
            }
            dragComparison = {
              sameDimensions: regionComparisons.length === await regions.count() && regionComparisons.every(({ sameDimensions }) => sameDimensions),
              changedFraction: regionComparisons.length
                ? Math.max(...regionComparisons.map(({ changedFraction }) => changedFraction ?? Number.POSITIVE_INFINITY))
                : Number.POSITIVE_INFINITY,
              regions: regionComparisons,
            };
          }
        }

        const titleCollision = metrics.titleRect && metrics.firstPanelRect
          ? intersects(metrics.titleRect, metrics.firstPanelRect)
          : true;
        const checks = {
          noHorizontalOverflow:
            metrics.documentWidth <= metrics.viewport.width + 1 &&
            metrics.visualScrollWidth <= metrics.visualClientWidth + 1,
          noClippedPanelText: metrics.clippedText.length === 0,
          titleDoesNotCollideWithFirstPanel: !titleCollision,
          visibleTextAtLeast12px: metrics.minimumVisibleFont >= 12,
          noLegacyMlffOverlay: metrics.visibleLegacy.length === 0 && metrics.strayCanvasCount === 0,
          noActiveCameraControls: metrics.visibleCameraControlCount === 0,
          exactlyTwoStaticMolstarRegions:
            metrics.regionDetails.length === 2 &&
            metrics.regionDetails.every((region) =>
              region.ready === "true" &&
              region.error === "false" &&
              region.autoRotate === "false" &&
              region.interactive === "false" &&
              region.pointerEvents === "none"
            ),
          expectedMolstarRegionsMounted: metrics.expectedVariantsPresent,
          ...(scene.id === "inside"
            ? {
                readableCenterAndCutoffLabels:
                  metrics.neighborMessageSignal.centerLabel?.fontSize >= 24 &&
                  metrics.neighborMessageSignal.cutoffLabel?.fontSize >= 18,
                semanticNeighborSignalPresent:
                  metrics.neighborMessageSignal.overlayCount === 1 &&
                  metrics.neighborMessageSignal.pulseCount === 6 &&
                  metrics.neighborMessageSignal.flashCount === 6 &&
                  metrics.neighborMessageSignal.haloCount === 1,
                exactProjectedEdgeAlignment:
                  metrics.neighborMessageSignal.projectedEdges.length === 6 &&
                  metrics.neighborMessageSignal.maximumEndpointError <= 0.01,
                mathematicallyConsistentCutoff:
                  metrics.neighborMessageSignal.lengthUnit === "angstrom" &&
                  Math.abs(metrics.neighborMessageSignal.cutoffAngstrom - 3.6) <= 1e-9 &&
                  metrics.neighborMessageSignal.cutoffBoundarySampleCount === 192 &&
                  metrics.neighborMessageSignal.signalsClippedToProjectedCutoff &&
                  metrics.neighborMessageSignal.projectedEdges.every(({ distanceAngstrom, sourceInsideProjectedCutoff }) =>
                    distanceAngstrom <= metrics.neighborMessageSignal.cutoffAngstrom + 1e-9 &&
                    sourceInsideProjectedCutoff
                  ),
                ...(MOTION_MODE === "reduce"
                  ? {
                      semanticNeighborMotionReduced:
                        metrics.neighborMessageSignal.pulses.every(({ animationName }) => animationName === "none") &&
                        metrics.neighborMessageSignal.flashes.every(({ animationName }) => animationName === "none"),
                    }
                  : {
                      semanticNeighborMotionActive:
                        metrics.neighborMessageSignal.pulses.every(({ animationName }) => animationName.includes("mlff-exact-message-arrive")) &&
                        metrics.neighborMessageSignal.flashes.every(({ animationName }) => animationName.includes("mlff-exact-center-receive")),
                      exactAnimatedPulseEndpoints:
                        metrics.neighborMessageSignal.animatedEndpointErrors.length === 6 &&
                        metrics.neighborMessageSignal.maximumAnimatedEndpointError <= 0.01,
                    }),
              }
            : {}),
          ...(DEEP_CHECKS
            ? MOTION_MODE === "reduce"
              ? {
                noUnintendedMotion:
                  motionComparison?.sameDimensions === true && motionComparison.changedFraction <= 0.0001,
                dragCannotMoveCamera:
                  dragComparison?.sameDimensions === true && dragComparison.changedFraction <= 0.0001,
              }
              : {
                  semanticMessageMotionVisible:
                    scene.id !== "inside" ||
                    (motionComparison?.sameDimensions === true && motionComparison.changedFraction >= 0.00001),
                }
            : {}),
        };
        const pass = Object.values(checks).every(Boolean);
        if (!pass) failed = true;

        report.cases.push({
          language,
          viewport,
          scene: scene.id,
          pass,
          checks,
          metrics,
          motionComparison,
          dragComparison,
          artifacts: [
            path.relative(ROOT, mainPath),
            ...deepArtifacts.map((artifact) => path.relative(ROOT, artifact)),
          ],
        });
        process.stdout.write(`${pass ? "PASS" : "FAIL"} ${slug} ${JSON.stringify(checks)}\n`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

report.summary = {
  cases: report.cases.length,
  passed: report.cases.filter(({ pass }) => pass).length,
  failed: report.cases.filter(({ pass }) => !pass).length,
  distinctMlffViewportVariants: [
    ...new Set(report.cases.flatMap(({ metrics }) => metrics.regionDetails.map(({ variant }) => variant))),
  ].sort(),
};

const reportPath = path.join(EVIDENCE_DIR, "report.json");
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
process.stdout.write(`Report: ${path.relative(ROOT, reportPath)}\n`);

if (failed && !ALLOW_FAILURE) process.exitCode = 1;
