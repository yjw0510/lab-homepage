"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

interface RdfPoint {
  r: number;
  g: number;
}

interface RdfMeta {
  shellRadii: number[];
  nBins: number;
  maxRadius: number;
}

const TRANSITION = "80ms ease-out";

export function BeadRDFPlot({
  progress,
  accentColor,
  rdfActiveRadius,
}: {
  progress: number;
  accentColor: string;
  rdfActiveRadius?: number;
}) {
  const clipId = useId();
  const [points, setPoints] = useState<RdfPoint[]>([]);
  const [meta, setMeta] = useState<RdfMeta | null>(null);

  // Load precomputed g(r) from the actual PBC trajectory
  useEffect(() => {
    fetch("/data/dna/rdf/rdf.bin")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const arr = new Float32Array(buf);
        const pts: RdfPoint[] = [];
        for (let i = 0; i < arr.length; i += 2) {
          pts.push({ r: arr[i], g: arr[i + 1] });
        }
        setPoints(pts);
      })
      .catch(() => {});

    fetch("/data/dna/rdf/meta.json")
      .then((r) => r.json())
      .then((m) => setMeta(m))
      .catch(() => {});
  }, []);

  const maxRadius = meta?.maxRadius ?? (points.length > 0 ? points[points.length - 1].r : 10);
  const yMax = useMemo(
    () => Math.max(2.4, ...points.map((p) => p.g)) * 1.08,
    [points],
  );

  const isBinDriven = rdfActiveRadius !== undefined;
  const activeCutoff = isBinDriven
    ? rdfActiveRadius
    : Math.min(maxRadius, maxRadius * (0.08 + progress * 0.9));

  // Snap to nearest data point for the indicator dot
  const activePoint = useMemo(() => {
    if (points.length === 0) return { r: 0, g: 0 };
    return points.reduce((best, p) =>
      Math.abs(p.r - activeCutoff) < Math.abs(best.r - activeCutoff) ? p : best,
    );
  }, [points, activeCutoff]);

  // Cache path generator — stable reference unless domain/range changes
  const buildPath = useMemo(() => {
    return (iw: number, ih: number) => {
      if (points.length < 2) return "";
      const xs = scaleLinear().domain([0, maxRadius]).range([0, iw]);
      const ys = scaleLinear().domain([0, yMax]).range([ih, 0]);
      return line<RdfPoint>().x((d) => xs(d.r)).y((d) => ys(d.g)).curve(curveMonotoneX)(points) || "";
    };
  }, [points, maxRadius, yMax]);

  return (
    <PlotContainer ariaLabel="Pair correlation function g(r) from CG trajectory with PBC">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([0, maxRadius]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([0, yMax]).range([innerHeight, 0]);
        const fullPath = buildPath(innerWidth, innerHeight);

        const oneY = yScale(1);
        const activeX = xScale(activePoint.r);
        const activeY = yScale(activePoint.g);

        const shellRadii = meta?.shellRadii ?? [];

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              {/* Axes */}
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={oneY} x2={innerWidth} y2={oneY} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />

              {/* Shell markers */}
              {shellRadii[0] != null && (
                <line x1={xScale(shellRadii[0])} y1={0} x2={xScale(shellRadii[0])} y2={innerHeight}
                  stroke="#06b6d4" strokeWidth={1.1} strokeDasharray="4,4" opacity={0.55} />
              )}
              {shellRadii[1] != null && (
                <line x1={xScale(shellRadii[1])} y1={0} x2={xScale(shellRadii[1])} y2={innerHeight}
                  stroke="#8b5cf6" strokeWidth={1.1} strokeDasharray="4,4" opacity={0.42} />
              )}

              {/* clipPath split — only the rect width/position changes per slider step */}
              <defs>
                <clipPath id={`${clipId}-left`}>
                  <rect x={0} y={-2} height={innerHeight + 4}
                    style={{ width: activeX, transition: isBinDriven ? `width ${TRANSITION}` : "none" }} />
                </clipPath>
                <clipPath id={`${clipId}-right`}>
                  <rect y={-2} height={innerHeight + 4}
                    style={{
                      transform: `translateX(${activeX}px)`,
                      width: innerWidth - activeX,
                      transition: isBinDriven ? `transform ${TRANSITION}, width ${TRANSITION}` : "none",
                    }} />
                </clipPath>
              </defs>

              {/* Full curve — left half (solid) */}
              <path d={fullPath} fill="none" stroke={accentColor} strokeWidth={2.6}
                strokeLinecap="round" strokeLinejoin="round"
                clipPath={isBinDriven ? `url(#${clipId}-left)` : undefined}
              />

              {/* Full curve — right half (faded), only in bin-driven mode */}
              {isBinDriven && fullPath && (
                <path d={fullPath} fill="none" stroke={accentColor} strokeWidth={2.2}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.18}
                  clipPath={`url(#${clipId}-right)`}
                />
              )}

              {/* Indicator line — CSS-transitioned transform */}
              <g style={{
                transform: `translateX(${activeX}px)`,
                transition: isBinDriven ? `transform ${TRANSITION}` : "none",
              }}>
                <line x1={0} y1={0} x2={0} y2={innerHeight}
                  stroke={`${accentColor}66`} strokeWidth={1.2} strokeDasharray="4,4" />
              </g>

              {/* Indicator dot — CSS-transitioned transform */}
              <circle r={4.8} fill="#f8fafc" stroke={accentColor} strokeWidth={2}
                style={{
                  transform: `translate(${activeX}px, ${activeY}px)`,
                  transition: isBinDriven ? `transform ${TRANSITION}` : "none",
                }}
              />

              <text x={innerWidth + 6} y={oneY + font.annotation / 3} fill={PLOT_COLORS.text} fontSize={font.annotation}>
                1
              </text>
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              latex: "r",
              align: "middle" as const,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "g(r)",
              align: "middle" as const,
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + activeX,
              y: margin.top + Math.max(activeY - 18, 10),
              latex: `r^*\\!=${activePoint.r.toFixed(2)}`,
              align: "middle" as const,
              color: accentColor,
              fontSize: font.annotation,
              className: "font-semibold",
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
