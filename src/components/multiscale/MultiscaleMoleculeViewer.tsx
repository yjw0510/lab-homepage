"use client";

import dynamic from "next/dynamic";

const MoleculeViewer = dynamic(
  () => import("@/components/three/MoleculeViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
    ),
  }
);

export function MultiscaleMoleculeViewer() {
  return (
    <div className="mb-8">
      <MoleculeViewer />
    </div>
  );
}
