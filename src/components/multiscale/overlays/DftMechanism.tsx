"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useMeasuredBox } from "../useMeasuredBox";
import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { withBasePath } from "@/lib/basePath";
import {
  MechanismHeader,
  MechanismPanel,
} from "../MechanismPanel";
import {
  MULTISCALE_MOTION,
  MULTISCALE_PANEL,
  MULTISCALE_TYPE,
} from "../visualRules";

export type DftOutputMode = "density" | "homo" | "lumo";
export type DftSceneKey = "D4_scf" | "D6_outputs";

export interface DftMechanismData {
  homoEV?: number;
  lumoEV?: number;
  outputMode?: DftOutputMode;
  onOutputModeChange?: (mode: DftOutputMode) => void;
  scfSnapshot?: {
    index: number;
  };
}

const DftMechanismDataContext = createContext<DftMechanismData>({});

export function DftMechanismDataProvider({
  value,
  children,
}: {
  value: DftMechanismData;
  children: ReactNode;
}) {
  return (
    <DftMechanismDataContext.Provider value={value}>
      {children}
    </DftMechanismDataContext.Provider>
  );
}

function useDftMechanismData() {
  return useContext(DftMechanismDataContext);
}

function MathNotation({
  latex,
  className = "",
  display = false,
}: {
  latex: string;
  className?: string;
  display?: boolean;
}) {
  const html = katex.renderToString(latex, {
    displayMode: display,
    output: "htmlAndMathml",
    strict: "ignore",
    throwOnError: false,
  });

  return (
    <span
      className={`dft-math ${display ? "block" : "inline-block"} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface ScfConvergenceData {
  trajectory: Array<{ iteration: number; deltaE: number }>;
  threshold: number;
}

/**
 * Shown for the frame or two before scf.json arrives, and permanently if that fetch fails.
 *
 * Sampled from the real run rather than an older one. The previous constant ran 0..14 with a
 * largest delta of 0.588, so on a fetch failure the panel drew a converged-looking curve under
 * a heading reading "Actual energy convergence", and every window and denominator derived from
 * it was wrong by two orders of magnitude.
 */
const SCF_FALLBACK: ScfConvergenceData = {
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
    { iteration: 45, deltaE: 2.262e-7 },
    { iteration: 59, deltaE: 1.6e-9 },
  ],
  threshold: 1e-5,
};

function D4Scf({
  lang,
  isMobile,
}: {
  lang: string;
  isMobile: boolean;
}) {
  const ko = lang === "ko";
  const data = useDftMechanismData();
  const snapshot = data.scfSnapshot;
  const [scf, setScf] = useState<ScfConvergenceData>(SCF_FALLBACK);

  useEffect(() => {
    fetch(withBasePath("/data/multiscale/dft/scf.json"))
      .then((response) => response.json())
      .then((next) => {
        if (
          Array.isArray(next?.trajectory) &&
          typeof next?.threshold === "number"
        ) {
          setScf({
            trajectory: next.trajectory,
            threshold: next.threshold,
          });
        }
      })
      .catch(() => {});
  }, []);

  const activeIndex = Math.max(
    0,
    Math.min(snapshot?.index ?? 0, scf.trajectory.length - 1),
  );
  const activePoint = scf.trajectory[activeIndex] ?? scf.trajectory[0];
  // The chart draws in its own pixel box, so fontSize="12" reaches the reader as twelve
  // real pixels whatever the host width is. Under the old fixed 520x180 viewBox the
  // mobile host measured 184x136, scaled the whole drawing to 0.354, and painted the
  // decade labels at 4.25px while getComputedStyle still reported 12.
  const [chartSvgRef, chartBox] = useMeasuredBox<SVGSVGElement>({ width: 520, height: 180 });

  const chartLeft = 46;
  const chartRight = Math.max(chartLeft + 60, chartBox.width - 18);
  const chartTop = 16;
  const chartBottom = Math.max(chartTop + 60, chartBox.height - 30);
  // The window is read off the run, not fixed at 10^0. Held there, 32 of the 59 iterations sat
  // at or above 1 Ha and drew as one flat line along the top gridline, while the readout beside
  // it printed 1275.840 Ha for a dot on the 1 Ha row. The 0/-10 window fitted SCF_FALLBACK,
  // whose largest delta is 0.588.
  const logMax = Math.max(0, Math.ceil(Math.log10(
    Math.max(...scf.trajectory.map((point) => point.deltaE), 1))));
  const logMin = -10;
  // One label every two decades, as before, but generated so the rows follow the window.
  const decades = [];
  for (let exponent = logMax; exponent >= logMin; exponent -= 2) decades.push(exponent);
  const pointCoordinates = scf.trajectory.map((point, index) => {
    const x =
      chartLeft +
      (index / Math.max(1, scf.trajectory.length - 1)) *
        (chartRight - chartLeft);
    const logValue = Math.max(logMin, Math.min(logMax, Math.log10(point.deltaE)));
    const y =
      chartTop +
      ((logMax - logValue) / (logMax - logMin)) * (chartBottom - chartTop);
    return { ...point, x, y };
  });
  const thresholdLog = Math.log10(scf.threshold);
  const thresholdY =
    chartTop +
    ((logMax - thresholdLog) / (logMax - logMin)) *
      (chartBottom - chartTop);
  const activeCoordinate = pointCoordinates[activeIndex] ?? pointCoordinates[0];
  const activeDelta = activePoint?.deltaE ?? 0;
  const converged = activeDelta < scf.threshold;
  const convergenceChart = (
    <svg
      ref={chartSvgRef}
      viewBox={`0 0 ${chartBox.width} ${chartBox.height}`}
      className="h-full w-full"
      role="img"
      aria-label={
        ko
          ? "전자 밀도를 반복 계산하면서 줄어드는 에너지 변화"
          : "Energy change shrinking as the electron density is recalculated"
      }
    >
      {decades.map((exponent) => {
        const y =
          chartTop +
          ((logMax - exponent) / (logMax - logMin)) *
            (chartBottom - chartTop);
        return (
          <g key={exponent}>
            <line
              x1={chartLeft}
              y1={y}
              x2={chartRight}
              y2={y}
              stroke="var(--plot-grid)"
              strokeOpacity="0.55"
            />
          </g>
        );
      })}
      <line
        x1={chartLeft}
        y1={thresholdY}
        x2={chartRight}
        y2={thresholdY}
        stroke="rgba(251,191,36,.82)"
        strokeWidth="1.5"
        strokeDasharray="7 6"
      />
      {/* Left-anchored. Right-anchored it sat exactly where the trace plunges, so the amber
          polyline ran through the label and a data marker landed on the glyphs — in Korean it
          erased 수 from 수렴 기준. The left half of the threshold row is empty. */}
      <text
        x={chartLeft + 8}
        y={thresholdY - 7}
        textAnchor="start"
        fill="var(--sch-amber-label)"
        fontSize="12"
      >
        {ko ? "계산 종료 기준" : "stopping target"}
      </text>
      <polyline
        points={pointCoordinates.map(({ x, y }) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="rgba(251,191,36,.22)"
        strokeWidth="3"
      />
      <polyline
        points={pointCoordinates
          .slice(0, activeIndex + 1)
          .map(({ x, y }) => `${x},${y}`)
          .join(" ")}
        fill="none"
        stroke="#fbbf24"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pointCoordinates.map((point, index) => (
        <circle
          key={`${point.iteration}-${index}`}
          cx={point.x}
          cy={point.y}
          r={index === activeIndex ? 6 : 3}
          fill={index <= activeIndex ? "var(--sch-amber-bright)" : "var(--plot-dim)"}
          stroke={index === activeIndex ? "var(--sch-ink)" : "none"}
          strokeWidth="2"
        />
      ))}
      <text
        x={activeCoordinate.x}
        y={chartBottom + 20}
        textAnchor="middle"
        fill="var(--plot-label)"
        fontSize="13"
        fontWeight="600"
      >
        {ko ? "현재" : "current"}
      </text>
    </svg>
  );

  if (isMobile) {
    return (
      <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.mobileBand}`}>
        <div className="flex items-start justify-between gap-4 border-b border-lv-dft-line bg-lv-dft-wash px-4 py-3">
          <div>
            <p className="text-base font-semibold text-lv-dft-text">
              {ko ? "같은 전자 밀도가 나올 때까지 다시 계산한다" : "Recalculate until the density stops changing"}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {ko
                ? "반복할수록 밀도가 덜 움직인다."
                : "Each pass moves the density a little less."}
            </p>
          </div>
          <p className="type-quiet shrink-0 text-sm font-semibold text-foreground">
            {converged ? (ko ? "기준 도달" : "target reached") : ko ? "계산 중" : "calculating"}
          </p>
        </div>

        {/* The readout sits above the chart rather than beside it. Sharing the row left
            the plot 184px for the run's 59-point log curve, which is both too tight to read the
            curve and the reason its labels were painting at 4.25px. */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {ko ? "에너지 변화" : "Energy change"}
              <span className="ml-2 text-base font-semibold text-lv-dft-text">
                {converged ? (ko ? "작음" : "small") : ko ? "차이 큼" : "large difference"}
              </span>
            </p>
            <p className={`text-sm font-semibold ${converged ? "text-lv-dft-text" : "text-muted-foreground"}`}>
              {converged
                ? ko
                  ? "수렴"
                  : "converged"
                : ko
                  ? "계산 중"
                  : "iterating"}
            </p>
          </div>
          <div className="mt-2 h-[8.5rem]">{convergenceChart}</div>
        </div>

        <div className="px-4 py-3">
          <p className="text-center text-base font-semibold text-foreground">
            {ko ? "추정한 밀도 → 새 밀도 계산 → 두 값 비교" : "trial density → calculate a new density → compare"}
          </p>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {ko
              ? "새 결과가 이전 추정과 충분히 가까워지면 반복을 끝낸다."
              : "The loop ends when the new result is close enough to the previous estimate."}
          </p>
        </div>
      </MechanismPanel>
    );
  }

  return (
    <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.desktopOverlay}`}>
      <MechanismHeader
        tone="sky"
        title={
          ko
            ? "같은 전자 밀도가 나올 때까지 다시 계산한다"
            : "Recalculate until the density stops changing"
        }
        description={
          ko
            ? "반복할수록 이전 추정과 새 결과의 차이가 줄어든다."
            : "Each pass reduces the difference between the previous estimate and the new result."
        }
        aside={
          <span className={MULTISCALE_TYPE.description}>
            {converged ? (ko ? "기준 도달" : "TARGET REACHED") : ko ? "계산 중" : "CALCULATING"}
          </span>
        }
      />

      <div className="grid gap-px bg-border p-px lg:grid-cols-[minmax(24rem,1.08fr)_minmax(23rem,.92fr)]">
        <section className="bg-surface-sunken px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-foreground">
                {ko ? "반복에 따른 에너지 변화" : "Energy change during iteration"}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {ko ? "아래로 갈수록 변화가 작다" : "Lower on the chart means a smaller change"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{ko ? "현재 상태" : "Current state"}</p>
              <p className="mt-1 text-base font-semibold text-lv-dft-text">
                {converged ? (ko ? "차이가 작음" : "small difference") : ko ? "차이가 남음" : "difference remains"}
              </p>
            </div>
          </div>
          <div className="mt-2 h-[10.5rem]">{convergenceChart}</div>
        </section>

        <section className="flex flex-col justify-between bg-surface-sunken px-5 py-4">
          <div>
            <p className="text-base font-semibold text-foreground">
              {ko ? "전자 밀도 한 번 갱신" : "One density update"}
            </p>
            <p className="mt-5 text-center text-lg font-semibold text-foreground">
              {ko ? "추정한 밀도 → 새 밀도 계산" : "trial density → calculate a new density"}
            </p>
            <div className="mt-5 border-t border-lv-dft-line pt-4">
              <p className="text-base font-semibold text-lv-dft-text">
                {ko ? "이전 추정과 새 결과를 비교한다" : "Compare the previous estimate with the new result"}
              </p>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {ko
                  ? "두 값의 차이가 충분히 작아질 때까지 계산을 반복한다."
                  : "The calculation repeats until the two distributions are close enough."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">
              {converged
                ? ko
                  ? "새 결과가 이전 추정과 충분히 가까워 계산을 끝낸다."
                  : "The new result is close enough to the previous estimate, so the calculation stops."
                : ko
                  ? "두 결과의 차이가 수렴 기준보다 커 계산을 반복한다."
                  : "The two results still differ, so the calculation continues."}
            </p>
            <span className={`ml-4 shrink-0 text-sm font-semibold ${converged ? "text-lv-dft-text" : "text-muted-foreground"}`}>
              {converged ? (ko ? "수렴" : "CONVERGED") : ko ? "반복 중" : "ITERATING"}
            </span>
          </div>
        </section>
      </div>
    </MechanismPanel>
  );
}

function D6Outputs({ lang, isMobile }: { lang: string; isMobile: boolean }) {
  const ko = lang === "ko";
  const data = useDftMechanismData();
  const mode = data.outputMode ?? "density";
  const hasOrbitalLevels =
    typeof data.homoEV === "number" && typeof data.lumoEV === "number";
  const rows = [
    {
      id: "density" as const,
      label: ko ? "전자 밀도" : "electron density",
      symbol: String.raw`\rho(\mathbf r)`,
      value: ko ? "전자가 공간에 분포하는 위치" : "Where electrons are distributed in space",
    },
    {
      id: "homo" as const,
      label: "HOMO",
      symbol: String.raw`\phi_{\mathrm H}`,
      value: ko ? "전자가 차 있는 가장 높은 오비탈" : "The highest orbital occupied by electrons",
    },
    {
      id: "lumo" as const,
      label: "LUMO",
      symbol: String.raw`\phi_{\mathrm L}`,
      value: ko ? "전자가 비어 있는 가장 낮은 오비탈" : "The lowest unoccupied orbital",
    },
  ];
  const activeRow = rows.find((row) => row.id === mode) ?? rows[0];

  // The in-diagram density caption only fits the wide desktop box; the mobile
  // 10.5rem column shows either the caption or the level diagram, never both.
  const renderEnergyLevels = (showDensityCaption: boolean) => (
    <div className="relative h-full min-h-[10rem]">
      <div className="absolute inset-x-0 top-[18%] border-t border-border-strong">
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className={`text-base font-semibold ${mode === "lumo" ? "text-lv-dft" : "text-muted-foreground"}`}>LUMO</span>
          <span className={`text-sm ${mode === "lumo" ? "text-lv-dft" : "text-muted-foreground"}`}>
            {ko ? "높은 에너지" : "higher energy"}
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[18%] border-t border-border-strong">
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className={`text-base font-semibold ${mode === "homo" ? "text-lv-dft" : "text-muted-foreground"}`}>HOMO</span>
          <span className={`text-sm ${mode === "homo" ? "text-lv-dft" : "text-muted-foreground"}`}>
            {ko ? "낮은 에너지" : "lower energy"}
          </span>
        </div>
      </div>
      {hasOrbitalLevels ? (
        <div className="absolute bottom-[31%] right-2 top-[31%] flex w-24 items-center justify-end border-y border-r border-lv-dft-line pr-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{ko ? "오비탈 간격" : "orbital gap"}</p>
            <p className="mt-1 text-sm font-semibold text-lv-dft">
              {ko ? "두 상태의 차이" : "separation between levels"}
            </p>
          </div>
        </div>
      ) : null}
      {mode === "density" && showDensityCaption ? (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 pr-28 text-sm leading-5 text-muted-foreground">
          {ko
            ? "전자 밀도는 점유 오비탈 전체가 만든 공간 분포이며 여러 준위의 기여를 함께 담는다."
            : "Electron density is the combined spatial distribution of every occupied orbital."}
        </p>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.mobileBand}`}>
        <div className="border-b border-lv-dft-line bg-lv-dft-wash px-4 py-3">
          <p className="text-base font-semibold text-lv-dft">
            {ko ? "같은 계산에서 서로 다른 정보를 읽는다" : "Read different information from the same calculation"}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {ko
              ? "밀도는 전하가 고인 곳을, HOMO와 LUMO는 그 전하가 먼저 움직이는 곳을 보여 준다."
              : "The density shows where charge has collected; HOMO and LUMO show where it moves first."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border p-px">
          {rows.map((row) => (
            <button
              type="button"
              key={row.id}
              className={`pointer-events-auto px-3 py-3 text-left ${MULTISCALE_MOTION.stateTransition} ${mode === row.id ? "bg-lv-dft-wash opacity-100" : "bg-surface-sunken opacity-40"}`}
              onMouseEnter={() => data.onOutputModeChange?.(row.id)}
              onFocus={() => data.onOutputModeChange?.(row.id)}
              onClick={() => data.onOutputModeChange?.(row.id)}
            >
              <MathNotation
                latex={row.symbol}
                className={`text-xl ${mode === row.id ? "text-lv-dft" : "text-muted-foreground"}`}
              />
              <p className="mt-2 text-sm font-semibold text-foreground">{row.label}</p>
            </button>
          ))}
        </div>
        {/* The right column is capped rather than fixed. At 10.5rem flat it doubled
            under a 200% text-resize setting and, with the gap and padding, exceeded a
            390px viewport on its own, clipping the density explanation by 35px. It
            still takes its full width whenever there is room for it. */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,10.5rem)] gap-4 px-4 py-3">
          <div>
            <MathNotation latex={activeRow.symbol} className="text-3xl text-lv-dft" />
            <h4 className="mt-2 text-lg font-semibold text-foreground">{activeRow.label}</h4>
            <p className="mt-2 text-sm leading-5 text-foreground">{activeRow.value}</p>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              {mode === "density"
                ? ko
                  ? "분자의 크기와 결합 주변의 전자 분포를 본다."
                  : "Shows molecular extent and electron distribution around bonds."
                : mode === "homo"
                  ? ko
                    ? "전자를 잃는 과정과 관련된 출발점을 찾을 때 본다."
                    : "A first orbital to inspect when considering electron removal."
                  : ko
                    ? "전자를 받는 과정과 관련된 도착점을 찾을 때 본다."
                    : "A first orbital to inspect when considering electron addition."}
            </p>
          </div>
          <div>
            {mode === "density" ? (
              <p className="text-sm leading-5 text-muted-foreground">
                {ko
                  ? "전자 밀도는 점유 오비탈 전체가 만든 공간 분포이며 여러 준위의 기여를 함께 담는다."
                  : "Electron density is the combined spatial distribution of every occupied orbital."}
              </p>
            ) : (
              renderEnergyLevels(false)
            )}
          </div>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-sm leading-5 text-muted-foreground">
          {ko
            ? "표시한 오비탈 간격은 채워진 준위와 빈 준위의 관계를 정성적으로 비교하는 계산값이다."
            : "The displayed orbital gap is a calculated value for qualitative comparison of filled and empty boundary levels."}
        </p>
      </MechanismPanel>
    );
  }

  return (
    <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.desktopOverlay}`}>
      <MechanismHeader
        tone="sky"
        title={
          ko
            ? "같은 계산에서 서로 다른 정보를 읽는다"
            : "Read different information from the same calculation"
        }
        description={
          ko
            ? "밀도는 전하가 고인 곳을, HOMO와 LUMO는 그 전하가 먼저 움직이는 곳을 보여 준다."
            : "The density shows where charge has collected; HOMO and LUMO show where it moves first."
        }
        aside={
          <p className={MULTISCALE_TYPE.description}>{ko ? "양자 계산" : "QUANTUM CALCULATION"}</p>
        }
      />

      <div className="grid gap-px bg-border p-px lg:grid-cols-[minmax(30rem,1.15fr)_minmax(20rem,.85fr)]">
        <section className="bg-surface-sunken">
          <div className="grid grid-cols-3 gap-px bg-border p-px">
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                className={`pointer-events-auto px-4 py-3 text-left ${MULTISCALE_MOTION.stateTransition} ${mode === row.id ? "bg-lv-dft-wash opacity-100" : "bg-surface-sunken opacity-38"}`}
                onMouseEnter={() => data.onOutputModeChange?.(row.id)}
                onFocus={() => data.onOutputModeChange?.(row.id)}
                onClick={() => data.onOutputModeChange?.(row.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <MathNotation
                    latex={row.symbol}
                    className={`text-2xl ${mode === row.id ? "text-lv-dft" : "text-muted-foreground"}`}
                  />
                  <span className={`h-px w-8 ${mode === row.id ? "bg-lv-dft" : "bg-border-strong"}`} />
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">{row.label}</p>
              </button>
            ))}
          </div>

          <div className="grid min-h-[11.5rem] grid-cols-[9rem_minmax(0,1fr)] gap-5 px-5 py-4">
            <div>
              <MathNotation latex={activeRow.symbol} className="text-4xl text-lv-dft" />
              <p className="mt-3 text-base font-semibold text-foreground">{activeRow.label}</p>
            </div>
            <div>
              <p className="text-lg font-semibold leading-7 text-foreground">{activeRow.value}</p>
              <p className="mt-3 text-base leading-6 text-muted-foreground">
                {mode === "density"
                  ? ko
                    ? "분자의 크기와 결합 주변에 전자가 어떻게 퍼져 있는지 본다."
                    : "Shows molecular extent and how electrons are distributed around bonds."
                  : mode === "homo"
                    ? ko
                      ? "전자를 잃는 과정과 관련된 출발점을 찾을 때 먼저 살펴보는 오비탈이다."
                      : "The first orbital to inspect when considering where electron removal begins."
                    : ko
                      ? "전자를 받는 과정과 관련된 도착점을 찾을 때 먼저 살펴보는 오비탈이다."
                      : "The first orbital to inspect when considering where electron addition occurs."}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface-sunken px-5 py-4">
          <h4 className="text-base font-semibold text-foreground">
            {ko ? "경계 오비탈 에너지" : "Frontier-orbital energies"}
          </h4>
          <div className="mt-3 h-[12.5rem]">{renderEnergyLevels(true)}</div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-5 border-t border-border px-5 py-3">
        <p className="text-sm leading-5 text-muted-foreground">
          {ko
            ? "표시한 오비탈 간격은 채워진 준위와 빈 준위의 관계를 정성적으로 비교하는 계산값이다."
            : "The displayed orbital gap is a calculated value for qualitative comparison of filled and empty boundary levels."}
        </p>
        <span className="shrink-0 text-sm font-semibold text-lv-dft">
          {mode === "density" ? (ko ? "전자 밀도" : "DENSITY") : mode.toUpperCase()}
        </span>
      </div>
    </MechanismPanel>
  );
}

const SCENE_ARIA: Record<DftSceneKey, { en: string; ko: string }> = {
  D4_scf: {
    en: "Repeated electron-density calculation shown at the same step as the density on screen.",
    ko: "화면의 전자 밀도와 같은 단계에 맞춘 반복 계산 과정.",
  },
  D6_outputs: {
    en: "Calculated electron density, HOMO, and LUMO shown as complementary views of one electronic state.",
    ko: "하나의 전자 상태를 서로 다른 방식으로 보여 주는 전자 밀도와 HOMO, LUMO.",
  },
};

export function DftMechanism({
  sceneKey,
  lang,
  reducedMotion = false,
  isMobile = false,
}: {
  sceneKey: DftSceneKey;
  lang: string;
  reducedMotion?: boolean;
  isMobile?: boolean;
}) {
  const aria = SCENE_ARIA[sceneKey]?.[lang === "ko" ? "ko" : "en"] ?? "";

  return (
    <div
      key={sceneKey}
      className={`dft-mechanism z-[2] ${isMobile ? "relative" : "pointer-events-none absolute inset-0 overflow-hidden"} ${
        reducedMotion ? "dft-reduced" : ""
      }`}
      role="img"
      aria-label={aria}
    >
      {sceneKey === "D4_scf" ? <D4Scf lang={lang} isMobile={isMobile} /> : null}
      {sceneKey === "D6_outputs" ? <D6Outputs lang={lang} isMobile={isMobile} /> : null}

      <style>{`
        .dft-mechanism .dft-enter {
          animation: dft-mechanism-enter 520ms var(--ease-ledger) both;
        }
        .dft-mechanism .dft-math .katex {
          font-size: 1em;
        }
        .dft-mechanism .dft-math .katex-display {
          margin: 0;
        }
        @keyframes dft-mechanism-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dft-mechanism.dft-reduced *,
        .dft-mechanism.dft-reduced *::before,
        .dft-mechanism.dft-reduced *::after {
          animation: none !important;
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .dft-mechanism *,
          .dft-mechanism *::before,
          .dft-mechanism *::after {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
