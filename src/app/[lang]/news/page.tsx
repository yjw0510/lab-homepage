import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NewsCard } from "@/components/news/NewsCard";
import { getAllNews } from "@/lib/news";
import { getDictionary, hasLocale } from "../dictionaries";

export const metadata: Metadata = {
  title: "News",
  description: "Latest news and updates from the Yu Lab.",
};

export default async function NewsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const news = getAllNews();

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={dict.news.title}
          subtitle={dict.news.subtitle}
        />

        <div className="space-y-6">
          {news.length > 0 ? (
            news.map((item) => <NewsCard key={item.slug} item={item} lang={lang} />)
          ) : (
            <p className="text-center text-muted-foreground py-12">
              {dict.news.noNews}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
