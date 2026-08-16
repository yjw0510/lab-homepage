import type { Metadata } from "next";

/** Site-wide metadata, shared by both root layouts. */
export const SITE_METADATA: Metadata = {
  title: {
    default: "Yu Lab | Multiscale Molecular Computational Chemistry",
    template: "%s | Yu Lab",
  },
  description:
    "Yu Lab builds computer models and machine-learning tools to explain how molecular motion shapes liquids, polymers, and nanomaterials across scales.",
  keywords: [
    "computational chemistry",
    "molecular dynamics",
    "machine learning force fields",
    "Ajou University",
    "Yu Lab",
  ],
};
