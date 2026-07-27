"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpecimenPlate } from "@/components/renders/SpecimenPlate";
import {
  SPECIMENS,
  posterSrc,
  TIER_LABEL,
  TIER_SCALE,
  type SpecimenTier,
} from "@/lib/renderSpecimens";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Dictionary } from "@/app/[lang]/dictionaries";

/** Tailwind cannot compile class names built at runtime, so every level token is written
 *  out in full. `textInk` is the text-grade variant: the dark MLFF mark colour measures
 *  4.42:1 on the page background, under the AA floor for 12px type. */
const TIER: Record<
  SpecimenTier,
  { textInk: string; fill: string; line: string }
> = {
  dft: { textInk: "text-lv-dft", fill: "bg-lv-dft", line: "border-lv-dft-line" },
  mlff: {
    textInk: "text-lv-mlff-text",
    fill: "bg-lv-mlff",
    line: "border-lv-mlff-line",
  },
  allatom: { textInk: "text-lv-aa", fill: "bg-lv-aa", line: "border-lv-aa-line" },
  meso: { textInk: "text-lv-meso", fill: "bg-lv-meso", line: "border-lv-meso-line" },
};

const ROTATE_MS = 7000;
const pad = (n: number) => String(n + 1).padStart(2, "0");

export function HeroSection({ lang, dict }: { lang: string; dict: Dictionary }) {
  const ko = lang === "ko";
  const reduceMotion = useReducedMotion();
  // A phone pays roughly 2.7 MB per rotation for a plate a few hundred pixels wide, so it
  // advances only when the reader asks for another specimen.
  const isPhone = useMediaQuery("(max-width: 639px)");
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(true);
  const [paused, setPaused] = useState(false);

  const active = SPECIMENS[index];
  const tier = TIER[active.tier];
  const t = (v: Record<"en" | "ko", string>) => (ko ? v.ko : v.en);

  // A hero that has scrolled away must stop rotating: each advance pulls a new
  // multi-megabyte loop, so an unwatched carousel is pure bandwidth.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rotating = !reduceMotion && !paused && !isPhone && inView;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % SPECIMENS.length),
      ROTATE_MS
    );
    return () => window.clearTimeout(id);
  }, [index, rotating]);

  // Picking a specimen is an explicit choice; letting the timer overwrite it seven seconds
  // later would undo the reader's action.
  const select = (i: number) => {
    setIndex(i);
    setPaused(true);
  };

  const label = {
    pause: ko ? "회전 멈춤" : "Pause rotation",
    resume: ko ? "회전 재개" : "Resume rotation",
    tray: ko ? "표본 선택" : "Select specimen",
  };

  return (
    <section
      ref={sectionRef}
      className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background"
    >
      <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
        {/* The specimen. Below lg it follows the masthead in reading order so a phone opens
            on the lab's name, not on a wordless render. From lg it is anchored to the right
            edge at full stage height, square so the render keeps its own composition, its
            left third dissolved by a mask so the display type never lands on rendered
            pixels. The height cap keeps it square on tall viewports instead of cropping. */}
        <div
          aria-hidden="true"
          className="pointer-events-none order-2 mx-auto aspect-square h-[min(27dvh,58vw)] [@media(max-height:660px)]:h-[min(25dvh,56vw)] sm:h-[min(34dvh,72vw)] lg:absolute lg:inset-y-0 lg:right-0 lg:order-none lg:mx-0 lg:h-full lg:max-h-[58vw] lg:w-auto lg:max-w-[58%] lg:[mask-image:linear-gradient(to_right,transparent,black_34%)]"
        >
          <div key={active.slug} className="animate-fade-in h-full w-full">
            <SpecimenPlate
              specimen={active}
              play={inView && !paused}
              priority
              sizes="(min-width: 1024px) 58vw, 72vw"
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="relative z-10 order-1 mx-auto w-full max-w-6xl px-6 pt-8 pb-6 sm:px-8 lg:order-none lg:py-8 [@media(max-height:700px)]:py-3">
          <div className="max-w-[34rem]">
            <p className="type-mono-meta text-[13px] text-muted-foreground">
              {dict.site.university}{" "}
              {dict.site.departments.replace(" · ", " · ")}
            </p>
            <h1
              className={`type-display mt-5 break-keep text-foreground [@media(max-height:660px)]:mt-3 ${
                ko
                  ? "text-[clamp(2.35rem,5.2vw,3.4rem)]"
                  : "text-[clamp(1.85rem,3.1vw,2.5rem)]"
              }`}
            >
              {dict.site.fullName}
            </h1>
            <p className="mt-4 max-w-[34rem] break-keep text-[17px] leading-relaxed text-muted-foreground sm:text-lg [@media(max-height:700px)]:mt-3">
              {dict.site.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-4 [@media(max-height:700px)]:mt-4">
              <Link
                href={`/${lang}/research-topics`}
                className="inline-flex min-h-11 items-center justify-center bg-primary px-6 py-3 font-[600] text-primary-foreground transition-[transform,background-color] duration-[180ms] hover:-translate-y-px hover:bg-primary/90 active:translate-y-0"
              >
                {dict.home.exploreMultiscale}
              </Link>
              <Link
                href={`/${lang}/contact`}
                className="inline-flex min-h-11 items-center justify-center border border-border-strong px-6 py-3 font-[600] text-foreground transition-colors duration-[180ms] hover:bg-muted"
              >
                {dict.home.joinLab}
              </Link>
            </div>

            {/* Printed plate label. Needs both a wide and a tall viewport; where either is
                missing, the readout band carries the same fields instead. */}
            <div className="mt-8 hidden max-w-[24rem] border-t border-border-strong pt-3 lg:[@media(min-height:820px)]:block">
              <p className={`type-mono-meta text-[12px] ${tier.textInk}`}>
                {t(TIER_LABEL[active.tier])}
                <span className="text-muted-foreground">
                  {" · "}
                  {TIER_SCALE[active.tier]}
                </span>
              </p>
              <p className="type-mono-meta mt-2.5 break-keep border-t border-border pt-2 text-[12px] leading-relaxed text-muted-foreground">
                {t(active.method)}
              </p>
              <p className="type-mono-meta mt-2 break-keep border-t border-border pt-2 text-[12px] leading-relaxed text-muted-foreground">
                {t(active.size)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Readout band: the one line that always names what is on screen. It only announces
          when the reader caused the change; a seven-second automatic announcement would
          talk over a screen-reader user indefinitely. */}
      <div className="relative z-10 shrink-0 border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-baseline gap-x-4 px-6 py-2 sm:px-8 [@media(max-height:660px)]:py-1.5">
          <div
            aria-live={rotating ? "off" : "polite"}
            className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-0.5"
          >
            <span className="type-mono-meta text-[12px] text-muted-foreground">
              {pad(index)} / {pad(SPECIMENS.length - 1)}
            </span>
            <span className={`type-mono-meta text-[12px] ${tier.textInk}`}>
              {t(TIER_LABEL[active.tier])}
            </span>
            <span className="type-heading min-w-0 break-keep text-[15px] text-foreground">
              {t(active.name)}
            </span>
            <span className="type-mono-meta w-full text-[12px] leading-relaxed text-muted-foreground lg:[@media(min-height:820px)]:hidden">
              {t(active.method)}
              {" · "}
              {t(active.size)}
            </span>
          </div>
          {!reduceMotion && !isPhone && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="type-mono-meta inline-flex min-h-11 shrink-0 items-center self-center px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {paused ? label.resume : label.pause}
            </button>
          )}
        </div>
      </div>

      {/* Specimen selector. Ruler ticks on a phone, where eight thumbnails cannot fit; the
          tray of plates from sm up, cells sharing the width so it never scrolls sideways. */}
      <div
        role="group"
        aria-label={label.tray}
        className="relative z-10 flex shrink-0 border-t border-border"
      >
        {SPECIMENS.map((specimen, i) => {
          const marks = TIER[specimen.tier];
          const isActive = i === index;
          return (
            <button
              key={specimen.slug}
              type="button"
              onClick={() => select(i)}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${pad(i)} ${t(TIER_LABEL[specimen.tier])} ${t(specimen.name)}`}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 border-t-2 border-l border-l-border px-1 py-2.5 outline-offset-[-2px] first:border-l-0 sm:gap-2 sm:px-2 sm:py-2 sm:[@media(max-height:800px)]:py-1 [@media(max-height:700px)]:py-1.5 ${
                isActive ? marks.line : "border-t-transparent hover:bg-muted"
              }`}
            >
              <span
                className={`type-mono-meta text-[12px] ${
                  isActive ? marks.textInk : "text-muted-foreground"
                }`}
              >
                {pad(i)}
              </span>
              {/* Phone: a ruler tick in the level's colour. From sm: the plate. */}
              <span
                aria-hidden="true"
                className={`block sm:hidden ${
                  isActive ? `h-5 w-[2px] ${marks.fill}` : "h-3.5 w-px bg-border"
                }`}
              />
              <span
                className={`relative hidden aspect-square w-full max-w-[88px] overflow-hidden bg-background transition-opacity duration-[180ms] sm:block sm:[@media(max-height:800px)]:max-w-[64px] sm:[@media(max-height:660px)]:max-w-[44px] ${
                  isActive ? "opacity-100" : "opacity-55"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterSrc(specimen.slug, "light", true)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover dark:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterSrc(specimen.slug, "dark", true)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 hidden h-full w-full object-cover dark:block"
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
