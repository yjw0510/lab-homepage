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
  bio: "Ji Woong Yu develops molecular simulation and machine-learning methods that connect molecular motion with the behavior of liquids and soft materials. His work combines machine-learning force fields, which predict forces between atoms from quantum-mechanical data, with coarse-grained models that represent groups of atoms as simpler units. He uses these tools to study water and electrolyte solutions, polymer-guided nanoparticle assembly, glass dynamics, and hydrogels. For each system he chooses a structural or dynamical quantity worth measuring, checks the model against higher-fidelity calculations or experiments, and reports the conditions under which its predictions hold. He received his Ph.D. in Chemical and Biological Engineering from Seoul National University and later worked at the Korea Institute for Advanced Study. He joined Ajou University as an Assistant Professor in March 2026.",
  bioKo: "유지웅 교수는 분자 움직임으로 액체와 연성물질의 거동을 설명하는 분자 시뮬레이션과 머신러닝 방법을 개발한다. 양자역학 계산 결과를 학습해 원자 사이의 힘을 예측하는 머신러닝 역장(MLFF)과, 여러 원자를 하나의 단위로 묶는 조대화 모형을 함께 쓴다. 이 방법으로 물과 전해질 용액, 고분자로 제어하는 나노 입자 자기조립, 유리의 동역학, 하이드로겔을 연구한다. 연구 대상마다 측정할 구조나 동역학 변수를 먼저 정하고, 더 정밀한 계산이나 실험과 비교해 모형을 검증한 뒤 예측이 성립하는 조건을 밝힌다. 서울대학교 화학생물공학부에서 박사 학위를 받았고 고등과학원을 거쳐 2026년 3월 아주대학교 조교수로 부임했다.",
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
