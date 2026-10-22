export interface Publication {
  slug: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: number;
  issue?: number;
  pages?: string;
  doi?: string;
  tags: string[];
  impactFactor?: number;
  coverImage?: string;
  abstract?: string;
  abstractKo?: string;
  featured?: boolean;
  content?: string;
  firstAuthors?: string[];
  correspondingAuthors?: string[];
}

export type ManuscriptStatus = "underReview" | "submitted" | "inPreparation";

export interface Manuscript {
  title: string;
  authors: string[];
  firstAuthors?: string[];
  correspondingAuthors?: string[];
  status: ManuscriptStatus;
  workingTitle?: boolean;
  /** Public preprint, when one exists. */
  preprint?: { label: string; url: string };
}
