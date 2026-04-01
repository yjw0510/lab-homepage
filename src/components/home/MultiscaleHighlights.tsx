"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getMultiscaleIcon } from "@/lib/icons";
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

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll(".multiscale-card-reveal");
    if (!els) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [areas]);

  if (areas.length === 0) return null;

  return (
    <section className="py-12 sm:py-20 px-4" ref={containerRef}>
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          title={dict.multiscale.title}
          subtitle={dict.multiscale.subtitle}
        />

        <div className="space-y-10 sm:space-y-16">
          {areas.map((area, i) => {
            const Schematic = schematicMap[area.slug];
            const isEven = i % 2 === 0;

            return (
              <div
                key={area.slug}
                className="multiscale-card-reveal"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} gap-8 items-center`}>
                  {/* Schematic */}
                  {Schematic && (
                    <div className="w-full md:w-1/2 p-6 rounded-2xl bg-card border border-border">
                      <Schematic active={true} />
                    </div>
                  )}

                  {/* Text */}
                  <div className="w-full md:w-1/2 text-center md:text-left">
                    {area.scale && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-3">
                        {area.scale}
                      </span>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                      <div style={{ color: area.color }}>
                        {getMultiscaleIcon(area.icon, "w-6 h-6")}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">
                        {area.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {lang === "ko" && area.shortDescriptionKo ? area.shortDescriptionKo : area.shortDescription}
                    </p>
                    <Link
                      href={`/${lang}/multiscale/${area.slug}`}
                      className="inline-flex items-center gap-2 text-primary hover:text-primary-light font-medium transition-colors"
                    >
                      {dict.multiscale.learnMore}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
