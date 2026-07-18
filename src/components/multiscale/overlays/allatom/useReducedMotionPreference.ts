"use client";

import { useSyncExternalStore } from "react";

const MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(listener: () => void) {
  const query = window.matchMedia(MEDIA_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getSnapshot() {
  return window.matchMedia(MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotionPreference(explicit?: boolean) {
  const systemPreference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return explicit ?? systemPreference;
}
