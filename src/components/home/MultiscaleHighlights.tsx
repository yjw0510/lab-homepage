"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MesoSchematic } from "@/components/multiscale/schematics/MesoSchematic";
import { AllAtomSchematic } from "@/components/multiscale/schematics/AllAtomSchematic";
import { MLFFSchematic } from "@/components/multiscale/schematics/MLFFSchematic";
import { DFTSchematic } from "@/components/multiscale/schematics/DFTSchematic";
import type { MultiscaleArea } from "@/types/multiscale";

const schematicMap: Record<string, React.ComponentType<{ active: boolean }>> = {
  meso: MesoSchematic,
  allatom: AllAtomSchematic,
  mlff: MLFFSchematic,
  dft: DFTSchematic,
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

        {/* Scale-ruler spine (signature system, DESIGN.md §7) */}
        <div className="scale-ruler" aria-hidden="true" />
        <div className="type-mono-meta mt-2 flex justify-between text-[12px] text-muted-foreground">
          <span>Å</span>
          <span>nm</span>
          <span>µm</span>
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
                  <span className="type-mono-meta text-[12px] text-muted-foreground">
                    {area.scale}
                  </span>
                </div>

                {/* Content */}
                <div className="col-span-12 min-w-0 sm:col-span-9 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] md:gap-8">
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
                      <Schematic active={true} />
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
