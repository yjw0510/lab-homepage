import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/home/HeroSection";
import { MultiscaleHighlights } from "@/components/home/MultiscaleHighlights";
import { RecentPublications } from "@/components/home/RecentPublications";
import { LabNews } from "@/components/home/LabNews";
import { getAllMultiscaleAreas } from "@/lib/multiscale";
import { getFeaturedPublications } from "@/lib/publications";
import { getRecentNews } from "@/lib/news";
import { getDictionary, hasLocale } from "./dictionaries";

export const metadata: Metadata = {
  title: {
    absolute: "Yu Lab | Multiscale Molecular Computational Chemistry",
  },
  description:
    "Multiscale Molecular Computational Chemistry Lab at Ajou University.",
  openGraph: {
    title: "Yu Lab | Multiscale Molecular Computational Chemistry",
    description:
      "Computational chemistry research lab at Ajou University studying molecular phenomena across scales.",
    url: "https://yu-mmcc.org",
    type: "website",
  },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const multiscaleAreas = getAllMultiscaleAreas();
  const featuredPubs = getFeaturedPublications();
  const recentNews = getRecentNews(4);

  return (
    <>
      <HeroSection lang={lang} dict={dict} />
      <MultiscaleHighlights areas={multiscaleAreas} lang={lang} dict={dict} />
      <RecentPublications publications={featuredPubs} lang={lang} dict={dict} />
      <LabNews news={recentNews} lang={lang} dict={dict} />
    </>
  );
}
