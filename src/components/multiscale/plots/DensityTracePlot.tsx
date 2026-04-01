"use client";

import { useEffect, useState } from "react";
import { scaleLinear } from "d3-scale";
import { area as d3Area, curveMonotoneX, line } from "d3-shape";
import { withBasePath } from "@/lib/basePath";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

interface MetricPoint {
  phase: string;
  timePs: number;
  density: number;
}

interface HighlightPoint {
  id: string;
  phase: string;
  timePs: number;
}

const FALLBACK: MetricPoint[] = [
  { phase: "min", timePs: 0, density: 0.58 },
  { phase: "npt", timePs: 1, density: 0.72 },
  { phase: "npt", timePs: 3, density: 0.86 },
  { phase: "npt", timePs: 5, density: 0.95 },
  { phase: "nvt", timePs: 7, density: 0.99 },
  { phase: "nvt", timePs: 9, density: 1.0 },
  { phase: "nvt", timePs: 11, density: 0.99 },
];

export function DensityTracePlot({ progress, accentColor }: { progress: number; accentColor: string; rdfActiveRadius?: number }) {
  const [data, setData] = useState<MetricPoint[]>(FALLBACK);
  const [highlights, setHighlights] = useState<HighlightPoint[]>([]);

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/allatom/metrics.json"))
      .then((response) => response.json())
      .then((next) => {
        if (!Array.isArray(next?.trajectory)) return;
        const parsed = next.trajectory.filter(
          (entry: MetricPoint) =>
            typeof entry?.timePs === "number" &&
            typeof entry?.density === "number" &&
            typeof entry?.phase === "string",
        );
        if (parsed.length > 4) setData(parsed);
        if (Array.isArray(next?.highlights)) {
          setHighlights(
            next.highlights.filter(
              (entry: HighlightPoint) =>
                typeof entry?.id === "string" &&
                typeof entry?.phase === "string" &&
                typeof entry?.timePs === "number" &&
                ["min", "npt", "nvt"].includes(entry.phase),
            ),
          );
        }
      })
      .catch(() => {});
  }, []);

  const xMax = data[data.length - 1]?.timePs ?? 12;
  const yMin = Math.min(...data.map((point) => point.density)) - 0.03;
  const yMax = Math.max(...data.map((point) => point.density)) + 0.03;
  const visibleTime = xMax * (0.28 + progress * 0.68);
  const visible = data.filter((point) => point.timePs <= visibleTime);
  const chartPoints = visible.length >= 2 ? visible : data.slice(0, 2);
  const nvtStart = data.find((point) => point.phase === "nvt")?.timePs ?? xMax * 0.6;

  return (
    <PlotContainer ariaLabel="Density trace from geometry optimization through NPT compression and NVT production">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([0, xMax]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);
        const linePath = line<MetricPoint>()
          .x((d) => xScale(d.timePs))
          .y((d) => yScale(d.density))
          .curve(curveMonotoneX)(chartPoints) || "";
        const areaPath = d3Area<MetricPoint>()
          .x((d) => xScale(d.timePs))
          .y0(innerHeight)
          .y1((d) => yScale(d.density))
          .curve(curveMonotoneX)(chartPoints) || "";
        const nvtX = xScale(nvtStart);
        const densityByTime = new Map(data.map((point) => [point.timePs, point.density]));
        const visibleHighlights = highlights.filter((point) => point.timePs <= visibleTime);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <rect x={nvtX} y={0} width={Math.max(0, innerWidth - nvtX)} height={innerHeight} fill={accentColor} opacity={0.06} />
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={nvtX} y1={0} x2={nvtX} y2={innerHeight} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <path d={areaPath} fill={accentColor} opacity={0.12} />
              <path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
              {visibleHighlights.map((point) => {
                const density = densityByTime.get(point.timePs);
                if (typeof density !== "number") return null;
                return (
                  <g key={point.id} transform={`translate(${xScale(point.timePs)},${yScale(density)})`}>
                    <circle r={3.6} fill={accentColor} stroke="#050510" strokeWidth={1.2} />
                    <text y={-8} textAnchor="middle" fill={PLOT_COLORS.text} fontSize={font.annotation}>
                      {point.id.split("_")[0]}
                    </text>
                  </g>
                );
              })}
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              latex: "t\\,(\\mathrm{ps})",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "\\rho\\,(\\mathrm{g\\,cm^{-3}})",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + nvtX + 8,
              y: margin.top + font.annotation,
              text: "NVT",
              align: "start",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
            {
              x: margin.left + Math.max(8, nvtX - 10),
              y: margin.top + font.annotation,
              text: "NPT",
              align: "end",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
