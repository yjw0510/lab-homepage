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

  const progress = max > 0 ? value / max : 0;
  const activeLabel =
    progress < 0.34
      ? lang === "ko"
        ? "초기 추정"
        : "Initial estimate"
      : progress < 0.8
        ? lang === "ko"
          ? "밀도 갱신 중"
          : "Updating density"
        : lang === "ko"
          ? "안정된 결과"
          : "Stable result";

  return (
    <div>
      <div className="type-mono-meta mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{lang === "ko" ? "전자 밀도 갱신" : "Electron-density update"}</span>
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
          aria-label={
            lang === "ko"
              ? "전자 밀도 갱신 과정 살펴보기"
              : "Explore the electron-density update"
          }
          aria-valuetext={activeLabel}
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
            return (
              <div
                key={`${snapshot.index}-${snapshot.iteration}`}
                className="pointer-events-none absolute top-0 flex -translate-x-1/2 items-start justify-center"
                style={{ left: `${x}px` }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2 w-[2px] ${active ? "bg-primary" : "bg-border-strong"}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
