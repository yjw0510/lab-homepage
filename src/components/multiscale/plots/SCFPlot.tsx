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

/**
 * Shown for the frame or two before scf.json arrives, and permanently if that fetch fails.
 *
 * Sampled from the real run. The previous constant was an older 13-point curve numbered from 0
 * with a largest delta of 2.417, so on a fetch failure this drew a converged-looking trace that
 * contradicted the comment forty lines below asserting the run reaches 1275.84 Ha.
 */
const FALLBACK: ScfData = {
  deltaE: [1275.8398222322, 1275.8398222322, 380.8553959527, 151.0666257163, 77.1386560472, 54.5315939654, 26.8227314605, 8.817025638, 1.3175500041, 2.262e-07, 1.6e-09],
  trajectory: [
    { iteration: 1, deltaE: 1275.8398222322 },
    { iteration: 2, deltaE: 1275.8398222322 },
    { iteration: 4, deltaE: 380.8553959527 },
    { iteration: 6, deltaE: 151.0666257163 },
    { iteration: 8, deltaE: 77.1386560472 },
    { iteration: 10, deltaE: 54.5315939654 },
    { iteration: 14, deltaE: 26.8227314605 },
    { iteration: 20, deltaE: 8.817025638 },
    { iteration: 30, deltaE: 1.3175500041 },
    { iteration: 45, deltaE: 2.262e-07 },
    { iteration: 59, deltaE: 1.6e-09 },
  ],
  threshold: 1e-5,
};

export function SCFPlot({
  progress,
  accentColor,
  activeIndexOverride,
  lang = "en",
}: {
  progress: number;
  accentColor: string;
  activeIndexOverride?: number;
  lang?: string;
}) {
  const ko = lang === "ko";
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
    <PlotContainer ariaLabel={ko ? "전자 밀도를 다시 계산할수록 줄어드는 에너지 변화" : "Energy change decreasing as the electron density is recalculated"}>
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const chart = (data.trajectory?.length ? data.trajectory : data.deltaE.map((deltaE, index) => ({
          iteration: index + 1,
          deltaE,
        }))).map((point) => ({
          iteration: point.iteration,
          deltaE: Math.max(1e-12, point.deltaE),
        }));
        const xScale = scaleLinear().domain([1, chart.length]).range([0, innerWidth]);
        // The top of the axis comes from the data, not a constant. Held at 10 it cut the run's
        // first decades off the chart: scf.json reaches 1275.84 Ha and 19 of its 59 points are
        // above 10, so scaleLog mapped them to negative y and the viewBox clipped them away —
        // exactly the "one large early excursion" the step's own prose points at. The floor
        // stays fixed because the low end is already clamped at 1e-12 above.
        const yScale = scaleLog()
          .domain([1e-10, Math.max(10, ...chart.map((point) => point.deltaE))])
          .range([innerHeight, 0]);
        const path = line<{ iteration: number; deltaE: number }>()
          .x((_, index) => xScale(index + 1))
          .y((d) => yScale(d.deltaE))(chart) || "";
        const thresholdY = yScale(data.threshold);
        const activeX = xScale(activeIndex + 1);

        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={PLOT_COLORS.axis} strokeWidth={1.3} />
              <line x1={0} y1={thresholdY} x2={innerWidth} y2={thresholdY} stroke="#ef4444" strokeWidth={1.1} strokeDasharray="5,4" opacity={0.55} />
              <line x1={activeX} y1={0} x2={activeX} y2={innerHeight} stroke={accentColor} strokeOpacity={0.33} strokeWidth={1.1} strokeDasharray="4,4" />
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
                {ko ? "현재" : "current"}
              </text>
            </g>
          ),
          overlays: [
            {
              x: margin.left + innerWidth / 2,
              y: height - font.axisLabel * 0.8,
              text: ko ? "반복 계산" : "Repeated calculation",
              align: "middle",
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: font.axisLabel * 0.95,
              y: margin.top + innerHeight / 2,
              text: ko ? "에너지 변화" : "Energy change",
              align: "middle",
              rotate: -90,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.axisLabel,
            },
            {
              x: margin.left + innerWidth + 6,
              y: margin.top + thresholdY,
              text: ko ? "종료 기준" : "target",
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
