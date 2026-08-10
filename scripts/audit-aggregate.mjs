// Roll the per-capture probes into one table the reviewers work from.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.EVIDENCE ?? ".superloopy/sessions/20260804-visual-code-audit/evidence";
const files = fs.readdirSync(path.join(ROOT, "probes")).filter((f) => f.endsWith(".json"));

/**
 * Not everything the probe calls clipped is a defect.
 *
 * `.sr-only` is a 1x1 clipping box by construction — that is how the technique works, and it
 * accounted for 240 of the first pass's 342 hits. `.truncate` is `text-overflow: ellipsis`, a
 * deliberate one-line elision that shows the reader an ellipsis. Only what is left is a box
 * silently swallowing content its author expected to be readable.
 */
function clipKind(c) {
  const d = c.desc ?? "";
  if (/\bsr-only\b/.test(d)) return "sr-only";
  if (/\btruncate\b|\bline-clamp/.test(d)) return "ellipsis";
  return "genuine";
}

/**
 * The declared token colours, as the browser reports them.
 *
 * The in-page probe compared `getComputedStyle(el).color` — always `rgb(r, g, b)` — against the
 * raw custom-property values, which globals.css writes as hex. Those never match, so every single
 * text node came back "off-token". Parse the stylesheet and convert, so the comparison is real.
 */
const TOKEN_RGB = (() => {
  const css = fs.readFileSync("src/app/globals.css", "utf8");
  const set = new Set();
  for (const m of css.matchAll(/--[\w-]+:\s*#([0-9a-fA-F]{6})\b/g)) {
    const h = m[1];
    set.add(`rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`);
  }
  for (const m of css.matchAll(/--[\w-]+:\s*(rgba?\([^)]+\))/g)) set.add(m[1].replace(/\s+/g, " "));
  return set;
})();

/**
 * WCAG 2.5.8 AA puts the minimum target at 24x24 CSS px; 44x44 is the AAA figure. The probe was
 * written against 40, which flagged every 40px-tall nav link whose measured height rounded to
 * 39.99. Judge against the standard instead of an invented number.
 */
const TARGET_MIN = 24;

const rows = [];
const weightTotals = {};
const weightBySurface = {};
const offTokenValues = {};
const clippedAll = [];
const smallAll = [];

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "probes", f), "utf8"));
  const id = f.replace(/\.json$/, "");
  const [theme, vp, lang, ...rest] = id.split("-");
  const surface = rest.join("-").startsWith("scene") ? "instrument" : "content";
  rows.push({ id, theme, vp, lang, page: rest.join("-"), surface, ...d.counts,
    clipped: (d.clipped ?? []).filter((c) => clipKind(c) === "genuine").length,
    smallTargets: (d.smallTargets ?? []).filter((s) => s.w < TARGET_MIN || s.h < TARGET_MIN).length,
    offToken: (d.offToken ?? []).filter((t) => !TOKEN_RGB.has(t.value.replace(/\s+/g, " "))).length,
    overflowX: d.overflowX });
  for (const [w, n] of Object.entries(d.weights ?? {})) {
    weightTotals[w] = (weightTotals[w] ?? 0) + n;
    weightBySurface[surface] ??= {};
    weightBySurface[surface][w] = (weightBySurface[surface][w] ?? 0) + n;
  }
  for (const t of d.offToken ?? []) {
    const v = t.value.replace(/\s+/g, " ");
    if (!TOKEN_RGB.has(v)) offTokenValues[v] = (offTokenValues[v] ?? 0) + 1;
  }
  for (const c of d.clipped ?? []) clippedAll.push({ id, ...c, kind: clipKind(c) });
  for (const s of d.smallTargets ?? []) {
    if (s.w < TARGET_MIN || s.h < TARGET_MIN) smallAll.push({ id, ...s });
  }
}

const pct = (obj) => {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(obj).sort((a, b) => b[1] - a[1])
    .map(([w, n]) => `${w}:${((n / total) * 100).toFixed(1)}%`).join("  ");
};

const lines = [];
lines.push(`# Audit probe aggregate — ${rows.length} captures\n`);
lines.push(`## Font-weight distribution (DESIGN.md §2 ladder: 900/800/700/600/500/430|400/300)\n`);
lines.push(`ALL SURFACES   ${pct(weightTotals)}`);
for (const [s, w] of Object.entries(weightBySurface)) lines.push(`${s.padEnd(14)} ${pct(w)}`);
lines.push("");

lines.push(`## Per-capture counts\n`);
lines.push(`| capture | surface | clipped | tapTargets<${TARGET_MIN} | offToken | overflowX |`);
lines.push("|---|---|---|---|---|---|");
for (const r of rows.sort((a, b) => (b.clipped + b.smallTargets) - (a.clipped + a.smallTargets))) {
  lines.push(`| ${r.id} | ${r.surface} | ${r.clipped} | ${r.smallTargets} | ${r.offToken} | ${r.overflowX ? "**YES**" : ""} |`);
}

const group = (arr, key) => {
  const m = {};
  for (const x of arr) { const k = key(x); (m[k] ??= []).push(x); }
  return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
};

const genuine = clippedAll.filter((c) => c.kind === "genuine");
const byKind = (k) => clippedAll.filter((c) => c.kind === k).length;
lines.push(`\n## Clipped text — ${genuine.length} genuine hits`);
lines.push(`(${byKind("sr-only")} \`.sr-only\` and ${byKind("ellipsis")} \`.truncate\`/line-clamp hits excluded: both clip by design.)\n`);
for (const [k, xs] of group(genuine, (x) => x.desc + "|" + (x.text ?? "").slice(0, 30)).slice(0, 40)) {
  lines.push(`- **${xs.length}x** \`${k}\` — e.g. ${xs[0].id} (sw ${xs[0].sw}/cw ${xs[0].cw}, sh ${xs[0].sh}/ch ${xs[0].ch})`);
}

lines.push(`\n## Tap targets under the WCAG 2.5.8 AA floor of ${TARGET_MIN}px — ${smallAll.length} hits\n`);
for (const [k, xs] of group(smallAll, (x) => x.desc).slice(0, 40)) {
  lines.push(`- **${xs.length}x** ${k} — ${xs[0].w}x${xs[0].h}px, e.g. ${xs[0].id}`);
}

lines.push(`\n## Off-token text colours — computed rgb() absent from the ${TOKEN_RGB.size} declared token values in globals.css\n`);
for (const [v, n] of Object.entries(offTokenValues).sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  lines.push(`- ${n}x  \`${v}\``);
}

const out = path.join(ROOT, "probes", "AGGREGATE.md");
fs.writeFileSync(out, lines.join("\n"));
console.log(lines.slice(0, 12).join("\n"));
console.log(`\nwrote ${out}  (${rows.length} captures, ${genuine.length} genuine clipped of ${clippedAll.length} raw, ${smallAll.length} small targets)`);
