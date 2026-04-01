"use client";

import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

const HOMO_EV = -5.93;
const LUMO_EV = -0.8;
const GAP_EV = LUMO_EV - HOMO_EV;

export function OrbitalGapPlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  return (
    <PlotContainer ariaLabel="HOMO-LUMO gap diagram">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const barWidth = innerWidth * 0.34;
        const homoX = margin.left + innerWidth * 0.16;
        const lumoX = margin.left + innerWidth * 0.56;
        const energyMin = -8;
        const energyMax = 1;
        const yScale = (energy: number) => margin.top + innerHeight * (1 - (energy - energyMin) / (energyMax - energyMin));
        const homoY = yScale(HOMO_EV);
        const lumoY = yScale(LUMO_EV);
        const zeroY = yScale(0);
        const barBottom = yScale(energyMin + 0.5);

        return {
          svg: (
            <>
              <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={margin.left} y1={zeroY} x2={margin.left + innerWidth} y2={zeroY} stroke={PLOT_COLORS.grid} strokeWidth={1.1} strokeDasharray="4,4" />
              <rect x={homoX} y={homoY} width={barWidth} height={barBottom - homoY} fill="#3b82f6" opacity={0.28} rx={6} />
              <rect x={lumoX} y={lumoY} width={barWidth} height={barBottom - lumoY} fill="#ef4444" opacity={0.18} rx={6} />
              <line x1={homoX} y1={homoY} x2={homoX + barWidth} y2={homoY} stroke="#3b82f6" strokeWidth={2.8} />
              <line x1={lumoX} y1={lumoY} x2={lumoX + barWidth} y2={lumoY} stroke="#ef4444" strokeWidth={2.8} />
              <line x1={homoX - 8} y1={homoY} x2={homoX - 8} y2={lumoY} stroke={accentColor} strokeWidth={1.4} />
              <line x1={homoX - 12} y1={homoY} x2={homoX - 4} y2={homoY} stroke={accentColor} strokeWidth={1.4} />
              <line x1={homoX - 12} y1={lumoY} x2={homoX - 4} y2={lumoY} stroke={accentColor} strokeWidth={1.4} />
            </>
          ),
          overlays: [
            {
              x: font.axisLabel,
              y: margin.top + innerHeight / 2,
              latex: "E\\,(\\mathrm{eV})",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left - 4,
              y: zeroY,
              text: "0",
              align: "end",
              color: PLOT_COLORS.text,
              fontSize: font.annotation,
            },
            {
              x: homoX + barWidth / 2,
              y: barBottom + font.tick * 1.15,
              text: "HOMO",
              align: "middle",
              color: "#60a5fa",
              fontSize: font.tick,
              className: "font-semibold",
            },
            {
              x: lumoX + barWidth / 2,
              y: barBottom + font.tick * 1.15,
              text: "LUMO",
              align: "middle",
              color: "#f87171",
              fontSize: font.tick,
              className: "font-semibold",
            },
            {
              x: homoX + barWidth / 2,
              y: homoY - 10,
              text: `${HOMO_EV.toFixed(2)} eV`,
              align: "middle",
              color: "#60a5fa",
              fontSize: font.annotation,
            },
            {
              x: lumoX + barWidth / 2,
              y: lumoY - 10,
              text: `${LUMO_EV.toFixed(2)} eV`,
              align: "middle",
              color: "#f87171",
              fontSize: font.annotation,
            },
            {
              x: homoX - 16,
              y: (homoY + lumoY) / 2,
              text: `${GAP_EV.toFixed(1)} eV`,
              align: "end",
              color: accentColor,
              fontSize: font.annotation,
              className: "font-semibold",
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
