"use client";

import { useEffect, useRef, useState } from "react";

export interface RdfBin {
  r: number;
  g: number;
}

const THUMB = 28;
const THUMB_R = THUMB / 2;

export function RDFBinSlider({
  bins,
  value,
  lang,
  onChange,
}: {
  bins: RdfBin[];
  value: number;
  lang: string;
  onChange: (nextIndex: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const max = bins.length - 1;

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
  const currentT = max > 0 ? value / max : 0;
  const currentX = THUMB_R + currentT * railWidth;

  const bin = bins[value];

  if (bins.length <= 1) return null;

  return (
    <div className="absolute bottom-24 left-1/2 z-10 w-[min(480px,calc(100%-3rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.32)] backdrop-blur-md">
      {/* Header + readout */}
      <div className="mb-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-white/65">
        <span>{lang === "ko" ? "RDF 반경" : "RDF Radius"}</span>
        {bin && (
          <span className="flex gap-3 text-white/85">
            <span>
              <span className="text-white/50">r</span> = {bin.r.toFixed(2)} nm
            </span>
            <span>
              <span className="text-white/50">g(r)</span> = {bin.g.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      <div className="relative">
        {/* Hidden native input */}
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="RDF bin slider"
          className="absolute inset-0 z-20 h-7 w-full cursor-ew-resize opacity-0"
        />

        {/* Custom visible track */}
        <div ref={trackRef} className="relative h-7">
          {/* Background rail */}
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/10"
            style={{ left: `${THUMB_R}px`, right: `${THUMB_R}px` }}
          />
          {/* Fill */}
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-cyan-500"
            style={{
              left: `${THUMB_R}px`,
              width: `${Math.max(0, currentX - THUMB_R)}px`,
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500"
            style={{ left: `${currentX}px` }}
          />
        </div>
      </div>
    </div>
  );
}
