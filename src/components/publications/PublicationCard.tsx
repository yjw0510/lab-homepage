"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Publication } from "@/types/publication";
import { AuthorList } from "./AuthorList";

export function PublicationCard({
  publication,
  lang,
}: {
  publication: Publication;
  lang?: string;
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
    tags,
    firstAuthors,
    correspondingAuthors,
  } = publication;

  // Bibliography: titles, journals and author names stay in their published form in every
  // locale, so the untranslated-English gate skips this subtree.
  return (
    <article data-bibliographic className="border-t border-border py-5 transition-colors hover:bg-muted/50">
      <h3 className="break-keep text-[16.5px] font-[600] leading-snug">
        <Link
          href={`/${resolvedLang}/publications/${slug}`}
          className="inline py-1 text-foreground transition-colors hover:text-accent-ink"
        >
          {title}
        </Link>
      </h3>

      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        <AuthorList
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

      {tags.length > 0 && (
        <p className="type-mono-meta mt-2 text-[11px] text-muted-foreground">
          {tags.map((tag) => `[${tag}]`).join(" ")}
        </p>
      )}
    </article>
  );
}
