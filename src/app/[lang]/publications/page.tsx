import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationList } from "@/components/publications/PublicationList";
import { ManuscriptList } from "@/components/publications/ManuscriptList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { manuscripts } from "../../../../data/manuscripts";
import { getAllPublications, getAllYears } from "@/lib/publications";
import { getAllTopics, getTopicsForPublication } from "@/lib/topics";
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

  // Filter and label papers by research topic. The raw tags were English-only, mostly
  // single-paper, and partly application domains; topics match the Research Topics page.
  const topicLabels: Record<string, string> = dict.publications.topicLabels;
  const topicsBySlug = Object.fromEntries(
    publications.map((p) => [p.slug, getTopicsForPublication(p).map((t) => t.id)]),
  );
  const topics = getAllTopics()
    .filter((t) => publications.some((p) => topicsBySlug[p.slug].includes(t.id)))
    .map((t) => ({ id: t.id, label: topicLabels[t.id] ?? (lang === "ko" ? t.titleKo : t.title) }));

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
          <p className="type-mono-meta mt-3 text-[12px] leading-relaxed text-muted-foreground">
            {dict.publications.authorKey}
          </p>
        </header>
        <div className="h-[3px] border-y border-border-strong" aria-hidden="true" />

        <ManuscriptList
          manuscripts={manuscripts}
          lang={lang}
          labels={dict.publications.manuscripts}
        />

        <section className="mt-20">
          <SectionHeading title={dict.publications.publishedTitle} />
          <PublicationList
            publications={publications}
            years={years}
            topics={topics}
            topicsBySlug={topicsBySlug}
            lang={lang}
            labels={{
              filterByYear: dict.publications.filterByYear,
              filterByTag: dict.publications.filterByTag,
              allYears: dict.publications.allYears,
              allTags: dict.publications.allTags,
              noResults: dict.publications.noResults,
            }}
          />
        </section>
      </div>
    </div>
  );
}
