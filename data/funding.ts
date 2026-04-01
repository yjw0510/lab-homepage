export interface FundingGrant {
  id: string;
  title: string;
  titleKo?: string;
  agency: string;
  period: string;
  amount?: string;
  role: "PI" | "Co-PI" | "Participant";
  description: string;
  status: "active" | "completed";
}

export const grants: FundingGrant[] = [
  {
    id: "ajou-basic-science-center",
    title: "University Core Research Center Support Program",
    titleKo: "아주대학교 기초과학 자율운영 중점연구소",
    agency: "Ajou University",
    period: "2026.03 –",
    role: "PI",
    description: "",
    status: "active",
  },
  {
    id: "ajou-new-faculty-startup",
    title: "Ajou University Research Grants for New Faculty Members",
    titleKo: "아주대학교 신임교원 정착연구",
    agency: "Ajou University",
    period: "2026.03 –",
    role: "PI",
    description: "",
    status: "active",
  },
];
