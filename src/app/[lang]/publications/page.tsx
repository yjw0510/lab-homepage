import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PublicationList } from "@/components/publications/PublicationList";
import {
  getAllPublications,
  getAllYears,
  getAllTags,
} from "@/lib/publications";
import { getDictionary, hasLocale } from "../dictionaries";

export const metadata: Metadata = {
  title: "Publications",
  description:
    "Research publications from the Multiscale Molecular Computational Chemistry Lab.",
};

export default async function PublicationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const publications = getAllPublications();
  const years = getAllYears();
  const tags = getAllTags();

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={dict.publications.title}
          subtitle={dict.publications.subtitle}
        />
        <PublicationList
          publications={publications}
          years={years}
          tags={tags}
        />
      </div>
    </div>
  );
}
