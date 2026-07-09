// Capture full-page screenshots of every route for design audit evidence.
// Usage: node scripts/capture-site-audit.mjs <outDir> [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = process.argv[2];
const baseUrl = process.argv[3] ?? "http://localhost:3000";
if (!outDir) {
  console.error("outDir required");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const routes = [
  ["home-ko", "/ko"],
  ["home-en", "/en"],
  ["people", "/ko/people"],
  ["publications", "/ko/publications"],
  ["news", "/ko/news"],
  ["contact", "/ko/contact"],
  ["funding", "/ko/funding"],
  ["topics", "/ko/research-topics"],
  ["multiscale", "/ko/multiscale"],
  ["multiscale-meso", "/ko/multiscale/meso"],
  ["pub-detail", "/ko/publications/2024-water-diffusion-mlff"],
];

const viewports = [
  ["390", { width: 390, height: 844 }],
  ["768", { width: 768, height: 1024 }],
  ["1280", { width: 1280, height: 800 }],
];

const themes = ["light", "dark"];

const browser = await chromium.launch();
for (const theme of themes) {
  for (const [vpName, viewport] of viewports) {
    // Audit matrix: dark only at 1280 to bound volume; light at all widths.
    if (theme === "dark" && vpName !== "1280") continue;
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
      } catch {}
    }, theme);
    const page = await ctx.newPage();
    for (const [name, route] of routes) {
      try {
        await page.goto(baseUrl + route, { waitUntil: "networkidle", timeout: 45000 });
      } catch {
        // heavy WebGL pages may never reach networkidle; proceed after load
        await page.waitForTimeout(2000);
      }
      await page.evaluate((t) => {
        const root = document.documentElement;
        root.classList.toggle("dark", t === "dark");
      }, theme);
      await page.waitForTimeout(2500);
      // Simulate a real user's scroll so IntersectionObserver reveals fire,
      // then return to top before the full-page capture.
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(800);
      const file = path.join(outDir, `${name}-${vpName}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // horizontal scroll check
      const hs = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      console.log(`${name} ${vpName} ${theme} captured${hs ? " [H-SCROLL!]" : ""}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log("done");
