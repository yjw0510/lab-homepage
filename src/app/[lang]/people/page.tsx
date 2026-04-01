import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PIProfile } from "@/components/people/PIProfile";
import { MemberGrid } from "@/components/people/MemberGrid";
import { pi, members } from "../../../../data/people";
import { getDictionary, hasLocale } from "../dictionaries";

export const metadata: Metadata = {
  title: "People",
  description:
    "Meet the members of the Multiscale Molecular Computational Chemistry Lab.",
};

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={dict.people.title}
          subtitle={dict.people.subtitle}
        />

        <div className="mb-16">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6">
            {dict.people.pi}
          </h2>
          <PIProfile person={pi} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6">
            {dict.people.labMembers}
          </h2>
          <MemberGrid members={members} contactHref={`/${lang}/contact`} />
        </div>
      </div>
    </div>
  );
}
