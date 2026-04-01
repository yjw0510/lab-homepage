"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { getTagColor } from "@/lib/utils";
import type { Publication } from "@/types/publication";
import { AuthorList } from "./AuthorList";

export function PublicationCard({ publication }: { publication: Publication }) {
  const pathname = usePathname();
  const lang = pathname.split("/")[1] || "en";
  const { slug, title, authors, journal, year, volume, issue, pages, doi, tags, impactFactor, firstAuthors, correspondingAuthors } =
    publication;

  return (
    <div className="flex gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group">
      {/* Color bar */}
      {tags.length > 0 && (
        <div
          className={`w-1 rounded-full flex-shrink-0 ${getTagColor(tags[0])}`}
        />
      )}

      <div className="flex-1 min-w-0">
        {/* Title — links to detail page */}
        <Link href={`/${lang}/publications/${slug}`}>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
            {title}
          </h3>
        </Link>

        {/* Authors */}
        <p className="mt-1.5 text-sm text-muted-foreground">
          <AuthorList authors={authors} firstAuthors={firstAuthors} correspondingAuthors={correspondingAuthors} />
        </p>

        {/* Journal info */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-primary">{journal}</span>
          {volume && (
            <span className="text-muted-foreground">
              Vol. {volume}
              {issue ? `, No. ${issue}` : ""}
              {pages ? `, pp. ${pages}` : ""}
            </span>
          )}
          <span className="text-muted-foreground">({year})</span>
          {impactFactor && (
            <span className="text-xs text-muted-foreground">
              IF: {impactFactor}
            </span>
          )}
          {doi && (
            <ExternalLink href={`https://doi.org/${doi}`} className="text-xs">
              DOI
            </ExternalLink>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
