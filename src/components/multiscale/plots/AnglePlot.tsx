"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

export function AnglePlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  return (
    <PlotContainer ariaLabel="Harmonic angle potential centered at the equilibrium bond angle">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([80, 140]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([0, 3]).range([innerHeight, 0]);
        const theta0 = 109.5;
        const data = Array.from({ length: 60 }, (_, i) => {
          const theta = 80 + i;
          const v = 0.5 * 75 * ((theta - theta0) * Math.PI / 180) ** 2;
          return { theta, v: Math.min(v, 3) };
        });
        const path = line<{ theta: number; v: number }>()
          .x((d) => xScale(d.theta))
          .y((d) => yScale(d.v))
          .curve(curveMonotoneX)(data) || "";
        const theta0X = xScale(theta0);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={theta0X} y1={0} x2={theta0X} y2={innerHeight} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <path d={path} fill="none" stroke={accentColor} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              latex: "\\theta\\,(^\\circ)",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "V(\\theta)",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + theta0X,
              y: height - font.tick * 2.1,
              latex: "\\theta_0",
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
