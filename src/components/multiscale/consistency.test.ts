import { describe, expect, it } from "vitest";
import { CHOREOGRAPHY } from "./levelData";
import type { LevelId } from "./scrollState";

// The regularizer for the multiscale instrument.
//
// Eight steps across four levels are read one after another, so they have to feel
// like one instrument rather than eight pages by eight authors. Nothing here judges
// whether a sentence is good; that is what the writing review is for. What it judges
// is whether the steps are the same SHAPE, because a step whose body runs half the
// length of its neighbour, or whose takeaway runs three times longer, reads as a
// different surface even when every individual sentence is fine.
//
// Every band below is derived from the measured distribution across the eight steps
// and is stated with the number it came from, so a future change either fits the
// established shape or moves the band deliberately.

const LEVELS: LevelId[] = ["dft", "mlff", "allatom", "meso"];
const STEPS = LEVELS.flatMap((level) =>
  CHOREOGRAPHY[level].steps.map((step, i) => ({ id: `${level}${i}`, level, index: i, step }))
);

const ko = (f: { en: string; ko: string }) => f.ko;
const sentences = (text: string) => text.split(/(?<=다\.)\s+/).filter(Boolean);

describe("multiscale step shape", () => {
  it("has eight steps, two per level", () => {
    expect(STEPS).toHaveLength(8);
    for (const level of LEVELS) expect(CHOREOGRAPHY[level].steps).toHaveLength(2);
  });

  // Measured spread before this test existed: 271 to 397 characters, a 46% swing
  // between the shortest and longest body. At 271 the all-atom flagship read as a
  // stub next to its neighbours; at 397 the DFT mechanism page overflowed the column
  // it shares with an equation and a slider. The band is the middle of that range.
  it("keeps every concept body inside one length band", () => {
    for (const { id, step } of STEPS) {
      const n = ko(step.concept).length;
      expect(n, `${id} concept is ${n} Korean characters`).toBeGreaterThanOrEqual(300);
      expect(n, `${id} concept is ${n} Korean characters`).toBeLessThanOrEqual(380);
    }
  });

  // A body that is one long sentence reads as a definition; one that is twelve short
  // ones reads as a list. Every step measured between 6 and 9 before this test.
  it("keeps every concept body inside one sentence-count band", () => {
    for (const { id, step } of STEPS) {
      const n = sentences(ko(step.concept)).length;
      expect(n, `${id} concept has ${n} sentences`).toBeGreaterThanOrEqual(6);
      expect(n, `${id} concept has ${n} sentences`).toBeLessThanOrEqual(9);
    }
  });

  // The takeaway renders only at step 0 of each level, so the four that render sit
  // beside each other in the reader's memory. Measured: 87, 51, 146, 60. The 146 is
  // the all-atom one, nearly three times its shortest sibling and four sentences
  // where the others are one or two.
  it("keeps the four rendered takeaways comparable", () => {
    for (const { id, index, step } of STEPS) {
      if (index !== 0) continue;
      const n = ko(step.takeaway).length;
      expect(n, `${id} takeaway is ${n} Korean characters`).toBeGreaterThanOrEqual(45);
      expect(n, `${id} takeaway is ${n} Korean characters`).toBeLessThanOrEqual(95);
    }
  });

  // The applicability line is typeset large and sits above the fold on every step, so
  // its length is a layout constant, not a free choice. Measured: 73 to 104.
  it("keeps every applicability line inside one length band", () => {
    for (const { id, step } of STEPS) {
      const n = ko(step.question).length;
      expect(n, `${id} question is ${n} Korean characters`).toBeGreaterThanOrEqual(70);
      expect(n, `${id} question is ${n} Korean characters`).toBeLessThanOrEqual(95);
    }
  });

  it("gives every step the fields the rail renders", () => {
    for (const { id, step } of STEPS) {
      for (const field of ["title", "question", "concept", "takeaway", "systemCaption"] as const) {
        expect(ko(step[field]).length, `${id} ${field}`).toBeGreaterThan(0);
        expect(step[field].en.length, `${id} ${field} en`).toBeGreaterThan(0);
      }
      expect(step.visualLayers.length, `${id} visualLayers`).toBeGreaterThan(0);
      expect(step.sceneKey, `${id} sceneKey`).toMatch(/^[A-Z]\d/);
    }
  });

  // English and Korean are written separately rather than translated, but a step
  // whose English body is half its Korean one has lost a claim somewhere.
  it("keeps the two locales within sight of each other", () => {
    for (const { id, step } of STEPS) {
      const enWords = step.concept.en.split(/\s+/).length;
      const koChars = ko(step.concept).length;
      // Korean characters per English word across the eight steps clusters near 3.
      const ratio = koChars / enWords;
      expect(ratio, `${id} ko/en density ratio ${ratio.toFixed(2)}`).toBeGreaterThan(2.2);
      expect(ratio, `${id} ko/en density ratio ${ratio.toFixed(2)}`).toBeLessThan(4.2);
    }
  });
});
