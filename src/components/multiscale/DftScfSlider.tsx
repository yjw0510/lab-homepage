"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ScfSnapshotMeta {
  index: number;
  iteration: number;
  label: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const THUMB = 28;
const THUMB_R = THUMB / 2;

export function DftScfSlider({
  snapshots,
  value,
  lang,
  onChange,
  onPointerStart,
  onPointerEnd,
}: {
  snapshots: ScfSnapshotMeta[];
  value: number;
  lang: string;
  onChange: (nextIndex: number) => void;
  onPointerStart: () => void;
  onPointerEnd: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const min = 0;
  const max = snapshots.length - 1;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setTrackWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setTrackWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const railWidth = Math.max(0, trackWidth - THUMB);
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

  return (
    <div className="absolute bottom-24 left-1/2 z-10 w-[min(560px,calc(100%-3rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.32)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-white/65">
        <span>{lang === "ko" ? "SCF 진행" : "SCF Progress"}</span>
        <span className="text-white/85">
          {snapshots[value]?.label ?? snapshots[value]?.iteration ?? value}
        </span>
      </div>

      <div className="relative">
        {/* Invisible native input for semantics + keyboard + pointer */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={onPointerStart}
          onPointerUp={onPointerEnd}
          onTouchStart={onPointerStart}
          onTouchEnd={onPointerEnd}
          aria-label={lang === "ko" ? "SCF iteration slider" : "SCF iteration slider"}
          className="absolute inset-0 z-20 h-7 w-full cursor-ew-resize opacity-0"
        />

        {/* Custom visible track */}
        <div ref={trackRef} className="relative h-7">
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/10"
            style={{ left: `${THUMB_R}px`, right: `${THUMB_R}px` }}
          />
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-orange-500"
            style={{
              left: `${THUMB_R}px`,
              width: `${Math.max(0, currentX - THUMB_R)}px`,
            }}
          />
          <div
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500"
            style={{ left: `${currentX}px` }}
          />
        </div>

        {/* Ticks + labels from the same coordinate model */}
        <div className="relative mt-3 h-10 text-[10px]">
          {ticks.map(({ snapshot, index, x }) => {
            const active = index === value;
            return (
              <button
                key={`${snapshot.index}-${snapshot.iteration}`}
                type="button"
                onMouseDown={onPointerStart}
                onMouseUp={onPointerEnd}
                onClick={() => onChange(index)}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${x}px` }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-orange-400" : "bg-white/30"}`} />
                  <span
                    className={
                      active
                        ? "rounded-md bg-white/8 px-2 py-1 text-white/90"
                        : "px-2 py-1 text-white/55"
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
