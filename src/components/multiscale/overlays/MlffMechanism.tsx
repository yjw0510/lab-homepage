"use client";

import { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";
import { MlffInsideFlow, MlffOverviewFlow } from "./mlff/MlffConceptPages";

export const MLFF_SCENE_KEYS = [
  "L1_why",
  "L2_dataset",
  "L3_locality",
  "L4_symmetry",
  "L5_energy_force",
  "L6_validate",
  "L7_active",
] as const;

export type MlffSceneKey = (typeof MLFF_SCENE_KEYS)[number];

const LEGACY_SCENE_KEYS: Record<string, MlffSceneKey> = {
  L1_clouds: "L1_why",
  L2_neighborhoods: "L2_dataset",
  L3_graph: "L3_locality",
  L4_energies: "L4_symmetry",
  L5_forces: "L5_energy_force",
  L6_comparison: "L6_validate",
  L7_settle: "L7_active",
};

export function normalizeMlffSceneKey(sceneKey: string): MlffSceneKey {
  if ((MLFF_SCENE_KEYS as readonly string[]).includes(sceneKey)) {
    return sceneKey as MlffSceneKey;
  }
  return LEGACY_SCENE_KEYS[sceneKey] ?? "L1_why";
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

type Copy = {
  title: string;
  description: string;
};

const COPY: Record<MlffSceneKey, { en: Copy; ko: Copy }> = {
  L1_why: {
    en: {
      title: "From DFT reference data to molecular motion",
      description:
        "DFT configurations teach one reusable potential that supplies energy and forces throughout an MD trajectory.",
    },
    ko: {
      title: "DFT 참조 데이터에서 분자 운동까지",
      description:
        "여러 DFT 배치가 하나의 재사용 가능한 퍼텐셜을 가르치고, 이 퍼텐셜이 MD 전 구간의 에너지와 힘을 제공한다.",
    },
  },
  L2_dataset: {
    en: {
      title: "Train, validation, and test sets answer different questions",
      description:
        "The split is made by configuration, so near-duplicate snapshots cannot leak across roles.",
    },
    ko: {
      title: "훈련·검증·시험 구조는 서로 다른 질문에 답한다",
      description:
        "비슷한 스냅샷이 서로 다른 집합에 섞이지 않도록 구조 단위로 분리한다.",
    },
  },
  L3_locality: {
    en: {
      title: "Each atom reads a neighborhood inside the cutoff",
      description:
        "The cutoff defines the graph used by the model. Periodic systems use the nearest image of each neighbor.",
    },
    ko: {
      title: "각 원자는 차단 반경 안의 이웃을 읽는다",
      description:
        "차단 반경으로 모델의 그래프를 만든다. 주기계에서는 가장 가까운 주기 이미지를 이웃으로 사용한다.",
    },
  },
  L4_symmetry: {
    en: {
      title: "Rotate the structure: energy stays, forces rotate",
      description:
        "The model must respect the same translation, rotation, and permutation rules as the physical system.",
    },
    ko: {
      title: "구조를 회전해도 에너지는 같고 힘은 함께 회전한다",
      description:
        "모델도 물리계와 같은 이동·회전·동일 원자 치환 규칙을 따라야 한다.",
    },
  },
  L5_energy_force: {
    en: {
      title: "How an MLFF reads one atom's neighborhood",
      description:
        "A symmetry-preserving local representation becomes an atomic energy; their sum defines the energy surface and its forces.",
    },
    ko: {
      title: "MLFF가 원자 하나의 이웃을 읽는 방법",
      description:
        "대칭성을 보존한 국소 표현을 원자별 에너지로 바꾸고, 그 합으로 에너지 곡면과 모든 힘을 정의한다.",
    },
  },
  L6_validate: {
    en: {
      title: "Validation asks whether the model can run the science",
      description:
        "A small held-out error is only the first check. Stable trajectories and correct observables are tested separately.",
    },
    ko: {
      title: "검증은 이 모델로 실제 연구를 수행할 수 있는지 확인한다",
      description:
        "보류 데이터 오차는 첫 검사일 뿐이다. 궤적 안정성과 필요한 관측량을 따로 확인한다.",
    },
  },
  L7_active: {
    en: {
      title: "Simulation finds the next DFT calculation",
      description:
        "When the model reaches an unfamiliar configuration, that structure is calculated with DFT and added to the next training round.",
    },
    ko: {
      title: "시뮬레이션이 다음 DFT 계산 대상을 찾는다",
      description:
        "모델이 낯선 구조를 만나면 그 구조를 DFT로 계산하고 다음 학습 데이터에 추가한다.",
    },
  },
};

const tone = {
  amber: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  violet: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  cyan: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  neutral: "border-white/14 bg-white/[0.035] text-slate-200",
} as const;

function L1Why({
  ko,
  isMobile,
  reducedMotion,
}: {
  ko: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  return (
    <MlffOverviewFlow ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} />
  );
}

const DATASET_ROLES = {
  train: {
    tone: tone.violet,
    en: {
      label: "Training",
      action: "Fit model parameters",
      rule: "These configurations may update the weights.",
    },
    ko: {
      label: "훈련",
      action: "모델 모수를 맞춘다",
      rule: "이 구조들은 모델 가중치 업데이트에 사용한다.",
    },
  },
  validate: {
    tone: tone.cyan,
    en: {
      label: "Validation",
      action: "Choose model and stopping point",
      rule: "These configurations compare choices but do not fit weights.",
    },
    ko: {
      label: "검증",
      action: "모델과 학습 종료 시점을 고른다",
      rule: "선택지를 비교하지만 가중치를 맞추는 데는 사용하지 않는다.",
    },
  },
  test: {
    tone: tone.neutral,
    en: {
      label: "Test",
      action: "Report final generalization",
      rule: "This set remains sealed until the model is fixed.",
    },
    ko: {
      label: "시험",
      action: "최종 일반화 성능을 확인한다",
      rule: "모델을 확정할 때까지 열어보지 않는다.",
    },
  },
} as const;

function L2Dataset({ ko }: { ko: boolean }) {
  const [active, setActive] = useState<keyof typeof DATASET_ROLES>("train");
  const selected = DATASET_ROLES[active][ko ? "ko" : "en"];

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={ko ? "데이터 집합 역할" : "dataset roles"}>
        {(Object.keys(DATASET_ROLES) as Array<keyof typeof DATASET_ROLES>).map((key) => {
          const item = DATASET_ROLES[key][ko ? "ko" : "en"];
          const selectedNow = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedNow}
              onMouseEnter={() => setActive(key)}
              onFocus={() => setActive(key)}
              onClick={() => setActive(key)}
              className={`min-h-24 border p-3 text-left transition-colors ${
                selectedNow ? DATASET_ROLES[key].tone : tone.neutral
              }`}
            >
              <span className="block text-base font-semibold">{item.label}</span>
              <span className="mt-2 block text-sm leading-5 opacity-75">{item.action}</span>
            </button>
          );
        })}
      </div>
      <div className="border border-white/14 bg-white/[0.025] p-4">
        <p className={MULTISCALE_TYPE.metadata}>{selected.label}</p>
        <p className={`mt-2 ${MULTISCALE_TYPE.semititle}`}>{selected.action}</p>
        <p className={`mt-3 ${MULTISCALE_TYPE.body}`}>{selected.rule}</p>
        <div className="mt-4 grid grid-cols-5 gap-2" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className={`aspect-square border ${
                index < 6 ? DATASET_ROLES[active].tone : "border-white/10 bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NeighborhoodDiagram({ ko }: { ko: boolean }) {
  return (
    <svg viewBox="0 0 360 190" className="h-44 w-full" role="img" aria-label={ko ? "차단 반경 안팎의 이웃 원자" : "neighbors inside and outside a cutoff"}>
      <circle cx="126" cy="95" r="74" fill="rgba(139,92,246,.08)" stroke="rgba(196,181,253,.7)" strokeWidth="2" strokeDasharray="7 6" />
      <line x1="126" y1="95" x2="197" y2="95" stroke="rgba(196,181,253,.7)" strokeWidth="2" />
      <text
        x="151"
        y="84"
        fill="rgba(221,214,254,.9)"
        fontSize="17"
        fontFamily="KaTeX_Main, 'Times New Roman', serif"
        fontStyle="italic"
      >
        r<tspan baselineShift="sub" fontSize="12">c</tspan>
      </text>
      <circle cx="126" cy="95" r="13" fill="#fbbf24" />
      {[
        [83, 55],
        [165, 56],
        [79, 130],
        [159, 133],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="10" fill="#a78bfa" />
      ))}
      <circle cx="245" cy="57" r="10" fill="#475569" />
      <circle cx="274" cy="126" r="10" fill="#475569" />
      <text x="220" y="95" fill="rgba(148,163,184,.85)" fontSize="15">
        {ko ? "이 반경 밖" : "outside cutoff"}
      </text>
    </svg>
  );
}

function L3Locality({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(20rem,.9fr)_minmax(0,1.1fr)] lg:items-center">
      <NeighborhoodDiagram ko={ko} />
      <div className="grid gap-4">
        <div className={`border border-violet-300/25 bg-violet-300/[0.05] p-4 ${MULTISCALE_TYPE.formula}`}>
          <Formula value="\mathcal N_i(r_c)=\{j\mid \lVert\mathbf r_{ij}^{\,\mathrm{MIC}}\rVert<r_c\}" display />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-cyan-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "주기 경계" : "Periodic boundary"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "가장 가까운 주기 이미지까지의 거리를 사용한다." : "Use the distance to the nearest periodic image."}
            </p>
          </div>
          <div className="border-l-2 border-amber-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "모델 범위" : "Model scope"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "장거리 정전기·분산·전하 이동은 별도 처리가 필요할 수 있다." : "Long-range electrostatics, dispersion, or charge transfer may need separate treatment."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SymmetryFrame({
  rotated,
  ko,
}: {
  rotated?: boolean;
  ko: boolean;
}) {
  const transform = rotated ? "rotate(32 120 90)" : undefined;
  return (
    <div className="border border-white/14 bg-white/[0.02] p-3">
      <p className={MULTISCALE_TYPE.metadata}>
        {rotated ? (ko ? "회전한 구조" : "ROTATED") : ko ? "원래 구조" : "ORIGINAL"}
      </p>
      <svg viewBox="0 0 240 180" className="mt-2 h-36 w-full" aria-hidden="true">
        <g transform={transform}>
          <line x1="120" y1="90" x2="71" y2="52" stroke="#94a3b8" strokeWidth="4" />
          <line x1="120" y1="90" x2="177" y2="61" stroke="#94a3b8" strokeWidth="4" />
          <line x1="120" y1="90" x2="158" y2="137" stroke="#94a3b8" strokeWidth="4" />
          <circle cx="120" cy="90" r="14" fill="#fbbf24" />
          <circle cx="71" cy="52" r="11" fill="#a78bfa" />
          <circle cx="177" cy="61" r="11" fill="#67e8f9" />
          <circle cx="158" cy="137" r="11" fill="#a78bfa" />
          <line x1="120" y1="90" x2="120" y2="34" stroke="#fb7185" strokeWidth="5" />
          <path d="M112 44 L120 31 L128 44" fill="none" stroke="#fb7185" strokeWidth="5" />
        </g>
      </svg>
    </div>
  );
}

function L4Symmetry({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.9fr)]">
      <div className="grid grid-cols-2 gap-3">
        <SymmetryFrame ko={ko} />
        <SymmetryFrame rotated ko={ko} />
      </div>
      <div className="grid content-center gap-3">
        <div className={`border border-violet-300/25 bg-violet-300/[0.05] px-4 py-3 ${MULTISCALE_TYPE.formula}`}>
          <Formula value="E(Q\mathbf R+\mathbf t)=E(\mathbf R)" display />
          <p className={`mt-1 text-center ${MULTISCALE_TYPE.description}`}>
            {ko ? "에너지는 변하지 않는다" : "energy is invariant"}
          </p>
        </div>
        <div className={`border border-cyan-300/25 bg-cyan-300/[0.05] px-4 py-3 ${MULTISCALE_TYPE.formula}`}>
          <Formula value="\mathbf F(Q\mathbf R+\mathbf t)=Q\mathbf F(\mathbf R)" display />
          <p className={`mt-1 text-center ${MULTISCALE_TYPE.description}`}>
            {ko ? "힘 벡터는 구조와 함께 회전한다" : "force vectors co-rotate"}
          </p>
        </div>
      </div>
    </div>
  );
}

function L5EnergyForce({
  ko,
  isMobile,
  reducedMotion,
}: {
  ko: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  return (
    <MlffInsideFlow ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} />
  );
}

const VALIDATION_CHECKS = {
  error: {
    en: ["Held-out error", "Does the model interpolate unseen reference configurations?"],
    ko: ["보류 데이터 오차", "보지 않은 참조 구조를 정확히 보간하는가?"],
  },
  residual: {
    en: ["Residual structure", "Are errors concentrated around a chemistry, geometry, or energy range?"],
    ko: ["잔차의 구조", "특정 화학종·구조·에너지 범위에 오차가 몰리는가?"],
  },
  rollout: {
    en: ["Trajectory stability", "Does MD remain physical over the intended temperature and time?"],
    ko: ["궤적 안정성", "목표 온도와 시간 범위에서 MD가 물리적으로 유지되는가?"],
  },
  observable: {
    en: ["Scientific observable", "Does the simulation reproduce the quantity used in the study?"],
    ko: ["연구 관측량", "연구에서 사용할 물리량을 재현하는가?"],
  },
  ood: {
    en: ["Out-of-distribution behavior", "Can unfamiliar configurations be detected before they corrupt the trajectory?"],
    ko: ["학습 범위 밖 거동", "낯선 구조가 궤적을 망치기 전에 감지되는가?"],
  },
} as const;

function L6Validate({ ko }: { ko: boolean }) {
  const [active, setActive] = useState<keyof typeof VALIDATION_CHECKS>("error");
  const [title, description] = VALIDATION_CHECKS[active][ko ? "ko" : "en"];
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.2fr)]">
      <div className="grid gap-2" role="tablist" aria-label={ko ? "검증 항목" : "validation checks"}>
        {(Object.keys(VALIDATION_CHECKS) as Array<keyof typeof VALIDATION_CHECKS>).map((key, index) => {
          const [label] = VALIDATION_CHECKS[key][ko ? "ko" : "en"];
          const selected = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onMouseEnter={() => setActive(key)}
              onFocus={() => setActive(key)}
              onClick={() => setActive(key)}
              className={`grid min-h-11 grid-cols-[2rem_1fr] items-center border px-3 text-left text-sm transition-colors ${
                selected ? tone.cyan : tone.neutral
              }`}
            >
              <span className="type-mono-meta opacity-55">0{index + 1}</span>
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="grid content-center border border-cyan-300/25 bg-cyan-300/[0.045] p-5">
        <p className={MULTISCALE_TYPE.metadata}>{ko ? "현재 검사" : "CURRENT CHECK"}</p>
        <p className={`mt-3 ${MULTISCALE_TYPE.panelTitle}`}>{title}</p>
        <p className={`mt-3 ${MULTISCALE_TYPE.body}`}>{description}</p>
        <div className="mt-5 h-2 overflow-hidden bg-white/8" aria-hidden="true">
          <div
            className="h-full bg-cyan-300 transition-[width] duration-300"
            style={{
              width: `${((Object.keys(VALIDATION_CHECKS).indexOf(active) + 1) / 5) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const ACTIVE_STEPS = {
  run: {
    en: ["Run MLFF MD", "Explore configurations at the target temperature, pressure, and composition."],
    ko: ["MLFF MD 실행", "목표 온도·압력·조성에서 구조 공간을 탐색한다."],
  },
  detect: {
    en: ["Detect unfamiliar geometry", "Use uncertainty or an out-of-distribution criterion to flag risky frames."],
    ko: ["낯선 구조 감지", "불확실성 또는 학습 범위 밖 판정으로 위험한 프레임을 고른다."],
  },
  query: {
    en: ["Calculate with DFT", "Generate reference energy and forces for the selected configuration."],
    ko: ["DFT로 계산", "선택한 구조의 참조 에너지와 힘을 계산한다."],
  },
  retrain: {
    en: ["Expand and retrain", "Add the new label, rebalance the dataset, and validate the updated model."],
    ko: ["데이터 확장·재학습", "새 참조값을 추가하고 데이터 균형을 조정한 뒤 다시 검증한다."],
  },
} as const;

function L7Active({ ko }: { ko: boolean }) {
  const [active, setActive] = useState<keyof typeof ACTIVE_STEPS>("run");
  const keys = Object.keys(ACTIVE_STEPS) as Array<keyof typeof ACTIVE_STEPS>;
  const [title, description] = ACTIVE_STEPS[active][ko ? "ko" : "en"];
  return (
    <div className="grid gap-4 p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label={ko ? "능동학습 순환" : "active-learning loop"}>
        {keys.map((key, index) => {
          const [label] = ACTIVE_STEPS[key][ko ? "ko" : "en"];
          const selected = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onMouseEnter={() => setActive(key)}
              onFocus={() => setActive(key)}
              onClick={() => setActive(key)}
              className={`relative min-h-20 border p-3 text-left transition-colors ${
                selected ? tone.violet : tone.neutral
              }`}
            >
              <span className="type-mono-meta opacity-55">0{index + 1}</span>
              <span className="mt-2 block text-base font-semibold">{label}</span>
              {index < keys.length - 1 ? (
                <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 bg-[#070712] px-1 text-slate-500 sm:block">
                  →
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 border-t border-white/12 pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className={MULTISCALE_TYPE.semititle}>{title}</p>
          <p className={`mt-2 ${MULTISCALE_TYPE.body}`}>{description}</p>
        </div>
        <p className={`${MULTISCALE_TYPE.metadata} border border-violet-300/25 bg-violet-300/[0.05] px-4 py-3`}>
          MLFF MD → OOD → DFT → RETRAIN ↺
        </p>
      </div>
    </div>
  );
}

function SceneContent({
  sceneKey,
  ko,
  isMobile,
  reducedMotion,
}: {
  sceneKey: MlffSceneKey;
  ko: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  switch (sceneKey) {
    case "L1_why":
      return <L1Why ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} />;
    case "L2_dataset":
      return <L2Dataset ko={ko} />;
    case "L3_locality":
      return <L3Locality ko={ko} />;
    case "L4_symmetry":
      return <L4Symmetry ko={ko} />;
    case "L5_energy_force":
      return <L5EnergyForce ko={ko} isMobile={isMobile} reducedMotion={reducedMotion} />;
    case "L6_validate":
      return <L6Validate ko={ko} />;
    case "L7_active":
      return <L7Active ko={ko} />;
  }
}

export function MlffMechanism({
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
  const normalizedKey = normalizeMlffSceneKey(sceneKey);
  const ko = lang.toLowerCase().startsWith("ko");
  const copy = COPY[normalizedKey][ko ? "ko" : "en"];

  return (
    <div className="mlff-mechanism pointer-events-none absolute inset-0 z-[3]">
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
              {ko ? "MLFF 메커니즘" : "MLFF MECHANISM"}
            </span>
          }
        />
        <SceneContent
          sceneKey={normalizedKey}
          ko={ko}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
        />
      </MechanismPanel>
    </div>
  );
}
