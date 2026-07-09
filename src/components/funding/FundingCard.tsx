import type { FundingGrant } from "../../../data/funding";

/* Periods in data/funding.ts use en-dashes; render them as plain hyphens. */
function plainDashes(s: string) {
  return s.replace(/[\u2013\u2014]/g, "-");
}

export function FundingCard({
  grant,
  lang,
  statusLabels,
}: {
  grant: FundingGrant;
  lang: string;
  statusLabels: { active: string; completed: string };
}) {
  const title = lang === "ko" && grant.titleKo ? grant.titleKo : grant.title;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 border-t border-border py-5 md:grid-cols-12">
      <div className="type-mono-meta text-[12px] text-muted-foreground md:col-span-3">
        {plainDashes(grant.period)}
      </div>
      <div className="md:col-span-9">
        <h3 className="font-[600] leading-relaxed text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{grant.agency}</p>
        <p className="type-mono-meta mt-2 text-[12px] text-muted-foreground">
          {grant.role} · {statusLabels[grant.status]}
        </p>
        {grant.amount && (
          <p className="type-mono-meta mt-1 text-[12px] text-muted-foreground">
            {grant.amount}
          </p>
        )}
        {grant.description && (
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {grant.description}
          </p>
        )}
      </div>
    </div>
  );
}
