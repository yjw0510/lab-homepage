import { siteConfig } from "../../../data/site-config";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export function RecruitmentBanner({ dict }: { dict: Dictionary }) {
  const r = dict.recruitment;

  const positions = [
    { label: r.msPhdLabel, status: r.msPhdStatus },
    { label: r.postdocLabel, status: r.postdocStatus },
    { label: r.undergradLabel, status: r.undergradStatus },
  ];

  return (
    <div className="border border-border-strong p-8 sm:p-10">
      <h2 className="type-heading text-[21px] text-foreground">{r.title}</h2>

      <div className="mt-6 border-b border-border">
        {positions.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 border-t border-border py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <span className="text-sm font-[600] text-foreground">
              {row.label}
            </span>
            <span className="text-sm text-muted-foreground">{row.status}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-[600] text-foreground">{r.howToApply}</p>
        <p>
          <span className="font-[600] text-foreground">{r.msPhdLabel}:</span>{" "}
          {r.howToApplyText}
        </p>
        <p>
          <span className="font-[600] text-foreground">{r.undergradLabel}:</span>{" "}
          {r.undergradApplyText}
        </p>
        <p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="type-mono-meta inline-block py-2 text-[13px] text-accent-ink underline decoration-[1px] underline-offset-[3px] transition-colors hover:text-primary"
          >
            {siteConfig.email}
          </a>
        </p>
        <p>
          <span className="font-[600] text-foreground">{r.fields}:</span>{" "}
          {r.fieldsText}
        </p>
      </div>
    </div>
  );
}
