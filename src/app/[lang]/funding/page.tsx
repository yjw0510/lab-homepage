import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FundingCard } from "@/components/funding/FundingCard";
import { grants } from "../../../../data/funding";
import { getDictionary, hasLocale } from "../dictionaries";

export const metadata: Metadata = {
  title: "Funding",
  description:
    "Research funding and grants for the Multiscale Molecular Computational Chemistry Lab.",
};

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

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={dict.funding.title}
          subtitle={dict.funding.subtitle}
        />

        {grants.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            {dict.funding.noGrants}
          </p>
        )}

        {activeGrants.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {dict.funding.active}
            </h2>
            <div className="space-y-6">
              {activeGrants.map((grant) => (
                <FundingCard key={grant.id} grant={grant} />
              ))}
            </div>
          </div>
        )}

        {completedGrants.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {dict.funding.completed}
            </h2>
            <div className="space-y-6">
              {completedGrants.map((grant) => (
                <FundingCard key={grant.id} grant={grant} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
