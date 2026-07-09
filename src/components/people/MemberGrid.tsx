import type { Person } from "@/types/person";

const roleLabels: Record<Person["role"], string> = {
  pi: "Principal Investigator",
  phd: "Ph.D. Student",
  ms: "M.S. Student",
  undergraduate: "Undergraduate Researcher",
  alumni: "Alumni",
};

export function MemberGrid({
  members,
  noMembersText,
}: {
  members: Person[];
  noMembersText: string;
}) {
  if (members.length === 0) {
    return (
      <div className="border-b border-t border-border py-10">
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {noMembersText}
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      {members.map((member) => (
        <div
          key={member.name}
          className="grid grid-cols-1 gap-x-8 gap-y-1 border-t border-border py-4 md:grid-cols-12"
        >
          <div className="type-mono-meta text-[12px] text-muted-foreground md:col-span-3">
            {member.enrollmentYear ?? ""}
          </div>
          <div className="md:col-span-9">
            <p className="font-[600] text-foreground">
              {member.name}
              {member.nameKo && (
                <span className="ml-2 font-[430] text-muted-foreground">
                  {member.nameKo}
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {roleLabels[member.role]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
