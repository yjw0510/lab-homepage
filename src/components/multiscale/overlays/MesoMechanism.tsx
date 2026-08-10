"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";

interface Props {
  sceneKey: string;
  lang: string;
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
  M2_mapping: {
    en: {
      title: "Choosing what counts as one particle",
      description:
        "Group atoms into a bead and the fast motion inside the group leaves the model. That single choice fixes both how far the simulation reaches and which questions it can still answer.",
    },
    ko: {
      title: "무엇을 한 입자로 셀 것인가",
      description:
        "원자를 묶어 비드로 만들면 그 안의 빠른 운동이 모형에서 빠진다. 이 선택 하나가 계산이 닿는 범위와 답할 수 있는 질문을 함께 정한다.",
    },
  },
  M5_collective: {
    en: {
      title: "The size at which stiffness and phase appear",
      description:
        "Stiffness and phase appear once enough chains are followed together, and that is the size at which a measurement finds them too.",
    },
    ko: {
      title: "강성과 상이 나타나는 크기",
      description:
        "강성이나 상은 여러 가닥을 함께 따라가야 나타나고, 측정이 그것을 붙잡는 것도 같은 크기에서다.",
    },
  },
} as const;

// Legacy color key; the selected state uses the 메조 level triad (lv-meso).
const tone = {
  amber: "border-lv-meso-line bg-lv-meso-wash text-lv-meso",
  neutral: "border-border bg-muted/40 text-foreground",
} as const;

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
      {/* Anchored to the right edge rather than to a start coordinate, so the Korean and
          English labels both clear the bead chain at x=347 without a per-language x.
          At 16 units this reaches 11.3px on a 390px phone, where 14 reached only 9.9. */}
      <text x="454" y="139" textAnchor="end" fill="var(--sch-ink)" fontSize="16">
        {ko ? "비드 사슬" : "bead chain"}
      </text>
    </svg>
  );
}

function M2Mapping({ ko, isMobile }: { ko: boolean; isMobile: boolean }) {
  const speedupFactors = [
    {
      label: ko ? "입자 수 감소" : "Fewer particles",
      note: ko ? "여러 원자가 비드 하나로" : "several atoms per bead",
    },
    {
      label: ko ? "긴 적분 스텝" : "Longer timestep",
      note: ko ? "부드러운 힘이 큰 스텝을 허용" : "softer forces allow a larger step",
    },
    {
      label: ko ? "넓은 도달" : "Wider reach",
      note: ko ? "더 큰 계, 더 긴 유효 시간" : "bigger systems, longer effective time",
    },
  ];
  return (
    <div className="grid gap-4 p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,1fr)] lg:items-center">
        <MappingDiagram ko={ko} />
        <div className="grid gap-4">
          <div className={`border border-lv-meso-line bg-lv-meso-wash p-4 ${isMobile ? MULTISCALE_TYPE.formulaCompact : MULTISCALE_TYPE.formula}`}>
            <Formula value="\mathbf R_I=\frac{\sum_{i\in I}m_i\mathbf r_i}{\sum_{i\in I}m_i}" display />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border-t border-lv-meso-line pt-4">
              <p className={MULTISCALE_TYPE.semititle}>{ko ? "보존" : "Retained"}</p>
              <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
                {ko ? "사슬 윤곽, 연결성, 선택한 구조 통계" : "chain contour, connectivity, selected structural statistics"}
              </p>
            </div>
            <div className="border-t border-lv-aa-line pt-4">
              <p className={MULTISCALE_TYPE.semititle}>{ko ? "제거" : "Eliminated"}</p>
              <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
                {ko ? "원자별 배치와 빠른 내부 진동" : "atom-specific geometry and fast internal vibrations"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border border-lv-meso-line bg-lv-meso-wash p-4">
        <p className={MULTISCALE_TYPE.semititle}>{ko ? "빨라지는 이유" : "Why it gets faster"}</p>
        {/* Three columns break "여러 원자가 비드 하나로" across four lines at 390px, and
            three stacked boxes cost more height than either. One hairline row each is the
            shortest arrangement that still reads. */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {speedupFactors.map((factor) => (
            <div
              key={factor.label}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 border border-border bg-muted/30 p-3 sm:block"
            >
              <p className={`${MULTISCALE_TYPE.panelTitle} whitespace-nowrap text-lv-meso`}>{factor.label}</p>
              <p className={`${MULTISCALE_TYPE.description} sm:mt-1`}>{factor.note}</p>
            </div>
          ))}
        </div>
        <p className={`mt-3 ${MULTISCALE_TYPE.description}`}>
          {ko
            ? "세 요인이 겹쳐 원자 계산이 닿지 못하는 계 크기와 완화 시간에 도달한다. 가속 배수 자체는 매핑에 따라 달라진다."
            : "The three compound into system sizes and relaxation times beyond atomistic reach; the factor itself depends on the mapping."}
        </p>
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
            <p className="type-quiet text-3xl">{value}</p>
            <p className={`mt-2 ${MULTISCALE_TYPE.description}`}>{label}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-lv-meso-line pt-4">
        <p className={MULTISCALE_TYPE.semititle}>{ko ? "여러 가닥이 만드는 배열" : "The arrangement many chains make"}</p>
        <p className={`mt-2 ${MULTISCALE_TYPE.body}`}>
          {ko
            ? "여러 가닥이 얽히고 풀리며 만드는 배열이 재료의 강성과 투과성을 정한다. 산란 실험이 되돌려 주는 것도 이 배열이다."
            : "The arrangement many chains make as they entangle and release is what sets a material's stiffness and permeability. It is also what a scattering experiment hands back."}
        </p>
        <p className={`mt-3 ${MULTISCALE_TYPE.metadata}`}>5 fs × 200,000 = 1 ns nominal trajectory</p>
      </div>
    </div>
  );
}

function SceneContent({
  sceneKey,
  ko,
  isMobile,
}: {
  sceneKey: string;
  ko: boolean;
  isMobile: boolean;
}) {
  if (sceneKey === "M2_mapping") return <M2Mapping ko={ko} isMobile={isMobile} />;
  if (sceneKey === "M5_collective") return <M5Collective ko={ko} />;
  return null;
}

export function MesoMechanism({
  sceneKey,
  lang,
  isMobile = false,
}: Props) {
  const ko = lang.toLowerCase().startsWith("ko");
  const copy = COPY[sceneKey as keyof typeof COPY]?.[ko ? "ko" : "en"];
  if (!copy) return null;

  return (
    <div className={`meso-mechanism z-[3] ${isMobile ? "relative" : "pointer-events-none absolute inset-0"}`}>
      <MechanismPanel
        className={`pointer-events-auto overflow-hidden ${
          isMobile ? MULTISCALE_PANEL.mobileBand : MULTISCALE_PANEL.desktopOverlay
        }`}
      >
        <MechanismHeader
          tone="meso"
          title={copy.title}
          description={copy.description}
          aside={isMobile ? undefined : <span className={MULTISCALE_TYPE.metadata}>{ko ? "메조스케일" : "MESOSCALE"}</span>}
        />
        <SceneContent sceneKey={sceneKey} ko={ko} isMobile={isMobile} />
      </MechanismPanel>
    </div>
  );
}
