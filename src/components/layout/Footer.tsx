import Link from "next/link";
import { siteConfig } from "../../../data/site-config";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { TIER_LABEL, TIER_SCALE, type SpecimenTier } from "@/lib/renderSpecimens";

const scaleIndex: SpecimenTier[] = ["dft", "mlff", "allatom", "meso"];

const levelTextMap: Record<string, string> = {
  dft: "text-lv-dft",
  mlff: "text-lv-mlff-text",
  allatom: "text-lv-aa",
  meso: "text-lv-meso",
};

export function Footer({ lang, dict }: { lang: string; dict: Dictionary }) {
  return (
    <footer>
      {/* The declared double rule: a 1px pair 3px apart, both --border-strong. It used to draw
          a strong line over a weak one, which is a different mark from the one the tier pages
          and the publication detail page ship under the same name. */}
      <div className="h-[3px] border-y border-border-strong" aria-hidden="true" />
      <div>
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
          {/* Colophon band */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {/* Identity */}
            <div className="md:col-span-5">
              <div className="flex items-baseline gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 self-center bg-primary"
                />
                <span className="type-heading text-[15px] leading-[1.7] text-foreground">
                  {dict.site.name}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {dict.site.fullName}
              </p>
              {/* Korean puts the university first, as the hero does. The English name is kept
                  whole so the line cannot end on "Ajou". */}
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {lang === "ko" ? (
                  `${dict.site.university} ${dict.site.departments}`
                ) : (
                  <>
                    {dict.site.departments},{" "}
                    <span className="whitespace-nowrap">{dict.site.university}</span>
                  </>
                )}
              </p>
            </div>

            {/* Contact metadata */}
            <div className="md:col-span-4">
              <h3 className="sr-only">{dict.footer.contact}</h3>
              <div className="type-mono-meta space-y-1 text-[12px] leading-relaxed text-muted-foreground">
                <p>
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="inline-flex min-h-6 items-center transition-colors hover:text-foreground"
                  >
                    {siteConfig.email}
                  </a>
                </p>
                {/* English breaks fall only between address parts, never inside one
                    ("Gyeonggi-|do"). The Korean address has no commas, so it wraps at its
                    spaces (break-keep) instead of becoming one unbreakable span. */}
                {lang === "ko" && siteConfig.location.addressKo ? (
                  <p className="break-keep">{siteConfig.location.addressKo}</p>
                ) : (
                  <p>
                    {siteConfig.location.address.split(", ").map((part, i) => (
                      <span key={part}>
                        {i > 0 && ", "}
                        <span className="whitespace-nowrap">{part}</span>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            {/* Link block, 2×2 so no link is left alone on a wrapped line. One column at md,
                where the 3-column cell (152px at 768) is narrower than the English 2×2. */}
            <nav aria-label={dict.footer.quickLinks} className="md:col-span-3">
              <div className="grid grid-cols-[repeat(2,max-content)] gap-x-4 gap-y-2 text-sm md:grid-cols-1 lg:grid-cols-[repeat(2,max-content)]">
                {[
                  { label: dict.nav.multiscale, href: "/multiscale" },
                  { label: dict.nav.publications, href: "/publications" },
                  { label: dict.nav.people, href: "/people" },
                  { label: dict.nav.contact, href: "/contact" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={`/${lang}${link.href}`}
                    className="inline-flex min-h-6 items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          {/* Scale ruler: DFT → MLFF → all-atom → meso.
              Mobile: 2×2 grid so no label orphans away from its tick. */}
          <div className="mt-12">
            <div className="scale-ruler" aria-hidden="true" />
            <div className="mt-2 grid grid-cols-2 gap-y-1 sm:flex sm:justify-between sm:gap-x-6">
              {scaleIndex.map((tier, i) => (
                <Link
                  key={tier}
                  href={`/${lang}/multiscale/${tier}`}
                  className={`type-mono-meta whitespace-nowrap py-2 text-[11px] ${
                    levelTextMap[tier] ?? "text-muted-foreground"
                  } transition-colors hover:text-foreground ${
                    i % 2 === 1 ? "justify-self-end sm:justify-self-auto" : ""
                  }`}
                >
                  {TIER_SCALE[tier]} {TIER_LABEL[tier][lang === "ko" ? "ko" : "en"]}
                </Link>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p className="type-mono-meta mt-10 text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} {dict.site.fullName}
          </p>
        </div>
      </div>
    </footer>
  );
}
