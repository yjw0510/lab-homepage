import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPublications } from "@/lib/publications";
import { getAllTopics, getTopicPaperCounts } from "@/lib/topics";
import { getDictionary, hasLocale } from "../dictionaries";
import { TopicsPageClient } from "@/components/topics/TopicsPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.topics.title, description: dict.topics.subtitle };
}

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
