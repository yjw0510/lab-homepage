import { Mail, MapPin, Building2 } from "lucide-react";
import { siteConfig } from "../../../data/site-config";

export function ContactInfo({ dict, lang }: { dict: { contact: { email: string; office: string; location: string } }; lang: string }) {
  const building = lang === "ko" && siteConfig.location.buildingKo ? siteConfig.location.buildingKo : siteConfig.location.building;
  const address = lang === "ko" && siteConfig.location.addressKo ? siteConfig.location.addressKo : siteConfig.location.address;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent text-primary flex-shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{dict.contact.email}</h3>
          <a
            href={`mailto:${siteConfig.email}`}
            className="text-primary hover:text-primary-light transition-colors"
          >
            {siteConfig.email}
          </a>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent text-primary flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{dict.contact.office}</h3>
          <p className="text-muted-foreground">{building}</p>
          {siteConfig.departments.map((d) => (
            <p key={d.name} className="text-sm text-muted-foreground">
              {d.name}
            </p>
          ))}
          <p className="text-sm text-muted-foreground">{siteConfig.university}</p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent text-primary flex-shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{dict.contact.location}</h3>
          <p className="text-muted-foreground">{address}</p>
        </div>
      </div>
    </div>
  );
}
