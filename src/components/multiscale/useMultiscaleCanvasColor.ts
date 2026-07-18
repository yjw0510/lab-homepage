"use client";

import { useTheme } from "@/providers/ThemeProvider";

const CANVAS_COLORS = {
  light: "#ededed",
  dark: "#0a0909",
} as const;

export function useMultiscaleCanvasColor() {
  const { theme } = useTheme();
  return CANVAS_COLORS[theme];
}
