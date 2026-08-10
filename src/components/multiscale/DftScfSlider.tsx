"use client";

import { useMemo } from "react";
import { useMeasuredBox } from "./useMeasuredBox";

interface ScfSnapshotMeta {
  index: number;
  iteration: number;
  label: string;
}

const THUMB = 28;
const THUMB_R = THUMB / 2;

export function DftScfSlider({
  snapshots,
  value,
  lang,
  onChange,
}: {
  snapshots: ScfSnapshotMeta[];
  value: number;
  lang: string;
  onChange: (nextIndex: number) => void;
}) {
  const [trackRef, track] = useMeasuredBox<HTMLDivElement>({ width: 0, height: 0 });

  const min = 0;
  const max = snapshots.length - 1;
  const railWidth = Math.max(0, track.width - THUMB);
  const currentT = max > min ? (value - min) / (max - min) : 0;
  const currentX = THUMB_R + currentT * railWidth;

  // Every snapshot gets a tick and a hit target; only some get a number. The run is 59
  // iterations long and a two-digit label needs about this much room, so at full width they
  // otherwise print on top of each other into an unreadable smear.
  const LABEL_WIDTH = 26;
  const labelStride = Math.max(1, Math.ceil(snapshots.length / Math.max(1, Math.floor(railWidth / LABEL_WIDTH))));

  const ticks = useMemo(() => {
    if (max <= 0) return [];
    return snapshots.map((snapshot, index) => ({
      snapshot,
      index,
      x: THUMB_R + (index / max) * railWidth,
    }));
  }, [snapshots, max, railWidth]);

  if (snapshots.length <= 1) return null;

  // scf.json carries English labels ("Iter 4") because it is computed output, so the readout has
  // to be built from the iteration number the way the ticks below already are. Printing
  // snapshot.label put English on the Korean page.
  const activeSnapshot = snapshots[value];
  const activeLabel = !activeSnapshot
    ? String(value)
    : lang === "ko"
      ? `반복 ${activeSnapshot.iteration}`
      : `Iteration ${activeSnapshot.iteration}`;

  return (
    <div>
      <div className="type-mono-meta mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{lang === "ko" ? "SCF 진행" : "SCF Progress"}</span>
        <span className="text-foreground">{activeLabel}</span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={lang === "ko" ? "SCF 반복 슬라이더" : "SCF iteration slider"}
          className="absolute inset-0 z-20 h-7 w-full cursor-ew-resize opacity-0"
        />

        <div ref={trackRef} className="relative h-7">
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-border-strong"
            style={{ left: `${THUMB_R}px`, right: `${THUMB_R}px` }}
          />
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-primary"
            style={{
              left: `${THUMB_R}px`,
              width: `${Math.max(0, currentX - THUMB_R)}px`,
            }}
          />
          <div
            className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-primary"
            style={{ left: `${currentX}px` }}
          />
        </div>

        {/* Ticks are decoration, not controls. At 59 snapshots the pitch is 5.09px, so no
            per-snapshot box can reach the 24px WCAG 2.5.8 floor — widening them from 16 to 24px
            only made each tick's topmost strip sit further from the mark it draws, so clicking a
            tick selected tick+2. The range input above already covers the whole track and is
            drag- and keyboard-accessible; it is the control. */}
        <div className="type-mono-meta pointer-events-none relative mt-3 h-10 text-xs">
          {ticks.map(({ snapshot, index, x }) => {
            const active = index === value;
            // Both ends are named, and then every `labelStride`-th tick, except where that would
            // land within one stride of the end and print on top of it. The selected iteration is
            // not forced into the row: it is already named above the track, and forcing it printed
            // its number over whichever strided label it happened to sit beside.
            const labelled =
              index === 0 ||
              index === max ||
              (index % labelStride === 0 && max - index >= labelStride);
            return (
              <div
                key={`${snapshot.index}-${snapshot.iteration}`}
                className="pointer-events-none absolute top-0 flex -translate-x-1/2 items-start justify-center"
                style={{ left: `${x}px` }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2 w-[2px] ${active ? "bg-primary" : "bg-border-strong"}`} />
                  {labelled ? (
                    <span
                      className={
                        active
                          ? "whitespace-nowrap bg-muted px-1.5 py-0.5 text-foreground"
                          : "whitespace-nowrap px-1.5 py-0.5 text-muted-foreground"
                      }
                    >
                      {snapshot.iteration}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
