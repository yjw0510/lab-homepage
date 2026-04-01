"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMounted } from "@/hooks/useMounted";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const MoleculeHero = dynamic(
  () => import("@/components/three/MoleculeHero"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-background to-card animate-pulse" />
    ),
  }
);

const AtomSimulation = dynamic(
  () => import("@/components/physics/AtomSimulation"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-background to-card animate-pulse" />
    ),
  }
);

export function HeroSection({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const mounted = useMounted();

  return (
    <section className="relative h-[85vh] min-h-[480px] sm:min-h-[600px] flex items-center justify-center overflow-hidden bg-background">
      {mounted &&
        (isMobile ? (
          <AtomSimulation particleCount={20} interactive={false} />
        ) : (
          <MoleculeHero />
        ))}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">
          {dict.site.university} &middot; {dict.site.departments}
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          {dict.site.fullName}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {dict.site.description}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/${lang}/research-topics`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors"
          >
            {dict.home.exploreMultiscale}
          </Link>
          <Link
            href={`/${lang}/contact`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
          >
            {dict.home.joinLab}
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <ArrowDown className="w-5 h-5 text-muted-foreground" />
      </div>
    </section>
  );
}
