"use client";

import { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";

interface Props {
  sceneKey: string;
  lang: string;
  reducedMotion?: boolean;
  isMobile?: boolean;
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

const COPY = {
  M1_select: {
    en: {
      title: "Choose coarse-graining when collective structure is the question",
      description:
        "Grouping atoms into beads removes fast internal detail and makes larger systems and longer collective rearrangements accessible.",
    },
    ko: {
      title: "집단 구조가 연구 대상일 때 조대화를 선택한다",
      description:
        "여러 원자를 비드로 묶어 빠른 내부 운동을 줄이고, 더 큰 계에서 느린 집단 재배열을 관찰한다.",
    },
  },
  M2_mapping: {
    en: {
      title: "A mapping defines the coordinates of the coarse model",
      description:
        "Each bead represents a chosen group of atoms. The mapping determines which shape, connectivity, and observables can be retained.",
    },
    ko: {
      title: "매핑으로 조대화 모형의 좌표를 정의한다",
      description:
        "각 비드는 선택한 원자 그룹을 대표한다. 어떤 형태·연결성·관측량을 보존할지는 매핑이 정한다.",
    },
  },
  M3_interactions: {
    en: {
      title: "Effective interactions reproduce the retained behavior",
      description:
        "Bond and angle terms maintain chain geometry; a soft nonbonded potential controls overlap and collective packing.",
    },
    ko: {
      title: "유효 상호작용으로 보존할 거동을 재현한다",
      description:
        "결합과 결합각 항은 사슬 구조를 유지하고, 부드러운 비결합 퍼텐셜은 겹침과 집단 배치를 조절한다.",
    },
  },
  M4_langevin: {
    en: {
      title: "Langevin dynamics samples the coarse-grained model",
      description:
        "Conservative forces move the beads while friction and random forces represent eliminated fast degrees of freedom.",
    },
    ko: {
      title: "Langevin 동역학으로 조대화 모형을 표본화한다",
      description:
        "보존력이 비드를 움직이고, 마찰력과 무작위 힘이 제거된 빠른 운동의 영향을 나타낸다.",
    },
  },
  M5_collective: {
    en: {
      title: "The reduced model reaches collective rearrangements",
      description:
        "Thousands of beads and many chains can be followed together, exposing entanglement, relaxation, and large-scale morphology.",
    },
    ko: {
      title: "줄어든 자유도로 집단 재배열을 관찰한다",
      description:
        "수천 개 비드와 여러 사슬을 함께 추적해 얽힘, 완화, 큰 규모의 형태 변화를 관찰한다.",
    },
  },
  M6_characterize: {
    en: {
      title: "Structural statistics turn trajectories into comparisons",
      description:
        "The radial distribution function measures how neighbor probability changes with distance; validation requires a matched reference at the same state point.",
    },
    ko: {
      title: "구조 통계로 궤적을 비교 가능한 결과로 바꾼다",
      description:
        "방사 분포 함수는 거리에 따른 이웃 확률을 측정한다. 검증에는 같은 상태점의 전원자 또는 실험 기준이 필요하다.",
    },
  },
} as const;

const tone = {
  cyan: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  violet: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  amber: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  neutral: "border-white/14 bg-white/[0.035] text-slate-200",
} as const;

function M1Select({ ko }: { ko: boolean }) {
  const levels = [
    {
      title: ko ? "전원자" : "All-atom",
      retained: ko ? "원자 접촉·분자 내부 구조" : "atomic contacts and intramolecular structure",
      reach: ko ? "작은 계·짧은 시간" : "smaller systems and shorter times",
      color: tone.neutral,
    },
    {
      title: ko ? "조대화 비드" : "Coarse-grained beads",
      retained: ko ? "사슬 윤곽·연결성·선택한 관측량" : "chain contour, connectivity, selected observables",
      reach: ko ? "더 큰 계·느린 집단 운동" : "larger systems and slower collective motion",
      color: tone.amber,
    },
    {
      title: ko ? "집단 형태" : "Collective morphology",
      retained: ko ? "도메인·얽힘·상관 길이" : "domains, entanglement, correlation length",
      reach: ko ? "여러 사슬의 창발적 거동" : "emergent behavior across many chains",
      color: tone.cyan,
    },
  ];
  return (
    <div className="grid gap-3 p-5 md:grid-cols-3">
      {levels.map((level, index) => (
        <article key={level.title} className={`border p-4 ${level.color}`}>
          <p className={MULTISCALE_TYPE.metadata}>0{index + 1}</p>
          <h4 className={`mt-2 ${MULTISCALE_TYPE.panelTitle}`}>{level.title}</h4>
          <p className={`mt-4 ${MULTISCALE_TYPE.semititle}`}>{ko ? "남기는 정보" : "Retained"}</p>
          <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>{level.retained}</p>
          <p className={`mt-4 ${MULTISCALE_TYPE.semititle}`}>{ko ? "도달 범위" : "Reach"}</p>
          <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>{level.reach}</p>
        </article>
      ))}
    </div>
  );
}

function MappingDiagram({ ko }: { ko: boolean }) {
  return (
    <svg viewBox="0 0 460 180" className="h-44 w-full" role="img" aria-label={ko ? "여러 원자를 세 개 비드로 묶는 다대일 매핑" : "many-to-one mapping from atoms to three beads"}>
      {Array.from({ length: 15 }, (_, index) => {
        const group = Math.floor(index / 5);
        const x = 25 + index * 20;
        const y = 35 + (index % 3) * 17;
        const beadX = 72 + group * 128;
        return (
          <g key={index}>
            <circle cx={x} cy={y} r="6" fill={group === 1 ? "#67e8f9" : "#cbd5e1"} />
            <path d={`M${x} ${y + 8} Q${x} 112 ${beadX} 133`} fill="none" stroke="rgba(251,191,36,.45)" strokeWidth="1.5" />
          </g>
        );
      })}
      {[72, 200, 328].map((x, index) => (
        <circle key={x} cx={x} cy="137" r="19" fill={index === 1 ? "#fbbf24" : "#f59e0b"} />
      ))}
      <line x1="91" y1="137" x2="181" y2="137" stroke="#f59e0b" strokeWidth="5" />
      <line x1="219" y1="137" x2="309" y2="137" stroke="#f59e0b" strokeWidth="5" />
      <text x="401" y="139" fill="#cbd5e1" fontSize="14">
        {ko ? "비드 사슬" : "bead chain"}
      </text>
    </svg>
  );
}

function M2Mapping({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1fr)] lg:items-center">
      <MappingDiagram ko={ko} />
      <div className="grid gap-4">
        <div className={`border border-amber-300/25 bg-amber-300/[0.05] p-4 ${MULTISCALE_TYPE.formula}`}>
          <Formula value="\mathbf R_I=\frac{\sum_{i\in I}m_i\mathbf r_i}{\sum_{i\in I}m_i}" display />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-cyan-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "보존" : "Retained"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "사슬 윤곽, 연결성, 선택한 구조 통계" : "chain contour, connectivity, selected structural statistics"}
            </p>
          </div>
          <div className="border-l-2 border-violet-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "제거" : "Eliminated"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "원자별 배치와 빠른 내부 진동" : "atom-specific geometry and fast internal vibrations"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const CG_TERMS = {
  bond: {
    label: { en: "Bond", ko: "결합" },
    formula: String.raw`U_{\mathrm{bond}}=\sum_b \frac{k_b}{2}(r_b-r_{0,b})^2`,
    text: { en: "Maintains connectivity and the preferred spacing of neighboring beads.", ko: "이웃 비드의 연결성과 선호 결합 길이를 유지한다." },
    color: "amber",
    path: "M18 15 Q72 82 126 15",
  },
  angle: {
    label: { en: "Angle", ko: "결합각" },
    formula: String.raw`U_{\mathrm{angle}}=\sum_a \frac{k_a}{2}(\theta_a-\theta_{0,a})^2`,
    text: { en: "Controls chain stiffness and the local contour of the polymer.", ko: "사슬의 강성과 국소 윤곽을 조절한다." },
    color: "cyan",
    path: "M18 15 Q72 82 126 15",
  },
  gaussian: {
    label: { en: "Gaussian repulsion", ko: "Gaussian 반발" },
    formula: String.raw`U_{\mathrm{G}}=\sum_{i<j}A\exp[-r_{ij}^2/(2\sigma^2)]`,
    text: { en: "A soft finite-range repulsion limits bead overlap and sets packing.", ko: "부드러운 유한 범위 반발로 비드 겹침과 집단 배치를 조절한다." },
    color: "violet",
    path: "M18 16 C35 22 47 47 63 65 C83 78 105 80 126 80",
  },
} as const;

