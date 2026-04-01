"use client";

import { useEffect, useState } from "react";
import { scaleLinear } from "d3-scale";
import { area as d3Area, curveMonotoneX, line } from "d3-shape";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

interface MetricPoint {
  phase: string;
  timePs: number;
  caffeineNeighbors: number;
}

interface HighlightPoint {
  id: string;
  phase: string;
  timePs: number;
}

const FALLBACK: MetricPoint[] = [
  { phase: "nvt", timePs: 0, caffeineNeighbors: 0 },
  { phase: "nvt", timePs: 1.5, caffeineNeighbors: 1 },
  { phase: "nvt", timePs: 3.0, caffeineNeighbors: 2 },
  { phase: "nvt", timePs: 4.5, caffeineNeighbors: 2 },
  { phase: "nvt", timePs: 6.0, caffeineNeighbors: 1 },
];

export function CoordinationTracePlot({ progress, accentColor }: { progress: number; accentColor: string; rdfActiveRadius?: number }) {
  const [data, setData] = useState<MetricPoint[]>(FALLBACK);
  const [highlights, setHighlights] = useState<HighlightPoint[]>([]);

  useEffect(() => {
    fetch("/data/multiscale/allatom/metrics.json")
      .then((response) => response.json())
      .then((next) => {
        if (!Array.isArray(next?.trajectory)) return;
        const parsed = next.trajectory
          .filter(
            (entry: MetricPoint) =>
              entry?.phase === "nvt" &&
              typeof entry?.timePs === "number" &&
              typeof entry?.caffeineNeighbors === "number",
          )
          .map((entry: MetricPoint) => ({
            phase: entry.phase,
            timePs: entry.timePs,
            caffeineNeighbors: entry.caffeineNeighbors,
          }));
        if (parsed.length > 4) setData(parsed);
        if (Array.isArray(next?.highlights)) {
          setHighlights(
            next.highlights.filter(
              (entry: HighlightPoint) =>
                typeof entry?.id === "string" &&
                typeof entry?.phase === "string" &&
                typeof entry?.timePs === "number" &&
                entry.phase === "nvt",
            ),
          );
        }
      })
      .catch(() => {});
  }, []);

  const xMax = data[data.length - 1]?.timePs ?? 6;
  const yMax = Math.max(2, ...data.map((point) => point.caffeineNeighbors)) + 0.6;
  const visibleTime = xMax * (0.2 + progress * 0.75);
  const visible = data.filter((point) => point.timePs <= visibleTime);
  const chartPoints = visible.length >= 2 ? visible : data.slice(0, 2);

  return (
    <PlotContainer ariaLabel="Local caffeine packing coordination count extracted from the NVT production segment">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([0, xMax]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([0, yMax]).range([innerHeight, 0]);
        const linePath = line<MetricPoint>()
          .x((d) => xScale(d.timePs))
          .y((d) => yScale(d.caffeineNeighbors))
          .curve(curveMonotoneX)(chartPoints) || "";
        const areaPath = d3Area<MetricPoint>()
          .x((d) => xScale(d.timePs))
          .y0(innerHeight)
          .y1((d) => yScale(d.caffeineNeighbors))
          .curve(curveMonotoneX)(chartPoints) || "";
        const visibleHighlights = highlights.filter((point) => point.timePs <= visibleTime);
        const valueByTime = new Map(data.map((point) => [point.timePs, point.caffeineNeighbors]));

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <path d={areaPath} fill={accentColor} opacity={0.12} />
              <path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
              {visibleHighlights.map((point) => {
                const value = valueByTime.get(point.timePs);
                if (typeof value !== "number") return null;
                return (
                  <g key={point.id} transform={`translate(${xScale(point.timePs)},${yScale(value)})`}>
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
              latex: "t_{\\mathrm{NVT}}\\,(\\mathrm{ps})",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "N_{\\mathrm{caf}}^{\\mathrm{stack}}",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
