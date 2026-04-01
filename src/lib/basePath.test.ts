import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

async function loadBasePathModule(basePath?: string) {
  if (basePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = basePath;
  }

  vi.resetModules();
  return import("./basePath");
}

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
  }
  vi.resetModules();
});

describe("normalizeBasePath", () => {
  it("normalizes empty and slash-only values to empty", async () => {
    const { normalizeBasePath } = await loadBasePathModule();

    expect(normalizeBasePath()).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
  });

  it("adds a leading slash and removes trailing slashes", async () => {
    const { normalizeBasePath } = await loadBasePathModule();

    expect(normalizeBasePath("lab-homepage/")).toBe("/lab-homepage");
    expect(normalizeBasePath("/lab-homepage///")).toBe("/lab-homepage");
  });
});

describe("withBasePath", () => {
  it("returns normalized local paths unchanged when no base path is configured", async () => {
    const { BASE_PATH, withBasePath } = await loadBasePathModule();

    expect(BASE_PATH).toBe("");
    expect(withBasePath("/images/people/pi.jpg")).toBe("/images/people/pi.jpg");
    expect(withBasePath("images/people/pi.jpg")).toBe("/images/people/pi.jpg");
  });

  it("prefixes local asset paths when a base path is configured", async () => {
    const { BASE_PATH, withBasePath } = await loadBasePathModule("/lab-homepage");

    expect(BASE_PATH).toBe("/lab-homepage");
    expect(withBasePath("/images/people/pi.jpg")).toBe("/lab-homepage/images/people/pi.jpg");
    expect(withBasePath("data/multiscale/allatom/trajectory.json")).toBe(
      "/lab-homepage/data/multiscale/allatom/trajectory.json",
    );
    expect(withBasePath("/lab-homepage/data/multiscale/allatom/trajectory.json")).toBe(
      "/lab-homepage/data/multiscale/allatom/trajectory.json",
    );
  });

  it("leaves remote, protocol-relative, and special URLs untouched", async () => {
    const { withBasePath } = await loadBasePathModule("/lab-homepage");

    expect(withBasePath("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(withBasePath("//cdn.example.com/a.png")).toBe("//cdn.example.com/a.png");
    expect(withBasePath("data:text/plain,hello")).toBe("data:text/plain,hello");
    expect(withBasePath("blob:https://example.com/id")).toBe("blob:https://example.com/id");
    expect(withBasePath("mailto:test@example.com")).toBe("mailto:test@example.com");
    expect(withBasePath("tel:+820000000000")).toBe("tel:+820000000000");
    expect(withBasePath("#section")).toBe("#section");
    expect(withBasePath("?step=2")).toBe("?step=2");
  });
});
