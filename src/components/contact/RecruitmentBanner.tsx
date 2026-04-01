import { Users } from "lucide-react";
import { siteConfig } from "../../../data/site-config";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export function RecruitmentBanner({ dict }: { dict: Dictionary }) {
  const r = dict.recruitment;

  return (
    <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent border border-primary/20">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/20 text-primary flex-shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {r.title}
          </h3>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-2">
              <span className="font-medium text-foreground text-sm w-28 sm:w-36 flex-shrink-0">
                {r.msPhdLabel}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.msPhdStatus}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-foreground text-sm w-28 sm:w-36 flex-shrink-0">
                {r.postdocLabel}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.postdocStatus}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-foreground text-sm w-28 sm:w-36 flex-shrink-0">
                {r.undergradLabel}
              </span>
              <span className="text-sm text-primary font-medium">
                {r.undergradStatus}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {r.howToApply}:
              </span>{" "}
              {r.howToApplyText}
            </p>
            <p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-primary hover:text-primary-light transition-colors"
              >
                {siteConfig.email}
              </a>
            </p>
            <p>
              <span className="font-medium text-foreground">
                {r.fields}:
              </span>{" "}
              {r.fieldsText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
