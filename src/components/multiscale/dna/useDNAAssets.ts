"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { decodeFloat32 } from "./binaryLoader";
import type { DNAManifest, AATopology, CGTopology } from "./types";

const jsonCache = new Map<string, Promise<unknown>>();
const binaryCache = new Map<string, Promise<ArrayBuffer>>();

function cachedJson<T>(url: string): Promise<T> {
  let p = jsonCache.get(url);
  if (!p) {
    const resolvedUrl = withBasePath(url);
    p = fetch(resolvedUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${resolvedUrl}: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
    jsonCache.set(url, p);
  }
  return p as Promise<T>;
}

function cachedBinary(url: string): Promise<ArrayBuffer> {
  let p = binaryCache.get(url);
  if (!p) {
    const resolvedUrl = withBasePath(url);
    p = fetch(resolvedUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${resolvedUrl}: ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer();
    });
    binaryCache.set(url, p);
  }
  return p;
}

const BASE = "/data/dna";

export interface DNAAssets {
  manifest: DNAManifest | null;
  aaPositions: Float32Array | null;
  aaTopology: AATopology | null;
  cgPositions: Float32Array | null;
  cgTrajectory: Float32Array | null;
  cgTopology: CGTopology | null;
}

export type DNAAssetMode = "mapping" | "collective" | null;

const EMPTY_ASSETS: DNAAssets = {
  manifest: null,
  aaPositions: null,
  aaTopology: null,
  cgPositions: null,
  cgTrajectory: null,
  cgTopology: null,
};

export function useDNAAssets(mode: DNAAssetMode): DNAAssets {
  const [assets, setAssets] = useState<DNAAssets>(EMPTY_ASSETS);

  useEffect(() => {
    let active = true;
    if (!mode) return;

    const manifestRequest = cachedJson<DNAManifest>(`${BASE}/manifest.json`);
    const request = mode === "mapping"
      ? Promise.all([
          manifestRequest,
          cachedBinary(`${BASE}/aa/positions.bin`).then(decodeFloat32),
          cachedJson<AATopology>(`${BASE}/aa/topology.json`),
        ]).then(([manifest, aaPositions, aaTopology]) => ({
          ...EMPTY_ASSETS,
          manifest,
          aaPositions,
          aaTopology,
        }))
      : Promise.all([
          manifestRequest,
          cachedBinary(`${BASE}/cg/positions.bin`).then(decodeFloat32),
          cachedBinary(`${BASE}/cg/trajectory.bin`).then(decodeFloat32),
          cachedJson<CGTopology>(`${BASE}/cg/topology.json`),
        ]).then(([manifest, cgPositions, cgTrajectory, cgTopology]) => ({
          ...EMPTY_ASSETS,
          manifest,
          cgPositions,
          cgTrajectory,
          cgTopology,
        }));

    request
      .then((nextAssets) => {
        if (active) setAssets(nextAssets);
      })
      .catch(() => {
        if (active) setAssets(EMPTY_ASSETS);
      });

    return () => {
      active = false;
    };
  }, [mode]);

  return assets;
}
