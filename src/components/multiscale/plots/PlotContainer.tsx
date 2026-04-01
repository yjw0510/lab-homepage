"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface PlotOverlay {
  x: number;
  y: number;
  text?: string;
  latex?: string;
  color?: string;
  align?: "start" | "middle" | "end";
  rotate?: number;
  fontSize?: number;
  className?: string;
}

export interface PlotFontScale {
  axisLabel: number;
  tick: number;
  annotation: number;
}

export interface PlotMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlotContext {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: PlotMargins;
  font: PlotFontScale;
}

export interface PlotRender {
  svg: React.ReactNode;
  overlays?: PlotOverlay[];
}

export function PlotContainer({
  children,
  ariaLabel,
  className,
  aspectRatio = 0.72,
  minHeight = 220,
  maxHeight = 280,
}: {
  children: (context: PlotContext) => PlotRender;
  ariaLabel: string;
  className?: string;
  aspectRatio?: number;
  minHeight?: number;
  maxHeight?: number;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const update = () => {
      const nextWidth = Math.max(320, Math.round(node.getBoundingClientRect().width));
      setWidth(nextWidth);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = clampNumber(Math.round(width * aspectRatio), minHeight, maxHeight);
  const font = {
    axisLabel: clampNumber(Math.round(width * 0.04), 13, 15),
    tick: clampNumber(Math.round(width * 0.037), 12, 14),
    annotation: clampNumber(Math.round(width * 0.034), 11, 13),
  } as const;
  const margin = {
    top: clampNumber(Math.round(height * 0.085), 18, 24),
    right: clampNumber(Math.round(width * 0.06), 18, 30),
    bottom: clampNumber(Math.round(height * 0.2), 44, 56),
    left: clampNumber(Math.round(width * 0.145), 50, 64),
  } as const;
  const innerWidth = Math.max(220, width - margin.left - margin.right);
  const innerHeight = Math.max(150, height - margin.top - margin.bottom);

  const rendered = useMemo(() => children({ width, height, innerWidth, innerHeight, margin, font }), [
    children,
    font,
    height,
    innerHeight,
    innerWidth,
    margin,
    width,
  ]);

  return (
    <div
      className={`rounded-2xl p-3 border border-border/40 bg-muted/20 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className ?? ""}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div ref={measureRef} className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full h-auto"
        >
          {rendered.svg}
        </svg>
        {rendered.overlays?.map((overlay, index) => {
          const content = overlay.latex
            ? katex.renderToString(overlay.latex, {
                throwOnError: false,
                displayMode: false,
              })
            : null;
          const alignShift =
            overlay.align === "end" ? "-100%" : overlay.align === "start" ? "0%" : "-50%";
          const style = {
            left: `${(overlay.x / width) * 100}%`,
            top: `${(overlay.y / height) * 100}%`,
            color: overlay.color ?? PLOT_COLORS.axisLabel,
            fontSize: overlay.fontSize ?? font.axisLabel,
            transform: `translate(${alignShift}, -50%) rotate(${overlay.rotate ?? 0}deg)`,
          } as const;

          return (
            <div
              key={`${overlay.latex ?? overlay.text ?? "overlay"}-${index}`}
              className={`pointer-events-none absolute whitespace-nowrap leading-none ${overlay.className ?? ""}`}
              style={style}
            >
              {content ? (
                <span dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                overlay.text
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const PLOT_COLORS = {
  axis: "var(--plot-axis)",
  axisLabel: "var(--plot-label)",
  grid: "var(--plot-grid)",
  text: "var(--plot-text)",
} as const;

export const FONT = { axisLabel: 14, tick: 13, annotation: 12 } as const;

export const MARGIN = { top: 20, right: 24, bottom: 48, left: 56 } as const;
