import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAllMultiscaleAreas, getMultiscaleArea } from "@/lib/multiscale";
import { getMultiscaleIcon } from "@/lib/icons";
import { MultiscaleMoleculeViewer } from "@/components/multiscale/MultiscaleMoleculeViewer";
import {
  parseMarkdownSections,
  renderMarkdownBody,
} from "@/lib/markdown";
import { getDictionary, hasLocale, locales } from "../../dictionaries";

export function generateStaticParams() {
  const areas = getAllMultiscaleAreas();
  return locales.flatMap((lang) =>
    areas.map((area) => ({ lang, slug: area.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = getMultiscaleArea(slug);
  if (!area) return { title: "Not Found" };
  return {
    title: area.title,
    description: area.shortDescription,
  };
}

export default async function MultiscaleDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const area = getMultiscaleArea(slug);
  if (!area) notFound();

  const rawContent = (lang === "ko" && area.contentKo) ? area.contentKo : (area.content || "");
  const sections = parseMarkdownSections(rawContent);

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/${lang}/multiscale`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {dict.common.backTo} {dict.nav.multiscale}
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div style={{ color: area.color }}>
            {getMultiscaleIcon(area.icon, "w-12 h-12")}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {area.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {lang === "ko" && area.shortDescriptionKo ? area.shortDescriptionKo : area.shortDescription}
            </p>
          </div>
        </div>

        {area.moleculeViewer && <MultiscaleMoleculeViewer />}

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {(() => {
            const usedTerms = lang === "ko" ? new Set<string>() : undefined;
            return sections.map((section) => (
              <div key={section.title} className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {section.title}
                </h2>
                <div className="text-muted-foreground leading-relaxed">
                  {renderMarkdownBody(section.body, lang, usedTerms)}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
