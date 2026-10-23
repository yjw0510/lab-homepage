import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAllPublications, getPublication } from "@/lib/publications";
import { ExternalLink } from "@/components/ui/ExternalLink";
import {
  parseMarkdownSections,
  renderMarkdownBody,
} from "@/lib/markdown";
import { AuthorList } from "@/components/publications/AuthorList";
import { keepCompounds } from "@/components/publications/keepCompounds";
import { getTopicsForPublication } from "@/lib/topics";
import { getDictionary, hasLocale, locales } from "../../dictionaries";

export function generateStaticParams() {
  const pubs = getAllPublications();
  return locales.flatMap((lang) =>
    pubs.map((pub) => ({ lang, slug: pub.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const pub = getPublication(slug);
  if (!pub) {
    return { title: lang === "ko" ? "페이지를 찾을 수 없습니다" : "Page not found" };
  }
  return {
    title: pub.title,
    description:
      (lang === "ko" ? pub.abstractKo : pub.abstract) ||
      pub.abstract ||
      `${pub.title}, ${pub.journal} (${pub.year})`,
  };
}

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const pub = getPublication(slug);
  if (!pub) notFound();

  // "## Abstract" holds the site's own short summary, so it is headed as one: a reader who
  // follows the DOI finds a different, longer official abstract.
  const sectionTitle = (title: string) =>
    title === "Abstract" ? dict.publications.summaryHeading : title;

  const topicLabels: Record<string, string> = dict.publications.topicLabels;
  const topicNames = getTopicsForPublication(pub).map(
    (t) => topicLabels[t.id] ?? (lang === "ko" ? t.titleKo : t.title),
  );

  const sections = parseMarkdownSections(pub.content || "").map((section) =>
    lang === "ko" && section.title === "Abstract" && pub.abstractKo
      ? { ...section, body: pub.abstractKo }
      : section,
  );

  return (
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <Link
            href={`/${lang}/publications`}
            className="type-mono-meta inline-flex min-h-11 items-center gap-1.5 text-[12.5px] text-accent-ink transition-colors hover:text-primary underline decoration-1 underline-offset-[3px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            {dict.common.backToPublications}
          </Link>

          <h1 className="type-display mt-6 text-[26px] text-foreground sm:text-4xl">
            {keepCompounds(pub.title)}
          </h1>

          <p className="mt-5 leading-relaxed text-muted-foreground">
            <AuthorList
              lang={lang}
              authors={pub.authors}
              firstAuthors={pub.firstAuthors}
              correspondingAuthors={pub.correspondingAuthors}
            />
          </p>

          {/* Double rule closes the title block (content-page masthead) */}
          <div className="mt-8 h-[3px] border-y border-border-strong" aria-hidden="true" />

          {/* Metadata block */}
          <div className="mt-6 border-b border-border pb-4 pt-1">
            <p className="type-mono-meta flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
              <span className="font-[500] text-foreground">{pub.journal}</span>
              {pub.volume && (
                <span>
                  Vol. {pub.volume}
                  {pub.issue ? `, No. ${pub.issue}` : ""}
                  {pub.pages ? `, pp. ${pub.pages}` : ""}
                </span>
              )}
              <span>{pub.year}</span>
              {pub.doi && (
                <ExternalLink
                  href={`https://doi.org/${pub.doi}`}
                  className="text-[12.5px] inline-flex min-h-6 items-center"
                >
                  {pub.doi}
                </ExternalLink>
              )}
            </p>
            {topicNames.length > 0 && (
              <p className="type-mono-meta mt-2 text-[11px] text-muted-foreground">
                {topicNames.map((topic) => `[${topic}]`).join(" ")}
              </p>
            )}
          </div>

          <div className="mt-10">
            {sections.map((section) => (
              <section key={section.title} className="mb-10">
                <h2 className="type-heading text-lg text-foreground">
                  {sectionTitle(section.title)}
                </h2>
                <div
                  className={`mt-4 leading-relaxed text-muted-foreground ${
                    lang === "ko" ? "max-w-[36rem]" : "max-w-[65ch]"
                  }`}
                >
                  {/* No term glosses: the two-sentence summaries already define their terms
                      inline, and a gloss on top stacked up to four labels on one term. */}
                  {renderMarkdownBody(section.body)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
