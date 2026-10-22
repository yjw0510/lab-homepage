import { describe, expect, it } from "vitest";
import { manuscripts } from "../../data/manuscripts";

describe("manuscripts in progress", () => {
  // AuthorList marks roles by exact string match, so a role name that drifts from the
  // author list (one initial off) silently loses its marker.
  it("names every first and corresponding author in the author list", () => {
    const strays = manuscripts.flatMap((m) =>
      [...(m.firstAuthors ?? []), ...(m.correspondingAuthors ?? [])]
        .filter((name) => !m.authors.includes(name))
        .map((name) => `${m.title}: ${name}`),
    );
    expect(strays, strays.join("\n")).toEqual([]);
  });
});
