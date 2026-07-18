import Link from "next/link";
import { siteConfig } from "../../../data/site-config";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const scaleIndex = [
  { slug: "dft", scale: "10⁻¹⁰ m", ko: "제일원리", en: "DFT" },
  { slug: "mlff", scale: "10⁻⁹ m", ko: "MLFF", en: "MLFF" },
  { slug: "allatom", scale: "10⁻⁸ m", ko: "전원자", en: "All-atom" },
  { slug: "meso", scale: "10⁻⁷ m", ko: "메조", en: "Meso" },
];

const levelTextMap: Record<string, string> = {
  dft: "text-lv-dft",
  mlff: "text-lv-mlff",
  allatom: "text-lv-aa",
  meso: "text-lv-meso",
};

export function Footer({ lang, dict }: { lang: string; dict: Dictionary }) {
  return (
    <footer className="border-t border-border-strong pt-[3px]">
      <div className="border-t border-border">
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
                <span className="text-[15px] font-[650] tracking-[-0.015em] text-foreground">
                  {dict.site.name}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {dict.site.fullName}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {dict.site.departments}, {dict.site.university}
              </p>
            </div>

            {/* Contact metadata */}
            <div className="md:col-span-4">
              <h3 className="sr-only">{dict.footer.contact}</h3>
              <div className="type-mono-meta space-y-1 text-[12px] leading-relaxed text-muted-foreground">
                <p>{siteConfig.email}</p>
                <p>
                  {lang === "ko" && siteConfig.location.addressKo
                    ? siteConfig.location.addressKo
                    : siteConfig.location.address}
                </p>
              </div>
            </div>

            {/* Inline link row (gaps only: separators dangle when the row wraps) */}
            <nav aria-label={dict.footer.quickLinks} className="md:col-span-3">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
              {scaleIndex.map((area, i) => (
                <Link
                  key={area.slug}
                  href={`/${lang}/multiscale/${area.slug}`}
                  className={`type-mono-meta whitespace-nowrap py-2 text-[11px] ${
                    levelTextMap[area.slug] ?? "text-muted-foreground"
                  } transition-colors hover:text-foreground ${
                    i % 2 === 1 ? "justify-self-end sm:justify-self-auto" : ""
                  }`}
                >
                  {area.scale} {lang === "ko" ? area.ko : area.en}
                </Link>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p className="type-mono-meta mt-10 text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} {dict.site.fullName}.{" "}
            <span className="whitespace-nowrap">{dict.footer.allRights}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
