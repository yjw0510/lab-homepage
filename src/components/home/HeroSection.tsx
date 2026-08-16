"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
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

/** The export ships one HTML file to every visitor, so a random first specimen cannot be
 *  chosen during render without a hydration mismatch. A layout effect runs after hydration
 *  and before the browser paints, so the draw is never seen as a swap away from 01. */
const useDrawOnMount = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function HeroSection({ lang, dict }: { lang: string; dict: Dictionary }) {
  const ko = lang === "ko";
  const reduceMotion = useReducedMotion();
  // A phone pays roughly 2.7 MB per rotation for a plate a few hundred pixels wide, so it
  // advances only when the reader asks for another specimen.
  const isPhone = useMediaQuery("(max-width: 639px)");
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(true);
  // Two independent things, which a single flag used to conflate: whether the loop runs,
  // and whether the carousel steps on its own. Selecting a specimen must stop the second
  // without touching the first, or the reader's own choice arrives frozen.
  const [playing, setPlaying] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  // Announced only when the reader caused the change. An automatic advance leaves this
  // string alone, so the live region stays silent instead of reading out every 7 seconds.
  const [announcement, setAnnouncement] = useState("");

  useDrawOnMount(() => {
    setIndex(Math.floor(Math.random() * SPECIMENS.length));
  }, []);

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

  const rotating = playing && autoAdvance && !reduceMotion && !isPhone && inView;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % SPECIMENS.length),
      ROTATE_MS
    );
    return () => window.clearTimeout(id);
  }, [index, rotating]);

  const describe = (i: number) => {
    const s = SPECIMENS[i];
    return `${pad(i)} ${t(TIER_LABEL[s.tier])} ${t(s.name)}`;
  };

  // Picking a specimen is an explicit choice; letting the timer overwrite it seven seconds
  // later would undo it. It holds the carousel only, so the chosen specimen keeps moving.
  const select = (i: number) => {
    setIndex(i);
    setAutoAdvance(false);
    setAnnouncement(describe(i));
  };

  // One control, asymmetric on purpose: pause holds the whole hero, play releases the whole
  // hero. Splitting it into two buttons would spend a second 44px column to expose a
  // distinction between "stop the carousel" and "stop the picture" that a reader making
  // either choice does not have in mind.
  const togglePlaying = () => {
    const next = !playing;
    setPlaying(next);
    if (next) setAutoAdvance(true);
    setAnnouncement(
      next ? describe(index) : ko ? "자동 재생 멈춤" : "Autoplay paused"
    );
  };

  const label = {
    pause: ko ? "자동 재생 멈춤" : "Pause autoplay",
    play: ko ? "자동 재생 다시 시작" : "Resume autoplay",
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
          className="pointer-events-none order-2 mx-auto aspect-square h-[min(27dvh,58vw)] [@media(max-height:660px)]:h-[min(14dvh,32vw)] sm:h-[min(34dvh,72vw)] lg:absolute lg:inset-y-0 lg:right-0 lg:order-none lg:mx-0 lg:h-full lg:max-h-[58vw] lg:w-auto lg:max-w-[58%] lg:[mask-image:linear-gradient(to_right,transparent,black_34%)]"
        >
          <div key={active.slug} className="animate-fade-in h-full w-full">
            <SpecimenPlate
              specimen={active}
              play={playing && inView}
              priority
              sizes="(min-width: 1024px) 58vw, 72vw"
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="relative z-10 order-1 mx-auto w-full max-w-6xl px-6 pt-8 pb-6 sm:px-8 lg:order-none lg:py-8 [@media(max-height:700px)]:py-3">
          <div className="max-w-[34rem] lg:max-w-[42rem]">
            <p className="type-mono-meta text-[13px] text-muted-foreground">
              {dict.site.university}{" "}
              {dict.site.departments}
            </p>
            {/* On a short viewport the type steps down as well as the margins. The English
                name is 48 characters against the Korean's 17, so at 360x640 it took three
                display lines where Korean took two and pushed the readout band and the
                whole specimen tray 154px past the fold. */}
            <h1
              className={`type-display mt-5 break-keep text-foreground [@media(max-height:660px)]:mt-2 ${
                ko
                  ? "text-[clamp(2.35rem,5.2vw,3.4rem)] [@media(max-height:660px)]:text-[1.95rem]"
                  : "text-[clamp(1.85rem,3.1vw,2.5rem)] [@media(max-height:660px)]:text-[1.5rem]"
              }`}
            >
              {dict.site.fullName}
            </h1>
            <p className="mt-4 max-w-[34rem] break-keep text-[17px] leading-relaxed text-muted-foreground sm:text-lg [@media(max-height:700px)]:mt-2 [@media(max-height:660px)]:text-[15px] [@media(max-height:660px)]:leading-snug">
              {dict.site.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-4 [@media(max-height:700px)]:mt-3 [@media(max-height:660px)]:gap-3">
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
              <p className="type-heading mt-2 break-keep text-[17px] text-foreground">
                {t(active.name)}
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

      {/* Readout band: the one line that always names what is on screen. The band itself
          is not a live region — toggling `aria-live` on a live node is handled unevenly,
          and a seven-second automatic announcement would talk over a screen-reader user
          indefinitely. A dedicated node below carries reader-initiated changes only. */}
      <div className="relative z-10 shrink-0 border-t border-border bg-background">
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        <div className="mx-auto flex w-full max-w-6xl items-baseline gap-x-4 px-6 py-2 sm:px-8 [@media(max-height:660px)]:py-1.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-0.5">
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
        </div>
      </div>

      {/* Specimen selector and transport. Ruler ticks on a phone, where eight thumbnails
          cannot fit; the tray of plates from sm up, cells sharing the width so it never
          scrolls sideways. The transport is the row's terminal column rather than a widget
          in the readout band: it then shares the row's separator, its 2px baseline and its
          height ladder instead of breaking the band's baseline, and it costs no vertical
          space, which the band placement was measured to cost at 360x640. */}
      <div className="relative z-10 flex shrink-0 border-t border-border">
      <div role="group" aria-label={label.tray} className="flex min-w-0 flex-1">
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
              className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 border-t-2 border-l border-l-border px-1 py-2.5 first:border-l-0 [&:focus-visible]:outline-offset-[-2px] sm:gap-2 sm:px-2 sm:py-2 sm:[@media(max-height:800px)]:py-1 [@media(max-height:700px)]:py-1.5 ${
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

        {/* Transport. Under reduced motion no loop is mounted and the carousel is off, so
            the control would govern nothing. Its 2px baseline carries the held state in
            the same grammar the tray uses for the current cell, which is what makes the
            paused hero legible from the composition rather than from a 16px glyph. */}
        {!reduceMotion && (
          <button
            type="button"
            onClick={togglePlaying}
            aria-label={playing ? label.pause : label.play}
            className={`flex shrink-0 basis-11 flex-col items-center gap-1.5 border-t-2 border-l border-l-border px-1 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&:focus-visible]:outline-offset-[-2px] sm:basis-14 sm:gap-2 sm:py-2 sm:[@media(max-height:800px)]:py-1 [@media(max-height:700px)]:py-1.5 ${
              playing ? "border-t-transparent" : "border-t-foreground text-foreground"
            }`}
          >
            {playing ? (
              <Pause className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </section>
  );
}
