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
const option = (cliKey, environmentKey, fallback) =>
  cli.get(cliKey) ?? process.env[environmentKey] ?? fallback;
const BASE_URL = option("base-url", "RESEARCH_BASE_URL", "http://localhost:3000");
const RUN_ID = option("run-id", "MULTISCALE_AUDIT_RUN_ID", new Date().toISOString().replace(/[:.]/g, "-"));
const languages = option("langs", "MULTISCALE_AUDIT_LANGS", "ko,en")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const EVIDENCE_DIR = path.join(ROOT, "artifacts", "multiscale-eight-page-audit", RUN_ID);
const VIEWPORT = { width: 1440, height: 1024 };
const SCENES = [
  { key: "D6_outputs", level: "dft", step: 0 },
  { key: "D4_scf", level: "dft", step: 1 },
  { key: "L1_why", level: "mlff", step: 0 },
  { key: "L5_energy_force", level: "mlff", step: 1 },
  { key: "A6_observables", level: "allatom", step: 0 },
  { key: "A3_forcefield", level: "allatom", step: 1 },
  { key: "M5_collective", level: "meso", step: 0 },
  { key: "M2_mapping", level: "meso", step: 1 },
];

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
  viewport: VIEWPORT,
  expectedSceneKeys: SCENES.map(({ key }) => key),
  cases: [],
};
let failed = false;

try {
  for (const language of languages) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/${language}/multiscale`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => typeof window.__multiscaleDebug?.jumpToScene === "function",
      undefined,
      { timeout: 30_000 },
    );

    for (const scene of SCENES) {
      await page.evaluate(({ level, step }) => {
        window.__multiscaleDebug?.jumpToScene(level, step, 0.5, null);
        window.scrollTo(0, 0);
      }, scene);
      await page.locator('[data-testid="multiscale-stage-shell"]').waitFor({ state: "visible", timeout: 30_000 });
      await page.locator('[data-testid="multiscale-visual-panel"]').waitFor({ state: "visible", timeout: 30_000 });
      if (scene.level === "mlff") {
        await page.waitForFunction(() => {
          const regions = [...document.querySelectorAll("[data-mlff-viewport]")];
          return regions.length === 2 && regions.every((region) => region.getAttribute("data-ready") === "true");
        }, undefined, { timeout: 45_000 });
      } else {
        await page.waitForTimeout(1_250);
      }
      await page.waitForTimeout(350);

      const metrics = await page.evaluate(({ level, step }) => {
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
        const stageShell = document.querySelector('[data-testid="multiscale-stage-shell"]');
        const visualPanel = document.querySelector('[data-testid="multiscale-visual-panel"]');
        const sceneTitle = document.querySelector('[data-testid="multiscale-scene-title"] h3');
        const textElements = stageShell
          ? [...stageShell.querySelectorAll("h1,h2,h3,h4,p,a,button,span,dt,dd,text,tspan")]
              .filter((element) => {
                if (!visible(element) || element.closest(".sr-only")) return false;
                const katexRoot = element.closest(".katex");
                if (katexRoot && katexRoot !== element) return false;
                return Boolean(element.textContent?.replace(/\s+/g, " ").trim());
              })
              .map((element) => ({
                tag: element.tagName,
                text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "",
                size: Number.parseFloat(window.getComputedStyle(element).fontSize),
                className: element.className?.toString().slice(0, 120) ?? "",
              }))
              .filter(({ size }) => Number.isFinite(size))
          : [];
        const visualHeadings = visualPanel
          ? [...visualPanel.querySelectorAll("h3,h4")]
              .filter(visible)
              .map((element) => ({
                text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 100) ?? "",
                size: Number.parseFloat(window.getComputedStyle(element).fontSize),
              }))
          : [];
        const rawEquationCandidates = stageShell
          ? [...stageShell.querySelectorAll("p,span,div")]
              .filter((element) => visible(element) && !element.closest(".katex") && !element.closest("svg"))
              .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
              .filter((text) => text.length > 0 && text.length < 160 && /[=∑Σ∇ρψφ]|E\(|F\(/.test(text))
              .slice(0, 30)
          : [];
        const state = window.__multiscaleDebug?.getState?.() ?? null;
        return {
          expectedState: { level, step },
          actualState: state ? { level: state.level, step: state.step } : null,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          stageClientWidth: stageShell?.clientWidth ?? 0,
          stageScrollWidth: stageShell?.scrollWidth ?? 0,
          minimumVisibleFont: textElements.length ? Math.min(...textElements.map(({ size }) => size)) : 0,
          smallestText: [...textElements].sort((a, b) => a.size - b.size).slice(0, 16),
          sceneTitleSize: sceneTitle ? Number.parseFloat(window.getComputedStyle(sceneTitle).fontSize) : 0,
          visualHeadings,
          katexCount: stageShell?.querySelectorAll(".katex").length ?? 0,
          svgTextCount: stageShell?.querySelectorAll("svg text").length ?? 0,
          rawEquationCandidates,
        };
      }, { level: scene.level, step: scene.step });

      const checks = {
        debugStateMatchesScene:
          metrics.actualState?.level === scene.level && metrics.actualState?.step === scene.step,
        sceneTitleIs28px: Math.abs(metrics.sceneTitleSize - 28) < 0.1,
        visibleTextAtLeast12px: metrics.minimumVisibleFont >= 12,
        noHorizontalOverflow:
          metrics.documentWidth <= metrics.viewportWidth + 1 &&
          metrics.stageScrollWidth <= metrics.stageClientWidth + 1,
        equationsUseTypesetSurfaces:
          metrics.katexCount + metrics.svgTextCount > 0 || metrics.rawEquationCandidates.length === 0,
      };
      const pass = Object.values(checks).every(Boolean);
      if (!pass) failed = true;

      const slug = `${language}-${scene.key}`;
      const visualPath = path.join(EVIDENCE_DIR, `${slug}.visual.png`);
      const viewportPath = path.join(EVIDENCE_DIR, `${slug}.viewport.png`);
      await page.locator('[data-testid="multiscale-visual-panel"]').screenshot({
        path: visualPath,
        animations: "disabled",
        caret: "hide",
      });
      await page.locator('[data-testid="multiscale-stage-shell"]').screenshot({
        path: viewportPath,
        animations: "disabled",
        caret: "hide",
      });

      report.cases.push({
        language,
        scene,
        pass,
        checks,
        metrics,
        artifacts: [path.relative(ROOT, visualPath), path.relative(ROOT, viewportPath)],
      });
      process.stdout.write(`${pass ? "PASS" : "FAIL"} ${slug} ${JSON.stringify(checks)}\n`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

report.summary = {
  totalCases: report.cases.length,
  passedCases: report.cases.filter(({ pass }) => pass).length,
  failedCases: report.cases.filter(({ pass }) => !pass).length,
  capturedSceneKeys: [...new Set(report.cases.map(({ scene }) => scene.key))],
  languages: [...new Set(report.cases.map(({ language }) => language))],
};

const reportPath = path.join(EVIDENCE_DIR, "report.json");
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
process.stdout.write(`Report: ${path.relative(ROOT, reportPath)}\n`);

if (failed) process.exitCode = 1;
