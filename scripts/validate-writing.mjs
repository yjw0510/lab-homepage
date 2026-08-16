import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import matter from "gray-matter";

const ROOT = resolve(import.meta.dirname, "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function wordCount(value) {
  return (value
    .replace(/\[[^\]]+\]\([^\)]+\)/g, " ")
    .replace(/[`*_>#|]/g, " ")
    .match(/[A-Za-z0-9]+(?:[³₂₃₄⁺⁻'’-][A-Za-z0-9]+)*/g) ?? []).length;
}

function expectRange(label, value, minimum, maximum) {
  const count = wordCount(value);
  if (count < minimum || count > maximum) {
    fail(`${label}: ${count} words; expected ${minimum}-${maximum}`);
  }
}

const directStylePatterns = {
  en: [
    [/[\s,.!?;:]rather than[\s,.!?;:]/i, "rather than"],
    [/[\s,.!?;:]instead of[\s,.!?;:]/i, "instead of"],
    [/\bnot (?:only|just|a|an|the)\b/i, "not X but Y framing"],
    [/\bcan and cannot\b/i, "can and cannot"],
    [/\b(?:however|whereas|although)\b/i, "concessive transition"],
    [/\bno single\b/i, "no single"],
    [/\bbut\b/i, "but"],
    [/\bwhile\b/i, "while"],
    [/\buniversal law\b/i, "universal-law defense"],
  ],
  ko: [
    [/아니라/, "A가 아니라 B"],
    [/뿐 아니라/, "뿐 아니라"],
    [/대신/, "대신"],
    [/다만|하지만|그러나|반면/, "방어적 전환"],
    [/보편 법칙|것은 아니다|수는 없다|못한다|모형 밖/, "방어적 범위 서술"],
    [/않지만|않고/, "부정형 대조"],
    [/할 수 있다|할 수 있을/, "완곡한 가능 표현"],
  ],
};

function expectDirectStyle(label, value, lang) {
  for (const [pattern, name] of directStylePatterns[lang]) {
    if (pattern.test(value)) fail(`${label}: uses ${name}; state the claim or evidence boundary directly`);
  }
}

function leafPaths(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leafEntries(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [[prefix, value]];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  );
}

const en = JSON.parse(read("messages/en.json"));
const ko = JSON.parse(read("messages/ko.json"));
const enKeys = leafPaths(en).sort();
const koKeys = leafPaths(ko).sort();

if (JSON.stringify(enKeys) !== JSON.stringify(koKeys)) {
  fail("messages/en.json and messages/ko.json do not expose the same keys");
}

for (const [path, value] of leafEntries(en)) {
  if (typeof value === "string") expectDirectStyle(`messages/en.json ${path}`, value, "en");
}
for (const [path, value] of leafEntries(ko)) {
  if (typeof value === "string") expectDirectStyle(`messages/ko.json ${path}`, value, "ko");
}

expectRange("Home description", en.site.description, 18, 30);
expectRange("Research page subtitle", en.topics.subtitle, 12, 30);
expectRange("Multiscale page subtitle", en.multiscale.subtitle, 12, 30);

const topicTargets = {
  "self-assembly": [215, 255],
  "aqueous-solution": [205, 240],
  glass: [150, 185],
  "colloidal-dynamics": [220, 260],
  hydrogel: [130, 165],
  misc: [65, 90],
  future: [125, 160],
};
const topicsSource = read("data/topics.ts");

for (const [id, [minimum, maximum]] of Object.entries(topicTargets)) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = topicsSource.match(
    new RegExp(
      `id: "${escapedId}"[\\s\\S]*?description: ` +
        "`([\\s\\S]*?)`,\\n\\s*descriptionKo: `([\\s\\S]*?)`,",
    ),
  );

  if (!match) {
    fail(`Research topic ${id}: could not read bilingual descriptions`);
    continue;
  }

  expectRange(`Research topic ${id}`, match[1], minimum, maximum);
  expectDirectStyle(`Research topic ${id} English`, match[1], "en");
  expectDirectStyle(`Research topic ${id} Korean`, match[2], "ko");
  if (match[2].trim().length < 40) {
    fail(`Research topic ${id}: Korean description is missing or implausibly short`);
  }
}

const publicationDir = join(ROOT, "content/publications");
const publicationFiles = readdirSync(publicationDir)
  .filter((name) => name.endsWith(".mdx"))
  .sort();

if (publicationFiles.length !== 22) {
  fail(`Publications: found ${publicationFiles.length}; expected 22`);
}

for (const name of publicationFiles) {
  const { data, content } = matter(readFileSync(join(publicationDir, name), "utf8"));
  const abstract = content.match(/^## Abstract\s+([\s\S]*?)(?=^## |\s*$)/m)?.[1]?.trim();
  if (!abstract) fail(`${name}: English abstract is missing`);
  else {
    expectRange(`${name} abstract`, abstract, 25, 45);
    expectDirectStyle(`${name} abstract`, abstract, "en");
  }
  if (typeof data.abstractKo !== "string" || data.abstractKo.trim().length < 20) {
    fail(`${name}: Korean abstract is missing or implausibly short`);
  } else {
    expectDirectStyle(`${name} Korean abstract`, data.abstractKo, "ko");
  }
}

const correctedPublicationMetadata = {
  "2017-colloidal-cdse-tetrapod.mdx": { doi: "10.1021/acs.nanolett.7b00096" },
  "2019-symmetry-transitions-grafted-np.mdx": { doi: "10.1021/acs.chemmater.9b01699" },
  "2020-active-microrheology.mdx": { doi: "10.1126/sciadv.aba8766", pages: "eaba8766" },
  "2020-cylindrical-microphase.mdx": { doi: "10.1039/c9sm01603a" },
  "2021-friction-dynamics-glass.mdx": { doi: "10.1039/d0sm02039g" },
  "2024-al-dissolution.mdx": { doi: "10.1021/acs.jpclett.4c02430" },
  "2024-plga-peg-hydrogel.mdx": { doi: "10.1021/acs.biomac.4c00817" },
  "2025-self-assembly-review.mdx": { pages: "011303" },
};

for (const [name, expected] of Object.entries(correctedPublicationMetadata)) {
  const { data } = matter(readFileSync(join(publicationDir, name), "utf8"));
  for (const [field, value] of Object.entries(expected)) {
    if (String(data[field]) !== value) {
      fail(`${name}: ${field} is ${String(data[field])}; expected ${value}`);
    }
  }
}

const multiscaleDir = join(ROOT, "content/multiscale");
const multiscaleFiles = readdirSync(multiscaleDir)
  .filter((name) => name.endsWith(".mdx"))
  .sort();

if (multiscaleFiles.length !== 4) {
  fail(`Multiscale articles: found ${multiscaleFiles.length}; expected 4`);
}

for (const name of multiscaleFiles) {
  const parsed = matter(readFileSync(join(multiscaleDir, name), "utf8"));
  const body = parsed.content.split(/^## Related Publications$/m)[0];
  expectRange(`${basename(name)} method overview`, body, 220, 320);
  expectDirectStyle(`${name} English method overview`, body, "en");
  if (typeof parsed.data.contentKo !== "string" || parsed.data.contentKo.trim().length < 100) {
    fail(`${name}: Korean method overview is missing or implausibly short`);
  } else {
    expectDirectStyle(`${name} Korean method overview`, parsed.data.contentKo, "ko");
  }
}

const multiscaleContinuity = {
  "dft.mdx": {
    en: ["machine-learning force field (MLFF)", "defines its trained chemistry"],
    ko: ["머신러닝 역장(MLFF)", "학습한 화학 범위"],
  },
  "mlff.mdx": {
    en: ["chemical environments represented by the training data", "return to DFT"],
    ko: ["학습 자료가 포괄하는 화학 환경", "DFT로 되돌려"],
  },
  "allatom.mdx": {
    en: ["coarse-grained models, which group several atoms"],
    ko: ["여러 원자를 한 단위로 묶는 조대화 모형"],
  },
  "meso.mdx": {
    en: ["atomistic trajectories or experimental measurements"],
    ko: ["전원자 궤적이나 실험값"],
  },
};

for (const [name, required] of Object.entries(multiscaleContinuity)) {
  const parsed = matter(readFileSync(join(multiscaleDir, name), "utf8"));
  for (const phrase of required.en) {
    if (!parsed.content.includes(phrase)) fail(`${name}: missing multiscale continuity guard "${phrase}"`);
  }
  for (const phrase of required.ko) {
    if (!String(parsed.data.contentKo).includes(phrase)) {
      fail(`${name}: Korean copy is missing multiscale continuity guard "${phrase}"`);
    }
  }
}

const levelDataSource = read("src/components/multiscale/levelData.ts");
if (!levelDataSource.includes("metal-free phthalocyanine") || !levelDataSource.includes("프탈로시아닌")) {
  fail("Multiscale DFT visualization must name its molecular system in both locales");
}

for (const match of levelDataSource.matchAll(/\b(en|ko):\s*("(?:\\.|[^"\\])*")/g)) {
  const lang = match[1];
  const value = JSON.parse(match[2]);
  expectDirectStyle(`Multiscale interactive ${lang}`, value, lang);
}

const newsDir = join(ROOT, "content/news");
for (const name of readdirSync(newsDir).filter((entry) => entry.endsWith(".mdx"))) {
  const parsed = matter(readFileSync(join(newsDir, name), "utf8"));
  expectDirectStyle(`${name} body`, parsed.content, "en");
  if (typeof parsed.data.summary === "string") expectDirectStyle(`${name} summary`, parsed.data.summary, "en");
  if (typeof parsed.data.summaryKo === "string") expectDirectStyle(`${name} Korean summary`, parsed.data.summaryKo, "ko");
}

if (failures.length > 0) {
  console.error("Writing validation failed:\n");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `Writing validation passed: 7 research topics, ${publicationFiles.length} bilingual publication summaries, ` +
    `${multiscaleFiles.length} bilingual method overviews, and matching locale keys.`,
);
