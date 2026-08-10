// Roll the layer probes into one table, with the known-benign stacking filtered out.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.EVIDENCE ?? ".superloopy/sessions/20260804-visual-code-audit/evidence";
const LAYERS = path.join(ROOT, "layers");
const ZOOM = path.join(ROOT, "shots-zoom");

/**
 * KaTeX paints every equation twice: a visual `.katex-html` tree and a MathML tree stacked on
 * the same pixels for assistive technology. The hit test therefore reports the MathML as
 * covered by the visual span, and the two boxes as overlapping, on every formula on the page.
 * That is how KaTeX works, not a defect, and it accounted for every hit on the MLFF scenes.
 */
const MATH = /^(math|semantics|annotation|mrow|mi|mo|mn|ms|mtext|msub|msup|msubsup|mfrac|msqrt|munder|mover|munderover|mtable|mtr|mtd|mpadded|mspace|mstyle)\b/;
const KATEX = /\b(katex|vlist|mord|mrel|mopen|mclose|mbin|mpunct|mspace|base|strut|delimsizing|op-symbol|accent|frac-line|sizing|nulldelimiter|pstrut|svg-align|halfarrow|stretchy|hide-tail)\b/;
const benign = (d = "") => MATH.test(d) || KATEX.test(d);

const rows = [];
const overlapsAll = [];
const occludedAll = [];
const translucentAll = [];
const blendedAll = [];
const invisibleAll = [];
const stackingAll = [];

for (const f of fs.readdirSync(LAYERS).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(LAYERS, f), "utf8"));
  const id = f.replace(/\.json$/, "");
  const keep = {
    overlaps: (d.overlaps ?? []).filter((x) => !benign(x.a) && !benign(x.b)),
    occluded: (d.occluded ?? []).filter((x) => !benign(x.desc) && !benign(x.coveredBy)),
    translucent: (d.translucent ?? []).filter((x) => !benign(x.desc)),
    blended: (d.blended ?? []).filter((x) => !benign(x.desc)),
    invisible: (d.invisible ?? []).filter((x) => !benign(x.desc)),
  };
  for (const x of keep.overlaps) overlapsAll.push({ id, ...x });
  for (const x of keep.occluded) occludedAll.push({ id, ...x });
  for (const x of keep.translucent) translucentAll.push({ id, ...x });
  for (const x of keep.blended) blendedAll.push({ id, ...x });
  for (const x of keep.invisible) invisibleAll.push({ id, ...x });
  for (const x of d.stacking ?? []) stackingAll.push({ id, ...x });
  rows.push({
    id,
    surface: id.includes("-scene-") ? "instrument" : "content",
    overlaps: keep.overlaps.length, occluded: keep.occluded.length,
    translucent: keep.translucent.length, blended: keep.blended.length,
    invisible: keep.invisible.length, stacking: (d.stacking ?? []).length,
    zoom: (d.zoomRegions ?? []).length,
  });
}

const group = (arr, key) => {
  const m = {};
  for (const x of arr) { const k = key(x); (m[k] ??= []).push(x); }
  return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
};

const L = [];
L.push(`# Layer probe — ${rows.length} captures\n`);
L.push(`What a flat screenshot cannot show: paint order, occlusion, blending, and elements that`);
L.push(`are present and sized but paint nothing. Occlusion is measured with the browser's own`);
L.push(`\`document.elementFromPoint\` hit test, sampled inside each element's line boxes, and an`);
L.push(`element counts as occluded only when >=70% of its sampled points answer with a`);
L.push(`non-descendant. KaTeX's parallel MathML tree is excluded — it stacks on the visual tree`);
L.push(`by construction.\n`);

L.push(`## Per-capture\n`);
L.push("| capture | surface | overlaps | occluded | translucent | blended | invisible | stacking ctx | zoom crops |");
L.push("|---|---|---|---|---|---|---|---|---|");
for (const r of rows.sort((a, b) => (b.overlaps + b.occluded + b.invisible) - (a.overlaps + a.occluded + a.invisible))) {
  L.push(`| ${r.id} | ${r.surface} | ${r.overlaps} | ${r.occluded} | ${r.translucent} | ${r.blended} | ${r.invisible} | ${r.stacking} | ${r.zoom} |`);
}

