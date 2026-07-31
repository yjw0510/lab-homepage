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

  // The tier label is printed by the hero readout, the tier plates and the footer ruler,
  // and the Korean side once carried three different names for the DFT tier. Length alone
  // would have passed all three, so this asserts the actual strings.
  it("prints one name per tier on every surface", () => {
    expect(TIER_LABEL.dft).toEqual({ en: "DFT", ko: "DFT" });
    const footer = readFileSync(resolve(__dirname, "../components/layout/Footer.tsx"), "utf8");
    for (const tier of TIERS) {
      expect(footer, `footer ruler names ${tier}`).toContain(`"${TIER_LABEL[tier].ko}"`);
    }
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

  it("names every tier once, for both locales and the scale tick", () => {
    for (const tier of TIERS) {
      expect(TIER_LABEL[tier].en.length).toBeGreaterThan(0);
      expect(TIER_LABEL[tier].ko.length).toBeGreaterThan(0);
      expect(TIER_SCALE[tier]).toMatch(/[Ånµm]/);
    }
  });
});
