import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import matter from "gray-matter";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");
const HANGUL = /[가-힣]/;
const outputIndex = process.argv.indexOf("--out");
const outputPath = outputIndex >= 0 ? resolve(process.argv[outputIndex + 1] ?? "") : null;
const entries = [];

function sourceLine(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function add(source, locator, value) {
  const text = String(value).trim();
  if (!HANGUL.test(text)) return;
  entries.push({ source, locator, text });
}

function walkFiles(directory, extensions) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "out", ".git", ".superloopy"].includes(entry.name)) return [];
      return walkFiles(absolute, extensions);
    }
    return extensions.has(extname(entry.name)) ? [absolute] : [];
  });
}

for (const directory of [join(ROOT, "data"), join(ROOT, "src")]) {
  for (const absolute of walkFiles(directory, new Set([".ts", ".tsx"]))) {
    if (/\.(?:test|spec)\.[^.]+$/.test(absolute) || absolute.includes("/__tests__/")) continue;
    const source = relative(ROOT, absolute);
    const text = readFileSync(absolute, "utf8");
    const kind = absolute.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true, kind);

    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        add(source, `line ${sourceLine(sourceFile, node.getStart(sourceFile))}`, node.text);
      } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        add(source, `line ${sourceLine(sourceFile, node.getStart(sourceFile))}`, node.text);
      } else if (ts.isJsxText(node)) {
        add(source, `line ${sourceLine(sourceFile, node.getStart(sourceFile))}`, node.getText(sourceFile));
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

function visitJson(value, path = []) {
  if (typeof value === "string") {
    add("messages/ko.json", path.join("."), value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => visitJson(child, [...path, String(index)]));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => visitJson(child, [...path, key]));
  }
}

visitJson(JSON.parse(readFileSync(join(ROOT, "messages/ko.json"), "utf8")));

for (const absolute of walkFiles(join(ROOT, "content"), new Set([".mdx"]))) {
  const source = relative(ROOT, absolute);
  const parsed = matter(readFileSync(absolute, "utf8"));
  for (const [key, value] of Object.entries(parsed.data)) {
    if (typeof value === "string") add(source, `frontmatter.${key}`, value);
  }
}

entries.sort((a, b) =>
  a.source.localeCompare(b.source) || a.locator.localeCompare(b.locator) || a.text.localeCompare(b.text),
);

const document = [
  "# Korean website copy — humanizer staging",
  "",
  "> Preserve chemical formulas, acronyms, proper names, official records, and source markers.",
  "> Technical English is intentional when it is defined in context.",
  "",
  ...entries.flatMap(({ source, locator, text }) => [
    `<!-- source: ${source} · ${locator} -->`,
    text,
    "",
  ]),
].join("\n");

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, document);
  console.log(`Exported ${entries.length} Korean strings to ${outputPath}`);
} else {
  process.stdout.write(document);
}
