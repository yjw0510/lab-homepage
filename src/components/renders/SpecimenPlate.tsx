"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/providers/ThemeProvider";
import { loopSources, posterSrc, type LoopSource, type Specimen } from "@/lib/renderSpecimens";

// The backdrop baked into the loop survives compression to within a level or two of the
// background token, which can draw a faint rectangle on a large plate. Fading the
// outermost 2% on each axis lands the plate edge on the poster underneath, which carries
// the token exactly. Two nested masks instead of mask-composite, which browsers support
// unevenly. The poster is frame 0 of the same loop, so the two agree pixel for pixel.
const FADE_X =
  "linear-gradient(to right, transparent, black 2%, black 98%, transparent)";
const FADE_Y =
  "linear-gradient(to bottom, transparent, black 2%, black 98%, transparent)";

const DEFAULT_SIZES = "(min-width: 640px) 50vw, 100vw";

// How long the loop takes to fade in over the poster, and therefore how long it is held on
// frame 0. One number so the class below and the hold in Loop cannot drift apart.
const REVEAL_MS = 600;

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
  /** Whether the loop runs. False holds it on its current frame; it is not a mount gate,
   *  so resuming continues from where it stopped rather than restarting. */
  play?: boolean;
  /** Load the poster eagerly for the plate that is above the fold at first paint. */
  priority?: boolean;
  /** Layout width of the plate, for poster selection. */
  sizes?: string;
  /**
   * Labels for a reader-facing play/pause control on the plate itself. Present means draw
   * it. It is gated on the same `mountLoop` that decides whether there is a loop at all,
   * which is why it lives here rather than at the call site: reduced motion and Save-Data
   * are read inside this component, and a control the caller drew without them would be a
   * button that governs nothing. The hero passes nothing and keeps its own transport.
   */
  controls?: { play: string; pause: string };
  className?: string;
}

/**
 * Owns its own readiness so unmounting resets it; a parent-held flag went stale and
 * showed a remounted video at full opacity before it had decoded a frame.
 *
 * Readiness comes from `loadeddata`, not `playing`: a loop that mounts in the paused
 * state never fires `playing` at all (measured event list is
 * `loadedmetadata, loadeddata, canplay`), so gating on it would hold the element at
 * `opacity-0` and show the poster where the reader asked for a frozen frame.
 */
