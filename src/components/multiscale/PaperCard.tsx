"use client";

import Link from "next/link";
import type { Publication } from "@/types/publication";

export function PaperCard({
  publication,
  lang,
}: {
  publication: Publication;
  accentColor?: string;
  lang: string;
}) {
  const firstAuthor = publication.authors[0] || "";
  const authorDisplay =
    publication.authors.length > 1
      ? `${firstAuthor} et al.`
      : firstAuthor;

  return (
    <Link
      href={`/${lang}/publications/${publication.slug}`}
      className="dark group block border-t border-border py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex gap-3">
        <span className="type-mono-meta w-10 flex-shrink-0 pt-0.5 text-[11px] text-muted-foreground">
          {publication.year}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-[500] leading-snug text-foreground line-clamp-2">
            {publication.title}
          </span>
          <span className="type-mono-meta mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            <span>{authorDisplay}</span>
            <span>{publication.journal}</span>
          </span>
        </span>
      </div>
    </Link>
  );
}
