import { Badge } from "@/components/ui/Badge";
import { formatDate, getCategoryColor } from "@/lib/utils";
import type { NewsItem } from "@/types/news";

export function NewsCard({ item, lang }: { item: NewsItem; lang?: string }) {
  const title = (lang === "ko" && item.titleKo) ? item.titleKo : item.title;
  const summary = (lang === "ko" && item.summaryKo) ? item.summaryKo : item.summary;
  return (
    <article className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <Badge className={getCategoryColor(item.category)}>
          {item.category}
        </Badge>
        <time className="text-xs text-muted-foreground">
          {formatDate(item.date)}
        </time>
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {summary}
      </p>
    </article>
  );
}
