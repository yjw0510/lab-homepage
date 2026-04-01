import { Award } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { FundingGrant } from "../../../data/funding";

export function FundingCard({ grant }: { grant: FundingGrant }) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent text-primary flex-shrink-0">
          <Award className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              className={
                grant.status === "active"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-muted text-muted-foreground"
              }
            >
              {grant.status === "active" ? "진행 중" : "완료"}
            </Badge>
            <Badge className="bg-primary/10 text-primary">{grant.role}</Badge>
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            {grant.title}
          </h3>
          {grant.titleKo && (
            <p className="text-muted-foreground text-sm">{grant.titleKo}</p>
          )}
          <p className="text-sm text-primary mt-1">{grant.agency}</p>
          <p className="text-sm text-muted-foreground">{grant.period}</p>
          {grant.amount && (
            <p className="text-sm text-muted-foreground">{grant.amount}</p>
          )}
          {grant.description && (
            <p className="mt-4 text-foreground leading-relaxed">
              {grant.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
