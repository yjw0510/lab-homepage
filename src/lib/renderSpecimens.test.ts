import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "fs";
import { resolve } from "path";
import sharp from "sharp";
import { SPECIMENS, TIER_LABEL, TIER_SCALE, specimensByTier } from "./renderSpecimens";
import { LOOP_LADDER } from "./loopSources.generated";

const PUBLIC = resolve(__dirname, "../../public/renders");
const TIERS = ["dft", "mlff", "allatom", "meso"] as const;

describe("specimen record", () => {
  it("covers every tier with a pair", () => {
    expect(SPECIMENS).toHaveLength(8);
    for (const tier of TIERS) {
      expect(specimensByTier(tier)).toHaveLength(2);
    }
  });

  it("has unique slugs and a declared source for each", () => {
    const slugs = SPECIMENS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const specimen of SPECIMENS) {
      expect(specimen.source, `${specimen.slug} source`).toMatch(/\.(xyz|pdb|cube|gsd)$/);
    }
  });

  it("ships every baked asset each specimen references", () => {
    for (const specimen of SPECIMENS) {
      for (const file of [
        "poster-light.webp",
        "poster-dark.webp",
        "poster-light-sm.webp",
        "poster-dark-sm.webp",
        "loop-light.mp4",
        "loop-dark.mp4",
      ]) {
        expect(
          existsSync(resolve(PUBLIC, specimen.slug, file)),
          `${specimen.slug}/${file}`
        ).toBe(true);
      }
    }
  });

  // The plate is square and paints both the poster and the loop with `object-fit: cover`,
  // which scales each asset by `max(box/width, box/height)`. Two assets of different aspect
  // therefore land at different scales in the same box, and the reveal is seen as the still
  // jumping in size. Measured at the point this was written, the loops carried their render
  // aspect while the posters were square, so the subject grew by 41.2% on nanotube, 35.9% on
  // woven-cof and 23.5% on buckycatcher the moment the loop faded in. Equal aspect is the
  // whole invariant; nothing else about the two files has to agree.
  it("frames every loop rung exactly like the poster it reveals over", async () => {
    for (const specimen of SPECIMENS) {
      for (const theme of ["light", "dark"] as const) {
        const poster = await sharp(
          resolve(PUBLIC, specimen.slug, `poster-${theme}.webp`)
        ).metadata();
        const posterAspect = poster.width / poster.height;
        for (const rung of LOOP_LADDER[specimen.slug][theme]) {
          const drift = Math.abs(rung.width / rung.height - posterAspect) / posterAspect;
          expect(
            drift,
            `${rung.src} is ${rung.width}x${rung.height} against a ` +
              `${poster.width}x${poster.height} poster`
          ).toBeLessThan(0.002);
        }
      }
    }
  });

  // The ladder carries each rung's dimensions and byte count, read back out of the encoded
  // file, and the page selects a source from it. A ladder that has drifted from the files on
  // disk describes something that is no longer being served, which is the state that lets the
  // assertion above pass while the reader still sees the jump.
  it("describes the loop files that are actually on disk", () => {
    for (const specimen of SPECIMENS) {
      for (const theme of ["light", "dark"] as const) {
        for (const rung of LOOP_LADDER[specimen.slug][theme]) {
          const file = resolve(__dirname, "../../public", rung.src.replace(/^\//, ""));
          expect(statSync(file).size, `${rung.src} bytes`).toBe(rung.bytes);
        }
      }
    }
  });

  // Counts identify the modeled object they belong to. For COF-505 that is the periodic
  // calculation cell, not the larger bond-completed scene drawn around it.
  it("states model sizes exactly, with no hedging", () => {
    for (const specimen of SPECIMENS) {
      for (const lang of ["en", "ko"] as const) {
        expect(specimen.size[lang], `${specimen.slug} size.${lang}`).not.toMatch(/≈|~|약 /);
      }
    }
    expect(SPECIMENS.find((s) => s.slug === "woven-cof")?.size).toEqual({
      en: "1,056-atom periodic cell",
      ko: "주기 셀 원자 1,056개",
    });
  });

  it("does not mislabel the molecular-knot density as DFT", () => {
    expect(SPECIMENS.find((s) => s.slug === "molecular-knot")?.method).toEqual({
      en: "Approximate electron-density calculation",
      ko: "근사 전자 밀도 계산",
    });
  });

  // The tier label is printed by the hero readout, the tier plates and the footer ruler,
  // and the Korean side once carried three different names for the DFT tier. The footer now
  // consumes the same record instead of copying those names into another array.
  it("prints one name per tier on every surface", () => {
    expect(TIER_LABEL).toEqual({
      dft: { en: "Electron density", ko: "전자 밀도" },
      mlff: { en: "Learned atomic forces", ko: "학습한 원자 힘" },
      allatom: { en: "All atoms", ko: "모든 원자" },
      meso: { en: "Grouped particles", ko: "묶은 입자" },
    });
    const footer = readFileSync(resolve(__dirname, "../components/layout/Footer.tsx"), "utf8");
    expect(footer).toContain("TIER_LABEL[tier]");
    expect(footer).toContain("TIER_SCALE[tier]");
  });

  // The first version of this assertion checked only U+2014, so `host–guest` (U+2013) sat
  // in the hero readout on every phone. DESIGN.md's anti-slop clause bans both.
  it("uses no em or en dash in visible copy", () => {
    for (const specimen of SPECIMENS) {
      for (const field of ["name", "method", "size"] as const) {
        for (const lang of ["en", "ko"] as const) {
          expect(specimen[field][lang], `${specimen.slug} ${field}.${lang}`).not.toMatch(
            /[—–]/
          );
        }
      }
    }
  });

  it("keeps Home captions free of protocol-level method details", () => {
    const forbidden = /PBE|plane-wave|Quantum ESPRESSO|MACE|Langevin|NVT|NPT|HOOMD|DPD|MMFF|GFN2|xTB/i;
    for (const specimen of SPECIMENS) {
      for (const lang of ["en", "ko"] as const) {
        expect(specimen.method[lang], `${specimen.slug} method.${lang}`).not.toMatch(forbidden);
      }
    }
  });

  it("names every tier once, for both locales and the scale tick", () => {
    for (const tier of TIERS) {
      expect(TIER_LABEL[tier].en.length).toBeGreaterThan(0);
      expect(TIER_LABEL[tier].ko.length).toBeGreaterThan(0);
      expect(TIER_SCALE[tier]).toMatch(/[Ånµm]/);
    }
  });
});
