import { ExternalLink } from "@/components/ui/ExternalLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Manuscript, ManuscriptStatus } from "@/types/publication";
import { AuthorList } from "./AuthorList";
import { keepCompounds } from "./keepCompounds";

const STATUS_ORDER: ManuscriptStatus[] = ["underReview", "submitted", "inPreparation"];

export interface ManuscriptListLabels {
  title: string;
  workingTitle: string;
  status: Record<ManuscriptStatus, string>;
}

/** Grouped by status the way PublicationList groups by year: label column, then entries. */
export function ManuscriptList({
  manuscripts,
  lang,
  labels,
}: {
  manuscripts: Manuscript[];
  lang: string;
  labels: ManuscriptListLabels;
}) {
  if (manuscripts.length === 0) return null;

  return (
    <section className="mt-10">
      <SectionHeading title={labels.title} />
      {STATUS_ORDER.map((status) => {
        const group = manuscripts.filter((m) => m.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className="grid grid-cols-12 gap-x-6">
            <h3 className="type-mono-meta col-span-12 border-t border-border pt-5 text-sm text-accent-ink md:col-span-2">
              {labels.status[status]}
            </h3>
            <div className="col-span-12 md:col-span-10">
              {group.map((m) => (
                <article key={m.title} data-bibliographic className="border-t border-border py-5">
                  <h4 className="type-heading break-keep text-[16.5px] leading-snug text-foreground">
                    {keepCompounds(m.title)}
                    {m.workingTitle && (
                      <span className="text-muted-foreground"> ({labels.workingTitle})</span>
                    )}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    <AuthorList
                      lang={lang}
                      authors={m.authors}
                      firstAuthors={m.firstAuthors}
                      correspondingAuthors={m.correspondingAuthors}
                    />
                  </p>
                  {m.preprint && (
                    <p className="type-mono-meta mt-2 text-[12px] leading-relaxed text-muted-foreground">
                      <ExternalLink
                        href={m.preprint.url}
                        className="inline-flex min-h-6 items-center text-[12px] leading-none"
                      >
                        {m.preprint.label}
                      </ExternalLink>
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
