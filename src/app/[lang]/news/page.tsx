import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsCard } from "@/components/news/NewsCard";
import { getAllNews } from "@/lib/news";
import { getDictionary, hasLocale } from "../dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.news.title, description: dict.news.subtitle };
}

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
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Masthead */}
        <header className="pb-8">
          <h1 className="type-display text-4xl text-foreground">
            {dict.news.title}
          </h1>
          <p className="mt-4 max-w-[36rem] leading-relaxed text-muted-foreground">
            {dict.news.subtitle}
          </p>
        </header>
        <div className="h-[3px] border-y border-border-strong" aria-hidden="true" />

        {news.length > 0 ? (
          <div className="mt-10 border-b border-border">
            {news.map((item) => (
              <NewsCard key={item.slug} item={item} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="mt-10 border-t border-b border-border py-10">
            <p className="type-mono-meta text-[12px] text-muted-foreground">0</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {dict.news.noNews}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
