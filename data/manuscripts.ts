import type { Manuscript } from "@/types/publication";

// Transcribed from the PI's CV (October 2026), "Manuscripts in progress". The CV gives
// initials; full names come from the lab's published records, the public preprints, and the
// PI. Roles follow the CV's (co-)first † and (co-)corresponding * marks. Where the CV marks
// no first author, the first-listed author is taken as first author.
export const manuscripts: Manuscript[] = [
  {
    title: "Insertion free energies and depletion interactions in polymer-particle mixtures",
    authors: ["Bae-Yeun Ha", "Daeseong Yong", "Ji Woong Yu", "Changbong Hyeon"],
    firstAuthors: ["Bae-Yeun Ha"],
    correspondingAuthors: ["Bae-Yeun Ha", "Changbong Hyeon"],
    status: "underReview",
  },
  {
    title: "Nuclear quantum effects enhance diffusion in supercooled ammonia through accelerated pyramidal inversion",
    authors: ["Minwoo Kim", "Hido Woo", "Taeyong Park", "Ji Woong Yu", "Won Bo Lee"],
    firstAuthors: ["Minwoo Kim"],
    correspondingAuthors: ["Ji Woong Yu"],
    status: "underReview",
    preprint: { label: "arXiv:2609.38688", url: "https://arxiv.org/abs/2609.38688" },
  },
  {
    title: "Bottom-up design of the operating window for direct urea synthesis from first-principles molecular thermodynamics",
    authors: ["Minwoo Kim", "Seungtae Kim", "Ji Woong Yu", "Won Bo Lee"],
    firstAuthors: ["Minwoo Kim"],
    correspondingAuthors: ["Ji Woong Yu"],
    status: "underReview",
  },
  {
    title: "Supersoft yet tough bottlebrush polymers via dynamic domain exchange",
    authors: [
      "Hyunjun Kim",
      "Yeonzu Son",
      "Jaeho Lee",
      "Ji Woong Yu",
      "Intanon Lapkriengkri",
      "Byeongdu Lee",
      "YongJoo Kim",
      "Seongjun Park",
      "Christopher M. Bates",
      "Jiheong Kang",
    ],
    firstAuthors: ["Hyunjun Kim", "Yeonzu Son", "Jaeho Lee", "Ji Woong Yu"],
    correspondingAuthors: ["YongJoo Kim", "Seongjun Park", "Christopher M. Bates", "Jiheong Kang"],
    status: "underReview",
    preprint: {
      label: "Research Square",
      url: "https://doi.org/10.21203/rs.3.rs-9046391/v1",
    },
  },
  {
    title: "Sulfur adsorption on liquid Fe-3wt%Si alloy and its effect on surface structure modification",
    authors: ["Jiwoo Park", "Ji Woong Yu", "YongJoo Kim", "Jürgen Brillo", "Junho Lee"],
    firstAuthors: ["Jiwoo Park"],
    status: "submitted",
  },
  {
    title: "Phase diagram of polymer brush-induced clustering of cylindrical inclusions",
    authors: ["Daeseong Yong", "Ji Woong Yu", "Bae-Yeun Ha", "Changbong Hyeon"],
    firstAuthors: ["Daeseong Yong"],
    correspondingAuthors: ["Changbong Hyeon"],
    status: "inPreparation",
  },
  {
    title: "Free Energy Landscape of Polarization Switching in HfO₂",
    authors: ["Ji Woong Yu", "Seung Jae Kwak", "Hongkee Yoon"],
    firstAuthors: ["Ji Woong Yu"],
    status: "inPreparation",
    workingTitle: true,
  },
];
