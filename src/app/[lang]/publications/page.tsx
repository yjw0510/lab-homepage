import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationList } from "@/components/publications/PublicationList";
import {
  getAllPublications,
  getAllYears,
  getAllTags,
} from "@/lib/publications";
import { getDictionary, hasLocale } from "../dictionaries";

export const metadata: Metadata = {
  title: "Publications",
  description:
    "Research publications from the Multiscale Molecular Computational Chemistry Lab.",
};

export default async function PublicationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const publications = getAllPublications();
  const years = getAllYears();
  const tags = getAllTags();

  return (
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Masthead */}
        <header className="pb-8">
          <h1 className="type-display text-4xl text-foreground">
            {dict.publications.title}
          </h1>
          <p className="mt-4 max-w-[36rem] leading-relaxed text-muted-foreground">
            {dict.publications.subtitle}
          </p>
        </header>
        <div className="border-t border-border-strong pt-[3px]" aria-hidden="true">
          <div className="border-t border-border" />
        </div>

        <PublicationList
          publications={publications}
          years={years}
          tags={tags}
          lang={lang}
          labels={{
            filterByYear: dict.publications.filterByYear,
            filterByTag: dict.publications.filterByTag,
            allYears: dict.publications.allYears,
            allTags: dict.publications.allTags,
            noResults: dict.publications.noResults,
          }}
        />
      </div>
    </div>
  );
}
