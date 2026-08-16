export interface FundingGrant {
  id: string;
  title: string;
  titleKo?: string;
  agency: string;
  agencyKo?: string;
  period: string;
  periodKo?: string;
  amount?: string;
  role: "PI" | "Co-PI" | "Participant";
  description: string;
  status: "active" | "completed";
}

export const grants: FundingGrant[] = [
  {
    id: "ajou-basic-science-center",
    title: "Ajou University Basic Science Research Institute",
    titleKo: "아주대학교 기초과학 자율운영 중점연구소",
    agency: "Ajou University",
    agencyKo: "아주대학교",
    period: "Mar 2026 to present",
    periodKo: "2026년 3월-현재",
    role: "PI",
    description: "",
    status: "active",
  },
  {
    id: "ajou-new-faculty-startup",
    title: "Ajou University Research Grants for New Faculty Members",
    titleKo: "아주대학교 신임교원 정착연구",
    agency: "Ajou University",
    agencyKo: "아주대학교",
    period: "Mar 2026 to present",
    periodKo: "2026년 3월-현재",
    role: "PI",
    description: "",
    status: "active",
  },
];
