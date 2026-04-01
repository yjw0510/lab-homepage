import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { formatDate, getCategoryColor } from "@/lib/utils";
import type { NewsItem } from "@/types/news";

export function LabNews({ news, lang, dict }: { news: NewsItem[]; lang: string; dict: { home: { labNews: string; labNewsSubtitle: string; allNews: string } } }) {
  return (
    <section className="py-12 sm:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title={dict.home.labNews} subtitle={dict.home.labNewsSubtitle} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((item) => (
            <div
              key={item.slug}
              className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Badge className={getCategoryColor(item.category)}>
                  {item.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.date)}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {(lang === "ko" && item.titleKo) ? item.titleKo : item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {(lang === "ko" && item.summaryKo) ? item.summaryKo : item.summary}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={`/${lang}/news`}
            className="inline-flex items-center gap-2 text-primary hover:text-primary-light font-medium transition-colors"
          >
            {dict.home.allNews}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
