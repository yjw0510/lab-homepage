import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PIProfile } from "@/components/people/PIProfile";
import { MemberGrid } from "@/components/people/MemberGrid";
import { pi, members } from "../../../../data/people";
import { education, experience, awards, skills, professional } from "../../../../data/cv";
import { getDictionary, hasLocale } from "../dictionaries";
import type { Locale } from "../dictionaries";

export const metadata: Metadata = {
  title: "People",
  description:
    "Meet the members of the Multiscale Molecular Computational Chemistry Lab.",
};

function CVSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 sm:mb-10">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const loc = lang as Locale;

  return (
    <div className="py-10 sm:py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={dict.people.title}
          subtitle={dict.people.subtitle}
        />

        <div className="mb-12 md:mb-16">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6 text-center md:text-left">
            {dict.people.pi}
          </h2>
          <PIProfile person={pi} />

          {/* CV */}
          <div className="mt-10 md:mt-12 max-w-3xl md:ml-56">
            <CVSection title={dict.cv.education}>
              <div className="space-y-4">
                {education[loc].map((ed, i) => (
                  <div key={i}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                      <p className="font-medium text-foreground">{ed.degree}</p>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {ed.period}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{ed.institution}</p>
                    {ed.detail && (
                      <p className="text-sm text-muted-foreground">{ed.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </CVSection>

            <CVSection title={dict.cv.experience}>
              <div className="space-y-4">
                {experience[loc].map((exp, i) => (
                  <div key={i}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                      <p className="font-medium text-foreground">{exp.role}</p>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{exp.institution}</p>
                    {"departments" in exp && exp.departments
                      ? (exp.departments as string[]).map((dept: string, di: number) => (
                          <p key={di} className="text-sm text-muted-foreground">{dept}</p>
                        ))
                      : "department" in exp && exp.department
                        ? <p className="text-sm text-muted-foreground">{exp.department}</p>
                        : null}
                    {"detail" in exp && exp.detail && (
                      <p className="text-sm text-muted-foreground">{exp.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </CVSection>

            <CVSection title={dict.cv.awards}>
              <div className="space-y-3">
                {awards[loc].map((aw, i) => (
                  <div key={i}>
                    <p className="font-medium text-foreground">{aw.title}</p>
                    <p className="text-sm text-muted-foreground">{aw.detail}</p>
                  </div>
                ))}
              </div>
            </CVSection>

            <CVSection title={dict.cv.skills}>
              <div className="space-y-2">
                {skills[loc].map((sk, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                    <span className="text-sm font-medium text-foreground w-52 shrink-0">
                      {sk.category}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {sk.items}
                    </span>
                  </div>
                ))}
              </div>
            </CVSection>

            <CVSection title={dict.cv.professional}>
              <ul className="space-y-1">
                {professional[loc].map((org, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {org}
                  </li>
                ))}
              </ul>
            </CVSection>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6 text-center md:text-left">
            {dict.people.labMembers}
          </h2>
          <MemberGrid members={members} contactHref={`/${lang}/contact`} noMembersText={dict.people.noMembers} />
        </div>
      </div>
    </div>
  );
}
