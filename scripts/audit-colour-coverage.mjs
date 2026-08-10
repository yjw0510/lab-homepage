// How much colour each captured page actually carries.
//
// DESIGN.md section 1 rev.2 says the palettes "must be FELT, not glimpsed". That is a claim
// about area, so measure area: the share of pixels that are chromatic rather than neutral,
// and how that chroma is distributed across hue families. Neutral here means low saturation
// in HSV, which is what both the ledger white and the Flexoki warm black are.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.env.EVIDENCE ?? ".superloopy/sessions/20260804-visual-code-audit/evidence";
const SHOTS = path.join(ROOT, "shots");

// Hue buckets named for the roles DESIGN.md assigns them.
const FAMILIES = [
  { name: "red/적 (signal, MLFF)", lo: 345, hi: 360 }, { name: "red/적 (signal, MLFF)", lo: 0, hi: 20 },
  { name: "orange", lo: 20, hi: 45 },
  { name: "yellow/황 (all-atom)", lo: 45, hi: 70 },
  { name: "green", lo: 70, hi: 160 },
  { name: "cyan/teal", lo: 160, hi: 200 },
  { name: "blue/청 (link, DFT)", lo: 200, hi: 260 },
  { name: "violet/magenta", lo: 260, hi: 345 },
];

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

const rows = [];
for (const file of fs.readdirSync(SHOTS).filter((f) => f.endsWith(".png"))) {
  const { data, info } = await sharp(path.join(SHOTS, file))
    .resize(320, null, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const ch = info.channels;
  let chromatic = 0, strong = 0;
  const fam = {};
  for (let i = 0; i < n; i += 1) {
    const { h, s, v } = rgbToHsv(data[i * ch], data[i * ch + 1], data[i * ch + 2]);
    // Saturation 0.18 separates the tinted washes from the neutral paper/ink; below it the
    // pixel reads as a grey to a viewer even when its hex is not strictly neutral.
    if (s < 0.18 || v < 0.06) continue;
    chromatic += 1;
    if (s >= 0.35) strong += 1;
    const f = FAMILIES.find((x) => h >= x.lo && h < x.hi);
    if (f) fam[f.name] = (fam[f.name] ?? 0) + 1;
  }
  const id = file.replace(/\.png$/, "");
  const [theme, vp, lang, ...rest] = id.split("-");
  rows.push({
    id, theme, vp, lang,
    surface: rest.join("-").startsWith("scene") ? "instrument" : "content",
    page: rest.join("-"),
    chromaticPct: +((chromatic / n) * 100).toFixed(2),
    strongPct: +((strong / n) * 100).toFixed(2),
    families: Object.fromEntries(Object.entries(fam)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => [k, +((c / n) * 100).toFixed(2)])),
  });
}

rows.sort((a, b) => a.chromaticPct - b.chromaticPct);
const lines = ["# Colour coverage — share of chromatic pixels per capture\n",
  "`chromatic` = HSV saturation >= 0.18. `strong` = saturation >= 0.35.",
  "DESIGN.md section 1 rev.2: the palettes \"must be FELT, not glimpsed\".\n",
  "| capture | surface | chromatic % | strong % | dominant families |", "|---|---|---|---|---|"];
for (const r of rows) {
  const fams = Object.entries(r.families).slice(0, 3).map(([k, v]) => `${k} ${v}%`).join(", ") || "—";
  lines.push(`| ${r.id} | ${r.surface} | ${r.chromaticPct} | ${r.strongPct} | ${fams} |`);
}
const mean = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : 0;
for (const key of ["surface", "theme"]) {
  const groups = {};
  for (const r of rows) (groups[r[key]] ??= []).push(r);
  lines.push(`\n## Mean by ${key}\n`);
  for (const [k, v] of Object.entries(groups)) {
    lines.push(`- **${k}** — chromatic ${mean(v.map((x) => x.chromaticPct))}%, strong ${mean(v.map((x) => x.strongPct))}%  (${v.length} captures)`);
  }
}
fs.writeFileSync(path.join(ROOT, "probes", "COLOUR-COVERAGE.md"), lines.join("\n"));
console.log(lines.slice(0, 8).join("\n"));
console.log(`\n${rows.length} captures. lowest: ${rows.slice(0, 5).map((r) => `${r.id} ${r.chromaticPct}%`).join(" | ")}`);
console.log(`highest: ${rows.slice(-5).map((r) => `${r.id} ${r.chromaticPct}%`).join(" | ")}`);
