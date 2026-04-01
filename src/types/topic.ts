export interface ResearchTopic {
  id: string;
  title: string;
  titleKo: string;
  tagline: string;
  taglineKo: string;
  description: string;
  descriptionKo: string;
  icon: string;
  color: string;
  gridSpan: [number, number];
  tags: string[];
  /** "research" (default) = tag-based paper mapping; "misc" = uncategorized papers; "future" = no papers, static content */
  kind?: "research" | "misc" | "future";
}
