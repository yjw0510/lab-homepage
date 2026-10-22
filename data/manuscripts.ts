import type { Manuscript } from "@/types/publication";

// Transcribed from the PI's CV (October 2026), "Manuscripts in progress". Author names keep
// the CV's initials; roles follow its (co-)first † and (co-)corresponding * marks. Where the
// CV marks no first author, the first-listed author is taken as first author.
export const manuscripts: Manuscript[] = [
  {
    title: "Insertion free energies and depletion interactions in polymer-particle mixtures",
    authors: ["B.-Y. Ha", "D. Yong", "J. W. Yu", "C. Hyeon"],
    firstAuthors: ["B.-Y. Ha"],
    correspondingAuthors: ["B.-Y. Ha", "C. Hyeon"],
    status: "underReview",
  },
  {
    title: "Nuclear quantum effects enhance diffusion in supercooled ammonia through accelerated pyramidal inversion",
    authors: ["M. Kim", "H. Woo", "T. Park", "J. W. Yu", "W. B. Lee"],
    firstAuthors: ["M. Kim"],
    correspondingAuthors: ["J. W. Yu"],
    status: "underReview",
    preprint: { label: "arXiv:2609.38688", url: "https://arxiv.org/abs/2609.38688" },
  },
  {
    title: "Bottom-up design of the operating window for direct urea synthesis from first-principles molecular thermodynamics",
    authors: ["M. Kim", "S. Kim", "J. W. Yu", "W. B. Lee"],
    firstAuthors: ["M. Kim"],
    correspondingAuthors: ["J. W. Yu"],
    status: "underReview",
  },
  {
    title: "Supersoft yet tough bottlebrush polymers via dynamic domain exchange",
    authors: [
      "H. Kim",
      "Y. Son",
      "J. Lee",
      "J. W. Yu",
      "I. Lapkriengkri",
      "B. Lee",
      "Y. Kim",
      "S. Park",
      "C. M. Bates",
      "J. Kang",
    ],
    firstAuthors: ["H. Kim", "Y. Son", "J. Lee", "J. W. Yu"],
    correspondingAuthors: ["Y. Kim", "S. Park", "C. M. Bates", "J. Kang"],
    status: "underReview",
    preprint: {
      label: "Research Square",
      url: "https://doi.org/10.21203/rs.3.rs-9046391/v1",
    },
  },
  {
    title: "Sulfur adsorption on liquid Fe-3wt%Si alloy and its effect on surface structure modification",
    authors: ["J. Park", "J. W. Yu", "Y.J. Kim", "J. Brillo", "J. Lee"],
    firstAuthors: ["J. Park"],
    status: "submitted",
  },
  {
    title: "Phase diagram of polymer brush-induced clustering of cylindrical inclusions",
    authors: ["D. Yong", "J. W. Yu", "B.-Y. Ha", "C. Hyeon"],
    firstAuthors: ["D. Yong"],
    correspondingAuthors: ["C. Hyeon"],
    status: "inPreparation",
  },
  {
    title: "Free Energy Landscape of Polarization Switching in HfO₂",
    authors: ["J. W. Yu", "S. Kwak", "H. Yoon"],
    firstAuthors: ["J. W. Yu"],
    status: "inPreparation",
    workingTitle: true,
  },
];
