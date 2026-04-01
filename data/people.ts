import { Person } from "@/types/person";

export const pi: Person = {
  name: "Ji Woong Yu",
  nameKo: "유지웅",
  role: "pi",
  title: "Assistant Professor",
  departments: ["School of Frontier Sciences", "Department of Chemistry"],
  university: "Ajou University",
  email: "jiwoongs1492@ajou.ac.kr",
  orcid: "0000-0001-8479-401X",
  photo: "/images/people/pi.jpg",
  bio: "Ji Woong Yu received his Ph.D. in Chemical and Biological Engineering from Seoul National University (advisor: Won Bo Lee). During his doctorate, he predicted how polymer grafting density controls nanoparticle superlattice symmetry using coarse-grained simulations (Advanced Science, 2024) and identified a friction-driven glass transition via active microrheology (Science Advances, 2020). At KIAS, he shifted to machine learning force fields for studying water dynamics in electrolyte solutions. He joined Ajou University as Assistant Professor in March 2026.",
  researchInterests: [
    "Machine Learning Force Fields",
    "Water Dynamics",
    "Nanoparticle Self-Assembly",
    "Polymer Brush Systems",
    "Metallic Glass",
  ],
  links: {
    googleScholar: "https://scholar.google.com/citations?user=LBsdpIYAAAAJ&hl=ko&oi=ao",
    github: "",
  },
};

export const members: Person[] = [
  // Lab members will be added here as they join
];
