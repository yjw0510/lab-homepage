"use client";

import { useEffect, useState } from "react";
import { scaleLinear } from "d3-scale";
import { area as d3Area, curveMonotoneX, line } from "d3-shape";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

interface RDFPoint {
  r: number;
  g: number;
  coordination?: number;
}

const FALLBACK: RDFPoint[] = Array.from({ length: 100 }, (_, i) => {
  const r = (i / 99) * 8;
  let g = 1;
  g += 2.0 * Math.exp(-((r - 3.5) ** 2) / 0.18);
  g += 0.8 * Math.exp(-((r - 5.6) ** 2) / 0.42);
  g *= 1 / (1 + Math.exp(-(r - 2.1) * 4.5));
  return { r, g: Math.max(0, g) };
});

export function RDFPlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  const [data, setData] = useState<RDFPoint[]>(FALLBACK);

  useEffect(() => {
    fetch("/data/multiscale/allatom/rdf.json")
      .then((response) => response.json())
      .then((next) => {
        const curve = Array.isArray(next) ? next : Array.isArray(next?.curve) ? next.curve : [];
        if (Array.isArray(curve)) {
          const parsed = curve
            .filter((entry): entry is RDFPoint => typeof entry?.r === "number" && typeof entry?.g === "number");
          if (parsed.length > 4) {
            setData(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  const xMax = data[data.length - 1]?.r ?? 8;
  const yMax = Math.max(3.2, ...data.map((point) => point.g)) * 1.08;
  const activeCutoff = xMax * (0.34 + progress * 0.5);
  const visiblePoints = data.filter((point) => point.r <= activeCutoff);
  const chartPoints = visiblePoints.length >= 2 ? visiblePoints : data.slice(0, 2);

  return (
    <PlotContainer ariaLabel="Caffeine-water radial distribution function derived from the explicit NVT trajectory">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([0, xMax]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([0, yMax]).range([innerHeight, 0]);
        const linePath = line<RDFPoint>()
          .x((d) => xScale(d.r))
          .y((d) => yScale(d.g))
          .curve(curveMonotoneX)(chartPoints) || "";
        const areaPath = d3Area<RDFPoint>()
          .x((d) => xScale(d.r))
          .y0(innerHeight)
          .y1((d) => yScale(d.g))
          .curve(curveMonotoneX)(chartPoints) || "";
        const oneY = yScale(1);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={oneY} x2={innerWidth} y2={oneY} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <path d={areaPath} fill={accentColor} opacity={0.12} />
              <path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              <text x={innerWidth + 6} y={oneY + font.annotation / 3} fill={PLOT_COLORS.text} fontSize={font.annotation}>
                1
              </text>
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              latex: "r\\,(\\AA)",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "g_{\\mathrm{caf-O_w}}(r)",
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
