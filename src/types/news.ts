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

/** The category is an English key in the MDX front matter. Both places that show it were
 *  printing the key, which put "member" and "general" on the Korean page. */
export const NEWS_CATEGORY_LABEL: Record<
  NewsItem["category"],
  Record<"en" | "ko", string>
> = {
  publication: { en: "Publication", ko: "논문" },
  award: { en: "Award", ko: "수상" },
  member: { en: "Member", ko: "구성원" },
  event: { en: "Event", ko: "행사" },
  general: { en: "News", ko: "소식" },
};

export function newsCategoryLabel(category: NewsItem["category"], lang?: string): string {
  return NEWS_CATEGORY_LABEL[category]?.[lang === "ko" ? "ko" : "en"] ?? category;
}
