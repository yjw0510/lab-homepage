"use client";

import { PLOT_COLORS, PlotContainer } from "./PlotContainer";

const HOMO_EV = -5.93;
const LUMO_EV = -0.8;
const GAP_EV = LUMO_EV - HOMO_EV;
const OCCUPIED = [-12.5, -11.2, -10.0, -8.8, -7.5, -6.8, HOMO_EV];
const UNOCCUPIED = [LUMO_EV, 0.5, 1.8, 3.2];

export function MOLevelPlot({ progress, accentColor }: { progress: number; accentColor: string }) {
  return (
    <PlotContainer ariaLabel="Molecular orbital energy-level diagram showing HOMO and LUMO">
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const yMin = -14;
        const yMax = 5;
        const yScale = (energy: number) => margin.top + innerHeight * (1 - (energy - yMin) / (yMax - yMin));
        const lineX1 = margin.left + innerWidth * 0.2;
        const lineX2 = margin.left + innerWidth * 0.8;
        const labelX = margin.left + innerWidth * 0.86;
        const homoY = yScale(HOMO_EV);
        const lumoY = yScale(LUMO_EV);

        return {
          svg: (
            <>
              <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              {OCCUPIED.slice(0, -1).map((energy, index) => (
                <line key={`occ-${index}`} x1={lineX1} y1={yScale(energy)} x2={lineX2} y2={yScale(energy)} stroke="var(--plot-dim)" strokeWidth={1.7} opacity={0.5} />
              ))}
              {UNOCCUPIED.slice(1).map((energy, index) => (
                <line key={`unocc-${index}`} x1={lineX1} y1={yScale(energy)} x2={lineX2} y2={yScale(energy)} stroke="var(--plot-dim)" strokeWidth={1.5} opacity={0.35} />
              ))}
              <line x1={lineX1} y1={homoY} x2={lineX2} y2={homoY} stroke="#3b82f6" strokeWidth={2.8} />
              <line x1={lineX1} y1={lumoY} x2={lineX2} y2={lumoY} stroke="#ef4444" strokeWidth={2.8} />
              <line x1={lineX2 + 10} y1={homoY} x2={lineX2 + 10} y2={lumoY} stroke={accentColor} strokeWidth={1.3} />
              <line x1={lineX2 + 5} y1={homoY} x2={lineX2 + 15} y2={homoY} stroke={accentColor} strokeWidth={1.3} />
              <line x1={lineX2 + 5} y1={lumoY} x2={lineX2 + 15} y2={lumoY} stroke={accentColor} strokeWidth={1.3} />
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
              x: labelX,
              y: homoY,
              text: "HOMO",
              align: "start",
              color: "#60a5fa",
              fontSize: font.tick,
              className: "font-semibold",
            },
            {
              x: labelX,
              y: lumoY,
              text: "LUMO",
              align: "start",
              color: "#f87171",
              fontSize: font.tick,
              className: "font-semibold",
            },
            {
              x: margin.left + 8,
              y: homoY - 10,
              text: `${HOMO_EV.toFixed(2)} eV`,
              align: "start",
              color: "#60a5fa",
              fontSize: font.annotation,
            },
            {
              x: margin.left + 8,
              y: lumoY + 12,
              text: `${LUMO_EV.toFixed(2)} eV`,
              align: "start",
              color: "#f87171",
              fontSize: font.annotation,
            },
            {
              x: lineX2 + 18,
              y: (homoY + lumoY) / 2,
              text: `${GAP_EV.toFixed(1)} eV`,
              align: "start",
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
