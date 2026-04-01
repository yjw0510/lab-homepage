"use client";

import { scaleLinear } from "d3-scale";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = rng(123);
const N = 60;
const REF = Array.from({ length: N }, () => -500 + rand() * 400);
const PRED = REF.map((value) => value + (rand() - 0.5) * 20);

export function ParityPlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  return (
    <PlotContainer ariaLabel="Parity plot comparing MLFF predictions with DFT reference energies">
      {({ width, height, innerWidth, innerHeight, margin, font }) => {
        const xScale = scaleLinear().domain([-500, -100]).range([0, innerWidth]);
        const yScale = scaleLinear().domain([-500, -100]).range([innerHeight, 0]);
        const points = REF.map((reference, index) => ({
          x: xScale(reference),
          y: yScale(PRED[index]),
        }));
        const highlightCount = Math.max(1, Math.round(progress * points.length));
        const diagPath = `M${xScale(-500)},${yScale(-500)} L${xScale(-100)},${yScale(-100)}`;

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <path d={diagPath} fill="none" stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="5,4" />
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={index < highlightCount ? 3.2 : 2.6}
                  fill={accentColor}
                  opacity={index < highlightCount ? 0.78 : 0.28}
                />
              ))}
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              latex: "E_{\\mathrm{DFT}}",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "E_{\\mathrm{MLFF}}",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: width - font.annotation * 4,
              y: margin.top + font.annotation * 1.2,
              latex: "y=x",
              align: "middle",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
