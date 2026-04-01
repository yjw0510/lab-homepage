"use client";

import { useEffect, useState } from "react";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

interface ValidationEnergy {
  forceRms?: number;
  maxForceRms?: number;
  forceP95?: number;
  maxForceP95?: number;
  forceMax?: number;
  maxForceMax?: number;
  potentialEnergyKJMol?: number;
}

const FALLBACK: ValidationEnergy = {
  forceRms: 1050,
  maxForceRms: 1800,
  forceP95: 1800,
  maxForceP95: 2200,
  forceMax: 4600,
  maxForceMax: 8000,
  potentialEnergyKJMol: -210000,
};

export function MinimizationSummaryPlot({ progress, accentColor }: { progress: number; accentColor: string; rdfActiveRadius?: number }) {
  const [energy, setEnergy] = useState<ValidationEnergy>(FALLBACK);

  useEffect(() => {
    fetch("/data/multiscale/allatom/validation.json")
      .then((response) => response.json())
      .then((next) => {
        const parsed = next?.checks?.energy;
        if (parsed && typeof parsed === "object") setEnergy(parsed);
      })
      .catch(() => {});
  }, []);

  const bars = [
    {
      label: "RMS",
      value: energy.forceRms ?? FALLBACK.forceRms ?? 0,
      limit: energy.maxForceRms ?? FALLBACK.maxForceRms ?? 1,
    },
    {
      label: "P95",
      value: energy.forceP95 ?? FALLBACK.forceP95 ?? 0,
      limit: energy.maxForceP95 ?? FALLBACK.maxForceP95 ?? 1,
    },
    {
      label: "MAX",
      value: energy.forceMax ?? FALLBACK.forceMax ?? 0,
      limit: energy.maxForceMax ?? FALLBACK.maxForceMax ?? 1,
    },
  ];

  return (
    <PlotContainer ariaLabel="Geometry optimization summary using minimized force statistics and final potential energy">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const baseY = margin.top + innerHeight;
        const barWidth = innerWidth / 7;

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              {bars.map((bar, index) => {
                const ratio = Math.min(1, bar.value / Math.max(bar.limit, 1));
                const h = innerHeight * (0.15 + ratio * 0.75) * (0.35 + progress * 0.65);
                const x = innerWidth * 0.12 + index * innerWidth * 0.28;
                return (
                  <g key={bar.label}>
                    <rect x={x} y={innerHeight - h} width={barWidth} height={h} rx={12} fill={accentColor} opacity={0.72} />
                    <rect x={x} y={0} width={barWidth} height={innerHeight} rx={12} fill="none" stroke="white" strokeOpacity={0.08} />
                    <text x={x + barWidth / 2} y={innerHeight + 18} textAnchor="middle" fill={PLOT_COLORS.text} fontSize={font.tick}>
                      {bar.label}
                    </text>
                    <text x={x + barWidth / 2} y={innerHeight - h - 8} textAnchor="middle" fill={accentColor} fontSize={font.annotation}>
                      {Math.round(bar.value)}
                    </text>
                  </g>
                );
              })}
              <rect x={innerWidth * 0.66} y={innerHeight * 0.1} width={innerWidth * 0.25} height={innerHeight * 0.54} rx={16} fill="#0f172a" opacity={0.8} />
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth * 0.785,
              y: margin.top + innerHeight * 0.22,
              text: "minimized",
              align: "middle",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
            {
              x: margin.left + innerWidth * 0.785,
              y: margin.top + innerHeight * 0.34,
              text: "force metrics",
              align: "middle",
              color: accentColor,
              fontSize: font.tick,
            },
            {
              x: margin.left + innerWidth * 0.785,
              y: margin.top + innerHeight * 0.49,
              text: `${Math.round(energy.potentialEnergyKJMol ?? 0).toLocaleString()} kJ/mol`,
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
