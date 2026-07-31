"use client";

import { useMeasuredBox } from "../useMeasuredBox";
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
  // The viewBox is written from this number, so it has to be the real one. Flooring it at
  // 320 made every container narrower than that paint the whole plot at boxWidth/320: in a
  // 254px rail column the svg rendered at 0.794 and the 12.5-unit tick labels reached the
  // reader as 9.92px while getComputedStyle still said 12.5. viewBox === measured pixels is
  // what makes the font scale below literal.
  const [measureRef, measured] = useMeasuredBox<HTMLDivElement>({ width: 360, height: 260 });
  const width = measured.width;

  const height = clampNumber(Math.round(width * aspectRatio), minHeight, maxHeight);
  const font = {
    axisLabel: clampNumber(Math.round(width * 0.042), 14, 16),
    tick: clampNumber(Math.round(width * 0.038), 12.5, 14),
    annotation: clampNumber(Math.round(width * 0.037), 12.5, 14),
  } as const;
  // These floors used to be sized for a width that was never below 320. Now that the
  // measured width is honest they have to hold at the real narrow end (a 254px rail
  // column): at the old minimums the margins alone left 186 units while innerWidth
  // insisted on 220, so the plot would have drawn 34 units past its own right edge.
  const margin = {
    top: clampNumber(Math.round(height * 0.085), 18, 24),
    right: clampNumber(Math.round(width * 0.06), 14, 30),
    bottom: clampNumber(Math.round(height * 0.2), 44, 56),
    left: clampNumber(Math.round(width * 0.145), 44, 64),
  } as const;
  const innerWidth = Math.max(140, width - margin.left - margin.right);
  const innerHeight = Math.max(120, height - margin.top - margin.bottom);

  const rendered = children({ width, height, innerWidth, innerHeight, margin, font });

  return (
    <div
      className={`border border-border bg-card p-3 ${className ?? ""}`}
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
