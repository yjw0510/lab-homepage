// How much of the DFT canvas the scene actually paints, per desktop viewport.
// Reads the WebGL canvas back through toDataURL; element.screenshot() renders black here.
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:4321";
// The schedule pads mobile by an extra factor, and mobile gets a fixed scene height rather than
// the panel's, so both sides have to be measured before either is retuned.
const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1280, h: 800 },
  { w: 1440, h: 900 },
  { w: 1728, h: 1080 },
  { w: 2560, h: 1440 },
];

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader",
         "--use-gl=angle", "--enable-unsafe-swiftshader"],
});
for (const step of [0, 1]) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(`${BASE}/en/multiscale`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => typeof window.__multiscaleDebug?.jumpToScene === "function",
      undefined, { timeout: 60000 },
    );
    await page.locator('[data-testid="multiscale-visual-panel"]').waitFor({ state: "visible", timeout: 30000 });
    await page.evaluate((s) => window.__multiscaleDebug.jumpToScene("dft", s, 0.8), step);
    await page.waitForSelector("canvas", { timeout: 60000 });
    await page.waitForTimeout(9000);

    const box = await page.evaluate(() => {
      const canvas = [...document.querySelectorAll("canvas")]
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (!canvas) return null;
      const url = canvas.toDataURL();
      const image = new Image();
      return new Promise((resolve) => {
        image.onload = () => {
          const w = image.width, h = image.height;
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          ctx.drawImage(image, 0, 0);
          const { data } = ctx.getImageData(0, 0, w, h);
          // The scene background is a near-black flat fill; anything painted is brighter.
          const bg = [data[0], data[1], data[2]];
          let x0 = w, x1 = -1, y0 = h, y1 = -1, painted = 0;
          for (let y = 0; y < h; y += 1) {
            for (let x = 0; x < w; x += 1) {
              const i = (y * w + x) * 4;
              const d = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
              if (d > 18) {
                painted += 1;
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
              }
            }
          }
          resolve({ w, h, x0, x1, y0, y1, painted, bg });
        };
        image.src = url;
      });
    });

    if (!box || box.x1 < 0) {
      console.log(`step=${step} ${vp.w}x${vp.h}: nothing painted`);
    } else {
      const fw = (box.x1 - box.x0 + 1) / box.w;
      const fh = (box.y1 - box.y0 + 1) / box.h;
      const edge = [box.x0 <= 1, box.x1 >= box.w - 2, box.y0 <= 1, box.y1 >= box.h - 2];
      console.log(
        `step=${step} ${vp.w}x${vp.h}  canvas ${box.w}x${box.h}  ` +
        `width ${(fw * 100).toFixed(1)}%  height ${(fh * 100).toFixed(1)}%  ` +
        `coverage ${((box.painted / (box.w * box.h)) * 100).toFixed(1)}%  ` +
        `touches [L${+edge[0]} R${+edge[1]} T${+edge[2]} B${+edge[3]}]`,
      );
    }
    await page.close();
  }
}
await browser.close();
