"use client";

import { useEffect, useState } from "react";
import { scaleLinear } from "d3-scale";
import { area as d3Area, curveMonotoneX, line } from "d3-shape";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

interface MetricPoint {
  phase: string;
  timePs: number;
  density: number;
}

const FALLBACK: MetricPoint[] = [
  { phase: "nvt", timePs: 7.0, density: 0.985 },
  { phase: "nvt", timePs: 8.0, density: 0.994 },
  { phase: "nvt", timePs: 9.0, density: 0.998 },
  { phase: "nvt", timePs: 10.0, density: 0.992 },
  { phase: "nvt", timePs: 11.0, density: 0.996 },
];

export function NvtStabilityPlot({ progress, accentColor }: { progress: number; accentColor: string; rdfActiveRadius?: number }) {
  const [data, setData] = useState<MetricPoint[]>(FALLBACK);

  useEffect(() => {
    fetch("/data/multiscale/allatom/metrics.json")
      .then((response) => response.json())
      .then((next) => {
        if (!Array.isArray(next?.trajectory)) return;
        const parsed = next.trajectory.filter(
          (entry: MetricPoint) =>
            entry?.phase === "nvt" &&
            typeof entry?.timePs === "number" &&
            typeof entry?.density === "number",
        );
        if (parsed.length >= 3) setData(parsed);
      })
      .catch(() => {});
  }, []);

  const xMin = data[0]?.timePs ?? 0;
  const xMax = data[data.length - 1]?.timePs ?? 1;
  const yMin = Math.min(...data.map((point) => point.density)) - 0.01;
  const yMax = Math.max(...data.map((point) => point.density)) + 0.01;
  const visibleTime = xMin + (xMax - xMin) * (0.25 + progress * 0.75);
  const visible = data.filter((point) => point.timePs <= visibleTime);
  const chartPoints = visible.length >= 2 ? visible : data.slice(0, 2);
  const avgDensity = data.reduce((sum, point) => sum + point.density, 0) / Math.max(1, data.length);

  return (
    <PlotContainer ariaLabel="NVT production stability shown as a density trace within the fixed-volume production window">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);
        const linePath = line<MetricPoint>()
          .x((d) => xScale(d.timePs))
          .y((d) => yScale(d.density))
          .curve(curveMonotoneX)(chartPoints) || "";
        const areaPath = d3Area<MetricPoint>()
          .x((d) => xScale(d.timePs))
          .y0(yScale(avgDensity))
          .y1((d) => yScale(d.density))
          .curve(curveMonotoneX)(chartPoints) || "";

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <rect x={0} y={0} width={innerWidth} height={innerHeight} rx={16} fill={accentColor} opacity={0.05} />
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={yScale(avgDensity)} x2={innerWidth} y2={yScale(avgDensity)} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <path d={areaPath} fill={accentColor} opacity={0.14} />
              <path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
              {chartPoints.map((point, index) => (
                <circle
                  key={`${point.timePs}-${index}`}
                  cx={xScale(point.timePs)}
                  cy={yScale(point.density)}
                  r={2.4}
                  fill={accentColor}
                  opacity={0.25 + index / Math.max(chartPoints.length, 1) * 0.75}
                />
              ))}
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
              latex: "\\rho_{\\mathrm{NVT}}",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + innerWidth - 4,
              y: margin.top + font.annotation,
              text: "production window",
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
