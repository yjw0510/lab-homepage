"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { decodeFloat32, decodeQuantizedUint16 } from "./binaryLoader";
import type { DNAManifest, DNAAssetEntry, AATopology, CGTopology } from "./types";

const jsonCache = new Map<string, Promise<unknown>>();
const binaryCache = new Map<string, Promise<ArrayBuffer>>();

/** Shared with the meso camera, which reads the same manifest; two caches fetched it twice. */
export function cachedJson<T>(url: string): Promise<T> {
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

/** Decoded once per page load: the trajectory is the largest asset and remounts are common. */
const decodedCache = new Map<string, Promise<Float32Array>>();

function cachedAsset(entry: DNAAssetEntry): Promise<Float32Array> {
  let p = decodedCache.get(entry.path);
  if (!p) {
    p = cachedBinary(`${BASE}/${entry.path}`).then((buffer) =>
      entry.dtype === "uint16" && entry.quantization
        ? decodeQuantizedUint16(buffer, entry.quantization.offsetNm, entry.quantization.scaleNm)
        : decodeFloat32(buffer),
    );
    decodedCache.set(entry.path, p);
  }
  return p;
}

export interface DNAAssets {
  manifest: DNAManifest | null;
  aaPositions: Float32Array | null;
  aaTopology: AATopology | null;
  cgPositions: Float32Array | null;
  cgTrajectory: Float32Array | null;
  cgTopology: CGTopology | null;
  /** The collective trajectory will not arrive; the still frame stands without a loading status. */
  cgTrajectoryFailed: boolean;
}

export type DNAAssetMode = "mapping" | "collective" | null;

const EMPTY_ASSETS: DNAAssets = {
  manifest: null,
  aaPositions: null,
  aaTopology: null,
  cgPositions: null,
  cgTrajectory: null,
  cgTopology: null,
  cgTrajectoryFailed: false,
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
          cachedJson<CGTopology>(`${BASE}/cg/topology.json`),
        ]).then(([manifest, cgPositions, cgTopology]) => ({
          ...EMPTY_ASSETS,
          manifest,
          cgPositions,
          cgTopology,
        }));

    // The collective page draws its first frame from the small assets above and starts moving
    // when the trajectory lands. Awaiting all four together held the trajectory download (48 MB
    // before it was quantized) in front of a 96 KB frame, and the stage stayed empty until the
    // whole file was in. The trajectory is requested after them so it does not slow them down.
    const loaded = request
      .then((nextAssets) => {
        if (active) setAssets(nextAssets);
        return nextAssets;
      })
      .catch(() => {
        if (active) setAssets({ ...EMPTY_ASSETS, cgTrajectoryFailed: mode === "collective" });
        return null;
      });

    if (mode === "collective") {
      loaded.then((base) => {
        if (!base) return;
        const entry = base.manifest?.assets?.cg_trajectory;
        // A failed trajectory leaves the still frame on screen and clears the loading status.
        const fail = () => {
          if (active) setAssets({ ...base, cgTrajectoryFailed: true });
        };
        if (!entry) {
          fail();
          return;
        }
        cachedAsset(entry)
          .then((cgTrajectory) => {
            if (active) setAssets({ ...base, cgTrajectory });
          })
          .catch(fail);
      });
    }

    return () => {
      active = false;
    };
  }, [mode]);

  return assets;
}
