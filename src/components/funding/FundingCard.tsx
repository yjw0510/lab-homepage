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
  const ko = lang === "ko";
  const title = ko && grant.titleKo ? grant.titleKo : grant.title;
  const agency = ko && grant.agencyKo ? grant.agencyKo : grant.agency;
  const period = ko && grant.periodKo ? grant.periodKo : grant.period;
  const role = ko
    ? {
        PI: "연구책임자",
        "Co-PI": "공동연구책임자",
        Participant: "참여연구자",
      }[grant.role]
    : grant.role;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 border-t border-border py-5 md:grid-cols-12">
      <div className="type-mono-meta text-[12px] text-accent-ink md:col-span-3">
        {plainDashes(period)}
      </div>
      <div className="md:col-span-9">
        <h3 className="type-heading leading-relaxed text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{agency}</p>
        <p className="type-mono-meta mt-2 text-[12px] text-muted-foreground">
          {role} · {statusLabels[grant.status]}
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
