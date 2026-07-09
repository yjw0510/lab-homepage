import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDate } from "@/lib/utils";
import type { NewsItem } from "@/types/news";

export function LabNews({
  news,
  lang,
  dict,
}: {
  news: NewsItem[];
  lang: string;
  dict: { home: { labNews: string; labNewsSubtitle: string; allNews: string } };
}) {
  if (news.length === 0) return null;

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeading
          title={dict.home.labNews}
          subtitle={dict.home.labNewsSubtitle}
        />

        <div>
          {news.map((item) => (
            <div
              key={item.slug}
              className="grid grid-cols-12 gap-x-6 gap-y-2 border-t border-border py-5"
            >
              {/* Margin column: mono date + category */}
              <div className="col-span-12 sm:col-span-3">
                <p className="type-mono-meta text-[12px] text-muted-foreground">
                  {formatDate(item.date, lang)}
                </p>
                <p className="type-mono-meta mt-0.5 text-[12px] text-muted-foreground">
                  {item.category}
                </p>
              </div>

              <div className="col-span-12 min-w-0 sm:col-span-9">
                <h3 className="font-[600] text-foreground">
                  {lang === "ko" && item.titleKo ? item.titleKo : item.title}
                </h3>
                <p className="mt-1 max-w-[34rem] break-keep text-sm leading-relaxed text-muted-foreground">
                  {lang === "ko" && item.summaryKo ? item.summaryKo : item.summary}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-5">
          <Link
            href={`/${lang}/news`}
            className="inline-flex min-h-11 items-center text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary"
          >
            {dict.home.allNews}
          </Link>
        </div>
      </div>
    </section>
  );
}