function Loop({
  sources,
  playing,
}: {
  sources: LoopSource[];
  playing: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  // The reveal happens once per mount; a later pause and resume must not re-arm the hold
  // below, or every resume would stall for the length of a fade.
  const revealed = useRef(false);

  // Playback starts only once the element is ready, and readiness means frame 0 is decoded.
  // The poster underneath is frame 0 of this same loop, verified: against the poster, frame
  // 0 scores SSIM 0.956 and every other frame scores about 0.61. So holding here is what
  // makes the reveal invisible. With `autoPlay` the element began playing the moment it
  // mounted while it was still `opacity-0`, and by the time `loadeddata` fired and the
  // 600ms fade ran, playback had already advanced; the reader saw the poster cut to a
  // frame from somewhere in the middle of the loop, which reads as a stutter.
  //
  // `play()` hands back a promise that rejects with AbortError whenever a pause or an
  // unmount lands before playback starts; unhandled it reaches window.onerror.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (!playing) {
      video.pause();
      return;
    }
    if (revealed.current) {
      void video.play().catch(() => {});
      return;
    }
    // Hold frame 0 for the length of the reveal so the cross-fade is frame 0 against
    // frame 0. Starting playback when the fade starts let the loop run through roughly
    // fourteen frames while it was still becoming visible: measured, the element was
    // already at currentTime 0.39s the first time it could be seen.
    revealed.current = true;
    const id = window.setTimeout(() => void video.play().catch(() => {}), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [playing, ready]);

  return (
    <div className="absolute inset-0" style={{ maskImage: FADE_X, WebkitMaskImage: FADE_X }}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        // `auto` rather than `metadata`: the element no longer autoplays, and some engines
        // will sit at HAVE_METADATA without ever decoding a frame until playback is asked
        // for. `loadeddata` is the signal the reveal waits on, so it has to be reachable
        // without playing first.
        preload="auto"
        aria-hidden="true"
        onLoadedData={() => setReady(true)}
        // Which element receives the failure is ambiguous in the spec once every source has
        // been tried, so both are wired. Either way the element is left transparent and the
        // poster underneath is what the reader sees.
        onError={() => setReady(false)}
        style={{ maskImage: FADE_Y, WebkitMaskImage: FADE_Y, ["--reveal" as string]: `${REVEAL_MS}ms` }}
        className={`h-full w-full object-cover transition-opacity duration-[--reveal] ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Walked in order; the first type the platform claims it can decode wins, and the
            list is not revisited if that one then fails. The element stays at opacity-0 in
            that case, which leaves the poster underneath painted. */}
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} media={source.media} />
        ))}
      </video>
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
 *
 * What survives what, since the two are often confused:
 * - Pause and resume hold the exact frame, because the element is never unmounted.
 * - Scrolling the plate past the observer margin, or switching theme, does recreate the
 *   element, and playback restarts at frame 0. Frame 0 is the poster, which is painted
 *   underneath, so the reset is invisible from the paused pose only if the reader paused
 *   near the loop start. Restoring `currentTime` was measured and rejected: each loop
 *   carries exactly one keyframe over 96 frames, so any seek decodes from zero to recover
 *   an offset inside a four-second loop.
 * - The reader's play/pause choice is held outside `Loop`, so it does survive both.
 */
export function SpecimenPlate({
  specimen,
  play = false,
  priority = false,
  sizes = DEFAULT_SIZES,
  controls,
  className = "",
}: SpecimenPlateProps) {
  const { theme } = useTheme();
  const mounted = useMounted();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  // Separate from `play`, which is the caller's gate. The two are ANDed, so a plate that
  // scrolled out of view still resumes on its own while a plate the reader stopped stays
  // stopped. Held here so it survives the remount a theme switch causes.
  const [readerPaused, setReaderPaused] = useState(false);
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

  // Mount gate and play gate are separate. `pause()` does not stop the transfer
  // (measured: a paused element keeps downloading to EOF), so leaving the plate's own
  // visibility out of the mount gate would defeat it. `play` only decides whether the
  // mounted element runs, which is what lets a pause hold its frame.
  const mountLoop = mounted && onScreen && !reduceMotion && !saveData;

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
      {mountLoop && (
        // The key belongs here, on the component, not on the `<video>` inside it. Held one
        // level down it replaced the element while leaving `Loop`'s own state standing, so
        // the new element inherited `ready: true` and `revealed: true` from the element it
        // replaced. Neither is an effect dependency that changed, and the element's own
        // `loadeddata` then set `ready` to the value it already held, which React discards
        // without re-rendering. Nothing ever called `play()`. Measured across all eight
        // plates on the four topic pages: after a theme switch the new source reached
        // readyState 4 with no error and full opacity, and sat at currentTime 0 forever.
        <Loop
          key={`${specimen.slug}-${theme}`}
          sources={loopSources(specimen.slug, theme)}
          playing={play && !readerPaused}
        />
      )}
      {/* The whole plate is the control, not a glyph in one corner of it. A 44px target in
          the corner is the thing a reader has to find; the picture is the thing they are
          already pointing at. The glyph inside is affordance and state, not the hit area,
          so it is a span: one button, and the plate cannot nest another.

          Held state is legible without the glyph, in the tray's grammar: a stopped plate
          keeps it on screen, a running one shows it on hover and on keyboard focus. A
          device with no hover keeps it on screen too, or nothing would say the picture
          answers to a tap. Drawn only when there is a loop for it to govern. */}
      {controls && mountLoop && (
        <button
          type="button"
          onClick={() => setReaderPaused((paused) => !paused)}
          aria-label={readerPaused ? controls.play : controls.pause}
          className="group absolute inset-0 cursor-pointer [&:focus-visible]:outline-offset-[-2px]"
        >
          <span
            className={`absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center border-l border-t border-border bg-surface-raised/90 text-muted-foreground transition-opacity group-hover:text-foreground group-focus-visible:opacity-100 ${
              readerPaused
                ? "text-foreground"
                : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            }`}
          >
            {readerPaused ? (
              <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </span>
        </button>
      )}
    </div>
  );
}
