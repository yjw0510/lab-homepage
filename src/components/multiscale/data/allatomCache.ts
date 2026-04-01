"use client";

import { withBasePath } from "@/lib/basePath";

const jsonFetchCache = new Map<string, Promise<unknown>>();

export function cachedAllAtomJsonFetch<T>(url: string): Promise<T> {
  let promise = jsonFetchCache.get(url);
  if (!promise) {
    const resolvedUrl = withBasePath(url);
    promise = fetch(resolvedUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${resolvedUrl}: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
    jsonFetchCache.set(url, promise);
  }
  return promise as Promise<T>;
}