function M3Interactions({ ko }: { ko: boolean }) {
  const [active, setActive] = useState<keyof typeof CG_TERMS>("bond");
  const selected = CG_TERMS[active];
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(16rem,.65fr)_minmax(0,1.35fr)]">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1" role="tablist" aria-label={ko ? "조대화 상호작용 항" : "coarse-grained interaction terms"}>
        {(Object.keys(CG_TERMS) as Array<keyof typeof CG_TERMS>).map((key) => {
          const item = CG_TERMS[key];
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
              className={`min-h-14 border px-3 text-left text-sm font-semibold transition-colors ${
                selectedNow ? tone[item.color] : tone.neutral
              }`}
            >
              {item.label[ko ? "ko" : "en"]}
            </button>
          );
        })}
      </div>
      <div className={`grid gap-3 border p-4 ${tone[selected.color]}`}>
        <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <svg viewBox="0 0 144 96" className="h-28 w-full" aria-hidden="true">
            <line x1="10" y1="84" x2="136" y2="84" stroke="rgba(148,163,184,.35)" />
            <line x1="10" y1="84" x2="10" y2="8" stroke="rgba(148,163,184,.35)" />
            <path d={selected.path} fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <div>
            <div className={MULTISCALE_TYPE.formulaCompact}>
              <Formula value={selected.formula} display />
            </div>
            <p className={`mt-3 ${MULTISCALE_TYPE.body}`}>{selected.text[ko ? "ko" : "en"]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function M4Langevin({ ko, reducedMotion }: { ko: boolean; reducedMotion: boolean }) {
  const forceNotes = [
    [ko ? "보존력" : "Conservative", ko ? "유효 퍼텐셜" : "effective potential", "border-amber-300/70"],
    [ko ? "마찰력" : "Friction", ko ? "빠른 운동으로 에너지 전달" : "energy transfer to fast modes", "border-cyan-300/70"],
    [ko ? "무작위 힘" : "Random force", ko ? "열적 요동" : "thermal fluctuations", "border-violet-300/70"],
  ];
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(19rem,.85fr)_minmax(0,1.15fr)] lg:items-center">
      <svg viewBox="0 0 360 210" className="h-48 w-full" role="img" aria-label={ko ? "비드에 작용하는 보존력, 마찰력, 무작위 힘" : "conservative, friction, and random forces on a bead"}>
        <circle cx="176" cy="105" r="24" fill="#f59e0b" />
        {[
          [176, 105, 279, 54, "#fbbf24", ko ? "보존력" : "conservative"],
          [176, 105, 83, 128, "#67e8f9", ko ? "마찰력" : "friction"],
          [176, 105, 222, 181, "#a78bfa", ko ? "무작위 힘" : "random"],
        ].map(([x1, y1, x2, y2, color, label], index) => (
          <g key={String(label)}>
            <line x1={Number(x1)} y1={Number(y1)} x2={Number(x2)} y2={Number(y2)} stroke={String(color)} strokeWidth="5">
              {!reducedMotion && index === 2 ? (
                <animate attributeName="x2" values="210;242;222;198;222" dur="2.4s" repeatCount="indefinite" />
              ) : null}
            </line>
            <circle cx={Number(x2)} cy={Number(y2)} r="5" fill={String(color)} />
            <text x={Number(x2) + 8} y={Number(y2) + 5} fill={String(color)} fontSize="15">{String(label)}</text>
          </g>
        ))}
      </svg>
      <div className="grid gap-4">
        <div className={`hidden border border-violet-300/25 bg-violet-300/[0.05] p-4 sm:block ${MULTISCALE_TYPE.formula}`}>
          <Formula value="m\dot{\mathbf v}=-\nabla U-\gamma m\mathbf v+\sqrt{2\gamma m k_{\mathrm B}T}\,\boldsymbol\eta(t)" display />
        </div>
        <div className={`border border-violet-300/25 bg-violet-300/[0.05] p-4 sm:hidden ${MULTISCALE_TYPE.formulaCompact}`}>
          <Formula value="m\dot{\mathbf v}=\mathbf F_{\mathrm C}+\mathbf F_{\gamma}+\mathbf F_{\mathrm R}" display />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {forceNotes.map(([title, text, borderClass]) => (
            <div key={title} className={`border-l-2 pl-3 ${borderClass}`}>
              <p className={MULTISCALE_TYPE.semititle}>{title}</p>
              <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function M5Collective({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)] lg:items-center">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["100", ko ? "고분자 사슬" : "polymer chains"],
          ["80", ko ? "사슬당 비드" : "beads per chain"],
          ["8,000", ko ? "전체 비드" : "total beads"],
          ["500", ko ? "저장 프레임" : "saved frames"],
        ].map(([value, label], index) => (
          <div key={label} className={`border p-4 ${index === 2 ? tone.amber : tone.neutral}`}>
            <p className="text-3xl font-semibold tabular-nums">{value}</p>
            <p className={`mt-2 ${MULTISCALE_TYPE.description}`}>{label}</p>
          </div>
        ))}
      </div>
      <div className="border-l-2 border-amber-300/70 pl-4">
        <p className={MULTISCALE_TYPE.semititle}>{ko ? "이 규모에서 보이는 것" : "What this scale exposes"}</p>
        <p className={`mt-2 ${MULTISCALE_TYPE.body}`}>
          {ko
            ? "한 사슬의 형태보다 여러 사슬이 서로 얽히고 풀리며 만드는 집단 완화와 형태 변화가 분석 대상이 된다."
            : "The analysis shifts from one-chain conformation to collective relaxation and morphology created as many chains entangle and rearrange."}
        </p>
        <p className={`mt-3 ${MULTISCALE_TYPE.metadata}`}>5 fs × 200,000 = 1 ns nominal trajectory</p>
      </div>
    </div>
  );
}

