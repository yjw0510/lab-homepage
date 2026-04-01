"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

export function LJCurvePlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  return (
    <PlotContainer ariaLabel="Lennard-Jones potential curve with sigma and epsilon markers">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const sigma = 3.166;
        const epsilon = 0.21;
        const xScale = scaleLinear().domain([2.8, 8]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([-0.3, 1.5]).range([innerHeight, 0]);
        const data = Array.from({ length: 120 }, (_, index) => {
          const r = 2.8 + (index / 119) * 5.2;
          const sr6 = (sigma / r) ** 6;
          const v = 4 * epsilon * (sr6 * sr6 - sr6);
          return { r, v: Math.min(v, 1.5) };
        });
        const path = line<{ r: number; v: number }>()
          .x((d) => xScale(d.r))
          .y((d) => yScale(d.v))
          .curve(curveMonotoneX)(data) || "";
        const sigmaX = xScale(sigma);
        const epsY = yScale(-epsilon);
        const zeroY = yScale(0);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={zeroY} x2={innerWidth} y2={zeroY} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <line x1={sigmaX} y1={zeroY - 5} x2={sigmaX} y2={zeroY + 5} stroke={accentColor} strokeWidth={1.8} />
              <line x1={0} y1={epsY} x2={sigmaX + 28} y2={epsY} stroke={accentColor} strokeWidth={1.1} strokeDasharray="3,3" opacity={0.6} />
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
              x: margin.left + sigmaX,
              y: margin.top + zeroY - 12,
              latex: "\\sigma",
              align: "middle",
              color: accentColor,
              fontSize: font.tick,
            },
            {
              x: margin.left + sigmaX + 34,
              y: margin.top + epsY,
              latex: "-\\varepsilon",
              align: "start",
              color: accentColor,
              fontSize: font.tick,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
