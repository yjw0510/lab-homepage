import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Publication } from "@/types/publication";
import { extractSection } from "@/lib/markdown";

const PUBLICATIONS_DIR = path.join(process.cwd(), "content", "publications");
const IMPACT_FACTORS_PATH = path.join(
  process.cwd(),
  "data",
  "impact-factors.json"
);

/**
 * Load impact factors from data/impact-factors.json if it exists.
 * Returns a map of normalized journal name → impact factor.
 */
function loadImpactFactors(): Record<string, number> {
  try {
    if (!fs.existsSync(IMPACT_FACTORS_PATH)) return {};
    const raw = fs.readFileSync(IMPACT_FACTORS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      const entry = value as { impactFactor?: number };
      if (entry.impactFactor) {
        result[key.toUpperCase()] = entry.impactFactor;
      }
    }
    return result;
  } catch {
    return {};
  }
}

const impactFactors = loadImpactFactors();

function lookupImpactFactor(journal: string): number | undefined {
  const normalized = journal
    .trim()
    .toUpperCase()
    .replace(/[.\-&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return impactFactors[normalized];
}

export function getAllPublications(): Publication[] {
  if (!fs.existsSync(PUBLICATIONS_DIR)) return [];

  const files = fs.readdirSync(PUBLICATIONS_DIR);

  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(PUBLICATIONS_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      const frontmatterIF = data.impactFactor;
      const resolvedIF =
        frontmatterIF ?? lookupImpactFactor(data.journal || "");

      return {
        slug: file.replace(".mdx", ""),
        title: data.title || "",
        authors: data.authors || [],
        journal: data.journal || "",
        year: data.year || 0,
        volume: data.volume,
        issue: data.issue,
        pages: data.pages,
        doi: data.doi,
        tags: data.tags || [],
        impactFactor: resolvedIF,
        coverImage: data.coverImage,
        featured: data.featured || false,
        firstAuthors: data.firstAuthors,
        correspondingAuthors: data.correspondingAuthors,
        abstract: extractSection(content, "Abstract") || "",
        content,
      } as Publication;
    })
    .sort((a, b) => b.year - a.year);
}

export function getPublication(slug: string): Publication | undefined {
  return getAllPublications().find((p) => p.slug === slug);
}

export function getFeaturedPublications(): Publication[] {
  return getAllPublications()
    .filter((p) => p.featured)
    .slice(0, 3);
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  getAllPublications().forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

export function getAllYears(): number[] {
  const years = new Set<number>();
  getAllPublications().forEach((p) => years.add(p.year));
  return Array.from(years).sort((a, b) => b - a);
}

const TAG_TO_AREA: Record<string, string> = {
  "Self-Assembly": "meso",
  "Nanoparticle": "meso",
  "Hydrogel": "meso",
  "Polymer Brush": "meso",
  "Metallic Glass": "allatom",
  "Dissolution": "allatom",
  MLFF: "mlff",
  Water: "mlff",
  "Machine Learning": "mlff",
};

export function getPublicationsByArea(): Record<string, Publication[]> {
  const all = getAllPublications();
  const result: Record<string, Publication[]> = {
    meso: [],
    allatom: [],
    mlff: [],
    dft: [],
  };
  const seen: Record<string, Set<string>> = {
    meso: new Set(),
    allatom: new Set(),
    mlff: new Set(),
    dft: new Set(),
  };

  for (const pub of all) {
    for (const tag of pub.tags) {
      const area = TAG_TO_AREA[tag];
      if (area && !seen[area].has(pub.slug)) {
        result[area].push(pub);
        seen[area].add(pub.slug);
      }
    }
  }

  return result;
}
