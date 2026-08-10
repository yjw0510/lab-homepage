import type { Metadata } from "next";

/** Site-wide metadata, shared by both root layouts. */
export const SITE_METADATA: Metadata = {
  title: {
    default: "Yu Lab | Multiscale Molecular Computational Chemistry",
    template: "%s | Yu Lab",
  },
  description:
    "Multiscale Molecular Computational Chemistry Lab at Ajou University. We study molecular phenomena across scales using computational methods including molecular dynamics, machine learning force fields, and first-principles calculations.",
  keywords: [
    "computational chemistry",
    "molecular dynamics",
    "machine learning force fields",
    "Ajou University",
    "Yu Lab",
  ],
};
