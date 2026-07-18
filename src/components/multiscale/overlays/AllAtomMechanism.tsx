"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import {
  normalizeAllAtomSceneKey,
  type AllAtomForceFieldTerm,
  type AllAtomReadoutId,
  type AllAtomSceneKey,
} from "../allatom/allAtomConfig";
import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";
import { ObservableTrace } from "./allatom/ObservableTrace";

export interface AllAtomMechanismProps {
  sceneKey: string;
  lang: string;
  reducedMotion?: boolean;
  isMobile?: boolean;
  activeTerm?: AllAtomForceFieldTerm | null;
  activeReadout?: AllAtomReadoutId | null;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
  onReadoutChange?: (readout: AllAtomReadoutId) => void;
}

function Formula({
  value,
  display = false,
  className = "",
}: {
  value: string;
  display?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`scientific-inline-math ${className}`}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, {
          throwOnError: false,
          displayMode: display,
        }),
      }}
    />
  );
}

const COPY: Record<
  AllAtomSceneKey,
  {
    en: { title: string; description: string };
    ko: { title: string; description: string };
  }
> = {
  A1_branch: {
    en: {
      title: "The atoms stay explicit; the energy model changes",
      description:
        "MLFF and classical force fields operate at the same atomic resolution, but their parameters and valid use cases come from different evidence.",
    },
    ko: {
      title: "원자는 그대로 두고 에너지 모형을 바꾼다",
      description:
        "MLFF와 고전 역장은 같은 원자 해상도를 사용하지만, 매개변수의 출처와 신뢰할 수 있는 사용 범위가 다르다.",
    },
  },
  A2_pbc: {
    en: {
      title: "One periodic cell represents bulk material",
      description:
        "A molecule leaving one face re-enters through the opposite face. Pair distances use the nearest periodic image.",
    },
    ko: {
      title: "하나의 주기 셀로 벌크 환경을 나타낸다",
      description:
        "한 면을 통과한 분자는 반대편으로 다시 들어온다. 입자 사이 거리는 가장 가까운 주기 이미지로 계산한다.",
    },
  },
  A3_forcefield: {
    en: {
      title: "A force field assigns energy to molecular geometry",
      description:
        "Bonded terms preserve local molecular shape; nonbonded terms describe packing, dispersion, and electrostatics.",
    },
    ko: {
      title: "역장은 분자 구조에 에너지를 부여한다",
      description:
        "결합 항은 분자의 국소 구조를 유지하고, 비결합 항은 분자 사이 배치·분산·정전기를 나타낸다.",
    },
  },
  A4_integrate: {
    en: {
      title: "Forces advance the trajectory one finite step",
      description:
        "The energy gradient gives forces. An integrator updates velocities and positions over a chosen timestep.",
    },
    ko: {
      title: "힘으로 궤적을 한 시간 간격씩 진행한다",
      description:
        "에너지 기울기에서 힘을 구하고, 적분기가 정한 시간 간격만큼 속도와 위치를 갱신한다.",
    },
  },
  A5_ensemble: {
    en: {
      title: "Preparation leads to the ensemble used for measurement",
      description:
        "Minimization removes severe clashes, equilibration establishes the state point, and production frames provide samples.",
    },
    ko: {
      title: "준비 과정을 거쳐 측정에 사용할 앙상블을 만든다",
      description:
        "에너지 최소화로 큰 충돌을 줄이고, 평형화로 상태점을 맞춘 뒤 생산 구간의 프레임을 표본으로 사용한다.",
    },
  },
  A6_observables: {
    en: {
      title: "Scientific observables come from a sequence of frames",
      description:
        "The same production trajectory can be projected into hydration, packing, orientation, or other measurable quantities.",
    },
    ko: {
      title: "연속된 프레임에서 연구 관측량을 계산한다",
      description:
        "같은 생산 궤적에서 수화, 분자 배치, 방향성 등 연구 질문에 맞는 물리량을 계산한다.",
    },
  },
  A7_mapping: {
    en: {
      title: "Coarse-graining begins by defining what each bead retains",
      description:
        "An atom-to-bead map, target observables, state point, and validation plan form the handoff to the mesoscale model.",
    },
    ko: {
      title: "각 비드가 무엇을 보존할지 정하며 조대화를 시작한다",
      description:
        "원자-비드 매핑, 보존할 관측량, 상태점, 검증 계획을 다음 메조스케일 모형으로 전달한다.",
    },
  },
};

