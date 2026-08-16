import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationList } from "@/components/publications/PublicationList";
import {
  getAllPublications,
  getAllYears,
  getAllTags,
} from "@/lib/publications";
import { getDictionary, hasLocale } from "../dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.publications.title,
    description: dict.publications.subtitle,
  };
}

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
        <div className="h-[3px] border-y border-border-strong" aria-hidden="true" />

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
