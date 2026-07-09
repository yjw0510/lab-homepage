import Link from "next/link";
import type { MultiscaleArea } from "@/types/multiscale";
import type { Dictionary } from "@/app/[lang]/dictionaries";

/* Mirrors the footer colophon ruler: DFT → MLFF → all-atom → meso. */
const rulerMarks = [
  { slug: "dft", scale: "10⁻¹⁰ m", ko: "제일원리", en: "DFT" },
  { slug: "mlff", scale: "10⁻⁹ m", ko: "MLFF", en: "MLFF" },
  { slug: "allatom", scale: "10⁻⁸ m", ko: "전원자", en: "All-atom" },
  { slug: "meso", scale: "10⁻⁷ m", ko: "메조", en: "Meso" },
];

export function MultiscaleOverview({
  areas,
  lang,
  dict,
}: {
  areas: MultiscaleArea[];
  lang: string;
  dict: Dictionary;
}) {
  if (areas.length === 0) return null;

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        {/* Masthead */}
        <header className="max-w-3xl">
          <h1 className="type-display text-4xl text-foreground sm:text-5xl">
            {dict.multiscale.title}
          </h1>
          <p className="mt-5 break-keep leading-relaxed text-muted-foreground">
            {dict.multiscale.subtitle}
          </p>
        </header>

        {/* Scale ruler — signature system (DESIGN.md §7c) */}
        <div className="mt-12">
          <div className="scale-ruler" aria-hidden="true" />
          <div className="mt-2 grid grid-cols-2 gap-y-1 sm:flex sm:justify-between sm:gap-x-6">
            {rulerMarks.map((mark, i) => (
              <span
                key={mark.slug}
                className={`type-mono-meta whitespace-nowrap text-[11px] text-muted-foreground ${
                  i % 2 === 1 ? "justify-self-end sm:justify-self-auto" : ""
                }`}
              >
                {mark.scale} {lang === "ko" ? mark.ko : mark.en}
              </span>
            ))}
          </div>
        </div>

        {/* Area index — margin-column ledger rows */}
        <div className="mt-16 border-b border-border">
          {areas.map((area) => (
            <Link
              key={area.slug}
              href={`/${lang}/multiscale/${area.slug}`}
              className="group grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border py-7 transition-colors hover:bg-muted/50 md:grid-cols-12"
            >
              <div className="type-mono-meta pt-1 text-[12px] text-muted-foreground md:col-span-3">
                {area.scale}
              </div>
              <div className="md:col-span-9">
                <h2 className="type-heading text-xl text-foreground sm:text-2xl">
                  {lang === "ko" && area.titleKo ? area.titleKo : area.title}
                </h2>
                <p className="mt-2 max-w-[42rem] break-keep text-sm leading-relaxed text-muted-foreground">
                  {lang === "ko" && area.shortDescriptionKo
                    ? area.shortDescriptionKo
                    : area.shortDescription}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
