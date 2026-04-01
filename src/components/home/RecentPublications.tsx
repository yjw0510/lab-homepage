import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PublicationCard } from "@/components/publications/PublicationCard";
import type { Publication } from "@/types/publication";

export function RecentPublications({
  publications,
  lang,
  dict,
}: {
  publications: Publication[];
  lang: string;
  dict: { home: { recentPublications: string; recentPublicationsSubtitle: string; viewAllPublications: string } };
}) {
  if (publications.length === 0) return null;

  return (
    <section className="py-12 sm:py-20 px-4 bg-card">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          title={dict.home.recentPublications}
          subtitle={dict.home.recentPublicationsSubtitle}
        />

        <div className="space-y-4">
          {publications.map((pub) => (
            <PublicationCard key={pub.slug} publication={pub} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={`/${lang}/publications`}
            className="inline-flex items-center gap-2 text-primary hover:text-primary-light font-medium transition-colors"
          >
            {dict.home.viewAllPublications}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
