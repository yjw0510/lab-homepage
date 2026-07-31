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

  const ticks = useMemo(() => {
    if (max <= 0) return [];
    return snapshots.map((snapshot, index) => ({
      snapshot,
      index,
      x: THUMB_R + (index / max) * railWidth,
    }));
  }, [snapshots, max, railWidth]);

  if (snapshots.length <= 1) return null;

  // scf.json carries English labels ("Initial guess", "Iter 4") because it is computed
  // output, so the readout has to be built from the iteration number the way the ticks
  // below already are. Printing snapshot.label put English on the Korean page.
  const activeSnapshot = snapshots[value];
  const activeLabel = !activeSnapshot
    ? String(value)
    : activeSnapshot.iteration === 0
      ? lang === "ko"
        ? "초기 추정"
        : "Initial guess"
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

        <div className="type-mono-meta relative mt-3 h-10 text-xs">
          {ticks.map(({ snapshot, index, x }) => {
            const active = index === value;
            return (
              <button
                key={`${snapshot.index}-${snapshot.iteration}`}
                type="button"
                onClick={() => onChange(index)}
                className="absolute top-0 flex min-h-9 min-w-6 -translate-x-1/2 items-start justify-center"
                style={{ left: `${x}px` }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2 w-[2px] ${active ? "bg-primary" : "bg-border-strong"}`} />
                  <span
                    className={
                      active
                        ? "bg-muted px-1.5 py-0.5 text-foreground"
                        : "px-1.5 py-0.5 text-muted-foreground"
                    }
                  >
                    {snapshot.iteration === 0 ? (lang === "ko" ? "초기" : "Init") : snapshot.iteration}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
