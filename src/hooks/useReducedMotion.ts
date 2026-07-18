"use client";

import { useMediaQuery } from "./useMediaQuery";

export function useReducedMotion(explicit?: boolean): boolean {
  const systemPreference = useMediaQuery("(prefers-reduced-motion: reduce)");
  return explicit ?? systemPreference;
}
