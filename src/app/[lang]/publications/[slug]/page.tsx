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
  const { slug } = await params;
  const pub = getPublication(slug);
  if (!pub) return { title: "Not Found" };
  return {
    title: pub.title,
    description:
      pub.abstract || `${pub.title}, ${pub.journal} (${pub.year})`,
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

  const sections = parseMarkdownSections(pub.content || "");

  return (
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <Link
            href={`/${lang}/publications`}
            className="type-mono-meta inline-flex min-h-11 items-center gap-1.5 text-[12.5px] text-accent-ink transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            {dict.common.backTo} {dict.nav.publications}
          </Link>

          <h1 className="type-display mt-6 text-[26px] text-foreground sm:text-4xl">
            {pub.title}
          </h1>

          <p className="mt-5 leading-relaxed text-muted-foreground">
            <AuthorList
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
                  className="text-[12.5px]"
                >
                  {pub.doi}
                </ExternalLink>
              )}
            </p>
            {pub.tags.length > 0 && (
              <p className="type-mono-meta mt-2 text-[11px] text-muted-foreground">
                {pub.tags.map((tag) => `[${tag}]`).join(" ")}
              </p>
            )}
          </div>

          <div className="mt-10">
            {sections.map((section) => (
              <section key={section.title} className="mb-10">
                <h2 className="type-heading text-lg text-foreground">
                  {section.title}
                </h2>
                <div
                  className={`mt-4 leading-relaxed text-muted-foreground ${
                    lang === "ko" ? "max-w-[36rem]" : "max-w-[65ch]"
                  }`}
                >
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
