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
// Every band below is derived from the concise, reviewed distribution across the
// eight steps. A future change must preserve that compact shape or move the band
// deliberately.

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

  // Reviewed spread after the site-wide compression pass: 148 to 187 characters.
  // The lower bound prevents stubs; the upper bound prevents the overview from
  // drifting back toward article-level detail.
  it("keeps every concept body inside one length band", () => {
    for (const { id, step } of STEPS) {
      const n = ko(step.concept).length;
      expect(n, `${id} concept is ${n} Korean characters`).toBeGreaterThanOrEqual(140);
      expect(n, `${id} concept is ${n} Korean characters`).toBeLessThanOrEqual(195);
    }
  });

  // Four sentences is enough to cover question, method, result, and limitation
  // without turning the overview into a list or a miniature article.
  it("keeps every concept body inside one sentence-count band", () => {
    for (const { id, step } of STEPS) {
      const n = sentences(ko(step.concept)).length;
      expect(n, `${id} concept has ${n} sentences`).toBeGreaterThanOrEqual(3);
      expect(n, `${id} concept has ${n} sentences`).toBeLessThanOrEqual(5);
    }
  });

  // The takeaway renders only at step 0 of each level. Reviewed spread: 40 to 56
  // characters, keeping all four at one compact sentence.
  it("keeps the four rendered takeaways comparable", () => {
    for (const { id, index, step } of STEPS) {
      if (index !== 0) continue;
      const n = ko(step.takeaway).length;
      expect(n, `${id} takeaway is ${n} Korean characters`).toBeGreaterThanOrEqual(38);
      expect(n, `${id} takeaway is ${n} Korean characters`).toBeLessThanOrEqual(60);
    }
  });

  // The applicability line is typeset large and sits above the fold on every step, so
  // its length is a layout constant, not a free choice. Reviewed spread: 35 to 60.
  it("keeps every applicability line inside one length band", () => {
    for (const { id, step } of STEPS) {
      const n = ko(step.question).length;
      expect(n, `${id} question is ${n} Korean characters`).toBeGreaterThanOrEqual(32);
      expect(n, `${id} question is ${n} Korean characters`).toBeLessThanOrEqual(65);
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
