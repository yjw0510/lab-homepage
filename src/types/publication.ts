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
  featured?: boolean;
  content?: string;
  firstAuthors?: string[];
  correspondingAuthors?: string[];
}
