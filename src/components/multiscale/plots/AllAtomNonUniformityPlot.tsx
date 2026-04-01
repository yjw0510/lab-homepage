"use client";

import { useEffect, useMemo, useState } from "react";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

interface MetricPoint {
  phase: string;
  frame: number;
  meanWaterDistance: number;
  hydrationContacts: number;
}

interface HighlightPoint {
  id: string;
  phase: string;
  frame: number;
}

const FALLBACK_DATA: MetricPoint[] = [
  { phase: "nvt", frame: 1, meanWaterDistance: 3.05, hydrationContacts: 5 },
  { phase: "nvt", frame: 2, meanWaterDistance: 3.42, hydrationContacts: 2 },
  { phase: "nvt", frame: 3, meanWaterDistance: 3.18, hydrationContacts: 6 },
  { phase: "nvt", frame: 4, meanWaterDistance: 3.61, hydrationContacts: 3 },
  { phase: "nvt", frame: 5, meanWaterDistance: 3.29, hydrationContacts: 4 },
];

/** Deterministic pseudo-random from seed, returns 0–1. */
function hashFloat(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function AllAtomNonUniformityPlot({ accentColor }: { progress: number; accentColor: string; rdfActiveRadius?: number }) {
  const [data, setData] = useState<MetricPoint[]>(FALLBACK_DATA);
  const [highlight, setHighlight] = useState<HighlightPoint | null>(null);

  useEffect(() => {
    fetch("/data/multiscale/allatom/metrics.json")
      .then((response) => response.json())
      .then((next) => {
        if (Array.isArray(next?.trajectory)) {
          const parsed = next.trajectory.filter(
            (entry: MetricPoint) =>
              entry?.phase === "nvt" &&
              typeof entry?.frame === "number" &&
              typeof entry?.meanWaterDistance === "number" &&
              typeof entry?.hydrationContacts === "number",
          );
          if (parsed.length >= 5) {
            const stride = Math.max(1, Math.floor(parsed.length / 5));
            const sampled = parsed.filter((_: MetricPoint, index: number) => index % stride === 0).slice(0, 5);
            if (sampled.length >= 5) setData(sampled);
          }
        }
        if (Array.isArray(next?.highlights)) {
          const nextHighlight = next.highlights.find((entry: HighlightPoint) => entry?.id === "A3_nonuniformity");
          if (nextHighlight) setHighlight(nextHighlight);
        }
      })
      .catch(() => {});
  }, []);

  const neighborhoods = useMemo(() => {
    if (!data.length) return [];
    const highlightIndex = Math.max(
      0,
      data.findIndex((entry) => entry.phase === highlight?.phase && entry.frame === highlight?.frame),
    );
    const rotation = highlightIndex >= 0 ? highlightIndex : 0;
    return data.map((_, index) => data[(index + rotation) % data.length]);
  }, [data, highlight]);

  const maxContacts = Math.max(1, ...neighborhoods.map((entry) => entry.hydrationContacts));
  const minDistance = Math.min(...neighborhoods.map((entry) => entry.meanWaterDistance));
  const maxDistance = Math.max(...neighborhoods.map((entry) => entry.meanWaterDistance));
  const distanceSpan = Math.max(1e-6, maxDistance - minDistance);

  // Generate data-driven water positions per snapshot
  const waterPositions = useMemo(() => {
    return neighborhoods.map((entry, ni) => {
      const count = Math.max(1, Math.min(5, entry.hydrationContacts));
      const seed = entry.frame * 137 + ni * 31;
      const clusterAngle = hashFloat(seed) * Math.PI * 2;
      // Higher distance → more spread; lower distance → tighter cluster
      const spread = 0.4 + ((entry.meanWaterDistance - minDistance) / distanceSpan) * 0.8;
      const shellRadius = 22 + ((entry.meanWaterDistance - minDistance) / distanceSpan) * 14;

      return Array.from({ length: count }, (_, i) => {
        const angle = clusterAngle + (i - (count - 1) / 2) * spread * 0.7;
        const dist = shellRadius * (0.7 + hashFloat(seed + i * 89) * 0.3);
        const weight = 1 - (hashFloat(seed + i * 53) * 0.3);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          r: 2.5 + weight * 2,
          opacity: 0.35 + weight * 0.45,
        };
      });
    });
  }, [neighborhoods, minDistance, distanceSpan]);

  return (
    <PlotContainer
      ariaLabel="A short sequence of local neighborhoods showing that one atomistic liquid still produces uneven local environments"
      aspectRatio={0.8}
      minHeight={250}
      maxHeight={320}
    >
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const laneY = margin.top + innerHeight * 0.58;
        const leftX = margin.left + innerWidth * 0.18;
        const stepX = innerWidth * 0.2;
        const visibleNeighborhoods = neighborhoods.slice(0, 4);

        return {
          svg: (
            <g>
              <line x1={leftX - 12} y1={laneY} x2={leftX + stepX * 3 + 12} y2={laneY} stroke={PLOT_COLORS.grid} strokeDasharray="4,4" strokeWidth={1.2} />
              {visibleNeighborhoods.map((entry, index) => {
                const x = leftX + index * stepX;
                const shellRadius = 22 + ((entry.meanWaterDistance - minDistance) / distanceSpan) * 14;
                const isHighlight = index === 0;
                const waters = waterPositions[index] ?? [];

                return (
                  <g key={`${entry.phase}-${entry.frame}-${index}`}>
                    {/* Dashed shell outline */}
                    <circle
                      cx={x}
                      cy={laneY}
                      r={shellRadius}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth={1.2}
                      strokeDasharray="3,3"
                      opacity={isHighlight ? 0.5 : 0.25}
                    />
                    {/* Connecting lines from waters to center */}
                    {waters.map((w, wi) => (
                      <line
                        key={`line-${wi}`}
                        x1={x}
                        y1={laneY}
                        x2={x + w.x}
                        y2={laneY + w.y}
                        stroke={PLOT_COLORS.text}
                        strokeWidth={0.8}
                        opacity={w.opacity * 0.3}
                      />
                    ))}
                    {/* Solute marker (constant small size) */}
                    <circle cx={x} cy={laneY} r={5} fill={isHighlight ? "#f8fafc" : accentColor} opacity={isHighlight ? 0.95 : 0.7} />
                    {/* Water dots at data-driven positions */}
                    {waters.map((w, wi) => (
                      <circle
                        key={`water-${wi}`}
                        cx={x + w.x}
                        cy={laneY + w.y}
                        r={w.r}
                        fill={PLOT_COLORS.text}
                        opacity={w.opacity}
                      />
                    ))}
                  </g>
                );
              })}
            </g>
          ),
          overlays: [
            {
              x: leftX,
              y: margin.top + font.annotation * 1.2,
              text: "same liquid",
              align: "start",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
            {
              x: leftX + stepX * 3,
              y: margin.top + font.annotation * 1.2,
              text: "different local neighborhoods",
              align: "end",
              color: accentColor,
              fontSize: font.annotation,
            },
            {
              x: leftX,
              y: height - font.axisLabel * 1.7,
              text: "compact",
              align: "start",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: leftX + stepX * 3,
              y: height - font.axisLabel * 1.7,
              text: "looser",
              align: "end",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
