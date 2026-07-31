import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Masthead */}
        <header className="pb-8">
          <h1 className="type-display text-4xl text-foreground">
            {dict.news.title}
          </h1>
        </header>
        <div className="border-t border-border-strong pt-[3px]" aria-hidden="true">
          <div className="border-t border-border" />
        </div>

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
