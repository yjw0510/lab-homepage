"use client";

import { useEffect, useState } from "react";
import { scaleLinear } from "d3-scale";
import { withBasePath } from "@/lib/basePath";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

/**
 * One observable, as it comes out of the run: how often each coordination number turns up, and
 * where the mean sits among them.
 *
 * Subordinate to the canvas beside it, so it is drawn small and quiet. It is also the only
 * place the three colours the scene paints the ions with are named, which is why the bars carry
 * those colours rather than one neutral fill.
 *
 * Bars run horizontally. Upright, the 76 % column left more than half the panel as empty sky
 * above the 18 % and 5 % bars, and the mean annotation landed on top of the tallest bar's own
 * label. Lying down, the long bar is simply long.
 *
 * The mean is printed rather than drawn. On a count axis 3.83 falls five sixths of the way from
 * the third row to the fourth, so any rule at that position lies across the 76 % bar and its
 * label, which is where the upright version's collision reappeared.
 *
 * The three bands are labelled directly on the bars they belong to rather than in a legend
 * strip. The bands are contiguous blocks of rows, so their identity is spatially fixed and a
 * detached key only adds eye travel and a fourth row of text. No grid; the baseline the bars
 * start from is the only rule drawn.
 */

/**
 * Same thresholds and the same three colours the scene paints the ions with. `label` marks the
 * row each band's name is written on, which is the row carrying nearly all of that band. The
 * names are the intervals themselves, so they need no translating and read as the axis does.
 */
export const BANDS = [
  { max: 3, color: "#2dd4bf", label: 3, name: "≤ 3" },
  { max: 4, color: "#facc15", label: 4, name: "4" },
  { max: Infinity, color: "#f472d0", label: 5, name: "≥ 5" },
] as const;

const bandOf = (count: number) => BANDS.findIndex((band) => count <= band.max);

interface Coordination {
  criterionNm: number;
  mean: number;
  blockError: number;
  histogram: number[];
  ionFrames: number;
}

// Drawn if the asset has not arrived yet, from the same run, so the shape never jumps.
const FALLBACK: Coordination = {
  criterionNm: 0.28,
  mean: 3.83,
  blockError: 0.018,
  histogram: [308, 78, 367, 9379, 40032, 2601, 3, 0],
  ionFrames: 52768,
};

export function AllAtomCoordinationPlot({
  accentColor,
  lang = "en",
}: {
  accentColor: string;
  lang?: string;
}) {
  const [data, setData] = useState<Coordination>(FALLBACK);

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/allatom/electrolyte.json"))
      .then((response) => response.json())
      .then((next) => {
        const coordination = next?.coordination;
        if (Array.isArray(coordination?.histogram) && typeof coordination?.mean === "number") {
          setData(coordination as Coordination);
        }
      })
      .catch(() => {});
  }, []);

  const ko = lang === "ko";
  // Counts nobody ever reaches are not drawn: a row of empty slots is not a measurement.
  const last = data.histogram.reduce((high, value, index) => (value > 0 ? index : high), 0);
  const first = data.histogram.findIndex((value) => value > 0);
  const counts = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const share = (count: number) => (data.histogram[count] ?? 0) / Math.max(1, data.ionFrames);
  const widest = Math.max(...counts.map(share));

  return (
    <PlotContainer
      ariaLabel={ko
        ? `이온별 배위수 분포. 평균 ${data.mean}, 오차 ${data.blockError.toFixed(2)}, 기준 카보닐 산소 ${data.criterionNm * 10} 옹스트롬`
        : `Distribution of per-ion coordination number. Mean ${data.mean}, error ${data.blockError.toFixed(2)}, criterion carbonyl O within ${data.criterionNm * 10} angstrom`}
      aspectRatio={0.46}
      minHeight={150}
      maxHeight={192}
    >
      {({ height, innerWidth, innerHeight, margin, font }) => {
        const rowHeight = innerHeight / counts.length;
        // Every label sits outside its bar, so the right gutter is measured from the longest one
        // rather than guessed. Set by a fixed multiple it was too narrow, and the label for the
        // 76 % bar had to be pushed inside it, where it read as a different kind of annotation
        // from the others and crowded the bar's own end.
        const labelFor = (count: number) => {
          const value = share(count);
          const band = BANDS[bandOf(count)];
          const name = band.label === count ? band.name : null;
          return [value >= 0.01 ? `${Math.round(value * 100)}%` : null, name].filter(Boolean).join("  ");
        };
        // Hangul occupies a full em, latin and digits roughly half of one.
        const textWidth = (text: string) => [...text]
          .reduce((sum, glyph) => sum + (/[\u3131-\uD79D]/.test(glyph) ? 1 : 0.55), 0) * font.tick;
        const gutterLeft = font.tick * 1.4;
        const gutterRight = Math.max(...counts.map((c) => textWidth(labelFor(c)))) + font.tick * 0.9;
        const x = scaleLinear().domain([0, widest]).range([0, innerWidth - gutterLeft - gutterRight]);
        const y = (count: number) => (count - counts[0] + 0.5) * rowHeight;
        const barHeight = rowHeight * 0.6;
        return {
          svg: (
            <g transform={`translate(${margin.left},${margin.top})`}>
              {counts.map((count) => {
                const value = share(count);
                const band = BANDS[bandOf(count)];
                const width = Math.max(1.5, x(value));
                const label = labelFor(count);
                return (
                  <g key={count}>
                    <text x={gutterLeft - font.tick * 0.55} y={y(count) + font.tick * 0.36}
                          textAnchor="end" fontSize={font.tick} fill={PLOT_COLORS.text} opacity={0.75}>
                      {count}
                    </text>
                    <rect x={gutterLeft} y={y(count) - barHeight / 2} width={width}
                          height={barHeight} fill={band.color} opacity={0.92} />
                    {label ? (
                      <text x={gutterLeft + width + font.tick * 0.45} y={y(count) + font.tick * 0.36}
                            fontSize={font.tick} fill={PLOT_COLORS.text} opacity={0.85}>
                        {label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {/* The only rule on the panel: what the bars are measured from. */}
              <line x1={gutterLeft} y1={0} x2={gutterLeft} y2={innerHeight}
                    stroke={PLOT_COLORS.axis} strokeWidth={1} />
            </g>
          ),
          overlays: [
            {
              x: margin.left,
              y: margin.top - font.annotation * 0.45,
              text: `${ko ? "평균" : "mean"} ${data.mean} ± ${data.blockError.toFixed(2)}`,
              align: "start" as const,
              color: accentColor,
              fontSize: font.annotation,
            },
            // One line, and it does not repeat the criterion the provenance block above states.
            {
              x: margin.left,
              y: height - font.annotation * 0.45,
              text: ko
                ? `이온 68개 · 이온·프레임 ${data.ionFrames.toLocaleString("ko-KR")}개`
                : `68 ions · ${data.ionFrames.toLocaleString("en-US")} ion-frames`,
              align: "start" as const,
              color: PLOT_COLORS.axisLabel,
              fontSize: font.annotation,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
