"use client";

import { useEffect, useState } from "react";
import { decodeFloat32 } from "./binaryLoader";
import type { DNAManifest, AATopology, CGTopology, CGMapping, RDFMeta } from "./types";

const jsonCache = new Map<string, Promise<unknown>>();
const binaryCache = new Map<string, Promise<ArrayBuffer>>();

function cachedJson<T>(url: string): Promise<T> {
  let p = jsonCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.json());
    jsonCache.set(url, p);
  }
  return p as Promise<T>;
}

function cachedBinary(url: string): Promise<ArrayBuffer> {
  let p = binaryCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.arrayBuffer());
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
  mapping: CGMapping | null;
  rdfData: Float32Array | null;
  rdfMeta: RDFMeta | null;
  loading: boolean;
}

/** Lazy-load DNA assets gated by the current step. */
export function useDNAAssets(step: number): DNAAssets {
  const [manifest, setManifest] = useState<DNAManifest | null>(null);
  const [aaPositions, setAaPositions] = useState<Float32Array | null>(null);
  const [aaTopology, setAaTopology] = useState<AATopology | null>(null);
  const [cgPositions, setCgPositions] = useState<Float32Array | null>(null);
  const [cgTrajectory, setCgTrajectory] = useState<Float32Array | null>(null);
  const [cgTopology, setCgTopology] = useState<CGTopology | null>(null);
  const [mapping, setMapping] = useState<CGMapping | null>(null);
  const [rdfData, setRdfData] = useState<Float32Array | null>(null);
  const [rdfMeta, setRdfMeta] = useState<RDFMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Load manifest on mount
  useEffect(() => {
    cachedJson<DNAManifest>(`${BASE}/manifest.json`)
      .then(setManifest)
      .catch(() => {});
  }, []);

  // Load AA assets for steps 0-1
  useEffect(() => {
    if (!manifest || step > 1) return;
    if (aaPositions) return; // already loaded
    setLoading(true);
    Promise.all([
      cachedBinary(`${BASE}/aa/positions.bin`).then((buf) => decodeFloat32(buf)),
      cachedJson<AATopology>(`${BASE}/aa/topology.json`),
      cachedJson<CGMapping>(`${BASE}/cg/mapping.json`),
    ]).then(([pos, topo, map]) => {
      setAaPositions(pos);
      setAaTopology(topo);
      setMapping(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [manifest, step, aaPositions]);

  // Load CG assets for steps 1+ (morph needs CG bead positions)
  useEffect(() => {
    if (!manifest || step < 1) return;
    if (cgPositions && cgTopology) return;
    setLoading(true);
    Promise.all([
      cachedBinary(`${BASE}/cg/positions.bin`).then((buf) => decodeFloat32(buf)),
      cachedJson<CGTopology>(`${BASE}/cg/topology.json`),
    ]).then(([pos, topo]) => {
      setCgPositions(pos);
      setCgTopology(topo);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [manifest, step, cgPositions, cgTopology]);

  // Load trajectory for steps 3, 5
  useEffect(() => {
    if (!manifest || (step !== 3 && step !== 5)) return;
    if (cgTrajectory) return;
    setLoading(true);
    cachedBinary(`${BASE}/cg/trajectory.bin`)
      .then((buf) => {
        setCgTrajectory(decodeFloat32(buf));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [manifest, step, cgTrajectory]);

  // Load RDF for step 4
  useEffect(() => {
    if (!manifest || step !== 4) return;
    if (rdfData) return;
    setLoading(true);
    Promise.all([
      cachedBinary(`${BASE}/rdf/rdf.bin`).then((buf) => decodeFloat32(buf)),
      cachedJson<RDFMeta>(`${BASE}/rdf/meta.json`),
    ]).then(([data, meta]) => {
      setRdfData(data);
      setRdfMeta(meta);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [manifest, step, rdfData]);

  return {
    manifest,
    aaPositions,
    aaTopology,
    cgPositions,
    cgTrajectory,
    cgTopology,
    mapping,
    rdfData,
    rdfMeta,
    loading: loading && !manifest,
  };
}
