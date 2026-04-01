"use client";

const jsonFetchCache = new Map<string, Promise<unknown>>();

export function cachedAllAtomJsonFetch<T>(url: string): Promise<T> {
  let promise = jsonFetchCache.get(url);
  if (!promise) {
    promise = fetch(url).then((response) => response.json());
    jsonFetchCache.set(url, promise);
  }
  return promise as Promise<T>;
}
