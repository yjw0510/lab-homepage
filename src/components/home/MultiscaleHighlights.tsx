"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MesoSchematic } from "@/components/multiscale/schematics/MesoSchematic";
import { AllAtomSchematic } from "@/components/multiscale/schematics/AllAtomSchematic";
import { MLFFSchematic } from "@/components/multiscale/schematics/MLFFSchematic";
import { DFTSchematic } from "@/components/multiscale/schematics/DFTSchematic";
import { TIER_LABEL, type SpecimenTier } from "@/lib/renderSpecimens";
import type { MultiscaleArea } from "@/types/multiscale";

const schematicMap: Record<
  string,
  React.ComponentType<{ active: boolean; ko?: boolean }>
> = {
  meso: MesoSchematic,
  allatom: AllAtomSchematic,
  mlff: MLFFSchematic,
  dft: DFTSchematic,
};

const levelTextMap: Record<string, string> = {
  dft: "text-lv-dft",
  mlff: "text-lv-mlff-text",
  allatom: "text-lv-aa",
  meso: "text-lv-meso",
};

/* Bars are rules, so they take the mark ink; the labels above them keep the text grade
   (DESIGN.md §2: in dark mode MLFF text is #E8705F, its mark stays #D14D41). */
const levelBarMap: Record<string, string> = {
  dft: "bg-lv-dft",
  mlff: "bg-lv-mlff",
  allatom: "bg-lv-aa",
  meso: "bg-lv-meso",
};

/* The ruler is a log axis from 0.1 nm to 1 µm, one decade per quarter. Each span is the
   area's `scale` front matter (content/multiscale/*.mdx) as percentages of that axis. */
const rulerLabels = ["0.1 nm", "1 nm", "10 nm", "100 nm", "1 µm"];
const rulerSpan: Record<SpecimenTier, [number, number]> = {
  dft: [0, 25], // 0.1-1 nm
  mlff: [25, 50], // 1-10 nm
  allatom: [25, 75], // 1-100 nm
  meso: [50, 100], // 10 nm - 1 µm
};

export function MultiscaleHighlights({
  areas,
  lang,
  dict,
}: {
  areas: MultiscaleArea[];
  lang: string;
  dict: { multiscale: { title: string; subtitle: string; learnMore: string } };
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Reveal policy (DESIGN.md §5): rows are visible by default; JS adds
  // .pre-reveal before observing, .visible on intersect.
  useEffect(() => {
    const els = containerRef.current?.querySelectorAll(".multiscale-card-reveal");
    if (!els || els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => {
      el.classList.add("pre-reveal");
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, [areas]);

  if (areas.length === 0) return null;

  return (
    <section className="py-20 sm:py-28" ref={containerRef}>
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeading
          title={dict.multiscale.title}
          subtitle={dict.multiscale.subtitle}
        />

        {/* Scale-ruler spine (signature system, DESIGN.md §7): each method's range above
            the log axis. Hidden from assistive tech because every row states its range. */}
        <div aria-hidden="true">
          <div className="space-y-1.5 pb-2">
            {areas.map((area) => {
              const tier = area.slug as SpecimenTier;
              const span = rulerSpan[tier];
              if (!span) return null;
              return (
                <div
                  key={area.slug}
                  className={`relative h-[22px] ${levelTextMap[area.slug] ?? "text-muted-foreground"}`}
                >
                  <span
                    className="type-mono-meta absolute top-0 whitespace-nowrap text-[11px] leading-4"
                    style={{ left: `${span[0]}%` }}
                  >
                    {TIER_LABEL[tier][lang === "ko" ? "ko" : "en"]}
                  </span>
                  <span
                    className={`absolute bottom-0 h-[2px] ${levelBarMap[area.slug] ?? "bg-current"}`}
                    style={{ left: `${span[0]}%`, width: `${span[1] - span[0]}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="scale-ruler scale-ruler-log" />
          <div className="type-mono-meta relative mt-2 h-4 text-[12px] text-muted-foreground">
            {rulerLabels.map((label, i) => (
              <span
                key={label}
                className={`absolute whitespace-nowrap ${
                  i === 0 ? "left-0" : i === rulerLabels.length - 1 ? "right-0" : "-translate-x-1/2"
                }`}
                style={i > 0 && i < rulerLabels.length - 1 ? { left: `${i * 25}%` } : undefined}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12">
          {areas.map((area, i) => {
            const Schematic = schematicMap[area.slug];

            return (
              <div
                key={area.slug}
                className="multiscale-card-reveal grid grid-cols-12 gap-x-6 gap-y-4 border-t border-border py-10 sm:py-12"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {/* Margin column: mono scale annotation */}
                <div className="col-span-12 sm:col-span-3">
                  <span
                    className={`type-mono-meta text-[12px] ${
                      levelTextMap[area.slug] ?? "text-muted-foreground"
                    }`}
                  >
                    {lang === "ko" && area.scaleKo ? area.scaleKo : area.scale}
                  </span>
                </div>

                {/* Content */}
                <div className="col-span-12 min-w-0 sm:col-span-9 md:grid md:grid-cols-[minmax(0,9fr)_minmax(0,10fr)] md:gap-8">
                  <div>
                    <h3 className="type-heading text-xl text-foreground">
                      {lang === "ko" && area.titleKo ? area.titleKo : area.title}
                    </h3>
                    <p className="mt-3 max-w-[34rem] break-keep leading-relaxed text-muted-foreground">
                      {lang === "ko" && area.shortDescriptionKo
                        ? area.shortDescriptionKo
                        : area.shortDescription}
                    </p>
                    <Link
                      href={`/${lang}/multiscale/${area.slug}`}
                      className="mt-4 inline-flex min-h-11 items-center text-accent-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-primary"
                    >
                      {dict.multiscale.learnMore}
                    </Link>
                  </div>

                  {Schematic && (
                    <div className="mt-6 flex items-center border border-border p-4 sm:p-5 md:mt-0">
                      <Schematic active={true} ko={lang === "ko"} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
