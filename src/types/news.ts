export interface NewsItem {
  slug: string;
  title: string;
  date: string;
  category: "publication" | "award" | "member" | "event" | "general";
  summary: string;
  titleKo?: string;
  summaryKo?: string;
  content?: string;
  image?: string;
}
