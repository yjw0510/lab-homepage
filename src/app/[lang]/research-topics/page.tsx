import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPublications } from "@/lib/publications";
import { getAllTopics, getTopicPaperCounts } from "@/lib/topics";
import { getDictionary, hasLocale } from "../dictionaries";
import { TopicsPageClient } from "@/components/topics/TopicsPageClient";

export const metadata: Metadata = {
  title: "Research Topics",
  description:
    "Thematic overview of research areas in the Multiscale Molecular Computational Chemistry Lab.",
};

export default async function TopicsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const topics = getAllTopics();
  const publications = getAllPublications();
  const paperCounts = getTopicPaperCounts(topics, publications);

  return (
    <TopicsPageClient
      topics={topics}
      publications={publications}
      paperCounts={paperCounts}
      lang={lang}
      dict={dict}
    />
  );
}
