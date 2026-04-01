import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { siteConfig } from "../../../data/site-config";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export function Footer({ lang, dict }: { lang: string; dict: Dictionary }) {
  return (
    <footer className="border-t border-border/50 bg-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Lab info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">
                {dict.site.name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {dict.site.fullName}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {dict.site.departments}, {dict.site.university}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {dict.footer.quickLinks}
            </h3>
            <div className="space-y-2">
              {[
                { label: dict.nav.multiscale, href: "/multiscale" },
                { label: dict.nav.publications, href: "/publications" },
                { label: dict.nav.people, href: "/people" },
                { label: dict.nav.contact, href: "/contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={`/${lang}${link.href}`}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {dict.footer.contact}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{siteConfig.email}</p>
              <p>{lang === "ko" && siteConfig.location.addressKo ? siteConfig.location.addressKo : siteConfig.location.address}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {dict.site.fullName}.{" "}
          {dict.footer.allRights}
        </div>
      </div>
    </footer>
  );
}
