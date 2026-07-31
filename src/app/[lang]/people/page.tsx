import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PIProfile } from "@/components/people/PIProfile";
import { MemberGrid } from "@/components/people/MemberGrid";
import { pi, members } from "../../../../data/people";
import { education, experience, awards, skills, professional } from "../../../../data/cv";
import { getDictionary, hasLocale } from "../dictionaries";
import type { Locale } from "../dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.people.title, description: dict.people.subtitle };
}

/* Date ranges in data/cv.ts use en-dashes; render them as plain hyphens. */
function plainDashes(s: string) {
  return s.replace(/[\u2013\u2014]/g, "-");
}

function CVSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0 sm:mt-12">
      <h3 className="type-heading text-[18px] text-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
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
    <div className="px-6 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Masthead */}
        <header>
          <h1 className="type-display text-[37px] text-foreground sm:text-[49px]">
            {dict.people.title}
          </h1>
        </header>
        <div
          aria-hidden="true"
          className="mt-8 border-t border-border-strong pt-[3px]"
        >
          <div className="border-t border-border" />
        </div>

        {/* Principal Investigator */}
        <section className="mt-14 sm:mt-16">
          <div className="border-t border-border-strong pt-6">
            <h2 className="type-title flex items-baseline text-[28px] text-foreground"><span aria-hidden="true" className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary" />
              {dict.people.pi}
            </h2>
          </div>

          <div className="mt-8">
            <PIProfile person={pi} lang={lang} />
          </div>

          {/* CV, aligned to the profile text column */}
          <div className="mt-12 grid grid-cols-1 gap-x-8 md:grid-cols-12">
            <div className="md:col-span-9 md:col-start-4">
              <CVSection title={dict.cv.education}>
                {education[loc].map((ed, i) => (
                  <div key={i} className="border-t border-border py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="font-[600] text-foreground">{ed.degree}</p>
                      <span className="type-mono-meta shrink-0 text-[12px] text-muted-foreground">
                        {plainDashes(ed.period)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {ed.institution}
                    </p>
                    {ed.detail && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {ed.detail}
                      </p>
                    )}
                  </div>
                ))}
              </CVSection>

              <CVSection title={dict.cv.experience}>
                {experience[loc].map((exp, i) => (
                  <div key={i} className="border-t border-border py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="font-[600] text-foreground">{exp.role}</p>
                      <span className="type-mono-meta shrink-0 text-[12px] text-muted-foreground">
                        {plainDashes(exp.period)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {exp.institution}
                    </p>
                    {"departments" in exp && exp.departments
                      ? (exp.departments as string[]).map((dept: string, di: number) => (
                          <p key={di} className="text-sm leading-relaxed text-muted-foreground">
                            {dept}
                          </p>
                        ))
                      : "department" in exp && exp.department
                        ? (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {exp.department}
                            </p>
                          )
                        : null}
                    {"detail" in exp && exp.detail && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {exp.detail}
                      </p>
                    )}
                  </div>
                ))}
              </CVSection>

              <CVSection title={dict.cv.awards}>
                {awards[loc].map((aw, i) => (
                  <div key={i} className="border-t border-border py-3">
                    <p className="font-[600] text-foreground">{aw.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {aw.detail}
                    </p>
                  </div>
                ))}
              </CVSection>

              <CVSection title={dict.cv.skills}>
                {skills[loc].map((sk, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 border-t border-border py-3 sm:flex-row sm:gap-6"
                  >
                    <span className="text-sm font-[600] text-foreground sm:w-52 sm:shrink-0">
                      {sk.category}
                    </span>
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {sk.items}
                    </span>
                  </div>
                ))}
              </CVSection>

              <CVSection title={dict.cv.professional}>
                <ul>
                  {professional[loc].map((org, i) => (
                    <li
                      key={i}
                      className="border-t border-border py-3 text-sm leading-relaxed text-muted-foreground"
                    >
                      {org}
                    </li>
                  ))}
                </ul>
              </CVSection>
            </div>
          </div>
        </section>

        {/* Lab members */}
        <section className="mt-16 sm:mt-20">
          <div className="border-t border-border-strong pt-6">
            <h2 className="type-title flex items-baseline text-[28px] text-foreground"><span aria-hidden="true" className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary" />
              {dict.people.labMembers}
            </h2>
          </div>
          <div className="mt-8">
            <MemberGrid members={members} noMembersText={dict.people.noMembers} />
          </div>
        </section>
      </div>
    </div>
  );
}