const tone = {
  cyan: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  violet: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  amber: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  rose: "border-rose-300/35 bg-rose-300/10 text-rose-100",
  neutral: "border-white/14 bg-white/[0.035] text-slate-200",
} as const;

function A1Branch({ ko }: { ko: boolean }) {
  const choices = [
    {
      label: "MLFF",
      source: ko ? "DFT 참조 데이터로 학습" : "trained on DFT reference data",
      use: ko ? "화학 반응성과 양자 정확도가 필요할 때" : "when reactive or quantum-level accuracy is needed",
      cost: ko ? "학습 데이터 생성 비용이 큼" : "high upfront data-generation cost",
      color: tone.violet,
    },
    {
      label: ko ? "고전 역장" : "Classical force field",
      source: ko ? "미리 정한 함수형과 독립 매개변수" : "fixed analytic form and independent parameters",
      use: ko ? "화학 결합이 유지되는 큰 계를 오래 표본화할 때" : "when fixed chemistry must be sampled for long times",
      cost: ko ? "결합 변화와 전자 재배열을 직접 다루지 않음" : "does not directly resolve bond changes or electronic rearrangement",
      color: tone.cyan,
    },
  ];
  return (
    <div className="grid gap-3 p-5 md:grid-cols-2">
      {choices.map((choice) => (
        <article key={choice.label} className={`border p-4 ${choice.color}`}>
          <h4 className={MULTISCALE_TYPE.panelTitle}>{choice.label}</h4>
          <dl className="mt-4 grid gap-3 text-sm leading-5">
            <div>
              <dt className={MULTISCALE_TYPE.metadata}>{ko ? "근거" : "PROVENANCE"}</dt>
              <dd className="mt-1 text-slate-200">{choice.source}</dd>
            </div>
            <div>
              <dt className={MULTISCALE_TYPE.metadata}>{ko ? "선택할 때" : "CHOOSE WHEN"}</dt>
              <dd className="mt-1 text-slate-200">{choice.use}</dd>
            </div>
            <div>
              <dt className={MULTISCALE_TYPE.metadata}>{ko ? "제약" : "LIMIT"}</dt>
              <dd className="mt-1 text-slate-300">{choice.cost}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function A2Pbc({ ko, reducedMotion }: { ko: boolean; reducedMotion: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(20rem,.95fr)_minmax(0,1.05fr)] lg:items-center">
      <svg viewBox="0 0 390 230" className="h-52 w-full" role="img" aria-label={ko ? "3×3 주기 셀과 경계 통과" : "3 by 3 periodic cells and boundary crossing"}>
        {Array.from({ length: 9 }, (_, index) => {
          const x = 16 + (index % 3) * 122;
          const y = 16 + Math.floor(index / 3) * 67;
          const center = index === 4;
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width="112"
              height="57"
              fill={center ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.018)"}
              stroke={center ? "#67e8f9" : "rgba(148,163,184,.25)"}
              strokeWidth={center ? 2 : 1}
            />
          );
        })}
        <line x1="145" y1="111" x2="263" y2="111" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 5" />
        <circle cx={reducedMotion ? 249 : 160} cy="111" r="8" fill="#f8fafc" stroke="#67e8f9" strokeWidth="3">
          {!reducedMotion ? (
            <animate attributeName="cx" values="160;260;140;160" keyTimes="0;.48;.5;1" dur="5s" repeatCount="indefinite" />
          ) : null}
        </circle>
        <text x="195" y="102" fill="#fcd34d" fontSize="14" textAnchor="middle">
          {ko ? "최소 이미지 거리" : "minimum-image distance"}
        </text>
      </svg>
      <div className="grid gap-4">
        <div className={`border border-cyan-300/25 bg-cyan-300/[0.05] p-4 ${MULTISCALE_TYPE.formula}`}>
          <Formula value="\mathbf r_{ij}^{\mathrm{MIC}}=\mathbf r_{ij}-\mathbf L\,\operatorname{nint}(\mathbf r_{ij}/\mathbf L)" display />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-cyan-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "계산 입자 수" : "Particle count"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "주변 복제 셀은 같은 입자의 이미지이며 새 입자를 추가하지 않는다." : "Neighboring tiles are images of the same particles, not additional particles."}
            </p>
          </div>
          <div className="border-l-2 border-amber-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "상호작용 거리" : "Pair distance"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "경계를 가로질러 가장 가까운 이미지까지의 벡터를 사용한다." : "Use the vector to the nearest image across the boundary."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FORCE_TERMS: Record<
  AllAtomForceFieldTerm,
  {
    label: { en: string; ko: string };
    family: { en: string; ko: string };
    formula: string;
    mobileFormula?: string;
    meaning: { en: string; ko: string };
    color: keyof typeof tone;
  }
> = {
  Ubond: {
    label: { en: "Bond", ko: "결합" },
    family: { en: "bonded", ko: "결합 항" },
    formula: String.raw`U_{\mathrm{bond}}=\sum_b \frac{k_b}{2}(r_b-r_{0,b})^2`,
    meaning: { en: "Penalizes stretching away from the reference bond length.", ko: "결합 길이가 기준값에서 벗어날 때 에너지가 증가한다." },
    color: "cyan",
  },
  Uangle: {
    label: { en: "Angle", ko: "결합각" },
    family: { en: "bonded", ko: "결합 항" },
    formula: String.raw`U_{\mathrm{angle}}=\sum_a \frac{k_a}{2}(\theta_a-\theta_{0,a})^2`,
    meaning: { en: "Maintains local molecular geometry around a central atom.", ko: "중심 원자 주변의 국소 분자 구조를 유지한다." },
    color: "violet",
  },
  Udihedral: {
    label: { en: "Dihedral", ko: "이면각" },
    family: { en: "bonded", ko: "결합 항" },
    formula: String.raw`U_{\mathrm{dihedral}}=\sum_n k_n[1+\cos(n\phi-\delta_n)]`,
    meaning: { en: "Controls rotation and conformational preferences around bonds.", ko: "결합 주위 회전과 선호하는 분자 형태를 정한다." },
    color: "amber",
  },
  UvdW: {
    label: { en: "van der Waals", ko: "반데르발스" },
    family: { en: "nonbonded", ko: "비결합 항" },
    formula: String.raw`U_{\mathrm{vdW}}=\sum_{i<j}4\varepsilon_{ij}\left[(\sigma_{ij}/r_{ij})^{12}-(\sigma_{ij}/r_{ij})^6\right]`,
    mobileFormula: String.raw`\begin{aligned}U_{\mathrm{vdW}}=\sum_{i<j}4\varepsilon_{ij}\big[&(\sigma_{ij}/r_{ij})^{12}\\[-2pt]&-(\sigma_{ij}/r_{ij})^6\big]\end{aligned}`,
    meaning: { en: "Combines short-range repulsion with dispersion attraction.", ko: "짧은 거리 반발과 분산 인력을 함께 나타낸다." },
    color: "rose",
  },
  UCoul: {
    label: { en: "Electrostatics", ko: "정전기" },
    family: { en: "nonbonded", ko: "비결합 항" },
    formula: String.raw`U_{\mathrm{Coul}}=\sum_{i<j}\frac{q_iq_j}{4\pi\varepsilon_0 r_{ij}}`,
    meaning: { en: "Charges attract or repel; periodic long-range interactions are evaluated with PME.", ko: "전하 사이 인력과 반발을 계산하며, 주기계의 장거리 항은 PME로 처리한다." },
    color: "cyan",
  },
};

function A3ForceField({
  ko,
  activeTerm,
  onTermChange,
}: {
  ko: boolean;
  activeTerm: AllAtomForceFieldTerm;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
}) {
  const selected = FORCE_TERMS[activeTerm];
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(17rem,.72fr)_minmax(0,1.28fr)]">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="tablist" aria-label={ko ? "역장 에너지 항" : "force-field energy terms"}>
        {(Object.keys(FORCE_TERMS) as AllAtomForceFieldTerm[]).map((term) => {
          const item = FORCE_TERMS[term];
          const selectedNow = activeTerm === term;
          return (
            <button
              key={term}
              type="button"
              role="tab"
              aria-selected={selectedNow}
              onMouseEnter={() => onTermChange?.(term)}
              onFocus={() => onTermChange?.(term)}
              onClick={() => onTermChange?.(term)}
              className={`grid min-h-12 grid-cols-[1fr_auto] items-center border px-3 text-left transition-colors ${
                selectedNow ? tone[item.color] : tone.neutral
              }`}
            >
              <span className="font-semibold">{item.label[ko ? "ko" : "en"]}</span>
              <span className={MULTISCALE_TYPE.metadata}>{item.family[ko ? "ko" : "en"]}</span>
            </button>
          );
        })}
      </div>
      <div className={`grid content-center border p-5 ${tone[selected.color]}`}>
        <p className={MULTISCALE_TYPE.metadata}>{selected.label[ko ? "ko" : "en"]}</p>
        <div className={`mt-3 hidden sm:block ${MULTISCALE_TYPE.formula}`}>
          <Formula value={selected.formula} display />
        </div>
        <div className={`mt-3 sm:hidden ${MULTISCALE_TYPE.formulaCompact}`}>
          <Formula value={selected.mobileFormula ?? selected.formula} display />
        </div>
        <p className={`mt-4 ${MULTISCALE_TYPE.body}`}>{selected.meaning[ko ? "ko" : "en"]}</p>
      </div>
    </div>
  );
}

function A4Integrator({ ko }: { ko: boolean }) {
  const steps = [
    [ko ? "현재 좌표" : "Coordinates", "Rₙ", "neutral"],
    [ko ? "에너지와 힘" : "Energy and force", "Fₙ = −∇U(Rₙ)", "cyan"],
    [ko ? "유한 시간 갱신" : "Finite timestep", "Δt = 2 fs", "amber"],
    [ko ? "다음 좌표" : "Next coordinates", "Rₙ₊₁, vₙ₊₁", "violet"],
  ] as const;
  return (
    <div className="grid gap-4 p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
        {steps.map(([label, math, color], index) => (
          <div key={label} className="contents">
            <div className={`min-h-24 border p-3 ${tone[color]}`}>
              <p className="text-base font-semibold">{label}</p>
              <p className="mt-3 font-mono text-sm opacity-80">{math}</p>
            </div>
            {index < steps.length - 1 ? <span className="hidden text-2xl text-slate-500 sm:block">→</span> : null}
          </div>
        ))}
      </div>
      <div className="grid gap-3 border-t border-white/12 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.7fr)]">
        <div className={MULTISCALE_TYPE.formula}>
          <Formula value="m_i\ddot{\mathbf R}_i=-\nabla_{\mathbf R_i}U(\mathbf R)" display />
        </div>
        <p className={`${MULTISCALE_TYPE.body} border-l-2 border-amber-300/70 pl-4`}>
          {ko
            ? "시간 간격이 너무 크면 빠른 진동을 놓쳐 궤적이 불안정해진다. 구속 조건과 열적 갱신은 선택한 적분 알고리즘에 포함된다."
            : "A timestep that is too large misses fast vibrations and destabilizes the trajectory. Constraints and thermal updates belong to the chosen integration scheme."}
        </p>
      </div>
    </div>
  );
}

const ENSEMBLE_STAGES = [
  {
    en: ["Initial structure", "Starting coordinates; not yet an equilibrium sample."],
    ko: ["초기 구조", "계산을 시작할 좌표이며 아직 평형 표본이 아니다."],
    meta: "R₀",
  },
  {
    en: ["Energy minimization", "Remove severe steric clashes before dynamics."],
    ko: ["에너지 최소화", "동역학 전에 큰 입체 충돌을 줄인다."],
    meta: "minimize",
  },
  {
    en: ["NPT equilibration", "Adjust density and box size at the target pressure."],
    ko: ["NPT 평형화", "목표 압력에서 밀도와 상자 크기를 맞춘다."],
    meta: "32 ps",
  },
  {
    en: ["NVT production", "Collect frames at fixed volume and temperature."],
    ko: ["NVT 생산", "부피와 온도를 고정한 상태에서 분석할 프레임을 모은다."],
    meta: "20 ps",
  },
] as const;

function A5Ensemble({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ENSEMBLE_STAGES.map((stage, index) => {
          const [title, description] = stage[ko ? "ko" : "en"];
          return (
            <article key={stage.meta} className={`relative min-h-36 border p-3 ${index === 3 ? tone.cyan : tone.neutral}`}>
              <p className={MULTISCALE_TYPE.metadata}>0{index + 1} · {stage.meta}</p>
              <p className="mt-3 text-base font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-5 opacity-70">{description}</p>
            </article>
          );
        })}
      </div>
      <p className={`${MULTISCALE_TYPE.body} border-l-2 border-cyan-300/70 pl-4`}>
        {ko
          ? "상태점과 생산 앙상블은 연구 질문에 맞춰 정한다. 준비 구간의 프레임을 생산 표본과 섞지 않는다."
          : "The state point and production ensemble follow the scientific question. Preparation frames are not mixed with production samples."}
      </p>
    </div>
  );
}

const READOUTS: Record<
  AllAtomReadoutId,
  { en: [string, string]; ko: [string, string] }
> = {
  orientation: {
    en: ["Orientation", "How molecular axes align relative to neighbors or an interface."],
    ko: ["방향성", "분자 축이 이웃 분자나 계면에 대해 어떻게 정렬되는지 계산한다."],
  },
  packing: {
    en: ["Packing", "How close molecular centers and aromatic planes approach one another."],
    ko: ["분자 배치", "분자 중심과 방향족 평면이 서로 얼마나 가깝게 배치되는지 계산한다."],
  },
  motif: {
    en: ["Interaction motif", "Count recurring hydration, stacking, or contact patterns."],
    ko: ["상호작용 모티프", "반복해서 나타나는 수화·적층·접촉 패턴을 센다."],
  },
};

function A6Observables({
  ko,
  reducedMotion,
  activeReadout,
  onReadoutChange,
  lang,
}: {
  ko: boolean;
  reducedMotion: boolean;
  activeReadout: AllAtomReadoutId;
  onReadoutChange?: (readout: AllAtomReadoutId) => void;
  lang: string;
}) {
  const selected = READOUTS[activeReadout][ko ? "ko" : "en"];
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(17rem,.7fr)]">
      <div className="border border-white/12 bg-white/[0.02] p-3">
        <ObservableTrace lang={lang} reducedMotion={reducedMotion} />
      </div>
      <div className="grid content-start gap-2">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1" role="tablist" aria-label={ko ? "궤적 관측량" : "trajectory readouts"}>
          {(Object.keys(READOUTS) as AllAtomReadoutId[]).map((readout) => {
            const [label] = READOUTS[readout][ko ? "ko" : "en"];
            const selectedNow = activeReadout === readout;
            return (
              <button
                key={readout}
                type="button"
                role="tab"
                aria-selected={selectedNow}
                onMouseEnter={() => onReadoutChange?.(readout)}
                onFocus={() => onReadoutChange?.(readout)}
                onClick={() => onReadoutChange?.(readout)}
                className={`min-h-12 border px-3 text-left text-sm font-semibold transition-colors ${
                  selectedNow ? tone.cyan : tone.neutral
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 border-l-2 border-cyan-300/70 pl-4">
          <p className={MULTISCALE_TYPE.semititle}>{selected[0]}</p>
          <p className={`mt-2 ${MULTISCALE_TYPE.description}`}>{selected[1]}</p>
        </div>
      </div>
    </div>
  );
}

function AtomToBeadMap({ ko }: { ko: boolean }) {
  return (
    <svg viewBox="0 0 430 170" className="h-40 w-full" role="img" aria-label={ko ? "원자 그룹을 세 개의 비드로 매핑" : "mapping atom groups to three beads"}>
      {([
        [45, 80, "#94a3b8"],
        [67, 53, "#3b82f6"],
        [82, 91, "#ef4444"],
        [110, 67, "#94a3b8"],
        [139, 93, "#3b82f6"],
        [158, 58, "#94a3b8"],
        [184, 84, "#ef4444"],
      ] as const).map(([cx, cy, fill], index) => (
        <circle key={index} cx={cx} cy={cy} r="10" fill={fill} />
      ))}
      <ellipse cx="67" cy="75" rx="45" ry="52" fill="none" stroke="#67e8f9" strokeWidth="2" strokeDasharray="7 5" />
      <ellipse cx="145" cy="75" rx="51" ry="52" fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="7 5" />
      <line x1="215" y1="76" x2="270" y2="76" stroke="#94a3b8" strokeWidth="2" />
      <path d="M260 68 L272 76 L260 84" fill="none" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="318" cy="76" r="25" fill="#22d3ee" fillOpacity=".8" />
      <circle cx="382" cy="76" r="25" fill="#a78bfa" fillOpacity=".8" />
      <line x1="343" y1="76" x2="357" y2="76" stroke="#e2e8f0" strokeWidth="5" />
      <text x="327" y="133" fill="#cbd5e1" fontSize="14" textAnchor="middle">
        {ko ? "조대화 비드" : "coarse-grained beads"}
      </text>
    </svg>
  );
}

function A7Mapping({ ko }: { ko: boolean }) {
  const fields = [
    [ko ? "매핑" : "Mapping", "M(R)"],
    [ko ? "보존할 관측량" : "Target observables", "A(R)"],
    [ko ? "상태점" : "State point", "(T, P, c)"],
    [ko ? "검증 계획" : "Validation plan", "AA ↔ CG"],
  ];
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1fr)] lg:items-center">
      <AtomToBeadMap ko={ko} />
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([label, value]) => (
          <div key={label} className="min-h-20 border border-cyan-300/25 bg-cyan-300/[0.045] p-3">
            <p className={MULTISCALE_TYPE.metadata}>{label}</p>
            <p className="mt-2 font-mono text-base text-cyan-100">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneContent({
  sceneKey,
  lang,
  reducedMotion,
  activeTerm,
  activeReadout,
  onTermChange,
  onReadoutChange,
}: {
  sceneKey: AllAtomSceneKey;
  lang: string;
  reducedMotion: boolean;
  activeTerm: AllAtomForceFieldTerm;
  activeReadout: AllAtomReadoutId;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
  onReadoutChange?: (readout: AllAtomReadoutId) => void;
}) {
  const ko = lang.toLowerCase().startsWith("ko");
  switch (sceneKey) {
    case "A1_branch":
      return <A1Branch ko={ko} />;
    case "A2_pbc":
      return <A2Pbc ko={ko} reducedMotion={reducedMotion} />;
    case "A3_forcefield":
      return <A3ForceField ko={ko} activeTerm={activeTerm} onTermChange={onTermChange} />;
    case "A4_integrate":
      return <A4Integrator ko={ko} />;
    case "A5_ensemble":
      return <A5Ensemble ko={ko} />;
    case "A6_observables":
      return (
        <A6Observables
          ko={ko}
          reducedMotion={reducedMotion}
          activeReadout={activeReadout}
          onReadoutChange={onReadoutChange}
          lang={lang}
        />
      );
    case "A7_mapping":
      return <A7Mapping ko={ko} />;
  }
}

export function AllAtomMechanism({
  sceneKey,
  lang,
  reducedMotion = false,
  isMobile = false,
  activeTerm = "Ubond",
  activeReadout = "orientation",
  onTermChange,
  onReadoutChange,
}: AllAtomMechanismProps) {
  const canonicalSceneKey = normalizeAllAtomSceneKey(sceneKey);
  const ko = lang.toLowerCase().startsWith("ko");
  const copy = COPY[canonicalSceneKey][ko ? "ko" : "en"];

  return (
    <div className="allatom-mechanism pointer-events-none absolute inset-0 z-[3]">
      <MechanismPanel
        className={`pointer-events-auto overflow-hidden ${
          isMobile ? MULTISCALE_PANEL.mobileOverlay : MULTISCALE_PANEL.desktopOverlay
        }`}
      >
        <MechanismHeader
          tone="sky"
          title={copy.title}
          description={copy.description}
          aside={
            <span className={MULTISCALE_TYPE.metadata}>
              {ko ? "고전 전원자" : "CLASSICAL ALL-ATOM"}
            </span>
          }
        />
        <SceneContent
          sceneKey={canonicalSceneKey}
          lang={lang}
          reducedMotion={reducedMotion}
          activeTerm={activeTerm ?? "Ubond"}
          activeReadout={activeReadout ?? "orientation"}
          onTermChange={onTermChange}
          onReadoutChange={onReadoutChange}
        />
      </MechanismPanel>
    </div>
  );
}
