"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { stagger, useAnimate, useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMounted } from "@/hooks/useMounted";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const MoleculeHero = dynamic(() => import("@/components/three/MoleculeHero"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-background" />,
});

const AtomSimulation = dynamic(
  () => import("@/components/physics/AtomSimulation"),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-background" />,
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
  const reduceMotion = useReducedMotion();
  const [scope, animateEntrance] = useAnimate();
  const played = useRef(false);

  // Entrance (DESIGN.md §5): server HTML renders fully visible; JS animates
  // from a hidden keyframe only after mount, so nothing is CSS-hidden by
  // default and reduced-motion users get an instant hero.
  useEffect(() => {
    if (reduceMotion || played.current) return;
    played.current = true;
    const controls = animateEntrance(
      "[data-hero-line]",
      { opacity: [0, 1], y: [16, 0] },
      { duration: 0.6, delay: stagger(0.06), ease: [0.16, 1, 0.3, 1] }
    );
    return () => controls.complete();
  }, [animateEntrance, reduceMotion]);

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden bg-background">
      {/* WebGL scene: full backdrop on mobile, right portion on desktop.
          Left edge softened with a mask so display type stays legible. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 md:left-[36%] md:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
      >
        {mounted && (
          <div className="animate-fade-in absolute inset-0">
            {isMobile ? (
              <AtomSimulation particleCount={20} interactive={false} />
            ) : (
              <MoleculeHero />
            )}
          </div>
        )}
      </div>

      <div
        ref={scope}
        className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 sm:px-8"
      >
        <div className="pointer-events-none grid grid-cols-12 gap-x-6">
          <div className="col-span-12 min-w-0 md:col-span-7">
            <p
              data-hero-line
              className="type-mono-meta text-[13px] text-muted-foreground"
            >
              {dict.site.university}{" "}
              {dict.site.departments.replace(" \u00B7 ", "\u00A0\u00B7 ")}
            </p>
            {/* The 49-char English name needs a smaller clamp to hold the
                2-line headline cap (DESIGN.md §2); Korean takes the full size. */}
            <h1
              data-hero-line
              className={`type-display mt-5 break-keep text-foreground ${
                lang === "ko"
                  ? "text-[clamp(2.6rem,6vw,4.6rem)]"
                  : "text-[clamp(2.1rem,3.6vw,2.875rem)]"
              }`}
            >
              {dict.site.fullName}
            </h1>
            <p
              data-hero-line
              className="mt-6 max-w-[34rem] break-keep text-[17px] leading-relaxed text-muted-foreground sm:text-lg"
            >
              {dict.site.description}
            </p>

            <div data-hero-line className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/${lang}/research-topics`}
                className="pointer-events-auto inline-flex min-h-11 items-center justify-center bg-primary px-6 py-3 font-[600] text-primary-foreground transition-[transform,background-color] duration-[180ms] hover:-translate-y-px hover:bg-primary/90 active:translate-y-0"
              >
                {dict.home.exploreMultiscale}
              </Link>
              <Link
                href={`/${lang}/contact`}
                className="pointer-events-auto inline-flex min-h-11 items-center justify-center border border-border-strong px-6 py-3 font-[600] text-foreground transition-colors duration-[180ms] hover:bg-muted"
              >
                {dict.home.joinLab}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
