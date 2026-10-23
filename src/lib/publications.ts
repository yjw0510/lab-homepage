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
        // An unquoted YAML date parses as a Date, which would not sort as a string.
        date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date,
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
        abstractKo: data.abstractKo || undefined,
        content,
      } as Publication;
    })
    // Volume year first, then the online date within it, newest first; an undated paper counts
    // as the year's newest. The slug breaks remaining ties, because readdir order is
    // filesystem-dependent and the deploy build could otherwise order a year differently.
    .sort(
      (a, b) =>
        b.year - a.year ||
        (b.date ?? `${b.year}-12-31`).localeCompare(a.date ?? `${a.year}-12-31`) ||
        a.slug.localeCompare(b.slug),
    );
}

export function getPublication(slug: string): Publication | undefined {
  return getAllPublications().find((p) => p.slug === slug);
}

export function getRecentPublications(count = 3): Publication[] {
  return getAllPublications().slice(0, count);
}

export function getAllYears(): number[] {
  const years = new Set<number>();
  getAllPublications().forEach((p) => years.add(p.year));
  return Array.from(years).sort((a, b) => b - a);
}
