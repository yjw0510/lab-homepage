"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

const SCF_FALLBACK: ScfConvergenceData = {
  trajectory: [
    { iteration: 0, deltaE: 0.4051611456 },
    { iteration: 2, deltaE: 0.4051611456 },
    { iteration: 4, deltaE: 0.5879381436 },
    { iteration: 6, deltaE: 0.0520257738 },
    { iteration: 8, deltaE: 0.0114490248 },
    { iteration: 10, deltaE: 0.0025831412 },
    { iteration: 12, deltaE: 0.0001684432 },
    { iteration: 14, deltaE: 3e-10 },
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
  const chartLeft = 44;
  const chartRight = 500;
  const chartTop = 18;
  const chartBottom = 154;
  const logMax = 0;
  const logMin = -10;
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
      viewBox="0 0 520 180"
      className="h-full w-full"
      role="img"
      aria-label={
        ko
          ? "실제 SCF 반복에 따른 에너지 변화 감소"
          : "Actual energy change across SCF iterations"
      }
    >
      {[
        { exponent: 0, label: "10⁰" },
        { exponent: -2, label: "10⁻²" },
        { exponent: -4, label: "10⁻⁴" },
        { exponent: -6, label: "10⁻⁶" },
        { exponent: -8, label: "10⁻⁸" },
        { exponent: -10, label: "10⁻¹⁰" },
      ].map(({ exponent, label }) => {
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
      <text
        x={chartRight}
        y={thresholdY - 7}
        textAnchor="end"
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
      <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.mobileOverlay}`}>
        <div className="flex items-start justify-between gap-4 border-b border-lv-aa-line bg-lv-aa-wash px-4 py-3">
          <div>
            <p className="text-base font-semibold text-lv-aa">
              {ko ? "같은 전자 밀도가 나올 때까지 다시 계산한다" : "Recalculate until the density stops changing"}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {ko
                ? "배경의 전자 밀도와 아래 점이 같은 반복을 나타낸다."
                : "The density above and the point below show the same iteration."}
            </p>
          </div>
          <p className="shrink-0 text-2xl font-semibold tabular-nums text-foreground">
            {activePoint.iteration}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ 14</span>
          </p>
        </div>

        <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">|ΔE|</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-lv-aa">
              {deltaLabel}
            </p>
            <p className="text-xs text-muted-foreground">Ha</p>
            <p className={`mt-2 text-sm font-semibold ${converged ? "text-lv-aa" : "text-muted-foreground"}`}>
              {converged
                ? ko
                  ? "수렴"
                  : "converged"
                : ko
                  ? "계산 중"
                  : "iterating"}
            </p>
          </div>
          <div className="h-[8.5rem]">{convergenceChart}</div>
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
        tone="amber"
        title={
          ko
            ? "같은 전자 밀도가 나올 때까지 다시 계산한다"
            : "Recalculate until the density stops changing"
        }
        description={
          ko
            ? "배경의 전자 밀도, 그래프의 점, 반복 번호가 함께 움직인다."
            : "The density surface, chart point, and iteration number advance together."
        }
        aside={
          <div className="flex items-baseline gap-3">
            <span className={MULTISCALE_TYPE.description}>
              {ko ? "SCF 반복" : "SCF iteration"}
            </span>
            <span className={MULTISCALE_TYPE.metric}>
              {String(activePoint.iteration).padStart(2, "0")}
            </span>
            <span className="text-base text-muted-foreground">/ 14</span>
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
              <p className="mt-1 text-xl font-semibold tabular-nums text-lv-aa">
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
            <div className="mt-5 border-l-2 border-lv-aa-line pl-4">
              <MathNotation
                latex={String.raw`\rho_{\mathrm{in}}^{(n+1)}\leftarrow\operatorname{mix}\!\left(\rho_{\mathrm{in}}^{(n)},\rho_{\mathrm{out}}^{(n)}\right)`}
                className="text-[1.15rem] text-lv-aa"
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
            <span className={`ml-4 shrink-0 text-sm font-semibold ${converged ? "text-lv-aa" : "text-muted-foreground"}`}>
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
            ? "자산 로딩 중"
            : "loading asset",
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
            ? "자산 로딩 중"
            : "loading asset",
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
            ? "전자 밀도는 에너지 준위가 아니라 모든 점유 오비탈이 만든 공간 분포다."
            : "Electron density is a spatial distribution built from all occupied orbitals, not an energy level."}
        </p>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.mobileOverlay}`}>
        <div className="border-b border-lv-dft-line bg-lv-dft-wash px-4 py-3">
          <p className="text-base font-semibold text-lv-dft">
            {ko ? "같은 계산에서 서로 다른 정보를 읽는다" : "Read different information from the same calculation"}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {ko
              ? "위의 3D 표면과 아래 설명이 함께 바뀐다."
              : "The 3D surface above and the explanation below change together."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border p-px">
          {rows.map((row) => (
            <button
              type="button"
              key={row.id}
              className={`pointer-events-auto bg-surface-sunken px-3 py-3 text-left ${MULTISCALE_MOTION.stateTransition} ${mode === row.id ? "opacity-100" : "opacity-40"}`}
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
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_10.5rem] gap-4 px-4 py-3">
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
                  ? "전자 밀도는 에너지 준위가 아니라 모든 점유 오비탈이 만든 공간 분포다."
                  : "Electron density is a spatial distribution built from all occupied orbitals, not an energy level."}
              </p>
            ) : (
              renderEnergyLevels(false)
            )}
          </div>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-sm leading-5 text-muted-foreground">
          {ko
            ? "HOMO-LUMO 간격은 2.02 eV이지만 광학 들뜸 에너지와 같다고 해석하지 않는다."
            : "The HOMO-LUMO gap is 2.02 eV, but it is not interpreted as an optical excitation energy."}
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
            ? "3D 표면이 전자 밀도, HOMO, LUMO 순서로 바뀌며 아래 해석과 연결된다."
            : "The 3D surface cycles through density, HOMO, and LUMO while the interpretation updates below."
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
                className={`pointer-events-auto bg-surface-sunken px-4 py-3 text-left ${MULTISCALE_MOTION.stateTransition} ${mode === row.id ? "opacity-100" : "opacity-38"}`}
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
            ? "HOMO-LUMO 간격은 2.02 eV이다. 바닥상태 Kohn-Sham 오비탈의 차이이며 광학 들뜸 에너지로 직접 해석하지 않는다."
            : "The HOMO-LUMO gap is 2.02 eV. It is a ground-state Kohn-Sham orbital difference, not a direct optical excitation energy."}
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
    en: "Self-consistent field cycle synchronized with the selected total-density iteration.",
    ko: "선택된 총 전자 밀도 반복과 연결된 자기일관장 순환.",
  },
  D6_outputs: {
    en: "Calculated density, HOMO, and LUMO outputs with asset-derived energies.",
    ko: "자산에서 읽은 에너지를 포함한 계산 밀도, HOMO, LUMO 출력.",
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
      className={`dft-mechanism pointer-events-none absolute inset-0 z-[2] overflow-hidden ${
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
