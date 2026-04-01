import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllMultiscaleAreas } from "@/lib/multiscale";
import { getPublicationsByArea } from "@/lib/publications";
import { hasLocale } from "../dictionaries";
import { MultiscaleExperienceLoader } from "@/components/multiscale/MultiscaleExperienceLoader";

export const metadata: Metadata = {
  title: "Multiscale",
  description:
    "Research areas of the Multiscale Molecular Computational Chemistry Lab.",
};

export default async function MultiscalePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const areas = getAllMultiscaleAreas();
  const pubsByArea = getPublicationsByArea();

  return (
    <div className="-mt-16 overflow-hidden">
      <MultiscaleExperienceLoader
        areas={areas}
        publications={pubsByArea}
        lang={lang}
      />
    </div>
  );
}
