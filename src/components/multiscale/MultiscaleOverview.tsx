import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getMultiscaleIcon } from "@/lib/icons";
import type { MultiscaleArea } from "@/types/multiscale";

export function MultiscaleOverview({
  areas,
  lang,
}: {
  areas: MultiscaleArea[];
  lang: string;
}) {
  if (areas.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {areas.map((area) => (
        <Link
          key={area.slug}
          href={`/${lang}/multiscale/${area.slug}`}
          className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="mb-4" style={{ color: area.color }}>
            {getMultiscaleIcon(area.icon)}
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
            {area.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {lang === "ko" && area.shortDescriptionKo ? area.shortDescriptionKo : area.shortDescription}
          </p>
          <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
            {lang === "ko" ? "자세히 보기" : "Learn more"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      ))}
    </div>
  );
}
