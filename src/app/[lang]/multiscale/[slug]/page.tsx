import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAllMultiscaleAreas, getMultiscaleArea } from "@/lib/multiscale";
import { TierSpecimens } from "@/components/renders/TierSpecimens";
import { globalStepFromLevel, LEVELS } from "@/components/multiscale/scrollState";
import type { SpecimenTier } from "@/lib/renderSpecimens";
import {
  parseMarkdownSections,
  renderMarkdownBody,
} from "@/lib/markdown";
import { getDictionary, hasLocale, locales } from "../../dictionaries";

// LEVELS already owns the four tier ids; re-declaring them here is how they drift apart.
const isSpecimenTier = (slug: string): slug is SpecimenTier =>
  LEVELS.some((level) => level.id === slug);

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
  const { lang, slug } = await params;
  const area = getMultiscaleArea(slug);
  if (!area) return { title: "Not Found" };
  const isKorean = lang === "ko";
  return {
    title: isKorean && area.titleKo ? area.titleKo : area.title,
    description: isKorean && area.shortDescriptionKo ? area.shortDescriptionKo : area.shortDescription,
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
  const scale = (lang === "ko" && area.scaleKo) ? area.scaleKo : area.scale;
  const sections = parseMarkdownSections(rawContent);
  const currentLevelIndex = LEVELS.findIndex((level) => level.id === area.slug);
  // The scale eyebrow and the handoff label name this tier, so they wear its ink. Both were
  // --muted-foreground on all four pages, which left the first screen of every tier page with
  // no chroma at all except a link, and that link is blue, i.e. DFT's colour on the MLFF,
  // all-atom and meso pages. Literal strings so Tailwind compiles them.
  // The h1 comes from MDX frontmatter and these links used to come from LEVELS.label, so the
  // DFT page's forward link said "MLFF" while the MLFF page's back link to it said "Electronic
  // Structure / DFT". One source for the page name; LEVELS.label stays as the instrument tab.
  const neighbourTitle = (id: string) => {
    const neighbour = getMultiscaleArea(id);
    if (!neighbour) return id;
    return lang === "ko" && neighbour.titleKo ? neighbour.titleKo : neighbour.title;
  };
  const tierInk = {
    dft: "text-lv-dft-text",
    mlff: "text-lv-mlff-text",
    allatom: "text-lv-aa",
    meso: "text-lv-meso",
  }[area.slug] ?? "text-muted-foreground";
  const previousLevel = currentLevelIndex > 0 ? LEVELS[currentLevelIndex - 1] : null;
  const nextLevel = currentLevelIndex >= 0 && currentLevelIndex < LEVELS.length - 1
    ? LEVELS[currentLevelIndex + 1]
    : null;
  const localizedTitle = lang === "ko" && area.titleKo ? area.titleKo : area.title;
  const interactiveHref = currentLevelIndex >= 0
    ? `/${lang}/multiscale?step=${globalStepFromLevel(currentLevelIndex, 0)}`
    : `/${lang}/multiscale`;
  const handoff = lang === "ko"
    ? {
        label: "멀티스케일 연결",
        sequence: "DFT → MLFF → 전원자 → 메조스케일",
        returnTo: "인터랙티브로 돌아가기",
        previous: "이전 방법",
        next: "다음 방법",
      }
    : {
        label: "MULTISCALE HANDOFF",
        sequence: "DFT → MLFF → all-atom → mesoscale",
        returnTo: "Return to interactive",
        previous: "Previous method",
        next: "Next method",
      };

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Link
          href={`/${lang}/multiscale`}
          className="inline-flex items-center gap-1.5 py-2 text-sm text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {dict.common.backTo} {dict.nav.multiscale}
        </Link>

        {/* Title block */}
        <header className="mt-8">
          {scale && (
            <p className={`type-mono-meta text-[12px] ${tierInk}`}>
              {scale}
            </p>
          )}
          <h1 className="type-display mt-3 max-w-3xl text-3xl text-foreground sm:text-4xl">
            {lang === "ko" && area.titleKo ? area.titleKo : area.title}
          </h1>
          <p className="type-lead mt-4 max-w-2xl break-keep leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {lang === "ko" && area.shortDescriptionKo ? area.shortDescriptionKo : area.shortDescription}
          </p>
        </header>

        <nav
          className="mt-8 border-y border-border py-4"
          aria-label={lang === "ko" ? "멀티스케일 방법 연결" : "Multiscale method handoff"}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <p className={`type-mono-meta text-[11px] ${tierInk}`}>{handoff.label}</p>
              <p className="mt-1 text-sm text-foreground">{handoff.sequence}</p>
            </div>
            <Link
              href={interactiveHref}
              className="type-mono-meta inline-flex min-h-6 items-center text-xs text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary"
            >
              {handoff.returnTo}: {localizedTitle}
            </Link>
          </div>
          {(previousLevel || nextLevel) && (
            <div className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-2 sm:gap-6">
              {previousLevel ? (
                <Link
                  href={`/${lang}/multiscale/${previousLevel.id}`}
                  className="type-mono-meta inline-flex min-h-6 min-w-0 items-center truncate text-xs text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary"
                >
                  ← {handoff.previous}: {neighbourTitle(previousLevel.id)}
                </Link>
              ) : <span />}
              {nextLevel ? (
                <Link
                  href={`/${lang}/multiscale/${nextLevel.id}`}
                  className="type-mono-meta inline-flex min-h-6 min-w-0 items-center truncate text-left text-xs text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary sm:justify-end sm:text-right"
                >
                  {handoff.next}: {neighbourTitle(nextLevel.id)} →
                </Link>
              ) : <span />}
            </div>
          )}
        </nav>

        {/* Double rule closes the title block (content-page masthead) */}
        <div className="mt-10 h-[3px] border-y border-border-strong" aria-hidden="true" />

        {isSpecimenTier(area.slug) && (
          <div className="mt-12">
            <TierSpecimens tier={area.slug} lang={lang} />
          </div>
        )}


        {/* Document sections — margin-column grid */}
        <div className="mt-6">
          {(() => {
            const usedTerms = lang === "ko" ? new Set<string>() : undefined;
            return sections.map((section, i) => (
              <section
                key={section.title}
                className={`grid grid-cols-1 gap-x-6 gap-y-3 py-10 md:grid-cols-12 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <h2 className="type-heading text-lg text-foreground md:col-span-3">
                  {section.title}
                </h2>
                <div className="max-w-[42rem] break-keep leading-relaxed text-muted-foreground md:col-span-9">
                  {renderMarkdownBody(section.body, lang, usedTerms)}
                </div>
              </section>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
