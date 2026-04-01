"use client";

import { useEffect, useState } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import { line } from "d3-shape";
import { withBasePath } from "@/lib/basePath";
import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

interface ScfSnapshotMeta {
  index: number;
  iteration: number;
  label: string;
}

interface ScfData {
  deltaE: number[];
  trajectory?: { iteration: number; deltaE: number }[];
  snapshots?: ScfSnapshotMeta[];
  threshold: number;
}

const FALLBACK: ScfData = {
  deltaE: [2.081, 2.417, 0.01147, 0.01095, 9.907e-4, 1.011e-4, 9.04e-6, 9.02e-7, 5.96e-8, 9.8e-9, 1.4e-9, 2e-10],
  trajectory: [
    { iteration: 0, deltaE: 2.081 },
    { iteration: 1, deltaE: 2.081 },
    { iteration: 2, deltaE: 2.417 },
    { iteration: 3, deltaE: 0.01147 },
    { iteration: 4, deltaE: 0.01095 },
    { iteration: 5, deltaE: 9.907e-4 },
    { iteration: 6, deltaE: 1.011e-4 },
    { iteration: 7, deltaE: 9.04e-6 },
    { iteration: 8, deltaE: 9.02e-7 },
    { iteration: 9, deltaE: 5.96e-8 },
    { iteration: 10, deltaE: 9.8e-9 },
    { iteration: 11, deltaE: 1.4e-9 },
    { iteration: 12, deltaE: 2e-10 },
  ],
  threshold: 1e-5,
};

export function SCFPlot({
  progress,
  accentColor,
  activeIndexOverride,
}: {
  progress: number;
  accentColor: string;
  activeIndexOverride?: number;
}) {
  const [data, setData] = useState<ScfData>(FALLBACK);

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/dft/scf.json"))
      .then((response) => response.json())
      .then((next) => {
        if (Array.isArray(next?.deltaE) && typeof next?.threshold === "number") {
          setData(next);
        }
      })
      .catch(() => {});
  }, []);

  const chartLength = data.trajectory?.length ?? data.deltaE.length;
  const activeIndex = Math.max(
    0,
    Math.min(
      chartLength - 1,
      activeIndexOverride ?? Math.round(progress * Math.max(0, chartLength - 1)),
    ),
  );

  return (
    <PlotContainer ariaLabel="SCF convergence during the DFT self-consistent cycle">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const chart = (data.trajectory?.length ? data.trajectory : data.deltaE.map((deltaE, index) => ({
          iteration: index + 1,
          deltaE,
        }))).map((point) => ({
          iteration: point.iteration,
          deltaE: Math.max(1e-12, point.deltaE),
        }));
        const xScale = scaleLinear().domain([1, chart.length]).range([0, innerWidth]);
        const yScale = scaleLog().domain([1e-10, 10]).range([innerHeight, 0]);
        const path = line<{ iteration: number; deltaE: number }>()
          .x((_, index) => xScale(index + 1))
          .y((d) => yScale(d.deltaE))(chart) || "";
        const thresholdY = yScale(data.threshold);
        const activePoint = chart[activeIndex];
        const activeX = xScale(activeIndex + 1);
        const activeY = yScale(activePoint.deltaE);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={thresholdY} x2={innerWidth} y2={thresholdY} stroke="#ef4444" strokeWidth={1.1} strokeDasharray="5,4" opacity={0.55} />
              <line x1={activeX} y1={0} x2={activeX} y2={innerHeight} stroke={`${accentColor}55`} strokeWidth={1.1} strokeDasharray="4,4" />
              <path d={path} fill="none" stroke={accentColor} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              {chart.map((point, index) => {
                const x = xScale(index + 1);
                const y = yScale(point.deltaE);
                const isActive = index === activeIndex;
                return (
                  <circle
                    key={`${point.iteration}-${index}`}
                    cx={x}
                    cy={y}
                    r={isActive ? 5 : 3.4}
                    fill={isActive ? "var(--plot-dot)" : accentColor}
                    stroke={accentColor}
                    strokeWidth={isActive ? 2 : 0}
                  />
                );
              })}
              <text x={activeX} y={innerHeight + 22} textAnchor="middle" fill={accentColor} fontSize={font.tick} fontWeight={600}>
                {activePoint.iteration}
              </text>
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              latex: "\\mathrm{Iteration}",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel * 0.95,
              y: margin.top + innerHeight / 2,
              latex: "\\left|\\Delta E\\right|\\,(\\mathrm{Ha})",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + innerWidth + 6,
              y: margin.top + thresholdY,
              latex: "10^{-5}",
              align: "start",
              color: "#ef4444",
              fontSize: font.annotation,
              className: "font-semibold",
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
