"use client";

import { useEffect, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import { withBasePath } from "@/lib/basePath";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";
import type { AllAtomReadoutId } from "../allatom/allAtomPagePolicy";

interface MetricPoint {
  phase: string;
  frame: number;
  timePs: number;
  hydrationContacts: number;
  packingScore: number;
  caffeineNeighbors: number;
}

interface HighlightPoint {
  id: string;
  phase: string;
  frame: number;
}

const FALLBACK: MetricPoint[] = [
  { phase: "nvt", frame: 1, timePs: 1, hydrationContacts: 3, packingScore: 0.45, caffeineNeighbors: 1 },
  { phase: "nvt", frame: 2, timePs: 2, hydrationContacts: 5, packingScore: 0.62, caffeineNeighbors: 2 },
  { phase: "nvt", frame: 3, timePs: 3, hydrationContacts: 4, packingScore: 0.56, caffeineNeighbors: 1 },
  { phase: "nvt", frame: 4, timePs: 4, hydrationContacts: 6, packingScore: 0.68, caffeineNeighbors: 2 },
  { phase: "nvt", frame: 5, timePs: 5, hydrationContacts: 5, packingScore: 0.6, caffeineNeighbors: 1 },
];

function normalizeSeries(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);
  return values.map((value) => (value - min) / span);
}

export function AllAtomReadoutPlot({
  progress,
  accentColor,
  activeReadout,
  onReadoutHover,
  onReadoutLeave,
  onReadoutToggle,
}: {
  progress: number;
  accentColor: string;
  rdfActiveRadius?: number;
  activeReadout?: AllAtomReadoutId | null;
  onReadoutHover?: (readout: AllAtomReadoutId) => void;
  onReadoutLeave?: () => void;
  onReadoutToggle?: (readout: AllAtomReadoutId) => void;
}) {
  const [data, setData] = useState<MetricPoint[]>(FALLBACK);
  const [highlight, setHighlight] = useState<HighlightPoint | null>(null);

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/allatom/metrics.json"))
      .then((response) => response.json())
      .then((next) => {
        if (Array.isArray(next?.trajectory)) {
          const parsed = next.trajectory.filter(
            (entry: MetricPoint) =>
              entry?.phase === "nvt" &&
              typeof entry?.frame === "number" &&
              typeof entry?.timePs === "number" &&
              typeof entry?.hydrationContacts === "number" &&
              typeof entry?.packingScore === "number" &&
              typeof entry?.caffeineNeighbors === "number",
          );
          if (parsed.length >= 6) setData(parsed.slice(-24));
        }
        if (Array.isArray(next?.highlights)) {
          const nextHighlight = next.highlights.find((entry: HighlightPoint) => entry?.id === "A5_readout");
          if (nextHighlight) setHighlight(nextHighlight);
        }
      })
      .catch(() => {});
  }, []);

  const highlightedIndex = Math.max(0, data.findIndex((entry) => entry.phase === highlight?.phase && entry.frame === highlight?.frame));
  const visibleCount = Math.max(4, Math.round(5 + progress * Math.max(0, data.length - 5)));
  const visible = data.slice(0, visibleCount);
  const series: Array<{
    id: AllAtomReadoutId;
    label: string;
    color: string;
    values: number[];
  }> = [
    {
      id: "orientation",
      label: "solvent orientation",
      color: accentColor,
      values: normalizeSeries(data.map((entry) => entry.hydrationContacts)),
    },
    {
      id: "packing",
      label: "local packing",
      color: "#f59e0b",
      values: normalizeSeries(data.map((entry) => entry.packingScore)),
    },
    {
      id: "motif",
      label: "contact motif",
      color: "#e2e8f0",
      values: normalizeSeries(data.map((entry) => entry.caffeineNeighbors)),
    },
  ];

  return (
    <PlotContainer
      ariaLabel="Three local readouts extracted from the same short all-atom trajectory window"
      aspectRatio={0.8}
      minHeight={255}
      maxHeight={325}
    >
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const x = scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, innerWidth]);
        const rowYs = [innerHeight * 0.22, innerHeight * 0.5, innerHeight * 0.78];
        const linegen = d3Line<{ cx: number; cy: number }>()
          .x((d) => d.cx)
          .y((d) => d.cy);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <rect x={0} y={0} width={innerWidth} height={innerHeight} rx={18} fill={accentColor} opacity={0.03} />
              {series.map((track, trackIndex) => {
                const rowY = rowYs[trackIndex];
                const isActive = activeReadout === track.id;
                const isDimmed = activeReadout != null && !isActive;
                // Connecting line data
                const linePoints = visible.map((_, index) => ({
                  cx: x(index),
                  cy: rowY,
                }));
                const pathD = linegen(linePoints);

                return (
                  <g
                    key={track.label}
                    onMouseEnter={() => onReadoutHover?.(track.id)}
                    onMouseLeave={onReadoutLeave}
                    onClick={() => onReadoutToggle?.(track.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Active track background band */}
                    {isActive && (
                      <rect x={0} y={rowY - 14} width={innerWidth} height={28} rx={6} fill={track.color} opacity={0.06} />
                    )}
                    <line x1={0} y1={rowY} x2={innerWidth} y2={rowY} stroke={PLOT_COLORS.grid} strokeDasharray="4,4" strokeWidth={1.1} />
                    {/* Connecting path between dots */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={track.color}
                        strokeWidth={1.2}
                        opacity={isActive ? 0.35 : isDimmed ? 0.06 : 0.18}
                      />
                    )}
                    {visible.map((point, index) => {
                      const normalized = track.values[index] ?? 0;
                      const isHighlight = index === highlightedIndex;
                      const dotOpacity = isHighlight
                        ? 0.96
                        : isActive
                          ? 0.5 + normalized * 0.5
                          : isDimmed
                            ? 0.12 + normalized * 0.12
                            : 0.38 + normalized * 0.48;
                      return (
                        <circle
                          key={`${track.label}-${point.phase}-${point.frame}-${index}`}
                          cx={x(index)}
                          cy={rowY}
                          r={2 + normalized * 3.5 + (isHighlight ? 1.4 : 0) + (isActive ? 0.8 : 0)}
                          fill={isHighlight ? "#f8fafc" : track.color}
                          opacity={dotOpacity}
                          stroke={isHighlight ? track.color : "none"}
                          strokeWidth={isHighlight ? 1.6 : 0}
                        />
                      );
                    })}
                  </g>
                );
              })}
              <line x1={x(highlightedIndex)} y1={0} x2={x(highlightedIndex)} y2={innerHeight} stroke={accentColor} strokeDasharray="5,4" strokeWidth={1.4} opacity={0.72} />
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              text: "one short trajectory, three local readouts",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            ...series.map((track, index) => ({
              x: margin.left + innerWidth * 0.03,
              y: margin.top + rowYs[index] - 12,
              text: track.label,
              align: "start" as const,
              color: activeReadout === track.id ? "#f8fafc" : activeReadout != null ? `${track.color}66` : track.color,
              fontSize: font.annotation,
            })),
          ],
        };
      }}
    </PlotContainer>
  );
}
