import { Person } from "@/types/person";

export const pi: Person = {
  name: "Ji Woong Yu",
  nameKo: "유지웅",
  role: "pi",
  title: "Assistant Professor",
  titleKo: "조교수",
  departments: ["School of Frontier Sciences", "Department of Chemistry"],
  departmentsKo: ["프런티어과학학부", "화학과"],
  university: "Ajou University",
  universityKo: "아주대학교",
  email: "jiwoongs1492@ajou.ac.kr",
  orcid: "0000-0001-8479-401X",
  photo: "/images/people/pi.jpg",
  bio: "Ji Woong Yu develops molecular simulation and machine-learning methods that connect molecular motion with the behavior of liquids and soft materials. His work combines machine-learning force fields, which predict forces between atoms from quantum-mechanical data, with coarse-grained models that represent groups of atoms as simpler units. He uses these tools to study water and electrolyte solutions, polymer-guided nanoparticle assembly, glass dynamics, and hydrogels. Across these systems, the emphasis is methodological: identify an informative structural or dynamical variable, test the model against higher-fidelity calculations or experiments, and state where its predictions remain reliable. He received his Ph.D. in Chemical and Biological Engineering from Seoul National University and later worked at the Korea Institute for Advanced Study. He joined Ajou University as an Assistant Professor in March 2026.",
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
