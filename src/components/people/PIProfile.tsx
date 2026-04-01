import ExportedImage from "next-image-export-optimizer";
import { Mail, BookOpen, GraduationCap } from "lucide-react";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { BASE_PATH } from "@/lib/basePath";
import { getInitials } from "@/lib/utils";
import type { Person } from "@/types/person";

export function PIProfile({ person }: { person: Person }) {
  return (
    <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
      {/* Photo or initials fallback */}
      {person.photo ? (
        <div className="w-36 sm:w-48 rounded-xl overflow-hidden flex-shrink-0 border border-border mx-auto md:mx-0">
          <ExportedImage
            src={person.photo}
            basePath={BASE_PATH}
            alt={person.name}
            width={192}
            height={256}
            className="w-full h-auto"
            sizes="(max-width: 640px) 144px, 192px"
            priority
            placeholder="blur"
          />
        </div>
      ) : (
        <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border border-border mx-auto md:mx-0">
          <span className="text-4xl text-muted-foreground font-bold">
            {getInitials(person.name)}
          </span>
        </div>
      )}

      <div className="flex-1 text-center md:text-left">
        <h2 className="text-2xl font-bold text-foreground">{person.name}</h2>
        {person.nameKo && (
          <p className="text-muted-foreground mt-0.5">{person.nameKo}</p>
        )}
        <p className="text-primary font-medium mt-1">{person.title}</p>
        <div className="text-sm text-muted-foreground">
          {person.departments
            ? person.departments.map((dept, i) => <span key={i} className="block">{dept}</span>)
            : person.department && <span className="block">{person.department}</span>}
          <span className="block">{person.university}</span>
        </div>

        <p className="mt-4 text-foreground leading-relaxed">{person.bio}</p>

        {/* Research interests */}
        {person.researchInterests && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Research Interests
            </h3>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {person.researchInterests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 text-sm rounded-full bg-accent text-accent-foreground"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm justify-center md:justify-start">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              {person.email}
            </a>
          )}
          {person.orcid && (
            <ExternalLink
              href={`https://orcid.org/${person.orcid}`}
              className="text-muted-foreground"
            >
              <BookOpen className="w-4 h-4" />
              ORCID
            </ExternalLink>
          )}
          {person.links?.googleScholar && (
            <ExternalLink
              href={person.links.googleScholar}
              className="text-muted-foreground"
            >
              <GraduationCap className="w-4 h-4" />
              Google Scholar
            </ExternalLink>
          )}
        </div>
      </div>
    </div>
  );
}