L.push(`\n## Box collisions (two non-nested boxes sharing >=25% of the smaller) — ${overlapsAll.length}\n`);
for (const [k, xs] of group(overlapsAll, (x) => `${x.a} X ${x.b}`).slice(0, 30)) {
  L.push(`- **${xs.length}x** ${k} — share ${xs[0].share}, e.g. ${xs[0].id} — "${(xs[0].aText || "").slice(0, 26)}" over "${(xs[0].bText || "").slice(0, 26)}"`);
}

L.push(`\n## Occluded content (>=70% of its own painted area answers as something else) — ${occludedAll.length}\n`);
for (const [k, xs] of group(occludedAll, (x) => `${x.desc} <- ${x.coveredBy}`).slice(0, 30)) {
  L.push(`- **${xs.length}x** ${k} — coverer opacity ${xs[0].covererOpacity}, e.g. ${xs[0].id} — "${(xs[0].text || "").slice(0, 40)}"`);
}

L.push(`\n## Translucent elements (0 < opacity < 1) — ${translucentAll.length}\n`);
for (const [k, xs] of group(translucentAll, (x) => `${x.desc} @${x.opacity}`).slice(0, 30)) {
  L.push(`- **${xs.length}x** ${k} — e.g. ${xs[0].id} "${(xs[0].text || "").slice(0, 34)}"`);
}

L.push(`\n## mix-blend-mode — ${blendedAll.length}\n`);
for (const [k, xs] of group(blendedAll, (x) => `${x.desc} ${x.blend}`).slice(0, 20)) {
  L.push(`- **${xs.length}x** ${k} — e.g. ${xs[0].id}`);
}

L.push(`\n## Sized but painting nothing (opacity 0 or visibility hidden) — ${invisibleAll.length}\n`);
L.push(`Some of these are mid-animation. A class that appears at opacity 0 in EVERY capture is`);
L.push(`either never animating or animating outside the sampled window.\n`);
for (const [k, xs] of group(invisibleAll, (x) => x.desc).slice(0, 30)) {
  const ids = new Set(xs.map((x) => x.id));
  L.push(`- **${xs.length}x across ${ids.size} captures** \`${k}\` — e.g. ${xs[0].id}`);
}

L.push(`\n## Stacking contexts declared — ${stackingAll.length}\n`);
for (const [k, xs] of group(stackingAll, (x) => `${x.desc} z=${x.z} pos=${x.position}${x.filter ? " filter=" + x.filter : ""}`).slice(0, 25)) {
  L.push(`- **${xs.length}x** ${k}`);
}

const zoomFiles = fs.existsSync(ZOOM) ? fs.readdirSync(ZOOM).filter((f) => f.endsWith(".png")) : [];
L.push(`\n## Zoom crops — ${zoomFiles.length} at 3x\n`);
L.push(`Four densest non-adjacent tiles per scene, expanded to 2x2 blocks and re-rendered through`);
L.push(`\`page.screenshot({clip})\` at \`deviceScaleFactor: 3\`. Real re-render, not an upscale.`);
L.push(`Path: \`${ZOOM}/<capture-id>-z<0..3>.png\`\n`);
for (const [k, xs] of group(zoomFiles.map((f) => ({ f, base: f.replace(/-z\d+\.png$/, "") })), (x) => x.base).slice(0, 40)) {
  L.push(`- ${k} — ${xs.length} crops`);
}

const out = path.join(ROOT, "probes", "LAYERS.md");
fs.writeFileSync(out, L.join("\n"));
const t = (k) => rows.reduce((s, r) => s + r[k], 0);
console.log(`wrote ${out}`);
console.log(`${rows.length} captures | overlaps ${t("overlaps")} | occluded ${t("occluded")} | translucent ${t("translucent")} | blended ${t("blended")} | invisible ${t("invisible")} | zoom ${zoomFiles.length}`);
