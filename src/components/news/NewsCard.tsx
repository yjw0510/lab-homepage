import { formatDate } from "@/lib/utils";
import { newsCategoryLabel, type NewsItem } from "@/types/news";

export function NewsCard({ item, lang }: { item: NewsItem; lang?: string }) {
  const title = lang === "ko" && item.titleKo ? item.titleKo : item.title;
  const summary = lang === "ko" && item.summaryKo ? item.summaryKo : item.summary;

  return (
    <article className="grid grid-cols-12 gap-x-6 gap-y-2 border-t border-border py-5">
      <div className="col-span-12 md:col-span-3">
        <time
          dateTime={item.date}
          className="type-mono-meta block text-[12px] text-accent-ink"
        >
          {formatDate(item.date, lang)}
        </time>
        <p className="type-mono-meta mt-1 text-[11px] text-muted-foreground">
          {newsCategoryLabel(item.category, lang)}
        </p>
      </div>
      <div className="col-span-12 md:col-span-9">
        <h2 className="break-keep text-[16.5px] font-[600] leading-snug text-foreground">
          {title}
        </h2>
        <p className="mt-2 break-keep text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </div>
    </article>
  );
}
