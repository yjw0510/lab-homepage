"use client";

import { useEffect, useRef, useState } from "react";
import { useMounted } from "@/hooks/useMounted";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/providers/ThemeProvider";
import { loopSrc, posterSrc, type Specimen } from "@/lib/renderSpecimens";

// The backdrop baked into the loop survives H.264 to within a level or two of the
// background token, which can draw a faint rectangle on a large plate. Fading the
// outermost 2% on each axis lands the plate edge on the poster underneath, which carries
// the token exactly. Two nested masks instead of mask-composite, which browsers support
// unevenly. The poster is frame 0 of the same loop, so the two agree pixel for pixel.
const FADE_X =
  "linear-gradient(to right, transparent, black 2%, black 98%, transparent)";
const FADE_Y =
  "linear-gradient(to bottom, transparent, black 2%, black 98%, transparent)";

const DEFAULT_SIZES = "(min-width: 640px) 50vw, 100vw";

/** A multi-megabyte autoplaying loop is exactly what Save-Data asks us not to send. */
function readSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || /2g/.test(conn.effectiveType ?? "");
}

interface SpecimenPlateProps {
  specimen: Specimen;
  /** Only the plate the viewer is looking at should decode video. */
  play?: boolean;
  /** Load the poster eagerly for the plate that is above the fold at first paint. */
  priority?: boolean;
  /** Layout width of the plate, for poster selection. */
  sizes?: string;
  className?: string;
}

/** Owns its own readiness so unmounting resets it; a parent-held flag went stale and
 *  showed a remounted video at full opacity before it had decoded a frame. */
function Loop({ src, cacheKey }: { src: string; cacheKey: string }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="absolute inset-0" style={{ maskImage: FADE_X, WebkitMaskImage: FADE_X }}>
      <video
        key={cacheKey}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onPlaying={() => setReady(true)}
        style={{ maskImage: FADE_Y, WebkitMaskImage: FADE_Y }}
        className={`h-full w-full object-cover transition-opacity duration-[600ms] ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

/**
 * One rendered specimen. Both posters ship in the markup and swap by CSS so the correct
 * one is painted before hydration decides a theme; the loop mounts over the poster only
 * after mount, and only while the plate is actually on screen.
 *
 * The mount gate is load-bearing: the server has no theme, so rendering the video during
 * SSR ships a dark-mode source that every light-mode client throws away mid-LCP. The
 * observer stays connected for the same reason in reverse — a plate that scrolled away
 * must stop pulling multi-megabyte loops. The poster stays painted underneath throughout,
 * so an unmounting loop can never expose an empty box.
 */
export function SpecimenPlate({
  specimen,
  play = false,
  priority = false,
  sizes = DEFAULT_SIZES,
  className = "",
}: SpecimenPlateProps) {
  const { theme } = useTheme();
  const mounted = useMounted();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  // Read once at mount rather than in an effect; the loop cannot mount before `mounted`
  // is true anyway, so there is nothing for a later update to correct.
  const [saveData] = useState(readSaveData);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showLoop = mounted && onScreen && play && !reduceMotion && !saveData;

  const posterProps = {
    loading: priority ? ("eager" as const) : ("lazy" as const),
    decoding: "async" as const,
    sizes,
    className: "absolute inset-0 h-full w-full object-cover",
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-background ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...posterProps}
        alt=""
        src={posterSrc(specimen.slug, "light", true)}
        srcSet={`${posterSrc(specimen.slug, "light", true)} 640w, ${posterSrc(specimen.slug, "light")} 1280w`}
        className={`${posterProps.className} dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...posterProps}
        alt=""
        src={posterSrc(specimen.slug, "dark", true)}
        srcSet={`${posterSrc(specimen.slug, "dark", true)} 640w, ${posterSrc(specimen.slug, "dark")} 1280w`}
        className={`${posterProps.className} hidden dark:block`}
      />
      {showLoop && (
        <Loop
          src={loopSrc(specimen.slug, theme)}
          cacheKey={`${specimen.slug}-${theme}`}
        />
      )}
    </div>
  );
}
