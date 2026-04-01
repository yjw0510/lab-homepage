import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAllPublications, getPublication } from "@/lib/publications";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { getTagColor } from "@/lib/utils";
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
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/${lang}/publications`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {dict.common.backTo} {dict.nav.publications}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
          {pub.title}
        </h1>

        <p className="mt-3 text-muted-foreground">
          <AuthorList authors={pub.authors} firstAuthors={pub.firstAuthors} correspondingAuthors={pub.correspondingAuthors} />
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-semibold text-primary">{pub.journal}</span>
          {pub.volume && (
            <span className="text-muted-foreground">
              Vol. {pub.volume}
              {pub.issue ? `, No. ${pub.issue}` : ""}
              {pub.pages ? `, pp. ${pub.pages}` : ""}
            </span>
          )}
          <span className="text-muted-foreground">({pub.year})</span>
          {pub.impactFactor && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
              IF: {pub.impactFactor}
            </span>
          )}
          {pub.doi && (
            <ExternalLink href={`https://doi.org/${pub.doi}`}>
              DOI
            </ExternalLink>
          )}
        </div>

        {pub.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pub.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex px-2.5 py-1 text-xs rounded-full text-white ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-border my-8" />

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {sections.map((section) => (
            <div key={section.title} className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {section.title}
              </h2>
              <div className="text-muted-foreground leading-relaxed">
                {renderMarkdownBody(section.body)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
