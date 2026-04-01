"use client";

import Link from "next/link";
import type { Publication } from "@/types/publication";

export function PaperCard({
  publication,
  accentColor,
  lang,
}: {
  publication: Publication;
  accentColor: string;
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
      className="block p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/25 transition-all group"
    >
      <div className="flex gap-3">
        <div
          className="w-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        />
        <div className="min-w-0">
          <div className="text-xs text-gray-400 mb-0.5">
            {publication.year} · {publication.journal}
          </div>
          <div className="text-sm text-gray-200 font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {publication.title}
          </div>
          <div className="text-xs text-gray-500 mt-1">{authorDisplay}</div>
        </div>
      </div>
    </Link>
  );
}
