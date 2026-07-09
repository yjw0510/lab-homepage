import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AuthorList } from "@/components/publications/AuthorList";
import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Publication } from "@/types/publication";

export function RecentPublications({
  publications,
  lang,
  dict,
}: {
  publications: Publication[];
  lang: string;
  dict: { home: { recentPublications: string; recentPublicationsSubtitle: string; viewAllPublications: string } };
}) {
  if (publications.length === 0) return null;

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeading
          title={dict.home.recentPublications}
          subtitle={dict.home.recentPublicationsSubtitle}
        />

        <div>
          {publications.map((pub) => (
            <article
              key={pub.slug}
              className="grid grid-cols-12 gap-x-6 gap-y-2 border-t border-border py-5 transition-colors hover:bg-muted/50"
            >
              {/* Margin column: mono year */}
              <div className="col-span-12 sm:col-span-2">
                <span className="type-mono-meta text-[13px] text-muted-foreground">
                  {pub.year}
                </span>
              </div>

              <div className="col-span-12 min-w-0 sm:col-span-10">
                <h3 className="font-[600] leading-snug text-foreground">
                  <Link
                    href={`/${lang}/publications/${pub.slug}`}
                    className="transition-colors hover:text-accent-ink"
                  >
                    {pub.title}
                  </Link>
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  <AuthorList
                    authors={pub.authors}
                    firstAuthors={pub.firstAuthors}
                    correspondingAuthors={pub.correspondingAuthors}
                  />
                </p>
                <p className="type-mono-meta mt-2 text-[12px] text-muted-foreground">
                  {pub.journal}
                  {pub.volume ? ` · ${pub.volume}` : ""}
                  {pub.pages ? `, ${pub.pages}` : ""}
                  {pub.doi && (
                    <>
                      {" · "}
                      <ExternalLink href={`https://doi.org/${pub.doi}`}>
                        {pub.doi}
                      </ExternalLink>
                    </>
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-border pt-5">
          <Link
            href={`/${lang}/publications`}
            className="inline-flex min-h-11 items-center text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary"
          >
            {dict.home.viewAllPublications}
          </Link>
        </div>
      </div>
    </section>
  );
}
