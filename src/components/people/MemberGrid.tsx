import Link from "next/link";
import { getInitials } from "@/lib/utils";
import type { Person } from "@/types/person";

export function MemberGrid({
  members,
  contactHref,
}: {
  members: Person[];
  contactHref: string;
}) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-xl bg-card border border-border">
        <p className="text-lg font-medium text-foreground mb-2">
          We are recruiting!
        </p>
        <p className="text-muted-foreground">
          Interested in joining our lab? Visit the{" "}
          <Link href={contactHref} className="text-primary hover:text-primary-light transition-colors">
            Contact
          </Link>{" "}
          page for details on open positions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((member) => (
        <div
          key={member.name}
          className="p-5 rounded-xl bg-card border border-border"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
            <span className="text-xl text-muted-foreground font-bold">
              {getInitials(member.name)}
            </span>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground">{member.name}</h3>
            {member.nameKo && (
              <p className="text-sm text-muted-foreground">{member.nameKo}</p>
            )}
            <p className="text-sm text-primary mt-1 capitalize">{member.role}</p>
            {member.enrollmentYear && (
              <p className="text-xs text-muted-foreground mt-1">
                Since {member.enrollmentYear}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
