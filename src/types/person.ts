export interface Person {
  name: string;
  nameKo?: string;
  role: "pi" | "phd" | "ms" | "undergraduate" | "alumni";
  title?: string;
  titleKo?: string;
  department?: string;
  departments?: string[];
  departmentsKo?: string[];
  university?: string;
  universityKo?: string;
  email?: string;
  orcid?: string;
  photo?: string;
  bio?: string;
  researchInterests?: string[];
  enrollmentYear?: number;
  links?: {
    googleScholar?: string;
    github?: string;
    linkedin?: string;
    personalSite?: string;
  };
}
