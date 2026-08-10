import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FundingCard } from "@/components/funding/FundingCard";
import { grants } from "../../../../data/funding";
import { getDictionary, hasLocale } from "../dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.funding.title, description: dict.funding.subtitle };
}

export default async function FundingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const activeGrants = grants.filter((g) => g.status === "active");
  const completedGrants = grants.filter((g) => g.status === "completed");
  const statusLabels = {
    active: dict.funding.active,
    completed: dict.funding.completed,
  };

  return (
    <div className="py-20 sm:py-28">
      {/* Gutter on the clamped element, not outside it. Applied to the outer div, `mx-auto`
          absorbs it and the column measures 1152px instead of the declared 1088, so body
          content on these four routes ruled 32px wider than the navbar above and the footer
          below it on the same screen. */}
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Masthead */}
        <header>
          <h1 className="type-display text-[37px] text-foreground sm:text-[49px]">
            {dict.funding.title}
          </h1>
          <p className="mt-4 max-w-[36rem] leading-relaxed text-muted-foreground">
            {dict.funding.subtitle}
          </p>
        </header>
        <div
          aria-hidden="true"
          className="mt-8 h-[3px] border-y border-border-strong"
        />

        {grants.length === 0 && (
          <div className="mt-14 border-b border-t border-border py-10 sm:mt-16">
            <p className="type-mono-meta text-[12px] text-muted-foreground">0</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {dict.funding.noGrants}
            </p>
          </div>
        )}

        {activeGrants.length > 0 && (
          <section className="mt-10">
            <div className="border-t border-border-strong pt-6">
              <h2 className="type-title flex items-baseline text-[28px] text-foreground"><span aria-hidden="true" className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary" />
                {dict.funding.active}
              </h2>
            </div>
            <div className="mt-6 border-b border-border">
              {activeGrants.map((grant) => (
                <FundingCard
                  key={grant.id}
                  grant={grant}
                  lang={lang}
                  statusLabels={statusLabels}
                />
              ))}
            </div>
          </section>
        )}

        {completedGrants.length > 0 && (
          <section className="mt-14 sm:mt-16">
            <div className="border-t border-border-strong pt-6">
              <h2 className="type-title flex items-baseline text-[28px] text-foreground"><span aria-hidden="true" className="mr-3 inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary" />
                {dict.funding.completed}
              </h2>
            </div>
            <div className="mt-6 border-b border-border">
              {completedGrants.map((grant) => (
                <FundingCard
                  key={grant.id}
                  grant={grant}
                  lang={lang}
                  statusLabels={statusLabels}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
