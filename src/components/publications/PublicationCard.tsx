"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Publication } from "@/types/publication";
import { AuthorList } from "./AuthorList";
import { keepCompounds } from "./keepCompounds";

export function PublicationCard({
  publication,
  lang,
  topics = [],
}: {
  publication: Publication;
  lang?: string;
  /** Localized research-topic labels for the bracket line. */
  topics?: string[];
}) {
  // Fallback for consumers that do not pass lang yet (home RecentPublications).
  const pathname = usePathname();
  const resolvedLang = lang ?? (pathname.split("/")[1] || "en");
  const {
    slug,
    title,
    authors,
    journal,
    year,
    volume,
    issue,
    pages,
    doi,
    firstAuthors,
    correspondingAuthors,
  } = publication;

  // Bibliography: titles, journals and author names stay in their published form in every
  // locale, so the untranslated-English gate skips this subtree.
  return (
    <article data-bibliographic className="border-t border-border py-5 transition-colors hover:bg-muted/50">
      <h4 className="type-heading break-keep text-[16.5px] leading-snug">
        <Link
          href={`/${resolvedLang}/publications/${slug}`}
          className="inline py-1 text-foreground transition-colors hover:text-accent-ink"
        >
          {keepCompounds(title)}
        </Link>
      </h4>

      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        <AuthorList
          lang={lang}
          authors={authors}
          firstAuthors={firstAuthors}
          correspondingAuthors={correspondingAuthors}
        />
      </p>

      <p className="type-mono-meta mt-2 text-[12px] leading-relaxed text-muted-foreground">
        <span className="font-[500] text-foreground">{journal}</span>
        {volume && (
          <>
            {" · "}Vol. {volume}
            {issue ? `, No. ${issue}` : ""}
            {pages ? `, pp. ${pages}` : ""}
          </>
        )}
        {" · "}
        {year}
        {doi && (
          <>
            {" · "}
            <ExternalLink
              href={`https://doi.org/${doi}`}
              className="inline-flex min-h-6 items-center text-[12px] leading-none"
            >
              DOI
            </ExternalLink>
          </>
        )}
      </p>

      {topics.length > 0 && (
        <p className="type-mono-meta mt-2 text-[11px] text-muted-foreground">
          {topics.map((topic) => `[${topic}]`).join(" ")}
        </p>
      )}
    </article>
  );
}
