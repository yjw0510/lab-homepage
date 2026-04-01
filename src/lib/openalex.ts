/**
 * OpenAlex API helper
 * Fetches publication data using ORCID.
 * Docs: https://docs.openalex.org
 *
 * Note: This runs at build-time only (Server Components / scripts).
 * For static export, call these functions in generateStaticParams or
 * in a build script that writes JSON to data/.
 */

export interface OpenAlexWork {
  id: string;
  title: string;
  doi: string | null;
  publicationYear: number;
  journal: string | null;
  authors: string[];
  citedByCount: number;
  openAccessUrl: string | null;
  abstract: string | null;
  type: string;
}

interface OpenAlexAuthorShip {
  author: { display_name: string };
  institutions: { display_name: string }[];
}

interface OpenAlexResult {
  id: string;
  title: string;
  doi: string | null;
  publication_year: number;
  primary_location?: {
    source?: { display_name: string };
  };
  authorships: OpenAlexAuthorShip[];
  cited_by_count: number;
  open_access?: { oa_url: string | null };
  abstract_inverted_index?: Record<string, number[]>;
  type: string;
}

const OPENALEX_API = "https://api.openalex.org";

/**
 * Reconstruct abstract from OpenAlex inverted index format
 */
function reconstructAbstract(
  invertedIndex: Record<string, number[]> | undefined
): string | null {
  if (!invertedIndex) return null;

  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, word]) => word).join(" ");
}

/**
 * Fetch all works for an author by ORCID
 * @param orcid - ORCID ID (e.g., "0000-0002-1234-5678")
 * @param email - Your email for polite pool (faster rate limits)
 */
export async function getWorksByOrcid(
  orcid: string,
  email?: string
): Promise<OpenAlexWork[]> {
  const authorUrl = `${OPENALEX_API}/authors/orcid:${orcid}`;
  const mailParam = email ? `&mailto=${email}` : "";

  // First, get the author's OpenAlex ID
  const authorRes = await fetch(`${authorUrl}?${mailParam}`);
  if (!authorRes.ok) {
    throw new Error(`Failed to fetch author: ${authorRes.statusText}`);
  }
  const authorData = await authorRes.json();
  const authorId: string = authorData.id;

  // Fetch all works (paginated)
  const allWorks: OpenAlexWork[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const worksUrl = `${OPENALEX_API}/works?filter=author.id:${authorId}&sort=publication_year:desc&per_page=50&page=${page}${mailParam}`;
    const worksRes = await fetch(worksUrl);
    if (!worksRes.ok) break;

    const worksData = await worksRes.json();
    const results: OpenAlexResult[] = worksData.results || [];

    if (results.length === 0) {
      hasMore = false;
      break;
    }

    for (const work of results) {
      allWorks.push({
        id: work.id,
        title: work.title,
        doi: work.doi,
        publicationYear: work.publication_year,
        journal: work.primary_location?.source?.display_name || null,
        authors: work.authorships.map((a) => a.author.display_name),
        citedByCount: work.cited_by_count,
        openAccessUrl: work.open_access?.oa_url || null,
        abstract: reconstructAbstract(work.abstract_inverted_index),
        type: work.type,
      });
    }

    if (results.length < 50) {
      hasMore = false;
    }
    page++;
  }

  return allWorks;
}

/**
 * Fetch a single work by DOI
 */
export async function getWorkByDoi(
  doi: string,
  email?: string
): Promise<OpenAlexWork | null> {
  const mailParam = email ? `?mailto=${email}` : "";
  const cleanDoi = doi.replace("https://doi.org/", "");
  const url = `${OPENALEX_API}/works/doi:${cleanDoi}${mailParam}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const work: OpenAlexResult = await res.json();

  return {
    id: work.id,
    title: work.title,
    doi: work.doi,
    publicationYear: work.publication_year,
    journal: work.primary_location?.source?.display_name || null,
    authors: work.authorships.map((a) => a.author.display_name),
    citedByCount: work.cited_by_count,
    openAccessUrl: work.open_access?.oa_url || null,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    type: work.type,
  };
}
