import type { Person } from "@/types/person";

// Localized, the way the sibling PIProfile already resolves `titleKo`. Mirrors the shape of
// newsCategoryLabel, which fixed this same bug class in src/types/news.ts.
const roleLabels: Record<Person["role"], Record<"en" | "ko", string>> = {
  pi: { en: "Principal Investigator", ko: "연구책임자" },
  phd: { en: "Ph.D. Student", ko: "박사과정" },
  ms: { en: "M.S. Student", ko: "석사과정" },
  undergraduate: { en: "Undergraduate Researcher", ko: "학부연구생" },
  alumni: { en: "Alumni", ko: "졸업생" },
};

export function MemberGrid({
  members,
  noMembersText,
  lang = "en",
}: {
  members: Person[];
  noMembersText: string;
  lang?: string;
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
              {roleLabels[member.role][lang as "en" | "ko"]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
