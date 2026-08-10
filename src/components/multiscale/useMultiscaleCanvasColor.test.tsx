import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { useMultiscaleCanvasColor } from "./useMultiscaleCanvasColor";

function ThemeProbe() {
  const { setTheme } = useTheme();
  const canvasColor = useMultiscaleCanvasColor();

  return (
    <button type="button" data-canvas-color={canvasColor} onClick={() => setTheme("dark")}>
      switch theme
    </button>
  );
}

describe("useMultiscaleCanvasColor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    // The provider no longer consults prefers-color-scheme; a stored preference is the only
    // thing that overrides the dark default, so the light starting point has to be stored.
    // This environment has no real localStorage, so stub the two calls the provider makes.
    const store: Record<string, string> = { theme: "light" };
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
    document.documentElement.classList.remove("dark");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("updates the viewer color from the existing theme context", async () => {
    await act(async () => {
      root.render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      );
    });

    const toggle = container.querySelector("button");
    expect(toggle).toHaveAttribute("data-canvas-color", "#ededed");
    expect(document.documentElement).not.toHaveClass("dark");

    await act(async () => toggle?.click());

    expect(toggle).toHaveAttribute("data-canvas-color", "#0a0909");
    expect(document.documentElement).toHaveClass("dark");
  });
});
