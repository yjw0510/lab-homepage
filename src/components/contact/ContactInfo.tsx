import { siteConfig } from "../../../data/site-config";

export function ContactInfo({ dict, lang }: { dict: { contact: { email: string; office: string; location: string } }; lang: string }) {
  const ko = lang === "ko";
  const building = ko && siteConfig.location.buildingKo ? siteConfig.location.buildingKo : siteConfig.location.building;
  const address = ko && siteConfig.location.addressKo ? siteConfig.location.addressKo : siteConfig.location.address;
  const university = ko && siteConfig.universityKo ? siteConfig.universityKo : siteConfig.university;

  return (
    <dl className="border-b border-border">
      <div className="border-t border-border py-4">
        <dt className="text-sm font-[600] text-foreground">
          {dict.contact.email}
        </dt>
        <dd className="type-mono-meta mt-1 text-[13px]">
          <a
            href={`mailto:${siteConfig.email}`}
            className="inline-block py-2 text-accent-ink underline decoration-[1px] underline-offset-[3px] transition-colors hover:text-primary"
          >
            {siteConfig.email}
          </a>
        </dd>
      </div>

      <div className="border-t border-border py-4">
        <dt className="text-sm font-[600] text-foreground">
          {dict.contact.office}
        </dt>
        <dd className="type-mono-meta mt-1.5 space-y-1 text-[13px] leading-relaxed text-muted-foreground">
          <p>{building}</p>
          {siteConfig.departments.map((d) => (
            <p key={d.name}>{ko && d.nameKo ? d.nameKo : d.name}</p>
          ))}
          <p>{university}</p>
        </dd>
      </div>

      <div className="border-t border-border py-4">
        <dt className="text-sm font-[600] text-foreground">
          {dict.contact.location}
        </dt>
        <dd className="type-mono-meta mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {address}
        </dd>
      </div>
    </dl>
  );
}
