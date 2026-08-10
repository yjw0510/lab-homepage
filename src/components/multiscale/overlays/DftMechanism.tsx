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

/** Decade exponent as a superscript, so the axis rows can be generated rather than listed. */
function supers(exponent: number) {
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const body = String(Math.abs(exponent)).split("").map((d) => digits[Number(d)]).join("");
  return exponent < 0 ? `⁻${body}` : body;
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
  // The denominator comes from the same array as the numerator. Hardcoded at 14 it read
  // "22 / 14" and ended the run at "59 / 14".
  const totalIterations = scf.trajectory.at(-1)?.iteration ?? scf.trajectory.length;
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
  const deltaLabel =
    activeDelta >= 0.01
      ? activeDelta.toFixed(3)
      : activeDelta.toExponential(1);

  const convergenceChart = (
    <svg
      ref={chartSvgRef}
      viewBox={`0 0 ${chartBox.width} ${chartBox.height}`}
      className="h-full w-full"
      role="img"
      aria-label={
        ko
          ? "실제 SCF 반복에 따른 에너지 변화 감소"
          : "Actual energy change across SCF iterations"
      }
    >
      {decades.map((exponent) => {
        const label = `10${supers(exponent)}`;
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
            <text
              x={chartLeft - 8}
              y={y + 4}
              textAnchor="end"
              fill="var(--plot-text)"
              fontSize="12"
            >
              {label}
            </text>
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
        {ko ? "수렴 기준 10⁻⁵ Ha" : "threshold 10⁻⁵ Ha"}
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
        {ko ? `반복 ${activePoint.iteration}` : `iteration ${activePoint.iteration}`}
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
          <p className="type-quiet shrink-0 text-2xl text-foreground">
            {activePoint.iteration}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {totalIterations}</span>
          </p>
        </div>

        {/* The readout sits above the chart rather than beside it. Sharing the row left
            the plot 184px for the run's 59-point log curve, which is both too tight to read the
            curve and the reason its labels were painting at 4.25px. */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              |ΔE|
              <span className="ml-2 text-xl font-semibold tabular-nums text-lv-dft-text">
                {deltaLabel}
              </span>
              <span className="ml-1">Ha</span>
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
          <MathNotation
            latex={String.raw`\rho_{\mathrm{in}}^{(n)}\rightarrow\hat H_{\mathrm{KS}}\rightarrow\{\phi_i^{(n)}\}\rightarrow\rho_{\mathrm{out}}^{(n)}\rightarrow\rho_{\mathrm{in}}^{(n+1)}`}
            className="block text-center text-[1.02rem] text-foreground"
          />
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {ko
              ? "새 밀도로 해밀토니안을 다시 만들며, 에너지 변화가 설정한 기준보다 작아지면 반복을 끝낸다."
              : "The new density rebuilds the Hamiltonian. The loop stops when the energy change falls below the chosen threshold."}
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
            ? "반복할수록 밀도가 덜 움직인다. 그 남은 움직임이 |ΔE|다."
            : "Each pass moves the density a little less. What is left of that motion is |ΔE|."
        }
        aside={
          <div className="flex items-baseline gap-3">
            <span className={MULTISCALE_TYPE.description}>
              {ko ? "SCF 반복" : "SCF iteration"}
            </span>
            <span className={MULTISCALE_TYPE.metric}>
              {String(activePoint.iteration).padStart(2, "0")}
            </span>
            <span className="text-base text-muted-foreground">/ {totalIterations}</span>
          </div>
        }
      />

      <div className="grid gap-px bg-border p-px lg:grid-cols-[minmax(24rem,1.08fr)_minmax(23rem,.92fr)]">
        <section className="bg-surface-sunken px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-foreground">
                {ko ? "실제 에너지 수렴" : "Actual energy convergence"}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {ko ? "세로축은 로그 눈금" : "Logarithmic vertical scale"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">|ΔE|</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-lv-dft-text">
                {deltaLabel} <span className="text-sm font-normal text-muted-foreground">Ha</span>
              </p>
            </div>
          </div>
          <div className="mt-2 h-[10.5rem]">{convergenceChart}</div>
        </section>

        <section className="flex flex-col justify-between bg-surface-sunken px-5 py-4">
          <div>
            <p className="text-base font-semibold text-foreground">
              {ko ? "한 번의 SCF 반복" : "One SCF iteration"}
            </p>
            <MathNotation
              latex={String.raw`\rho_{\mathrm{in}}^{(n)}\rightarrow\hat H_{\mathrm{KS}}[\rho_{\mathrm{in}}^{(n)}]\rightarrow\{\phi_i^{(n)}\}\rightarrow\rho_{\mathrm{out}}^{(n)}`}
              className="mt-5 block text-center text-[1.3rem] text-foreground"
            />
            <div className="mt-5 border-t border-lv-dft-line pt-4">
              <MathNotation
                latex={String.raw`\rho_{\mathrm{in}}^{(n+1)}\leftarrow\operatorname{mix}\!\left(\rho_{\mathrm{in}}^{(n)},\rho_{\mathrm{out}}^{(n)}\right)`}
                className="text-[1.15rem] text-lv-dft-text"
              />
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {ko
                  ? "새 밀도로 해밀토니안을 다시 만들고 다음 반복을 시작한다."
                  : "The updated density rebuilds the Hamiltonian for the next iteration."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">
              {converged
                ? ko
                  ? "|ΔE|가 10⁻⁵ Ha보다 작아져 계산을 종료한다."
                  : "|ΔE| is below 10⁻⁵ Ha, so the calculation stops."
                : ko
                  ? "|ΔE|가 아직 기준보다 크므로 다시 계산한다."
                  : "|ΔE| remains above the threshold, so the loop continues."}
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
  const gap =
    typeof data.homoEV === "number" && typeof data.lumoEV === "number"
      ? data.lumoEV - data.homoEV
      : undefined;
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
      value:
        typeof data.homoEV === "number"
          ? ko
            ? `${data.homoEV.toFixed(2)} eV · 가장 높은 점유 오비탈`
            : `${data.homoEV.toFixed(2)} eV · highest occupied orbital`
          : ko
            ? "값 불러오는 중"
            : "loading",
    },
    {
      id: "lumo" as const,
      label: "LUMO",
      symbol: String.raw`\phi_{\mathrm L}`,
      value:
        typeof data.lumoEV === "number"
          ? ko
            ? `${data.lumoEV.toFixed(2)} eV · 가장 낮은 비점유 오비탈`
            : `${data.lumoEV.toFixed(2)} eV · lowest unoccupied orbital`
          : ko
            ? "값 불러오는 중"
            : "loading",
    },
  ];
  const activeRow = rows.find((row) => row.id === mode) ?? rows[0];

  // The in-diagram density caption only fits the wide desktop box; the mobile
  // 10.5rem column shows either the caption or the level diagram, never both.
  const renderEnergyLevels = (showDensityCaption: boolean) => (
    <div className="relative h-full min-h-[10rem]">
      <div className="absolute inset-x-0 top-[18%] border-t border-border-strong">
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <MathNotation latex={String.raw`\varepsilon_{\mathrm L}`} className={`text-xl ${mode === "lumo" ? "text-lv-dft" : "text-muted-foreground"}`} />
          <span className={`text-base tabular-nums ${mode === "lumo" ? "text-lv-dft" : "text-muted-foreground"}`}>
            {typeof data.lumoEV === "number" ? `${data.lumoEV.toFixed(2)} eV` : "-"}
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[18%] border-t border-border-strong">
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <MathNotation latex={String.raw`\varepsilon_{\mathrm H}`} className={`text-xl ${mode === "homo" ? "text-lv-dft" : "text-muted-foreground"}`} />
          <span className={`text-base tabular-nums ${mode === "homo" ? "text-lv-dft" : "text-muted-foreground"}`}>
            {typeof data.homoEV === "number" ? `${data.homoEV.toFixed(2)} eV` : "-"}
          </span>
        </div>
      </div>
      {typeof gap === "number" ? (
        <div className="absolute bottom-[31%] right-2 top-[31%] flex w-24 items-center justify-end border-y border-r border-lv-dft-line pr-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{ko ? "KS 간격" : "KS gap"}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-lv-dft">
              {gap.toFixed(2)} eV
            </p>
          </div>
        </div>
      ) : null}
      {mode === "density" && showDensityCaption ? (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 pr-28 text-sm leading-5 text-muted-foreground">
          {ko
            ? "전자 밀도는 점유 오비탈 전부가 겹쳐 만든 공간 분포다. 준위 하나에 대응하지 않는다."
            : "Electron density is one spatial distribution built from every occupied orbital. It does not correspond to a single level."}
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
                  ? "전자 밀도는 점유 오비탈 전부가 겹쳐 만든 공간 분포다. 준위 하나에 대응하지 않는다."
                  : "Electron density is one spatial distribution built from every occupied orbital. It does not correspond to a single level."}
              </p>
            ) : (
              renderEnergyLevels(false)
            )}
          </div>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-sm leading-5 text-muted-foreground">
          {ko
            ? "이 간격이 넓을수록 전자를 내주거나 받기 어렵다. 다만 흡수 스펙트럼이 알려 주는 들뜸 에너지와 같은 값은 아니다."
            : "A wider gap means the molecule parts with an electron, or accepts one, less readily. It is not the excitation energy an absorption spectrum reports."}
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
          <p className={MULTISCALE_TYPE.description}>B3LYP / 6-31G*</p>
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
            ? "이 간격은 전자를 내주거나 받기가 얼마나 쉬운지를 가늠하게 한다. 바닥상태 Kohn-Sham 오비탈의 차이이므로 흡수 스펙트럼의 들뜸 에너지로 바로 옮겨 읽지는 않는다."
            : "The gap gauges how readily the molecule parts with an electron or accepts one. It is a ground-state Kohn-Sham orbital difference, so it is not read straight across to an absorption spectrum's excitation energy."}
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
    en: "SCF cycle sitting at the same iteration as the total density on screen.",
    ko: "고른 반복의 총 전자 밀도와 같은 지점을 가리키는 SCF 순환.",
  },
  D6_outputs: {
    en: "Calculated electron density, HOMO, and LUMO, with the corresponding orbital energies.",
    ko: "계산된 전자 밀도와 HOMO, LUMO, 그리고 각 오비탈 에너지.",
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
