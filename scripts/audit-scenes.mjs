// Per-scene motion + rotation + occlusion audit for the live multiscale spine.
// Fresh browser context per scene so it reflects current server code.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const GL = ["--enable-webgl","--ignore-gpu-blocklist","--use-angle=swiftshader","--use-gl=angle","--enable-unsafe-swiftshader"];
const OUT = "/Users/yjw0510/Desktop/projects/lab_homepage/.superloopy/evidence/frontend/multiscale-pass3/audit";
await fs.mkdir(OUT, { recursive: true });

const SCENES = [
  { step: 0, id: "dft-D6", animates: true },
  { step: 1, id: "dft-D4scf", animates: true },
  { step: 2, id: "mlff-L1", animates: false },
  { step: 3, id: "aa-A6", animates: true },
  { step: 4, id: "aa-A3", animates: true },
  { step: 5, id: "meso-M5", animates: true },
  { step: 6, id: "meso-M6", animates: false },
];

const OVERLAY_TELLS = /reduced model reaches|polymer chains|What this scale exposes|Read different information|Reference-vs-inference|DFT-based MD|Scientific observables come from|force field is an energy|The mapping defines/i;
const report = [];

for (const s of SCENES) {
  const b = await chromium.launch({ args: GL });
  const c = await b.newContext({ viewport: { width: 1100, height: 860 }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  try {
    await p.goto(`http://localhost:3111/en/multiscale?step=${s.step}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.locator('[data-testid="multiscale-stage-shell"]').waitFor({ state: "visible", timeout: 60000 });
    await p.waitForTimeout(7500);
    const panel = p.locator('[data-testid="multiscale-visual-panel"]');
    const t0 = await panel.screenshot({ path: `${OUT}/${s.step}-${s.id}-t0.png` });
    await p.waitForTimeout(1600);
    const t1 = await panel.screenshot({ path: `${OUT}/${s.step}-${s.id}-t1.png` });
    const motionChanged = !t0.equals(t1);

    // rotate
    const box = await panel.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down();
    await p.mouse.move(cx + 200, cy + 30, { steps: 10 }); await p.mouse.up();
    await p.waitForTimeout(1200);
    const rot = await panel.screenshot({ path: `${OUT}/${s.step}-${s.id}-rot.png` });
    const rotateChanged = !t0.equals(rot);

    const panelText = await panel.innerText().catch(() => "");
    const railText = await p.locator('[data-testid="multiscale-right-rail"]').innerText().catch(() => "");
    const occlusion = OVERLAY_TELLS.test(panelText);

    const rec = {
      step: s.step, id: s.id,
      motionChanged, expectedMotion: s.animates,
      motionFlag: s.animates && !motionChanged ? "STATIC-BUT-SHOULD-ANIMATE" : "ok",
      rotateChanged, rotateFlag: !rotateChanged ? "CAMERA-NOT-TRACKING?" : "ok",
      occlusionOnCanvas: occlusion,
    };
    report.push(rec);
    process.stdout.write(JSON.stringify(rec) + "\n");
  } catch (e) {
    report.push({ step: s.step, id: s.id, error: String(e).slice(0, 120) });
    process.stdout.write(`ERROR ${s.id}: ${String(e).slice(0, 120)}\n`);
  }
  await b.close();
}
await fs.writeFile(`${OUT}/_audit.json`, JSON.stringify(report, null, 2));
console.log("AUDIT COMPLETE");
