import ExportedImage from "next-image-export-optimizer";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { BASE_PATH } from "@/lib/basePath";
import { getInitials } from "@/lib/utils";
import type { Person } from "@/types/person";

export function PIProfile({ person, lang }: { person: Person; lang: string }) {
  // The 경력 section below this block already prints these three facts in Korean, from
  // data/cv.ts. Printing them in English here left one page saying both.
  const ko = lang === "ko";
  const title = (ko && person.titleKo) || person.title;
  const departments = (ko && person.departmentsKo) || person.departments;
  const university = (ko && person.universityKo) || person.university;
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-12">
      {/* Photo or initials fallback */}
      <div className="md:col-span-3">
        {person.photo ? (
          <div className="w-36 border border-border sm:w-48">
            <ExportedImage
              src={person.photo}
              basePath={BASE_PATH}
              alt={person.name}
              width={192}
              height={256}
              className="block h-auto w-full"
              sizes="(max-width: 640px) 144px, 192px"
              priority
              placeholder="blur"
            />
          </div>
        ) : (
          <div className="flex h-36 w-36 items-center justify-center border border-border bg-muted sm:h-48 sm:w-48">
            <span className="type-mono-meta text-2xl text-muted-foreground">
              {getInitials(person.name)}
            </span>
          </div>
        )}
      </div>

      <div className="md:col-span-9">
        <h3 className="type-heading text-[21px] text-foreground">
          {person.name}
          {person.nameKo && (
            <span className="ml-2 font-[430] text-muted-foreground">
              {person.nameKo}
            </span>
          )}
        </h3>
        <p className="mt-2 text-foreground">{title}</p>
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {departments
            ? departments.map((dept, i) => (
                <span key={i} className="block">
                  {dept}
                </span>
              ))
            : person.department && (
                <span className="block">{person.department}</span>
              )}
          <span className="block">{university}</span>
        </div>

        {/* Links */}
        <div className="type-mono-meta mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[12px]">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="inline-block py-2 text-accent-ink underline decoration-[1px] underline-offset-[3px] transition-colors hover:text-primary"
            >
              {person.email}
            </a>
          )}
          {person.orcid && (
            <ExternalLink
              href={`https://orcid.org/${person.orcid}`}
              className="py-2 text-[12px]"
            >
              ORCID
            </ExternalLink>
          )}
          {person.links?.googleScholar && (
            <ExternalLink
              href={person.links.googleScholar}
              className="py-2 text-[12px]"
            >
              Google Scholar
            </ExternalLink>
          )}
        </div>
      </div>
    </div>
  );
}
