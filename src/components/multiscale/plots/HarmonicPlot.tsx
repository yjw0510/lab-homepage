"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

export function HarmonicPlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  return (
    <PlotContainer ariaLabel="Harmonic bond potential centered at the equilibrium bond length">
      {({ width, height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([0.6, 1.4]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([0, 2]).range([innerHeight, 0]);
        const data = Array.from({ length: 80 }, (_, i) => {
          const r = 0.6 + (i / 79) * 0.8;
          const v = 0.5 * 500 * (r - 0.96) ** 2;
          return { r, v: Math.min(v, 2) };
        });
        const path = line<{ r: number; v: number }>()
          .x((d) => xScale(d.r))
          .y((d) => yScale(d.v))
          .curve(curveMonotoneX)(data) || "";

        const r0X = xScale(0.96);
        const minY = yScale(0);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={r0X} y1={0} x2={r0X} y2={innerHeight} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <circle cx={r0X} cy={minY} r={4.8} fill="var(--plot-dot)" stroke={accentColor} strokeWidth={2} />
              <path d={path} fill="none" stroke={accentColor} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
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
              latex: "V(r)",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + r0X,
              y: height - font.tick * 2.1,
              latex: "r_0",
              align: "middle",
              color: accentColor,
              fontSize: font.tick,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
