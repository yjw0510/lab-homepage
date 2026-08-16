import { describe, expect, it } from "vitest";
import { topics } from "../../data/topics";

/**
 * The author of the research-topic texts is a computational chemist. Application-domain
 * framing (drug delivery, optics, devices, clinical anything) kept leaking in from paper
 * abstracts, because journals require it and paper summaries carried it as "grounded
 * fact". The PI has rejected every instance. This test makes the ban structural:
 * research-identity copy may name phenomena, variables, and methods, never an
 * application domain. misc (collaboration records) and future (roadmap) are exempt,
 * since applications there are the factual content itself.
 */
const BANNED: [RegExp, string][] = [
  // "제약" is excluded: it collides with 제약(constraint), the common sense in this corpus.
  [/약물|신약|의약|치료|임상|제약사/u, "pharma/medical framing"],
  [/drug|pharmaceutic|therapeutic|clinical|payload|medicine/i, "pharma/medical framing"],
  [/광학|optic/i, "optics (not this lab's field)"],
  [/소자|디바이스|\bdevice/iu, "device framing"],
  [/배터리|battery|연료전지|fuel cell/i, "energy-device framing"],
  [/대표적인 적용|적용 대상|representative application/iu, "self-appointed application claim"],
  [/연구 범위를 넓히|최근에는|we are extending|recently/iu, "research-trajectory narration"],
];

describe("research topic identity", () => {
  const research = topics.filter((t) => !t.kind || t.kind === "research");
  for (const topic of research) {
    it(`"${topic.id}" carries no application-domain framing`, () => {
      const text = [topic.title, topic.titleKo, topic.tagline, topic.taglineKo, topic.description, topic.descriptionKo].join("\n");
      const hits = BANNED.flatMap(([re, label]) => {
        const m = text.match(re);
        return m ? [`${label}: "${m[0]}"`] : [];
      });
      expect(hits, hits.join("; ")).toEqual([]);
    });
  }
});
