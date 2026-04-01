"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/basePath";
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
    fetch(withBasePath("/data/multiscale/allatom/metrics.json"))
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
          if (parsed.length >= 3) {
            const stride = Math.max(1, Math.floor(parsed.length / 3));
            const sampled = parsed.filter((_: MetricPoint, index: number) => index % stride === 0).slice(0, 3);
            if (sampled.length >= 3) setData(sampled);
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

  const minDistance = Math.min(...neighborhoods.map((entry) => entry.meanWaterDistance));
  const maxDistance = Math.max(...neighborhoods.map((entry) => entry.meanWaterDistance));
  const distanceSpan = Math.max(1e-6, maxDistance - minDistance);
  const maxContacts = Math.max(1, ...neighborhoods.map((entry) => entry.hydrationContacts));

  // Generate water positions per neighborhood
  const waterPositions = useMemo(() => {
    return neighborhoods.map((entry, ni) => {
      const count = Math.max(2, Math.min(6, entry.hydrationContacts));
      const seed = entry.frame * 137 + ni * 31;
      const shellRadius = 20 + ((entry.meanWaterDistance - minDistance) / distanceSpan) * 18;
      return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + hashFloat(seed + i * 89) * 0.6;
        const dist = shellRadius * (0.75 + hashFloat(seed + i * 53) * 0.25);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          r: 2.8,
        };
      });
    });
  }, [neighborhoods, minDistance, distanceSpan]);

  return (
    <PlotContainer
      ariaLabel="Three local neighborhoods from the same liquid showing uneven local environments"
      aspectRatio={0.8}
      minHeight={250}
      maxHeight={320}
    >
      {({ width, height, innerWidth, innerHeight, margin, font }) => {
        const centerY = margin.top + innerHeight * 0.5;
        const visible = neighborhoods.slice(0, 3);
        const spacing = innerWidth / 3;
        const startX = margin.left + spacing * 0.5;

        // Unique gradient IDs per instance
        const gradIds = visible.map((_, i) => `nu-shell-${i}`);

        return {
          svg: (
            <g>
              <defs>
                {visible.map((entry, i) => {
                  const t = (entry.meanWaterDistance - minDistance) / distanceSpan;
                  const density = entry.hydrationContacts / maxContacts;
                  return (
                    <radialGradient key={gradIds[i]} id={gradIds[i]}>
                      <stop offset="0%" stopColor={accentColor} stopOpacity={0.06 + density * 0.12} />
                      <stop offset={`${60 + t * 20}%`} stopColor={accentColor} stopOpacity={0.03 + density * 0.06} />
                      <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                    </radialGradient>
                  );
                })}
              </defs>

              {/* Horizontal axis connecting neighborhoods */}
              <line
                x1={startX - 8}
                y1={centerY}
                x2={startX + spacing * 2 + 8}
                y2={centerY}
                stroke={PLOT_COLORS.grid}
                strokeDasharray="4,4"
                strokeWidth={1}
              />

              {visible.map((entry, i) => {
                const cx = startX + i * spacing;
                const t = (entry.meanWaterDistance - minDistance) / distanceSpan;
                const shellRadius = 20 + t * 18;
                const density = entry.hydrationContacts / maxContacts;
                const isFirst = i === 0;
                const waters = waterPositions[i] ?? [];

                return (
                  <g key={`n-${i}`}>
                    {/* Filled shell gradient */}
                    <circle cx={cx} cy={centerY} r={shellRadius + 4} fill={`url(#${gradIds[i]})`} />
                    {/* Shell outline */}
                    <circle
                      cx={cx}
                      cy={centerY}
                      r={shellRadius}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth={1 + density * 0.8}
                      strokeDasharray="3,3"
                      opacity={isFirst ? 0.6 : 0.3}
                    />
                    {/* Water dots */}
                    {waters.map((w, wi) => (
                      <circle
                        key={`w-${wi}`}
                        cx={cx + w.x}
                        cy={centerY + w.y}
                        r={w.r}
                        fill={PLOT_COLORS.text}
                        opacity={0.5 + density * 0.3}
                      />
                    ))}
                    {/* Solute center */}
                    <circle
                      cx={cx}
                      cy={centerY}
                      r={4.5}
                      fill={isFirst ? "#f8fafc" : accentColor}
                      opacity={isFirst ? 0.95 : 0.75}
                    />
                    {/* Coordination number label below shell */}
                    <text
                      x={cx}
                      y={centerY + shellRadius + 16}
                      textAnchor="middle"
                      fill={PLOT_COLORS.text}
                      fontSize={font.tick}
                      opacity={0.78}
                    >
                      n={entry.hydrationContacts}
                    </text>
                  </g>
                );
              })}

              {/* Gradient arrow: compact → looser */}
              <defs>
                <linearGradient id="nu-arrow-grad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <rect
                x={startX}
                y={height - margin.bottom * 0.2 - 3}
                width={spacing * 2}
                height={2.5}
                rx={1.2}
                fill="url(#nu-arrow-grad)"
              />
            </g>
          ),
          overlays: [
            {
              x: width / 2,
              y: margin.top + font.annotation * 0.6,
              text: "same liquid, different local neighborhoods",
              align: "middle",
              color: accentColor,
              fontSize: font.annotation,
            },
            {
              x: startX,
              y: height - font.axisLabel * 0.6,
              text: "compact",
              align: "middle",
              color: PLOT_COLORS.text,
              fontSize: font.axisLabel,
            },
            {
              x: startX + spacing * 2,
              y: height - font.axisLabel * 0.6,
              text: "looser",
              align: "middle",
              color: PLOT_COLORS.text,
              fontSize: font.axisLabel,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
