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
import { OrbitalOccupancyDiagram } from "../OrbitalOccupancyDiagram";

export type DftOutputMode = "density" | "homo" | "lumo";

export interface DftMechanismData {
  totalEnergyHa?: number;
  finalDensityIsovalue?: number;
  homoEV?: number;
  lumoEV?: number;
  homoLabel?: string;
  lumoLabel?: string;
  outputMode?: DftOutputMode;
  onOutputModeChange?: (mode: DftOutputMode) => void;
  scfSnapshot?: {
    index: number;
    count: number;
    iteration: number;
    label: string;
    isovalue: number;
  };
  geometryOptimization?: {
    index: number;
    count: number;
    iteration: number;
    energyHa: number;
    energyDropKcalMol: number;
    relativeEnergyKcalMol: number;
    maxForceEvA: number;
    rmsForceEvA: number;
    targetMaxForceEvA: number;
    maximumDisplacementAngstrom: number;
    system: string;
    formula: string;
    method: string;
    basis: string;
    engine: string;
    optimizer: string;
    converged: boolean;
    series: Array<{
      iteration: number;
      energyHa: number;
      energyDropKcalMol: number;
      relativeEnergyKcalMol: number;
      maxForceEvA: number;
    }>;
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

function LayerBadge({
  kind,
  lang,
}: {
  kind: "calculated" | "schematic" | "schema" | "unavailable";
  lang: string;
}) {
  const labels = {
    calculated: { en: "CALCULATED", ko: "계산 데이터" },
    schematic: { en: "MECHANISM SCHEMATIC", ko: "원리 도식" },
    schema: { en: "SCHEMA EXAMPLE", ko: "스키마 예시" },
    unavailable: { en: "NOT IN ASSET", ko: "현재 자산에 없음" },
  } as const;
  const label = labels[kind][lang === "ko" ? "ko" : "en"];

  return (
    <span
      className={`type-mono-meta inline-flex border px-2 py-1 text-xs leading-none tracking-[0.08em] ${
        kind === "calculated"
          ? "border-sky-300/35 bg-sky-950/50 text-sky-200"
          : kind === "unavailable"
            ? "border-slate-500/40 bg-[#080812]/82 text-slate-400"
            : "border-amber-300/35 bg-amber-950/35 text-amber-200"
      }`}
    >
      {label}
    </span>
  );
}

function InstrumentPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-white/14 bg-[#070712]/92 text-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}

function SceneCaption({
  label,
  note,
  readable = false,
}: {
  label: string;
  note?: string;
  readable?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-white/12 ${
        readable ? "px-4 py-3" : "px-3 py-2"
      }`}
    >
      <span
        className={`type-mono-meta tracking-[0.08em] text-slate-200 ${
          readable ? "text-base" : "text-xs"
        }`}
      >
        {label}
      </span>
      {note ? (
        <span
          className={`text-right text-slate-400 ${
            readable
              ? "max-w-[26rem] text-sm leading-5"
              : "max-w-[15rem] text-xs leading-4"
          }`}
        >
          {note}
        </span>
      ) : null}
    </div>
  );
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

function D1ProbeAnimation({
  index,
  ko,
}: {
  index: number;
  ko: boolean;
}) {
  if (index === 0) {
    return (
      <div className="border-l border-cyan-200/30 bg-cyan-950/12 py-2.5 pl-3 pr-2.5">
        <svg viewBox="0 0 156 54" className="h-16 w-full" role="img" aria-label={ko ? "원자 간 거리가 줄면서 결합 차수가 증가하는 정규화 도식" : "Normalized atomic distance decreases as bond order increases"}>
          <ellipse className="dft-bond-density" cx="76" cy="23" rx="30" ry="8" fill="#5eead4" opacity="0.16" />
          <line className="dft-bond-form" x1="43" y1="23" x2="109" y2="23" stroke="#5eead4" strokeWidth="4" />
          <circle cx="34" cy="23" r="10" fill="#e2e8f0" />
          <g className="dft-bond-partner">
            <circle cx="121" cy="23" r="10" fill="#7dd3fc" />
          </g>
        </svg>
        <div className="grid grid-cols-2 gap-3 border-t border-cyan-200/20 pt-2">
          <div>
            <p className="text-xs text-slate-400">{ko ? "평형 거리의" : "equilibrium distance"}</p>
            <p className="mt-0.5 text-sm font-medium text-teal-100">{ko ? "1.8배 → 1.0배" : "1.8× → 1.0×"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">{ko ? "결합 차수" : "bond order"}</p>
            <p className="mt-0.5 text-sm font-medium text-cyan-100">0 → 1</p>
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="border-l border-amber-200/30 bg-amber-950/10 py-2.5 pl-3 pr-2.5">
        <svg viewBox="0 0 156 54" className="h-16 w-full" role="img" aria-label={ko ? "전자 하나가 주개에서 받개로 이동하며 부분 전하가 생기는 도식" : "An electron moves from donor to acceptor and creates partial charges"}>
          <circle className="dft-charge-donor-halo" cx="33" cy="23" r="17" fill="none" stroke="#f6c177" strokeWidth="2" />
          <circle className="dft-charge-acceptor-halo" cx="123" cy="23" r="17" fill="none" stroke="#67e8f9" strokeWidth="2" />
          <circle cx="33" cy="23" r="10" fill="#cbd5e1" />
          <circle cx="123" cy="23" r="10" fill="#7dd3fc" />
          <line x1="48" y1="23" x2="108" y2="23" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle className="dft-charge-transfer" cx="52" cy="23" r="4.5" fill="#f6c177" />
          <text className="dft-charge-plus" x="33" y="8" textAnchor="middle" fill="#f6c177" fontSize="12" fontWeight="700">+</text>
          <text className="dft-charge-minus" x="123" y="8" textAnchor="middle" fill="#67e8f9" fontSize="12" fontWeight="700">−</text>
          <text x="33" y="51" textAnchor="middle" fill="#cbd5e1" fontSize="12">{ko ? "주개 D" : "donor D"}</text>
          <text x="123" y="51" textAnchor="middle" fill="#bae6fd" fontSize="12">{ko ? "받개 A" : "acceptor A"}</text>
        </svg>
        <div className="grid grid-cols-2 gap-3 border-t border-amber-200/20 pt-2">
          <div>
            <p className="text-xs text-slate-400">{ko ? "주개 전하" : "donor charge"}</p>
            <MathNotation latex="0\rightarrow+0.6e" className="mt-0.5 text-sm text-amber-100" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{ko ? "받개 전하" : "acceptor charge"}</p>
            <MathNotation latex="0\rightarrow-0.6e" className="mt-0.5 text-sm text-cyan-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l border-violet-200/30 bg-violet-950/10 py-2.5 pl-3 pr-2.5">
      <OrbitalOccupancyDiagram
        variant="spin-crossover"
        lang={ko ? "ko" : "en"}
        className="h-[5.75rem] w-full"
      />
      <div className="grid grid-cols-2 gap-3 border-t border-violet-200/20 pt-2">
        <div>
          <p className="text-xs text-slate-400">{ko ? "총스핀" : "total spin"}</p>
          <MathNotation latex="S=0\rightarrow S=1" className="mt-0.5 text-sm text-violet-100" />
        </div>
        <div>
          <p className="text-xs text-slate-400">{ko ? "두 상태의 에너지 차" : "state energy gap"}</p>
          <MathNotation latex="\Delta E_{\rm HS-LS}" className="mt-0.5 text-sm text-cyan-100" />
        </div>
      </div>
    </div>
  );
}

function D1Selection({ lang, isMobile }: { lang: string; isMobile: boolean }) {
  const ko = lang === "ko";
  const [activeProbe, setActiveProbe] = useState(0);
  const probes = ko
    ? [
        ["결합이 생기거나 끊어질 때", "화학 반응과 결합 세기"],
        ["전하가 이동할 때", "산화·환원과 전하 이동"],
        ["스핀·오비탈 상태가 중요할 때", "자성과 전자 상태"],
      ]
    : [
        ["Bond rearrangement", "formation, cleavage, and bond order"],
        ["Charge response", "redox, polarization, and transfer"],
        ["Spin and orbitals", "spin state and electronic character"],
      ];

  if (isMobile) {
    return (
      <InstrumentPanel className="dft-enter absolute bottom-3 left-3 right-3">
        <div className="border-b border-amber-300/25 bg-amber-950/18 px-4 py-2.5">
          <p className="text-[0.9375rem] font-semibold text-amber-100">
            {ko ? "전자 상태를 직접 계산해야 하는 세 경우" : "Three reasons to resolve the electronic state"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/10 p-px">
          {probes.map(([title], index) => (
            <button
              key={title}
              type="button"
              className={`pointer-events-auto min-h-11 bg-[#080812]/98 px-2 py-2 text-left ${MULTISCALE_MOTION.stateTransition} ${
                activeProbe === index ? "opacity-100" : "opacity-45"
              }`}
              onMouseEnter={() => setActiveProbe(index)}
              onFocus={() => setActiveProbe(index)}
              onClick={() => setActiveProbe(index)}
              aria-label={title}
            >
              <span className={`type-mono-meta text-sm ${activeProbe === index ? "text-sky-200" : "text-slate-500"}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
        <div className="grid h-[12rem] grid-cols-[minmax(0,1fr)_10.75rem] items-center gap-3 bg-[#080812]/98 p-3">
          <div className="min-w-0">
            <h4 className="text-base font-semibold leading-snug text-slate-100">
              {probes[activeProbe][0]}
            </h4>
            <p className="mt-1.5 text-sm leading-5 text-slate-300">
              {probes[activeProbe][1]}
            </p>
          </div>
          <D1ProbeAnimation index={activeProbe} ko={ko} />
        </div>
        <div className="flex min-h-12 items-center justify-between border-t border-sky-300/30 bg-sky-950/14 px-4 py-2">
          <p className="text-sm text-slate-300">
            {ko ? "하나라도 해당하면" : "If any condition applies"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="type-heading text-xl text-sky-100">DFT</span>
            <span className="text-xs text-slate-400">
              {ko ? "전자구조 계산" : "electronic structure"}
            </span>
          </div>
        </div>
      </InstrumentPanel>
    );
  }

  return (
    <>
      <InstrumentPanel className="dft-enter absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8">
        <div className="flex items-baseline justify-between gap-5 border-b border-amber-300/30 bg-amber-950/20 px-5 py-3.5">
          <div className="flex items-baseline gap-5">
            <span className="type-mono-meta shrink-0 text-sm text-slate-300">
              {ko ? "언제 DFT를 쓰는가" : "WHEN TO USE DFT"}
            </span>
            <p className="text-xl font-semibold leading-snug text-amber-100 sm:text-[1.375rem]">
              {ko
                ? "결합, 전하, 스핀 상태를 직접 계산해야 하는가?"
                : "Does the observable depend on electrons rearranging with molecular geometry?"}
            </p>
          </div>
          <span className="shrink-0 text-sm text-slate-400">
            {ko ? "전자 상태가 답을 좌우할 때" : "When electronic state determines the answer"}
          </span>
        </div>

        <div className="grid gap-px bg-white/10 p-px lg:grid-cols-[repeat(3,minmax(0,1fr))_.82fr]">
          {probes.map(([title, detail], index) => (
            <section
              key={title}
              className="dft-decision-probe flex min-h-[15rem] flex-col bg-[#080812]/96 p-4"
              style={{ animationDelay: `${0.35 + index * 0.6}s` }}
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="type-mono-meta pt-0.5 text-sm text-sky-200">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h4 className="text-base font-semibold leading-snug text-slate-100">
                    {title}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {detail}
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <D1ProbeAnimation index={index} ko={ko} />
              </div>
            </section>
          ))}

          <section className="flex min-h-[15rem] flex-col justify-center bg-[#080812]/96 p-4 text-center">
            <p className="text-sm leading-relaxed text-slate-300">
              {ko ? "하나라도 해당하면" : "If any condition applies"}
            </p>
            <div className="dft-decision-route my-3 border-y border-sky-300/45 py-3">
              <p className="type-heading text-2xl text-sky-100">DFT</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {ko ? "전자구조 계산" : "electronic structure"}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-sky-100">
              {ko ? "전자 밀도 · 오비탈" : "density · orbitals"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {ko ? "에너지 · 원자에 작용하는 힘" : "energy · nuclear forces"}
            </p>
            <p className="mt-3 border-t border-white/12 pt-3 text-xs leading-relaxed text-slate-400">
              {ko ? "작은 계와 선택된 구조를 정밀하게 계산" : "Precise calculations on small systems and selected structures"}
            </p>
          </section>
        </div>
      </InstrumentPanel>
    </>
  );
}

function D2Pes({
  lang,
  reducedMotion,
  isMobile,
}: {
  lang: string;
  reducedMotion: boolean;
  isMobile: boolean;
}) {
  const ko = lang === "ko";
  const optimization = useDftMechanismData().geometryOptimization;
  if (!optimization) return null;

  const currentIndex = reducedMotion
    ? optimization.count - 1
    : optimization.index;
  const energyValues = optimization.series.map((frame) => frame.energyDropKcalMol);

  const chart = (
    values: number[],
    width: number,
    height: number,
    padX = 12,
    padY = 10,
  ) => {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const span = Math.max(maximum - minimum, 1e-9);
    const points = values.map((value, index) => ({
      x:
        padX +
        (index / Math.max(1, values.length - 1)) * (width - padX * 2),
      y: padY + ((maximum - value) / span) * (height - padY * 2),
    }));
    return {
      all: points.map(({ x, y }) => `${x},${y}`).join(" "),
      active: points
        .slice(0, Math.max(1, currentIndex + 1))
        .map(({ x, y }) => `${x},${y}`)
        .join(" "),
      point: points[Math.min(currentIndex, points.length - 1)],
      minimum,
      maximum,
    };
  };

  const energyChart = chart(energyValues, 360, 142);
  const current = optimization.series[currentIndex] ?? optimization.series[0];

  if (isMobile) {
    return (
      <InstrumentPanel className="dft-enter absolute bottom-3 left-3 right-3">
        <div className="flex items-center justify-between gap-3 border-b border-white/12 px-4 py-2.5">
          <div>
            <p className="type-mono-meta text-xs text-sky-200">
              {ko ? "실제 DFT 구조 최적화" : "ACTUAL DFT OPTIMIZATION"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {ko ? "카페인 " : "Caffeine "}
              <MathNotation
                latex={String.raw`\mathrm{C_8H_{10}N_4O_2}`}
                className="ml-1 text-slate-200"
              />
              <span className="ml-1 text-slate-500">
                · ΔR<sub>max</sub> {optimization.maximumDisplacementAngstrom.toFixed(2)} Å
              </span>
            </p>
          </div>
          <p className="shrink-0 text-2xl font-semibold tabular-nums text-slate-100">
            {String(optimization.iteration).padStart(2, "0")}
            <span className="ml-1 text-sm font-normal text-slate-500">
              / {optimization.series.at(-1)?.iteration ?? optimization.count - 1}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 px-4 py-2.5">
          <div>
            <p className="text-xs leading-4 text-slate-400">
              {ko ? "낮아진 에너지" : "energy decrease"}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-sky-100">
              {current.energyDropKcalMol.toFixed(1)}
            </p>
            <p className="text-xs text-slate-500">kcal mol⁻¹</p>
          </div>
          <svg
            viewBox="0 0 360 142"
            className="h-[5.6rem] w-full"
            role="img"
            aria-label={ko ? "실제 최적화 반복에 따른 에너지 감소" : "Actual energy decrease across optimization iterations"}
          >
            <line x1="12" y1="132" x2="348" y2="132" stroke="rgba(148,163,184,.25)" />
            <polyline points={energyChart.all} fill="none" stroke="#334155" strokeWidth="3" />
            <polyline points={energyChart.active} fill="none" stroke="#67e8f9" strokeWidth="4" />
            <circle cx={energyChart.point.x} cy={energyChart.point.y} r="7" fill="#f8fafc" stroke="#67e8f9" strokeWidth="3" />
          </svg>
        </div>

        <p className="border-t border-white/12 px-4 py-2.5 text-sm leading-5 text-slate-300">
          {ko
            ? "에너지와 힘을 계산하고, 더 안정한 구조가 되는 방향으로 원자 위치를 바꾸는 과정을 반복한다."
            : "Each iteration computes energy and forces, then moves the atoms toward a more stable geometry."}
        </p>
      </InstrumentPanel>
    );
  }

  return (
    <section className="dft-enter absolute inset-y-0 right-0 w-[40%] overflow-hidden border-l border-white/12 bg-[#070712]/98 px-6 pb-5 pt-32">
      <header className="border-b border-white/12 pb-5">
        <p className="type-mono-meta text-sm tracking-[0.08em] text-sky-200">
          {ko ? "실제 DFT 구조 최적화" : "ACTUAL DFT GEOMETRY OPTIMIZATION"}
        </p>
        <h3 className="mt-2 text-[1.65rem] font-semibold leading-tight text-slate-100">
          {ko ? "찌그러진 구조가 펴지면서 에너지가 내려간다" : "The distorted geometry relaxes as its energy falls"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {ko ? "카페인 " : "Caffeine "}
          <MathNotation
            latex={String.raw`\mathrm{C_8H_{10}N_4O_2}`}
            className="mx-1 text-slate-300"
          />
          {ko
            ? `· 초기 구조 최대 ${optimization.maximumDisplacementAngstrom.toFixed(2)} Å 변형`
            : `· initial geometry distorted by up to ${optimization.maximumDisplacementAngstrom.toFixed(2)} Å`}
        </p>
      </header>

      <div className="flex items-end justify-between border-b border-white/12 py-4">
        <div>
          <p className="type-mono-meta text-xs text-slate-500">
            {ko ? "최적화 반복" : "OPTIMIZATION ITERATION"}
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-100">
            {String(optimization.iteration).padStart(2, "0")}
            <span className="ml-2 text-base font-normal text-slate-500">
              / {String(optimization.series.at(-1)?.iteration ?? optimization.count - 1).padStart(2, "0")}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-sky-100">
            {ko ? "배경 구조와 그래프 점" : "Molecular geometry and chart point"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {ko ? "같은 iteration을 표시" : "show the same optimization iteration"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1.15fr_.85fr] gap-px bg-white/10 p-px">
        <div className="bg-[#080812] p-4">
          <p className="text-sm text-slate-400">
            {ko ? "초기 구조보다 낮아진 에너지" : "Energy decrease from the initial geometry"}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-100">
            {current.energyDropKcalMol.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-slate-400">kcal mol⁻¹</p>
        </div>
        <div className="bg-[#080812] p-4">
          <p className="text-sm text-slate-400">{ko ? "현재 총에너지" : "Current total energy"}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
            {optimization.energyHa.toFixed(6)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Ha</p>
        </div>
      </div>

      <div className="border-b border-white/12 py-4">
        <div className="flex items-baseline justify-between">
          <h4 className="text-base font-semibold text-slate-100">
            {ko ? "총에너지" : "Total energy"}
          </h4>
          <span className="text-xs text-slate-500">ΔE / kcal mol⁻¹</span>
        </div>
        <svg viewBox="0 0 360 142" className="mt-3 h-[10.5rem] w-full" role="img" aria-label={ko ? "실제 DFT 최적화 반복에 따른 총에너지 감소" : "Actual total-energy decrease across DFT optimization iterations"}>
          <line x1="12" y1="132" x2="348" y2="132" stroke="rgba(148,163,184,.25)" />
          <polyline points={energyChart.all} fill="none" stroke="#334155" strokeWidth="2" />
          <polyline points={energyChart.active} fill="none" stroke="#67e8f9" strokeWidth="3" />
          <circle cx={energyChart.point.x} cy={energyChart.point.y} r="5.5" fill="#f8fafc" stroke="#67e8f9" strokeWidth="2.5" />
          <text x="12" y="18" fill="#94a3b8" fontSize="12">0</text>
          <text x="12" y="126" fill="#94a3b8" fontSize="12">{energyChart.minimum.toFixed(1)}</text>
        </svg>
      </div>

      <footer className="pt-4">
        <MathNotation
          latex={String.raw`E_0\!\left(\mathbf R^{(0)}\right)>E_0\!\left(\mathbf R^{(1)}\right)>\cdots>E_0\!\left(\mathbf R^\ast\right)`}
          className="text-[1.25rem] text-sky-100"
        />
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {ko
            ? "에너지와 힘을 계산하고, 더 안정한 구조가 되는 방향으로 원자 위치를 바꾸는 과정을 반복한다."
            : "Each iteration computes the energy and forces, then moves the atoms toward a more stable geometry."}
        </p>
        <p className="type-mono-meta mt-3 border-t border-white/12 pt-3 text-xs leading-5 text-slate-500">
          {optimization.engine} · {optimization.method}/{optimization.basis}
        </p>
      </footer>
    </section>
  );
}

function D3KohnSham({ lang, isMobile }: { lang: string; isMobile: boolean }) {
  const ko = lang === "ko";

  if (isMobile) {
    return (
      <InstrumentPanel className="dft-enter absolute bottom-3 left-3 right-3">
        <div className="border-b border-amber-300/25 bg-amber-950/16 px-4 py-2.5">
          <p className="text-[0.9375rem] font-semibold text-amber-100">
            {ko ? "입력한 밀도와 계산된 밀도가 같아질 때까지 반복한다" : "Repeat until the input and output densities agree"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-white/12 px-4 py-2.5">
          <div>
            <p className="type-mono-meta text-xs text-rose-200">
              {ko ? "반복 동안 고정" : "FIXED IN THE LOOP"}
            </p>
            <p className="mt-1 text-xs leading-4 text-slate-400">
              {ko ? "원자핵 종류와 위치" : "nuclear species and positions"}
            </p>
          </div>
          <MathNotation
            latex={String.raw`\hat T+v_{\mathrm{ext}}(\mathbf r;\mathbf R)`}
            className="text-[1.05rem] text-rose-100"
          />
        </div>

        <div className="space-y-1.5 p-3">
          <div
            className="dft-ks-mobile-step border border-sky-300/25 bg-sky-950/10 px-3 py-2.5"
            style={{ animationDelay: "0s" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-100">
                {ko ? "유효 방정식을 푼다" : "Solve the effective equation"}
              </p>
              <span className="type-mono-meta text-xs text-sky-300">01</span>
            </div>
            <MathNotation
              latex={String.raw`\hat H_{\mathrm{KS}}[\rho^{(n)}]\phi_i^{(n)}=\varepsilon_i^{(n)}\phi_i^{(n)}`}
              className="mt-1.5 text-[1.05rem] text-sky-100"
            />
          </div>

          <div className="text-center text-lg leading-none text-amber-300">↓</div>

          <div
            className="dft-ks-mobile-step border border-violet-300/25 bg-violet-950/10 px-3 py-2.5"
            style={{ animationDelay: "1.6s" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-100">
                {ko ? "오비탈로 새 밀도를 만든다" : "Build a new density from the orbitals"}
              </p>
              <span className="type-mono-meta text-xs text-violet-300">02</span>
            </div>
            <MathNotation
              latex={String.raw`\rho_{\mathrm{out}}^{(n)}=\sum_i f_i\left|\phi_i^{(n)}\right|^2`}
              className="mt-1.5 text-[1.05rem] text-violet-100"
            />
          </div>

          <div className="text-center text-lg leading-none text-amber-300">↓</div>

          <div
            className="dft-ks-mobile-step border border-amber-300/25 bg-amber-950/10 px-3 py-2.5"
            style={{ animationDelay: "3.2s" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-100">
                {ko ? "다음 반복에 쓸 밀도를 갱신한다" : "Update the density for the next iteration"}
              </p>
              <span className="type-mono-meta text-xs text-amber-300">03</span>
            </div>
            <MathNotation
              latex={String.raw`\rho^{(n+1)}\leftarrow\operatorname{mix}\!\left(\rho^{(n)},\rho_{\mathrm{out}}^{(n)}\right)`}
              className="mt-1.5 text-[0.98rem] text-amber-100"
            />
          </div>
        </div>

        <div className="flex min-h-11 items-center justify-between border-t border-white/12 px-4 py-2">
          <p className="text-xs leading-4 text-slate-400">
            {ko ? "갱신한 밀도로 다시 유효 방정식을 만든다" : "The updated density rebuilds the effective equation"}
          </p>
          <span className="ml-3 text-2xl text-amber-300">↺</span>
        </div>
      </InstrumentPanel>
    );
  }

  return (
    <InstrumentPanel className="dft-enter absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8">
      <SceneCaption
        readable
        label={ko ? "KOHN–SHAM 피드백 문제" : "THE KOHN–SHAM FEEDBACK PROBLEM"}
        note={
          ko
            ? "오비탈이 밀도를 만들고, 그 밀도가 해밀토니안을 다시 만드는 닫힌 계산 고리"
            : "Orbitals create density; that density rebuilds the Hamiltonian and closes the computational loop."
        }
      />

      <div className="border-b border-amber-300/24 bg-amber-950/16 px-4 py-3">
        <p className="text-base font-semibold leading-6 text-amber-100">
          {ko
            ? "핵 배치는 고정한다. 오비탈을 풀어 밀도를 만들고, 그 밀도로 다음 유효 해밀토니안을 다시 만든다."
            : "Hold the nuclei fixed. Solve for orbitals, build their density, then use that density to rebuild the effective Hamiltonian."}
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <section className="border border-rose-300/28 bg-[#080812]/94">
          <div className="flex items-center justify-between gap-3 border-b border-white/12 px-3 py-2">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-rose-200">
              {ko ? "반복 동안 고정" : "FIXED DURING THE ITERATION"}
            </span>
            <span className="type-mono-meta text-xs text-slate-500">01</span>
          </div>
          <div className="space-y-4 p-3">
            <div>
              <MathNotation
                latex={String.raw`\hat T=-\frac{1}{2}\nabla^2`}
                className="text-xl text-slate-100"
              />
              <p className="mt-2 text-sm leading-5 text-slate-400">
                {ko ? "오비탈의 운동 에너지 연산자" : "Orbital kinetic-energy operator"}
              </p>
            </div>
            <div className="border-t border-white/12 pt-4">
              <MathNotation
                latex={String.raw`v_{\mathrm{ext}}\!\left(\mathbf r;\{Z_A,\mathbf R_A\}\right)`}
                className="text-xl text-rose-100"
              />
              <p className="mt-2 text-sm leading-5 text-slate-400">
                {ko
                  ? "선택한 원자핵 종류와 위치가 만드는 외부 퍼텐셜"
                  : "External potential set by the chosen nuclei and their positions"}
              </p>
            </div>
          </div>
          <div className="border-t border-white/12 px-3 py-3 text-sm leading-5 text-slate-300">
            {ko
              ? "이 두 입력은 매 반복에서 바뀌지 않으며, 왼쪽 아래의 다음 해밀토니안에 계속 들어간다."
              : "These inputs remain fixed through the iterations and enter every rebuilt Hamiltonian."}
          </div>
        </section>

        <section className="relative hidden h-[19rem] border border-white/12 bg-[#080812]/90 sm:block">
          <svg
            viewBox="0 0 1000 440"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="dft-ks-flow-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="rgba(251,191,36,.92)" />
              </marker>
            </defs>
            <path
              className="dft-ks-flow"
              d="M292 112 H355"
              fill="none"
              markerEnd="url(#dft-ks-flow-arrow)"
            />
            <path
              className="dft-ks-flow"
              d="M646 112 H709"
              fill="none"
              markerEnd="url(#dft-ks-flow-arrow)"
              style={{ animationDelay: "0.45s" }}
            />
            <path
              className="dft-ks-flow"
              d="M854 166 V254"
              fill="none"
              markerEnd="url(#dft-ks-flow-arrow)"
              style={{ animationDelay: "0.9s" }}
            />
            <path
              className="dft-ks-flow"
              d="M709 332 H646"
              fill="none"
              markerEnd="url(#dft-ks-flow-arrow)"
              style={{ animationDelay: "1.35s" }}
            />
            <path
              className="dft-ks-flow"
              d="M355 332 H292"
              fill="none"
              markerEnd="url(#dft-ks-flow-arrow)"
              style={{ animationDelay: "1.8s" }}
            />
            <path
              className="dft-ks-flow dft-ks-feedback"
              d="M146 254 V166"
              fill="none"
              markerEnd="url(#dft-ks-flow-arrow)"
              style={{ animationDelay: "2.25s" }}
            />
          </svg>

          <div className="absolute left-[2%] top-[8%] w-[28%] border border-slate-300/32 bg-[#090914] px-3 py-3">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-slate-400">
              {ko ? "유효 문제를 푼다" : "SOLVE THE EFFECTIVE PROBLEM"}
            </span>
            <MathNotation
              latex={String.raw`\hat H_{\mathrm{KS}}[\rho^{(n)}]`}
              className="mt-3 block text-xl text-slate-50"
            />
          </div>

          <div className="absolute left-[36%] top-[8%] w-[28%] border border-sky-300/30 bg-[#090914] px-3 py-3">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-sky-200">
              {ko ? "출력: 오비탈" : "OUTPUT: ORBITALS"}
            </span>
            <MathNotation
              latex={String.raw`\{\phi_i^{(n)},\varepsilon_i^{(n)}\}`}
              className="mt-3 block text-xl text-sky-100"
            />
            <p className="mt-2 text-sm leading-5 text-slate-400">
              {ko ? "한 전자 유효 방정식의 해" : "Solutions of the effective one-electron problem"}
            </p>
          </div>

          <div className="absolute right-[2%] top-[8%] w-[28%] border border-sky-300/30 bg-[#090914] px-3 py-3">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-sky-200">
              {ko ? "오비탈이 밀도를 만든다" : "ORBITALS PRODUCE DENSITY"}
            </span>
            <MathNotation
              latex={String.raw`\rho_{\mathrm{out}}^{(n)}=\sum_i f_i|\phi_i^{(n)}|^2`}
              className="mt-3 block text-base text-sky-100"
            />
          </div>

          <div className="absolute bottom-[8%] right-[2%] w-[28%] border border-white/18 bg-[#090914] px-3 py-3">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-slate-300">
              {ko ? "안정적으로 밀도를 갱신" : "UPDATE THE DENSITY"}
            </span>
            <MathNotation
              latex={String.raw`\rho^{(n+1)}\leftarrow\operatorname{mix}\!\left(\rho^{(n)},\rho_{\mathrm{out}}^{(n)}\right)`}
              className="mt-3 block text-base text-slate-100"
            />
          </div>

          <div className="absolute bottom-[8%] left-[36%] w-[28%] border border-amber-300/30 bg-[#090914] px-3 py-3">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-amber-200">
              {ko ? "밀도가 퍼텐셜을 갱신" : "DENSITY UPDATES POTENTIALS"}
            </span>
            <MathNotation
              latex={String.raw`v_{\mathrm H}[\rho^{(n+1)}],\quad v_{\mathrm{xc}}[\rho^{(n+1)}]`}
              className="mt-3 block text-xl text-amber-100"
            />
          </div>

          <div className="absolute bottom-[8%] left-[2%] w-[28%] border border-amber-300/38 bg-amber-950/20 px-3 py-3">
            <span className="type-mono-meta text-xs tracking-[0.08em] text-amber-200">
              {ko ? "다음 해밀토니안을 조립" : "ASSEMBLE THE NEXT HAMILTONIAN"}
            </span>
            <MathNotation
              latex={String.raw`\begin{aligned}\hat H_{\mathrm{KS}}^{(n+1)}&=\hat T+v_{\mathrm{ext}}\\&\quad+v_{\mathrm H}+v_{\mathrm{xc}}\end{aligned}`}
              className="mt-3 block text-base text-amber-100"
            />
          </div>
        </section>

        <section className="grid gap-px border border-white/12 bg-white/12 sm:hidden">
          {[
            {
              number: "02",
              label: ko ? "유효 문제를 푼다" : "Solve the effective problem",
              latex: String.raw`\hat H_{\mathrm{KS}}[\rho^{(n)}]\phi_i^{(n)}=\varepsilon_i^{(n)}\phi_i^{(n)}`,
            },
            {
              number: "03",
              label: ko ? "오비탈이 밀도를 만든다" : "Orbitals produce density",
              latex: String.raw`\rho_{\mathrm{out}}^{(n)}=\sum_i f_i|\phi_i^{(n)}|^2`,
            },
            {
              number: "04",
              label: ko ? "밀도가 퍼텐셜을 갱신한다" : "Density updates the potentials",
              latex: String.raw`v_{\mathrm H}[\rho^{(n+1)}],\ v_{\mathrm{xc}}[\rho^{(n+1)}]`,
            },
            {
              number: "05",
              label: ko ? "해밀토니안을 조립해 다시 푼다" : "Reassemble the Hamiltonian and solve again",
              latex: String.raw`\hat H_{\mathrm{KS}}[\rho^{(n+1)}]\longrightarrow\{\phi_i^{(n+1)}\}`,
            },
          ].map((item) => (
            <div key={item.number} className="bg-[#090914] p-3">
              <span className="type-mono-meta text-xs text-amber-200">{item.number}</span>
              <p className="mt-1 text-base font-semibold text-slate-100">{item.label}</p>
              <MathNotation latex={item.latex} className="mt-2 text-lg text-slate-300" />
            </div>
          ))}
        </section>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/12 px-4 py-3">
        <p className="text-sm leading-5 text-slate-300">
          {ko
            ? "고리가 수렴하면 입력 밀도와 출력 밀도가 일치한다. 다음 장은 이 반복을 실제 SCF 순서로 펼친다."
            : "At convergence, input and output densities agree. The next scene expands this loop into the practical SCF sequence."}
        </p>
        <LayerBadge kind="schematic" lang={lang} />
      </div>
    </InstrumentPanel>
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
              stroke="rgba(148,163,184,.14)"
            />
            <text
              x={chartLeft - 8}
              y={y + 4}
              textAnchor="end"
              fill="rgba(148,163,184,.72)"
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
        fill="rgba(253,230,138,.9)"
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
          fill={index <= activeIndex ? "#fbbf24" : "#334155"}
          stroke={index === activeIndex ? "#f8fafc" : "none"}
          strokeWidth="2"
        />
      ))}
      <text
        x={activeCoordinate.x}
        y={chartBottom + 20}
        textAnchor="middle"
        fill="#f8fafc"
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
        <div className="flex items-start justify-between gap-4 border-b border-amber-300/25 bg-amber-950/16 px-4 py-3">
          <div>
            <p className="text-base font-semibold text-amber-100">
              {ko ? "같은 전자 밀도가 나올 때까지 다시 계산한다" : "Recalculate until the density stops changing"}
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-400">
              {ko
                ? "배경의 전자 밀도와 아래 점이 같은 반복을 나타낸다."
                : "The density above and the point below show the same iteration."}
            </p>
          </div>
          <p className="shrink-0 text-2xl font-semibold tabular-nums text-slate-100">
            {activePoint.iteration}
            <span className="ml-1 text-sm font-normal text-slate-500">/ 14</span>
          </p>
        </div>

        <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 border-b border-white/12 px-4 py-3">
          <div>
            <p className="text-sm text-slate-400">|ΔE|</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-amber-100">
              {deltaLabel}
            </p>
            <p className="text-xs text-slate-500">Ha</p>
            <p className={`mt-2 text-sm font-semibold ${converged ? "text-amber-200" : "text-slate-300"}`}>
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
            className="block text-center text-[1.02rem] text-slate-100"
          />
          <p className="mt-2 text-sm leading-5 text-slate-300">
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
            <span className="text-base text-slate-500">/ 14</span>
          </div>
        }
      />

      <div className="grid gap-px bg-white/10 p-px lg:grid-cols-[minmax(24rem,1.08fr)_minmax(23rem,.92fr)]">
        <section className="bg-[#080812]/96 px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-slate-100">
                {ko ? "실제 에너지 수렴" : "Actual energy convergence"}
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                {ko ? "세로축은 로그 눈금" : "Logarithmic vertical scale"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">|ΔE|</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-amber-100">
                {deltaLabel} <span className="text-sm font-normal text-slate-500">Ha</span>
              </p>
            </div>
          </div>
          <div className="mt-2 h-[10.5rem]">{convergenceChart}</div>
        </section>

        <section className="flex flex-col justify-between bg-[#080812]/96 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-100">
              {ko ? "한 번의 SCF 반복" : "One SCF iteration"}
            </p>
            <MathNotation
              latex={String.raw`\rho_{\mathrm{in}}^{(n)}\rightarrow\hat H_{\mathrm{KS}}[\rho_{\mathrm{in}}^{(n)}]\rightarrow\{\phi_i^{(n)}\}\rightarrow\rho_{\mathrm{out}}^{(n)}`}
              className="mt-5 block text-center text-[1.3rem] text-slate-50"
            />
            <div className="mt-5 border-l-2 border-amber-300/65 pl-4">
              <MathNotation
                latex={String.raw`\rho_{\mathrm{in}}^{(n+1)}\leftarrow\operatorname{mix}\!\left(\rho_{\mathrm{in}}^{(n)},\rho_{\mathrm{out}}^{(n)}\right)`}
                className="text-[1.15rem] text-amber-100"
              />
              <p className="mt-2 text-sm leading-5 text-slate-400">
                {ko
                  ? "새 밀도로 해밀토니안을 다시 만들고 다음 반복을 시작한다."
                  : "The updated density rebuilds the Hamiltonian for the next iteration."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/12 pt-3">
            <p className="text-sm text-slate-300">
              {converged
                ? ko
                  ? "|ΔE|가 10⁻⁵ Ha보다 작아져 계산을 종료한다."
                  : "|ΔE| is below 10⁻⁵ Ha, so the calculation stops."
                : ko
                  ? "|ΔE|가 아직 기준보다 크므로 다시 계산한다."
                  : "|ΔE| remains above the threshold, so the loop continues."}
            </p>
            <span className={`ml-4 shrink-0 text-sm font-semibold ${converged ? "text-amber-200" : "text-slate-400"}`}>
              {converged ? (ko ? "수렴" : "CONVERGED") : ko ? "반복 중" : "ITERATING"}
            </span>
          </div>
        </section>
      </div>
    </MechanismPanel>
  );
}

function D5Recipe({
  lang,
  isMobile,
}: {
  lang: string;
  isMobile: boolean;
}) {
  const ko = lang === "ko";
  const [activeChoice, setActiveChoice] = useState(0);
  const choices = [
    {
      title: ko ? "교환-상관 근사" : "Exchange-correlation approximation",
      short: ko ? "함수형" : "functional",
      value: "B3LYP",
      description: ko
        ? "전자 사이의 교환과 상관 효과를 어떤 식으로 근사할지 정한다."
        : "Chooses how exchange and correlation between electrons are approximated.",
      consequence: ko
        ? "결합 에너지, 전하 분포, 반응 장벽이 달라질 수 있다."
        : "Bond energies, charge distribution, and reaction barriers can change.",
    },
    {
      title: ko ? "오비탈을 표현하는 함수" : "Functions used to represent orbitals",
      short: ko ? "기저함수" : "basis set",
      value: "6-31G*",
      description: ko
        ? "원자 주변 전자 분포를 얼마나 유연하게 표현할지 정한다."
        : "Chooses how flexibly the electron distribution around each atom can be represented.",
      consequence: ko
        ? "편극 함수가 결합 방향으로 전자 분포가 휘는 것을 표현한다."
        : "Polarization functions let the density bend along bonding directions.",
    },
    {
      title: ko ? "전자의 수와 스핀 배치" : "Electron count and spin arrangement",
      short: ko ? "전하·스핀" : "charge and spin",
      value: ko ? "중성 · singlet" : "neutral · singlet",
      description: ko
        ? "계산할 전자 상태를 먼저 지정한다."
        : "Specifies the electronic state to be calculated.",
      consequence: ko
        ? "전하나 스핀 다중도가 달라지면 서로 다른 전자구조 문제를 푼다."
        : "Changing charge or spin multiplicity defines a different electronic-structure problem.",
    },
  ];

  const active = choices[activeChoice];
  const choiceVisual =
    activeChoice === 0 ? (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <MathNotation
          latex={String.raw`E[\rho]=T_{\mathrm s}[\rho]+E_{\mathrm H}[\rho]+\color{#fbbf24}{E_{\mathrm{xc}}[\rho]}+\int v_{\mathrm{ext}}(\mathbf r)\rho(\mathbf r)\,d\mathbf r`}
          className="text-[1.15rem] text-slate-100 sm:text-[1.4rem]"
        />
        <div className="mt-5 grid w-full max-w-lg grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="border border-white/12 px-3 py-3">
            <p className="text-sm text-slate-400">{ko ? "직접 계산하는 항" : "Explicit terms"}</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              T<sub>s</sub> + E<sub>H</sub> + V<sub>ext</sub>
            </p>
          </div>
          <span className="text-2xl text-amber-300">+</span>
          <div className="dft-xc-focus border border-amber-300/45 bg-amber-950/16 px-3 py-3">
            <p className="text-sm text-amber-200">{ko ? "선택한 근사" : "Chosen approximation"}</p>
            <p className="mt-1 text-lg font-semibold text-amber-100">
              E<sub>xc</sub> : B3LYP
            </p>
          </div>
        </div>
      </div>
    ) : activeChoice === 1 ? (
      <div className="grid h-full grid-cols-2 items-center gap-6 px-5">
        <div className="relative mx-auto h-40 w-40">
          {[9, 15, 20].map((size, index) => (
            <div
              key={size}
              className="dft-basis-shell absolute left-1/2 top-1/2 rounded-full border border-amber-300/45"
              style={{
                width: `${size * 4}px`,
                height: `${size * 4}px`,
                marginLeft: `${-size * 2}px`,
                marginTop: `${-size * 2}px`,
                animationDelay: `${index * 0.35}s`,
              }}
            />
          ))}
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200" />
          <div className="absolute left-[58%] top-[28%] h-16 w-8 rotate-45 rounded-[50%] border border-sky-300/55 bg-sky-300/12" />
          <div className="absolute bottom-[28%] right-[11%] h-8 w-16 -rotate-12 rounded-[50%] border border-sky-300/55 bg-sky-300/12" />
        </div>
        <div>
          <MathNotation
            latex={String.raw`\phi_i(\mathbf r)=\sum_{\mu}C_{\mu i}\chi_\mu(\mathbf r)`}
            className="text-[1.35rem] text-slate-100"
          />
          <p className="mt-4 text-base leading-6 text-slate-300">
            {ko
              ? "6-31G*는 원자 중심 함수의 조합으로 오비탈을 표현한다. 별표는 편극 함수를 포함한다는 뜻이다."
              : "6-31G* represents orbitals as combinations of atom-centered functions. The asterisk denotes polarization functions."}
          </p>
        </div>
      </div>
    ) : (
      <div
        className={`grid h-full items-center ${
          isMobile
            ? "grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] gap-3 px-3"
            : "grid-cols-[minmax(13rem,.85fr)_minmax(16rem,1.15fr)] gap-6 px-5"
        }`}
      >
        <div>
          <OrbitalOccupancyDiagram
            variant="singlet"
            lang={ko ? "ko" : "en"}
            className={`${isMobile ? "h-[9.5rem]" : "h-[11rem]"} w-full`}
          />
          <p className={`text-center text-slate-400 ${isMobile ? "text-xs leading-4" : "text-sm"}`}>
            {ko ? "점유 오비탈의 전자가 ↑↓로 짝을 이룬 singlet" : "Singlet with ↑↓ pairs in occupied orbitals"}
          </p>
        </div>
        <div>
          <MathNotation
            latex={String.raw`N_{\mathrm e}=\sum_A Z_A-q`}
            className={`${isMobile ? "text-[0.98rem]" : "text-[1.3rem]"} text-slate-100`}
          />
          <div className={`${isMobile ? "mt-3" : "mt-4"} grid grid-cols-2 gap-px bg-white/10 p-px`}>
            <div className={`bg-[#090914] ${isMobile ? "px-2 py-2" : "px-4 py-3"}`}>
              <p className={`${isMobile ? "text-xs" : "text-sm"} text-slate-400`}>q</p>
              <p className={`${isMobile ? "text-lg" : "text-xl"} mt-1 font-semibold text-slate-100`}>0</p>
            </div>
            <div className={`bg-[#090914] ${isMobile ? "px-2 py-2" : "px-4 py-3"}`}>
              <p className={`${isMobile ? "text-xs" : "text-sm"} whitespace-nowrap text-slate-400`}>2S + 1</p>
              <p className={`${isMobile ? "text-lg" : "text-xl"} mt-1 font-semibold text-slate-100`}>1</p>
            </div>
          </div>
        </div>
      </div>
    );

  if (isMobile) {
    return (
      <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.mobileOverlay}`}>
        <div className="border-b border-amber-300/25 bg-amber-950/16 px-4 py-3">
          <p className="text-base font-semibold text-amber-100">
            {ko ? "계산 전에 전자구조 모델을 선택한다" : "Choose the electronic-structure model before solving"}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-400">
            {ko
              ? "수렴한 계산이라도 이 선택이 바뀌면 결과가 달라질 수 있다."
              : "A converged calculation can change when these model choices change."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/10 p-px">
          {choices.map((choice, index) => (
            <button
              type="button"
              key={choice.short}
              className={`pointer-events-auto bg-[#080812]/96 px-2 py-3 text-center ${MULTISCALE_MOTION.stateTransition} ${index === activeChoice ? "opacity-100" : "opacity-40"}`}
              onMouseEnter={() => setActiveChoice(index)}
              onFocus={() => setActiveChoice(index)}
              onClick={() => setActiveChoice(index)}
            >
              <p className={`text-sm font-semibold ${index === activeChoice ? "text-amber-100" : "text-slate-300"}`}>
                {choice.short}
              </p>
              <p className="mt-1 text-xs text-slate-500">{choice.value}</p>
            </button>
          ))}
        </div>
        <div className="h-[13.5rem] border-b border-white/12">{choiceVisual}</div>
        <div className="px-4 py-3">
          <h4 className="text-lg font-semibold text-slate-100">{active.title}</h4>
          <p className="mt-2 text-sm leading-5 text-slate-300">{active.description}</p>
          <p className="mt-1 text-sm leading-5 text-amber-100">{active.consequence}</p>
        </div>
        <p className="border-t border-white/12 px-4 py-2.5 text-sm text-slate-400">
          RKS / B3LYP · 6-31G* · q = 0 · singlet
        </p>
      </MechanismPanel>
    );
  }

  return (
    <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.desktopOverlay}`}>
      <MechanismHeader
        tone="amber"
        title={
          ko
            ? "계산 전에 전자구조 모델을 선택한다"
            : "Choose the electronic-structure model before solving"
        }
        description={
          ko
            ? "수렴 여부는 계산이 끝났다는 뜻이다. 어떤 모델의 답인지는 아래 선택이 정한다."
            : "Convergence says the calculation finished. These choices define which model produced the answer."
        }
        aside={
          <p className={MULTISCALE_TYPE.description}>
            RKS / B3LYP · 6-31G* · q = 0 · singlet
          </p>
        }
      />

      <div className="grid gap-px bg-white/10 p-px lg:grid-cols-[13rem_minmax(0,1fr)_15rem]">
        <section className="bg-[#080812]/96">
          {choices.map((choice, index) => (
            <button
              type="button"
              key={choice.short}
              className={`pointer-events-auto border-b border-white/10 px-4 py-4 text-left last:border-b-0 ${MULTISCALE_MOTION.stateTransition} ${index === activeChoice ? "opacity-100" : "opacity-38"}`}
              onMouseEnter={() => setActiveChoice(index)}
              onFocus={() => setActiveChoice(index)}
              onClick={() => setActiveChoice(index)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-base font-semibold ${index === activeChoice ? "text-amber-100" : "text-slate-300"}`}>
                  {choice.short}
                </p>
                <span className="text-sm text-slate-500">{choice.value}</span>
              </div>
            </button>
          ))}
        </section>

        <section className="h-[17rem] bg-[#080812]/96">{choiceVisual}</section>

        <section className="flex flex-col justify-center bg-[#080812]/96 px-5 py-4">
          <h4 className="text-lg font-semibold leading-6 text-slate-100">{active.title}</h4>
          <p className="mt-3 text-base leading-6 text-slate-300">{active.description}</p>
          <p className="mt-3 border-l-2 border-amber-300/65 pl-4 text-base leading-6 text-amber-100">
            {active.consequence}
          </p>
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

  const energyLevels = (
    <div className="relative h-full min-h-[10rem]">
      <div className="absolute inset-x-0 top-[18%] border-t border-slate-500/65">
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <MathNotation latex={String.raw`\varepsilon_{\mathrm L}`} className={`text-xl ${mode === "lumo" ? "text-sky-100" : "text-slate-400"}`} />
          <span className={`text-base tabular-nums ${mode === "lumo" ? "text-sky-100" : "text-slate-400"}`}>
            {typeof data.lumoEV === "number" ? `${data.lumoEV.toFixed(2)} eV` : "-"}
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[18%] border-t border-slate-500/65">
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <MathNotation latex={String.raw`\varepsilon_{\mathrm H}`} className={`text-xl ${mode === "homo" ? "text-sky-100" : "text-slate-400"}`} />
          <span className={`text-base tabular-nums ${mode === "homo" ? "text-sky-100" : "text-slate-400"}`}>
            {typeof data.homoEV === "number" ? `${data.homoEV.toFixed(2)} eV` : "-"}
          </span>
        </div>
      </div>
      {typeof gap === "number" ? (
        <div className="absolute bottom-[31%] right-2 top-[31%] flex w-24 items-center justify-end border-y border-r border-sky-300/45 pr-3">
          <div className="text-right">
            <p className="text-sm text-slate-400">{ko ? "KS 간격" : "KS gap"}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-sky-100">
              {gap.toFixed(2)} eV
            </p>
          </div>
        </div>
      ) : null}
      {mode === "density" ? (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 pr-28 text-sm leading-5 text-slate-300">
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
        <div className="border-b border-sky-300/25 bg-sky-950/12 px-4 py-3">
          <p className="text-base font-semibold text-sky-100">
            {ko ? "같은 계산에서 서로 다른 정보를 읽는다" : "Read different information from the same calculation"}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-400">
            {ko
              ? "위의 3D 표면과 아래 설명이 함께 바뀐다."
              : "The 3D surface above and the explanation below change together."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/10 p-px">
          {rows.map((row) => (
            <button
              type="button"
              key={row.id}
              className={`pointer-events-auto bg-[#080812]/96 px-3 py-3 text-left ${MULTISCALE_MOTION.stateTransition} ${mode === row.id ? "opacity-100" : "opacity-40"}`}
              onMouseEnter={() => data.onOutputModeChange?.(row.id)}
              onFocus={() => data.onOutputModeChange?.(row.id)}
              onClick={() => data.onOutputModeChange?.(row.id)}
            >
              <MathNotation
                latex={row.symbol}
                className={`text-xl ${mode === row.id ? "text-sky-100" : "text-slate-400"}`}
              />
              <p className="mt-2 text-sm font-semibold text-slate-200">{row.label}</p>
            </button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_10.5rem] gap-4 px-4 py-3">
          <div>
            <MathNotation latex={activeRow.symbol} className="text-3xl text-sky-100" />
            <h4 className="mt-2 text-lg font-semibold text-slate-100">{activeRow.label}</h4>
            <p className="mt-2 text-sm leading-5 text-slate-300">{activeRow.value}</p>
            <p className="mt-3 text-sm leading-5 text-slate-400">
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
          <div>{energyLevels}</div>
        </div>
        <p className="border-t border-white/12 px-4 py-2.5 text-sm leading-5 text-slate-400">
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

      <div className="grid gap-px bg-white/10 p-px lg:grid-cols-[minmax(30rem,1.15fr)_minmax(20rem,.85fr)]">
        <section className="bg-[#080812]/96">
          <div className="grid grid-cols-3 gap-px bg-white/10 p-px">
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                className={`pointer-events-auto bg-[#080812]/96 px-4 py-3 text-left ${MULTISCALE_MOTION.stateTransition} ${mode === row.id ? "opacity-100" : "opacity-38"}`}
                onMouseEnter={() => data.onOutputModeChange?.(row.id)}
                onFocus={() => data.onOutputModeChange?.(row.id)}
                onClick={() => data.onOutputModeChange?.(row.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <MathNotation
                    latex={row.symbol}
                    className={`text-2xl ${mode === row.id ? "text-sky-100" : "text-slate-400"}`}
                  />
                  <span className={`h-px w-8 ${mode === row.id ? "bg-sky-300" : "bg-slate-700"}`} />
                </div>
                <p className="mt-2 text-base font-semibold text-slate-100">{row.label}</p>
              </button>
            ))}
          </div>

          <div className="grid min-h-[11.5rem] grid-cols-[9rem_minmax(0,1fr)] gap-5 px-5 py-4">
            <div>
              <MathNotation latex={activeRow.symbol} className="text-4xl text-sky-100" />
              <p className="mt-3 text-base font-semibold text-slate-100">{activeRow.label}</p>
            </div>
            <div>
              <p className="text-lg font-semibold leading-7 text-slate-100">{activeRow.value}</p>
              <p className="mt-3 text-base leading-6 text-slate-300">
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

        <section className="bg-[#080812]/96 px-5 py-4">
          <h4 className="text-base font-semibold text-slate-100">
            {ko ? "경계 오비탈 에너지" : "Frontier-orbital energies"}
          </h4>
          <div className="mt-3 h-[12.5rem]">{energyLevels}</div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-5 border-t border-white/12 px-5 py-3">
        <p className="text-sm leading-5 text-slate-400">
          {ko
            ? "HOMO-LUMO 간격은 2.02 eV이다. 바닥상태 Kohn-Sham 오비탈의 차이이며 광학 들뜸 에너지로 직접 해석하지 않는다."
            : "The HOMO-LUMO gap is 2.02 eV. It is a ground-state Kohn-Sham orbital difference, not a direct optical excitation energy."}
        </p>
        <span className="shrink-0 text-sm font-semibold text-sky-100">
          {mode === "density" ? (ko ? "전자 밀도" : "DENSITY") : mode.toUpperCase()}
        </span>
      </div>
    </MechanismPanel>
  );
}

function D7Labels({ lang, isMobile }: { lang: string; isMobile: boolean }) {
  const ko = lang === "ko";
  const data = useDftMechanismData();
  const totalEnergy =
    typeof data.totalEnergyHa === "number" ? data.totalEnergyHa.toFixed(6) : undefined;
  const datasetRows = [
    {
      id: "01",
      source: ko ? "열적 분포" : "Thermal basin",
      descriptor: ko ? "평형 요동" : "Equilibrium fluctuations",
      purpose: ko ? "자주 만나는 상태 학습" : "Fit frequently visited states",
      split: "TRAIN",
      tone: "border-l-sky-300/70",
    },
    {
      id: "02",
      source: ko ? "변형된 셀" : "Strained cells",
      descriptor: ko ? "셀·결합 변형" : "Cell / bond deformation",
      purpose: ko ? "변형 구조의 보간 점검" : "Check deformed geometries",
      split: "VALIDATION",
      tone: "border-l-violet-300/70",
    },
    {
      id: "03",
      source: ko ? "희귀 사건 영역" : "Rare-event region",
      descriptor: ko ? "장벽·반응 영역" : "Barrier / reactive region",
      purpose: ko ? "어려운 물리를 독립 점검" : "Hold out difficult physics",
      split: "TEST",
      tone: "border-l-amber-300/70",
    },
  ];

  if (isMobile) {
    return (
      <MechanismPanel className={`dft-enter ${MULTISCALE_PANEL.mobileOverlay}`}>
        <div className="border-b border-amber-300/25 bg-amber-950/16 px-4 py-3">
          <p className={MULTISCALE_TYPE.panelTitle}>
            {ko
              ? "한 번의 DFT 계산이 한 개의 참조 레코드가 된다"
              : "One DFT calculation becomes one reference record"}
          </p>
          <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
            {ko
              ? "원자 구조, 계산 방법, 에너지와 힘을 한 묶음으로 저장한다."
              : "Atomic structure, calculation protocol, energy, and forces are stored together."}
          </p>
        </div>

        <section className="border-b border-white/12 px-4 py-3">
          <MathNotation
            latex={String.raw`\{Z_A,\mathbf R_A\}\xrightarrow{\ \mathrm{DFT}\ }\{E,\mathbf F\}`}
            className="block text-center text-[1.25rem] text-slate-50"
          />
          <div className="mt-3 grid grid-cols-2 gap-px bg-white/10 p-px">
            <div className="bg-[#090914] px-3 py-3">
              <p className="text-sm text-slate-400">{ko ? "총에너지" : "total energy"}</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-slate-100">
                {totalEnergy ? `${totalEnergy} Ha` : ko ? "불러오는 중" : "loading"}
              </p>
            </div>
            <div className="bg-[#090914] px-3 py-3">
              <p className="text-sm text-slate-400">{ko ? "원자별 힘" : "atomic forces"}</p>
              <MathNotation
                latex={String.raw`\mathbf F_A=-\nabla_A E`}
                className="mt-1 text-base text-slate-100"
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-3">
          <h4 className={MULTISCALE_TYPE.semititle}>
            {ko ? "데이터셋은 서로 다른 구조를 함께 담는다" : "The dataset combines different configurations"}
          </h4>
          <div className="mt-3 space-y-2">
            {datasetRows.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 border-l-2 bg-[#090914] px-3 py-2.5 ${row.tone}`}
              >
                <p className="text-sm font-semibold text-slate-100">{row.source}</p>
                <p className="text-sm leading-5 text-slate-400">{row.descriptor}</p>
                <span className="type-mono-meta text-xs text-slate-300">{row.split}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="border-t border-white/12 px-4 py-3 text-sm leading-5 text-slate-300">
          {ko
            ? "MLFF는 이 레코드들을 학습해 DFT 에너지와 힘을 더 큰 계에서 빠르게 재현한다."
            : "An MLFF learns these records to reproduce DFT energies and forces for larger systems at lower cost."}
        </p>
      </MechanismPanel>
    );
  }

  return (
    <InstrumentPanel className="dft-enter absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8">
      <div className="grid border-b border-amber-300/28 bg-amber-950/18 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
        <div>
          <span className="type-mono-meta text-xs tracking-[0.08em] text-amber-200">
            {ko ? "DFT 해에서 참조 데이터셋으로" : "FROM ONE DFT SOLVE TO A REFERENCE DATASET"}
          </span>
          <p className="mt-1 text-xl font-semibold leading-7 text-slate-50">
            {ko
              ? "DFT 계산마다 참조 레코드 하나가 쌓인다. 구성 공간을 덮는 레코드 집합이 데이터셋을 이룬다."
              : "Each DFT solve contributes one reference record. Coverage across configurations forms the dataset."}
          </p>
        </div>
        <MathNotation
          latex={
            ko
              ? String.raw`1\ \text{회 계산}\;\longrightarrow\;1\ \text{개 레코드}`
              : String.raw`1\ \mathrm{solve}\;\longrightarrow\;1\ \mathrm{record}`
          }
          className="mt-3 border-l border-amber-300/28 pl-5 text-2xl text-amber-100 sm:mt-0"
        />
      </div>

      <div className="grid gap-px bg-white/10 p-px lg:grid-cols-[minmax(22rem,.92fr)_minmax(28rem,1.08fr)]">
        <section className="dft-label-packet bg-[#080812]/96 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-semibold text-slate-100">
              {ko ? "참조 레코드 0001" : "REFERENCE RECORD 0001"}
            </span>
            <LayerBadge kind="schema" lang={lang} />
          </div>

          <div className="mt-3 border border-white/14 bg-[#090914] px-3 py-3">
            <MathNotation
              latex={String.raw`\{Z_A,\mathbf R_A\}\xrightarrow{\ \mathrm{DFT\ protocol}\ }\{E,\mathbf F,\boldsymbol{\sigma},\mathcal M\}`}
              className="block text-center text-xl text-slate-50"
            />
            <p className="mt-2 text-center text-sm leading-5 text-slate-400">
              {ko
                ? "입력 구조와 계산 프로토콜을 함께 보존해야 레이블의 의미가 재현된다."
                : "The input geometry and protocol must travel with the labels for the record to be reproducible."}
            </p>
          </div>

          <div className="mt-2 border border-white/12">
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/12 px-3 py-2">
              <span className="type-mono-meta text-xs tracking-[0.08em] text-slate-500">
                {ko ? "필드" : "FIELD"}
              </span>
              <span className="type-mono-meta text-xs tracking-[0.08em] text-slate-500">
                {ko ? "이 레코드의 값" : "VALUE IN THIS RECORD"}
              </span>
              <span className="type-mono-meta text-xs tracking-[0.08em] text-slate-500">
                {ko ? "출처" : "PROVENANCE"}
              </span>
            </div>

            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/12 px-3 py-2.5">
              <MathNotation latex="E" className="text-xl text-slate-100" />
              {totalEnergy ? (
                <MathNotation
                  latex={String.raw`${totalEnergy}\,\mathrm{Ha}`}
                  className="text-lg text-slate-50"
                />
              ) : (
                <span className="text-sm text-slate-400">
                  {ko ? "자산 로딩 중" : "Loading asset"}
                </span>
              )}
              <LayerBadge kind="calculated" lang={lang} />
            </div>

            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/12 px-3 py-2.5">
              <MathNotation
                latex={String.raw`\mathbf F_A=-\frac{\partial E}{\partial\mathbf R_A}`}
                className="text-base text-slate-300"
              />
              <span className="text-sm leading-5 text-slate-400">
                {ko ? "원자별 힘 배열 필드" : "Per-atom force-array field"}
              </span>
              <LayerBadge kind="unavailable" lang={lang} />
            </div>

            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/12 px-3 py-2.5">
              <MathNotation latex={String.raw`\boldsymbol{\sigma}`} className="text-xl text-slate-300" />
              <span className="text-sm leading-5 text-slate-400">
                {ko ? "주기계의 응력 텐서 필드" : "Stress-tensor field for periodic cells"}
              </span>
              <LayerBadge kind="unavailable" lang={lang} />
            </div>

            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
              <MathNotation latex={String.raw`\mathcal M`} className="text-xl text-slate-300" />
              <span className="text-sm leading-5 text-slate-300">
                RKS · B3LYP · 6-31G* · charge 0 · singlet
              </span>
              <LayerBadge kind="schema" lang={lang} />
            </div>
          </div>
        </section>

        <section className="dft-atlas bg-[#080812]/96 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-base font-semibold text-slate-100">
                {ko ? "레코드가 쌓여 데이터셋이 된다" : "RECORDS ACCUMULATE INTO A DATASET"}
              </span>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                {ko
                  ? "서로 다른 구성 공간 영역을 의도적으로 표본화하고, 역할에 따라 분할한다."
                  : "Sample distinct regions of configuration space deliberately, then assign each record a role."}
              </p>
            </div>
            <LayerBadge kind="schematic" lang={lang} />
          </div>

          <div className="mt-3 grid grid-cols-[2.5rem_minmax(7.5rem,.9fr)_minmax(8.5rem,1.1fr)_6.25rem] gap-x-2 border border-white/12 bg-[#090914] px-3 py-2">
            <span className="type-mono-meta text-xs text-slate-500">ID</span>
            <span className="type-mono-meta text-xs text-slate-500">
              {ko ? "구성 출처" : "CONFIGURATION SOURCE"}
            </span>
            <span className="type-mono-meta text-xs text-slate-500">
              {ko ? "데이터셋에서의 목적" : "PURPOSE IN THE DATASET"}
            </span>
            <span className="type-mono-meta text-xs text-slate-500">
              {ko ? "분할" : "SPLIT"}
            </span>
          </div>

          <div className="space-y-2 pt-2">
            {datasetRows.map((row, index) => (
              <div
                key={row.id}
                className={`dft-dataset-row grid grid-cols-[2.5rem_minmax(7.5rem,.9fr)_minmax(8.5rem,1.1fr)_6.25rem] items-center gap-x-2 border border-white/12 border-l-2 bg-[#090914] px-3 py-2.5 ${row.tone}`}
                style={{ animationDelay: `${0.65 + index * 0.55}s` }}
              >
                <span className="type-mono-meta text-sm text-slate-500">{row.id}</span>
                <div>
                  <span className="block text-base font-semibold text-slate-100">{row.source}</span>
                  <span className="block text-sm leading-5 text-slate-500">{row.descriptor}</span>
                </div>
                <span className="pr-3 text-sm leading-5 text-slate-300">{row.purpose}</span>
                <div>
                  <span className="type-mono-meta block text-xs tracking-[0.05em] text-slate-200">
                    {row.split}
                  </span>
                  <span className="mt-1 block text-xs text-amber-200">
                    {ko ? "구성 행 도식" : "schematic row"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-t border-white/12 pt-2">
            <MathNotation
              latex={String.raw`\mathcal D=\bigcup_{k=1}^{N}\mathrm{record}_k,\qquad N\gg1`}
              className="text-xl text-sky-100"
            />
            <p className="text-sm leading-5 text-slate-400">
              {ko
                ? "학습 모델의 유효 범위는 레코드가 덮는 물리 영역으로 정해진다."
                : "The physical domain covered by these records defines where the learned model can be trusted."}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-2 border-t border-white/12 px-4 py-3 text-sm leading-5 sm:grid-cols-2">
        <p className="text-slate-200">
          <span className="type-mono-meta mr-2 text-xs text-sky-200">
            {ko ? "레코드 스키마" : "RECORD SCHEMA"}
          </span>
          {ko ? "입력 → 프로토콜 → 레이블이라는 레코드 스키마" : "The input → protocol → label record schema"}
        </p>
        <p className="border-white/12 text-slate-400 sm:border-l sm:pl-4">
          <span className="type-mono-meta mr-2 text-xs text-amber-200">
            {ko ? "다음 화학계" : "NEXT CHEMICAL SYSTEM"}
          </span>
          {ko
            ? "다음 MLFF 장면은 다른 화학계에서 이 스키마가 어떻게 데이터셋이 되는지 보여 준다."
            : "The next MLFF scene changes the chemical system and shows how this schema becomes a dataset."}
        </p>
      </div>
    </InstrumentPanel>
  );
}

const SCENE_ARIA: Record<string, { en: string; ko: string }> = {
  D1_select: {
    en: "Question lens comparing electron-sensitive questions with sampling reach.",
    ko: "전자 민감 질문과 표본 도달 범위를 비교하는 질문 렌즈.",
  },
  D2_pes: {
    en: "Schematic local potential-energy projection showing force as the negative slope.",
    ko: "힘을 에너지의 음의 기울기로 보여 주는 국소 퍼텐셜 에너지 투영 도식.",
  },
  D3_ks: {
    en: "Kohn-Sham feedback loop in which orbitals create density and density rebuilds the effective Hamiltonian.",
    ko: "오비탈이 밀도를 만들고 밀도가 유효 해밀토니안을 다시 만드는 Kohn-Sham 피드백 고리.",
  },
  D4_scf: {
    en: "Self-consistent field cycle synchronized with the selected total-density iteration.",
    ko: "선택된 총 전자 밀도 반복과 연결된 자기일관장 순환.",
  },
  D5_recipe: {
    en: "Provenance-bearing calculation recipe for the displayed calculation.",
    ko: "표시된 계산의 출처와 설정을 담은 계산 레시피.",
  },
  D6_outputs: {
    en: "Calculated density, HOMO, and LUMO outputs with asset-derived energies.",
    ko: "자산에서 읽은 에너지를 포함한 계산 밀도, HOMO, LUMO 출력.",
  },
  D7_labels: {
    en: "One provenance-bearing DFT reference record accumulating with schematic configuration rows into a dataset.",
    ko: "출처가 명시된 DFT 참조 레코드 하나가 구성 행 도식과 함께 데이터셋으로 쌓이는 장면.",
  },
};

export function DftMechanism({
  sceneKey,
  lang,
  reducedMotion = false,
  isMobile = false,
}: {
  sceneKey: string;
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
      {sceneKey === "D1_select" ? (
        <D1Selection lang={lang} isMobile={isMobile} />
      ) : null}
      {sceneKey === "D2_pes" ? (
        <D2Pes
          lang={lang}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
        />
      ) : null}
      {sceneKey === "D3_ks" ? (
        <D3KohnSham lang={lang} isMobile={isMobile} />
      ) : null}
      {sceneKey === "D4_scf" ? <D4Scf lang={lang} isMobile={isMobile} /> : null}
      {sceneKey === "D5_recipe" ? (
        <D5Recipe
          lang={lang}
          isMobile={isMobile}
        />
      ) : null}
      {sceneKey === "D6_outputs" ? <D6Outputs lang={lang} isMobile={isMobile} /> : null}
      {sceneKey === "D7_labels" ? (
        <D7Labels lang={lang} isMobile={isMobile} />
      ) : null}

      <style>{`
        .dft-mechanism .dft-enter {
          animation: dft-mechanism-enter 520ms var(--ease-ledger) both;
        }
        .dft-mechanism .dft-select-lens {
          animation: dft-select-lens 5.6s var(--ease-ledger) both;
          transform-origin: 500px 340px;
        }
        .dft-mechanism .dft-select-scan {
          animation: dft-select-scan 4.8s var(--ease-ledger) 420ms both;
        }
        .dft-mechanism .dft-select-detail {
          animation: dft-scale-full 3.8s var(--ease-ledger) 900ms both;
        }
        .dft-mechanism .dft-select-reach {
          animation: dft-scale-short 3.8s var(--ease-ledger) 900ms both;
        }
        .dft-mechanism .dft-decision-probe {
          animation: dft-decision-probe 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-decision-route {
          animation: dft-decision-route 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-mobile-probe {
          opacity: 0;
          animation: dft-mobile-probe 9s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-mobile-probe:first-child {
          opacity: 1;
        }
        .dft-mechanism .dft-ks-mobile-step {
          animation: dft-ks-mobile-step 4.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-bond-form {
          animation: dft-bond-form 3.8s var(--ease-ledger) infinite;
          transform-box: fill-box;
          transform-origin: left center;
        }
        .dft-mechanism .dft-bond-partner {
          animation: dft-bond-partner 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-bond-density {
          animation: dft-bond-density 3.8s var(--ease-ledger) infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .dft-mechanism .dft-charge-transfer {
          animation: dft-charge-transfer 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-charge-donor-halo {
          animation: dft-charge-donor-halo 3.8s var(--ease-ledger) infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .dft-mechanism .dft-charge-acceptor-halo {
          animation: dft-charge-acceptor-halo 3.8s var(--ease-ledger) infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .dft-mechanism .dft-charge-plus,
        .dft-mechanism .dft-charge-minus {
          animation: dft-charge-sign 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-spin-ls {
          animation: dft-spin-ls 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-spin-hs {
          animation: dft-spin-hs 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-spin-path {
          animation: dft-spin-path 3.8s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-pes-state-left,
        .dft-mechanism .dft-pes-state-minimum,
        .dft-mechanism .dft-pes-state-right {
          opacity: .12;
        }
        .dft-mechanism .dft-pes-state-left {
          animation: dft-pes-state-left 7.2s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-pes-state-minimum {
          animation: dft-pes-state-minimum 7.2s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-pes-state-right {
          animation: dft-pes-state-right 7.2s var(--ease-ledger) infinite;
        }
        .dft-mechanism .dft-pes-tangent {
          animation: dft-tangent-in 5.6s var(--ease-ledger) both;
          transform-origin: 346px 95px;
        }
        .dft-mechanism .dft-q-line {
          animation: dft-q-line 5.6s var(--ease-ledger) both;
          transform-origin: 80px 20px;
        }
        .dft-mechanism .dft-q-left {
          animation: dft-q-left 5.6s var(--ease-ledger) both;
        }
        .dft-mechanism .dft-q-right {
          animation: dft-q-right 5.6s var(--ease-ledger) both;
        }
        .dft-mechanism .dft-recipe-item {
          animation: dft-term-in 520ms var(--ease-ledger) both;
        }
        .dft-mechanism .dft-xc-focus {
          animation: dft-xc-focus 1.8s ease-in-out infinite;
        }
        .dft-mechanism .dft-basis-shell {
          animation: dft-basis-shell 2.2s ease-in-out infinite;
        }
        .dft-mechanism .dft-math .katex {
          font-size: 1em;
        }
        .dft-mechanism .dft-math .katex-display {
          margin: 0;
        }
        .dft-mechanism .dft-ks-flow {
          stroke: rgba(251, 191, 36, .78);
          stroke-width: 2;
          stroke-dasharray: 12 9;
          animation: dft-ks-flow 1.8s linear infinite;
        }
        .dft-mechanism .dft-ks-feedback {
          stroke-width: 2.8;
        }
        .dft-mechanism .dft-label-packet {
          animation: dft-packet-in 720ms var(--ease-ledger) both;
        }
        .dft-mechanism .dft-atlas {
          animation: dft-atlas-in 720ms var(--ease-ledger) 280ms both;
        }
        .dft-mechanism .dft-dataset-row {
          animation: dft-dataset-row 620ms var(--ease-ledger) both;
        }
        @keyframes dft-mechanism-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dft-xc-focus {
          0%, 100% {
            border-color: rgba(252, 211, 77, .34);
            background-color: rgba(120, 53, 15, .12);
          }
          50% {
            border-color: rgba(252, 211, 77, .76);
            background-color: rgba(120, 53, 15, .26);
          }
        }
        @keyframes dft-basis-shell {
          0%, 100% { opacity: .35; transform: scale(.94); }
          50% { opacity: .9; transform: scale(1.04); }
        }
        @keyframes dft-select-lens {
          0% { opacity: .38; transform: scale(.72); }
          48% { opacity: 1; transform: scale(1); }
          100% { opacity: .86; transform: scale(1); }
        }
        @keyframes dft-select-scan {
          0% { opacity: 0; transform: translateY(-116px); }
          18% { opacity: .85; }
          72% { opacity: .85; }
          100% { opacity: 0; transform: translateY(116px); }
        }
        @keyframes dft-scale-full {
          from { opacity: .3; transform: scaleX(.18); }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes dft-scale-short {
          from { opacity: 1; transform: scaleX(1); }
          to { opacity: .55; transform: scaleX(.34); }
        }
        @keyframes dft-decision-probe {
          0%, 18% { transform: translateX(-2px); background: transparent; }
          42%, 72% { transform: translateX(0); background: rgba(56,189,248,.035); }
          100% { transform: translateX(0); background: transparent; }
        }
        @keyframes dft-decision-route {
          0%, 30% { border-color: rgba(125,211,252,.22); background: transparent; }
          58%, 100% { border-color: rgba(125,211,252,.66); background: rgba(14,116,144,.12); }
        }
        @keyframes dft-mobile-probe {
          0%, 28% { opacity: 1; transform: translateX(0); }
          34%, 94% { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes dft-ks-mobile-step {
          0%, 18% { border-color: rgba(251,191,36,.58); background: rgba(120,53,15,.2); transform: translateX(0); }
          30%, 100% { transform: translateX(0); }
        }
        @keyframes dft-bond-form {
          0%, 18% { opacity: .15; transform: scaleX(.12); }
          48%, 78% { opacity: 1; transform: scaleX(1); }
          100% { opacity: .3; transform: scaleX(.35); }
        }
        @keyframes dft-bond-partner {
          0%, 18% { transform: translateX(22px); }
          48%, 78% { transform: translateX(0); }
          100% { transform: translateX(16px); }
        }
        @keyframes dft-bond-density {
          0%, 18% { opacity: 0; transform: scaleX(.2); }
          48%, 78% { opacity: .34; transform: scaleX(1); }
          100% { opacity: .08; transform: scaleX(.35); }
        }
        @keyframes dft-charge-transfer {
          0%, 18% { transform: translateX(0); }
          55%, 78% { transform: translateX(52px); }
          100% { transform: translateX(0); }
        }
        @keyframes dft-charge-donor-halo {
          0%, 18% { opacity: .15; transform: scale(.7); }
          55%, 78% { opacity: .85; transform: scale(1); }
          100% { opacity: .15; transform: scale(.7); }
        }
        @keyframes dft-charge-acceptor-halo {
          0%, 18% { opacity: .12; transform: scale(.7); }
          55%, 78% { opacity: 1; transform: scale(1.08); }
          100% { opacity: .12; transform: scale(.7); }
        }
        @keyframes dft-charge-sign {
          0%, 24% { opacity: 0; transform: translateY(3px); }
          55%, 78% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(3px); }
        }
        @keyframes dft-spin-ls {
          0%, 28% { opacity: 1; }
          48%, 82% { opacity: .08; }
          100% { opacity: 1; }
        }
        @keyframes dft-spin-hs {
          0%, 28% { opacity: .08; }
          48%, 82% { opacity: 1; }
          100% { opacity: .08; }
        }
        @keyframes dft-spin-path {
          0%, 24% { opacity: 0; stroke-dashoffset: 18; }
          42%, 64% { opacity: .8; stroke-dashoffset: 0; }
          82%, 100% { opacity: 0; stroke-dashoffset: -18; }
        }
        @keyframes dft-pes-state-left {
          0%, 24% { opacity: 1; }
          31%, 93% { opacity: .12; }
          100% { opacity: 1; }
        }
        @keyframes dft-pes-state-minimum {
          0%, 27% { opacity: .12; }
          35%, 58% { opacity: 1; }
          66%, 100% { opacity: .12; }
        }
        @keyframes dft-pes-state-right {
          0%, 61% { opacity: .12; }
          69%, 92% { opacity: 1; }
          100% { opacity: .12; }
        }
        @keyframes dft-tangent-in {
          0%, 58% { opacity: 0; transform: scale(.72); }
          76%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes dft-q-line {
          0%, 18% { transform: scaleX(.7); }
          72%, 100% { transform: scaleX(1.42); }
        }
        @keyframes dft-q-left {
          0%, 18% { transform: translateX(8px); }
          72%, 100% { transform: translateX(-11px); }
        }
        @keyframes dft-q-right {
          0%, 18% { transform: translateX(-8px); }
          72%, 100% { transform: translateX(11px); }
        }
        @keyframes dft-term-in {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dft-ks-flow {
          from { stroke-dashoffset: 42; opacity: .42; }
          42% { opacity: 1; }
          to { stroke-dashoffset: 0; opacity: .72; }
        }
        @keyframes dft-packet-in {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes dft-atlas-in {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes dft-dataset-row {
          from { opacity: 0; transform: translateY(10px); }
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
