"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

interface MetricPoint {
  phase: string;
  frame: number;
  density: number;
}

interface HighlightPoint {
  id: string;
  phase: string;
  frame: number;
}

export function AllAtomEnsemblePlot({ progress, accentColor }: { progress: number; accentColor: string; rdfActiveRadius?: number }) {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [highlight, setHighlight] = useState<HighlightPoint | null>(null);

  useEffect(() => {
    fetch("/data/multiscale/allatom/metrics.json")
      .then((response) => response.json())
      .then((next) => {
        if (Array.isArray(next?.trajectory)) {
          const parsed = next.trajectory.filter(
            (entry: MetricPoint) =>
              typeof entry?.frame === "number" &&
              typeof entry?.density === "number" &&
              typeof entry?.phase === "string",
          );
          if (parsed.length >= 6) setData(parsed);
        }
        if (Array.isArray(next?.highlights)) {
          const nextHighlight = next.highlights.find((entry: HighlightPoint) => entry?.id === "A4_ensemble");
          if (nextHighlight) setHighlight(nextHighlight);
        }
      })
      .catch(() => {});
  }, []);

  const visibleCount = Math.max(2, Math.round(2 + progress * Math.max(0, data.length - 2)));
  const visible = data.slice(0, visibleCount);
  const preparationEnd = Math.max(0, data.findLastIndex((entry) => entry.phase !== "nvt"));
  const ensembleStart = Math.max(0, data.findIndex((entry) => entry.phase === "nvt"));
  const highlightedIndex = Math.max(
    0,
    data.findIndex((entry) => entry.phase === highlight?.phase && entry.frame === highlight?.frame),
  );

  const yMin = useMemo(() => Math.min(...(data.map((entry) => entry.density).length ? data.map((entry) => entry.density) : [0.8])) - 0.03, [data]);
  const yMax = useMemo(() => Math.max(...(data.map((entry) => entry.density).length ? data.map((entry) => entry.density) : [1.05])) + 0.03, [data]);

  return (
    <PlotContainer
      ariaLabel="One prepared trajectory with an early preparation interval and a later thermal ensemble window"
      aspectRatio={0.78}
      minHeight={250}
      maxHeight={320}
    >
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const x = scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, innerWidth]);
        const y = scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);
        const densityPath = line<MetricPoint>()
          .x((_, index) => x(index))
          .y((point) => y(point.density))(visible) || "";

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <rect
                x={0}
                y={0}
                width={Math.max(0, x(preparationEnd))}
                height={innerHeight}
                rx={12}
                fill="#0b1526"
                opacity={0.6}
              />
              <rect
                x={x(ensembleStart)}
                y={0}
                width={Math.max(0, innerWidth - x(ensembleStart))}
                height={innerHeight}
                rx={12}
                fill={accentColor}
                opacity={0.07}
              />
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <path d={densityPath} fill="none" stroke={accentColor} strokeWidth={2.8} strokeLinecap="round" />
              {visible.map((point, index) => {
                const isHighlight = index === highlightedIndex;
                return (
                  <circle
                    key={`${point.phase}-${point.frame}-${index}`}
                    cx={x(index)}
                    cy={y(point.density)}
                    r={isHighlight ? 4.8 : 2.3}
                    fill={isHighlight ? "#f8fafc" : accentColor}
                    opacity={isHighlight ? 0.95 : 0.34 + (index / Math.max(1, visible.length - 1)) * 0.5}
                  />
                );
              })}
              <line x1={x(highlightedIndex)} y1={0} x2={x(highlightedIndex)} y2={innerHeight} stroke={accentColor} strokeDasharray="5,4" strokeWidth={1.4} opacity={0.72} />
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth * 0.2,
              y: margin.top + font.annotation * 1.15,
              text: "preparation",
              align: "middle",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
            {
              x: margin.left + innerWidth * 0.75,
              y: margin.top + font.annotation * 1.15,
              text: "prepared thermal window",
              align: "middle",
              color: accentColor,
              fontSize: font.annotation,
            },
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              text: "one prepared trajectory",
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
          ],
        };
      }}
    </PlotContainer>
  );
}
