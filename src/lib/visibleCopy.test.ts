import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const SRC = resolve(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Strip comments so a note *about* a dash does not read as a dash in the UI. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("visible copy", () => {
  // DESIGN.md's anti-slop section is binding: zero em or en dashes in anything a reader
  // sees. They had reached the hero readout (`host–guest`), the scale ruler (`Å–nm`), the
  // MLFF schematic (`ns–µs`) and the all-atom schematic, where `Lennard–Jones` was also
  // factually wrong — it is one person's hyphenated surname.
  it("contains no em or en dash", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      stripComments(readFileSync(file, "utf8"))
        .split("\n")
        .forEach((line, i) => {
          if (/[—–]/.test(line)) offenders.push(`${relative(SRC, file)}:${i + 1}  ${line.trim().slice(0, 90)}`);
        });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  // Geist Mono was retired because it carried no Hangul, so Korean metadata broke into two
  // typefaces inside one line. Reintroducing a second text family brings the bug back.
  it("declares exactly one text family", () => {
    const layout = readFileSync(join(SRC, "app/layout.tsx"), "utf8");
    expect(layout).not.toMatch(/next\/font\/google/);
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    expect(css).toMatch(/--font-sans:\s*var\(--font-pretendard\)/);
    expect(css).not.toMatch(/--font-geist-mono/);
  });
});