function M6Characterize({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(19rem,.9fr)_minmax(0,1.1fr)] lg:items-center">
      <svg viewBox="0 0 380 210" className="h-48 w-full" role="img" aria-label={ko ? "방사 분포 함수의 첫 번째 봉우리와 배위 껍질" : "first peak and coordination shell in a radial distribution function"}>
        <line x1="42" y1="176" x2="358" y2="176" stroke="rgba(148,163,184,.4)" />
        <line x1="42" y1="176" x2="42" y2="22" stroke="rgba(148,163,184,.4)" />
        <path d="M42 170 C75 168 88 55 126 48 C164 42 169 134 210 130 C258 126 274 152 358 150" fill="none" stroke="#67e8f9" strokeWidth="4" />
        <path d="M42 176 L42 170 C75 168 88 55 126 48 C164 42 169 134 210 130 L210 176 Z" fill="rgba(34,211,238,.12)" />
        <line x1="210" y1="35" x2="210" y2="176" stroke="#fbbf24" strokeWidth="2" strokeDasharray="7 5" />
        <text x="126" y="35" fill="#a5f3fc" fontSize="15" textAnchor="middle">{ko ? "첫 이웃 껍질" : "first neighbor shell"}</text>
        <text
          x="214"
          y="55"
          fill="#fcd34d"
          fontSize="17"
          fontFamily="KaTeX_Main, 'Times New Roman', serif"
          fontStyle="italic"
        >
          r<tspan baselineShift="sub" fontSize="12">c</tspan>
        </text>
        <text
          x="342"
          y="197"
          fill="#94a3b8"
          fontSize="16"
          fontFamily="KaTeX_Main, 'Times New Roman', serif"
          fontStyle="italic"
        >
          r
        </text>
        <text
          x="17"
          y="30"
          fill="#94a3b8"
          fontSize="16"
          fontFamily="KaTeX_Main, 'Times New Roman', serif"
          fontStyle="italic"
        >
          g(r)
        </text>
      </svg>
      <div className="grid gap-4">
        <div className={`border border-cyan-300/25 bg-cyan-300/[0.05] p-4 ${MULTISCALE_TYPE.formulaCompact}`}>
          <Formula value="g(r)=\frac{V}{4\pi r^2N^2}\left\langle\sum_{i\ne j}\delta(r-r_{ij})\right\rangle" display />
          <Formula value="N(r_c)=4\pi\rho\int_0^{r_c}g(r)r^2\,dr" display />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-cyan-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "현재 궤적에서 측정" : "Measured here"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "이웃 거리 분포와 첫 배위 껍질" : "neighbor-distance distribution and first coordination shell"}
            </p>
          </div>
          <div className="border-l-2 border-amber-300/70 pl-4">
            <p className={MULTISCALE_TYPE.semititle}>{ko ? "검증에 필요한 비교" : "Validation comparison"}</p>
            <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
              {ko ? "같은 상태점의 매핑 전원자 궤적 또는 실험 데이터" : "mapped atomistic trajectory or experiment at the same state point"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneContent({
  sceneKey,
  ko,
  reducedMotion,
}: {
  sceneKey: string;
  ko: boolean;
  reducedMotion: boolean;
}) {
  switch (sceneKey) {
    case "M1_select":
      return <M1Select ko={ko} />;
    case "M2_mapping":
      return <M2Mapping ko={ko} />;
    case "M3_interactions":
      return <M3Interactions ko={ko} />;
    case "M4_langevin":
      return <M4Langevin ko={ko} reducedMotion={reducedMotion} />;
    case "M5_collective":
      return <M5Collective ko={ko} />;
    case "M6_characterize":
      return <M6Characterize ko={ko} />;
    default:
      return null;
  }
}

export function MesoMechanism({
  sceneKey,
  lang,
  reducedMotion = false,
  isMobile = false,
}: Props) {
  const ko = lang.toLowerCase().startsWith("ko");
  const copy = COPY[sceneKey as keyof typeof COPY]?.[ko ? "ko" : "en"];
  if (!copy) return null;

  return (
    <div className="meso-mechanism pointer-events-none absolute inset-0 z-[3]">
      <MechanismPanel
        className={`pointer-events-auto overflow-hidden ${
          isMobile ? MULTISCALE_PANEL.mobileOverlay : MULTISCALE_PANEL.desktopOverlay
        }`}
      >
        <MechanismHeader
          tone="amber"
          title={copy.title}
          description={copy.description}
          aside={<span className={MULTISCALE_TYPE.metadata}>{ko ? "메조스케일" : "MESOSCALE"}</span>}
        />
        <SceneContent sceneKey={sceneKey} ko={ko} reducedMotion={reducedMotion} />
      </MechanismPanel>
    </div>
  );
}
