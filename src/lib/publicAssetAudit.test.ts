import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { extname, resolve } from "path";

const ROOT = resolve(__dirname, "../..");
const ALLOWED_CONTENT_FILES = new Set([
  resolve(ROOT, "data/people.ts"),
]);
const ALLOWED_SOURCE_FILES = new Set([
  resolve(ROOT, "src/lib/basePath.test.ts"),
  resolve(ROOT, "src/lib/publicAssetAudit.test.ts"),
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mdx", ".md", ".json"]);
const FORBIDDEN_SOURCE_PATTERNS = [
  /fetch\s*\(\s*["']\/(?:images|data|files|fonts)\//g,
  /src\s*=\s*["']\/(?:images|data|files|fonts)\//g,
  /src\s*=\s*\{\s*["']\/(?:images|data|files|fonts)\//g,
];
const FORBIDDEN_CONTENT_PATTERNS = [
  /["']\/(?:images|data|files|fonts)\//g,
];

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === "__tests__") continue;
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(extname(fullPath))) continue;
    if (fullPath.includes(".test.")) continue;
    files.push(fullPath);
  }

  return files;
}

function getLineNumber(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function collectViolations(
  files: string[],
  patterns: RegExp[],
  allowlist: Set<string>,
): string[] {
  const violations: string[] = [];

  for (const file of files) {
    if (allowlist.has(file)) continue;

    const contents = readFileSync(file, "utf-8");
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null = pattern.exec(contents);
      while (match) {
        violations.push(`${file}:${getLineNumber(contents, match.index)} -> ${match[0]}`);
        match = pattern.exec(contents);
      }
    }
  }

  return violations;
}

describe("public asset path audit", () => {
  it("does not use root-absolute public asset paths directly in runtime source", () => {
    const sourceFiles = collectFiles(resolve(ROOT, "src"));

    const violations = collectViolations(sourceFiles, FORBIDDEN_SOURCE_PATTERNS, ALLOWED_SOURCE_FILES);
    expect(violations).toEqual([]);
  });

  it("does not introduce raw public asset paths in content or structured data", () => {
    const dataFiles = collectFiles(resolve(ROOT, "data"));
    const contentFiles = collectFiles(resolve(ROOT, "content"));
    const publicFiles = collectFiles(resolve(ROOT, "public"));
    const violations = collectViolations(
      dataFiles.concat(contentFiles, publicFiles),
      FORBIDDEN_CONTENT_PATTERNS,
      ALLOWED_CONTENT_FILES,
    );

    expect(violations).toEqual([]);
  });
});
