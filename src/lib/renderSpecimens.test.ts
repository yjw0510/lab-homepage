import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";
import { SPECIMENS, TIER_LABEL, TIER_SCALE, specimensByTier } from "./renderSpecimens";

const PUBLIC = resolve(__dirname, "../../public/renders");
const TIERS = ["dft", "mlff", "allatom", "meso"] as const;

// Geist Mono's loaded Latin subset carries none of these. Anything here in a field that
// renders in the mono register silently falls back to another face mid-line.
const MONO_GAPS = /[≈→⁴₀-₉Ͱ-Ͽ]/;

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

  // The first version of this record hedged exact counts ("≈1,056", "원자 약 1,056개")
  // and published order-of-magnitude ranges. Every count now comes from the file the
  // render loads, so a hedge means someone guessed again.
  it("states counts exactly, with no hedging", () => {
    for (const specimen of SPECIMENS) {
      for (const lang of ["en", "ko"] as const) {
        expect(specimen.size[lang], `${specimen.slug} size.${lang}`).not.toMatch(/≈|~|약 /);
      }
    }
  });

  it("keeps mono-register fields inside the loaded Geist Mono subset", () => {
    for (const specimen of SPECIMENS) {
      for (const field of ["method", "size"] as const) {
        for (const lang of ["en", "ko"] as const) {
          expect(
            specimen[field][lang],
            `${specimen.slug} ${field}.${lang}`
          ).not.toMatch(MONO_GAPS);
        }
      }
    }
  });

  it("uses no em dash in visible copy", () => {
    for (const specimen of SPECIMENS) {
      for (const field of ["name", "method", "size"] as const) {
        for (const lang of ["en", "ko"] as const) {
          expect(specimen[field][lang]).not.toContain("—");
        }
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
