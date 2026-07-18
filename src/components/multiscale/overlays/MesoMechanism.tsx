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
      title: "The mapping sets the beads, and the speedup follows",
      description:
        "Each bead represents a chosen group of atoms; removing their fast internal motion is what makes larger, longer, and softer simulations affordable.",
    },
    ko: {
      title: "매핑이 비드를 정하고 거기서 가속이 따라온다",
      description:
        "각 비드는 선택한 원자 그룹을 대표한다. 그 빠른 내부 운동을 없앤 것이 더 크고 긴 시뮬레이션을 가능하게 한다.",
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
      <text x="401" y="139" fill="var(--sch-ink)" fontSize="14">
        {ko ? "비드 사슬" : "bead chain"}
      </text>
    </svg>
  );
}

function M2Mapping({ ko }: { ko: boolean }) {
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
          <div className={`border border-lv-meso-line bg-lv-meso-wash p-4 ${MULTISCALE_TYPE.formula}`}>
            <Formula value="\mathbf R_I=\frac{\sum_{i\in I}m_i\mathbf r_i}{\sum_{i\in I}m_i}" display />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border-l-2 border-lv-meso-line pl-4">
              <p className={MULTISCALE_TYPE.semititle}>{ko ? "보존" : "Retained"}</p>
              <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
                {ko ? "사슬 윤곽, 연결성, 선택한 구조 통계" : "chain contour, connectivity, selected structural statistics"}
              </p>
            </div>
            <div className="border-l-2 border-lv-aa-line pl-4">
              <p className={MULTISCALE_TYPE.semititle}>{ko ? "제거" : "Eliminated"}</p>
              <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
                {ko ? "원자별 배치와 빠른 내부 진동" : "atom-specific geometry and fast internal vibrations"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border border-lv-meso-line bg-lv-meso-wash p-4">
        <p className={MULTISCALE_TYPE.semititle}>{ko ? "가속의 출처" : "Where the speedup comes from"}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {speedupFactors.map((factor) => (
            <div key={factor.label} className="border border-border bg-muted/30 p-3">
              <p className={`${MULTISCALE_TYPE.panelTitle} text-lv-meso`}>{factor.label}</p>
              <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>{factor.note}</p>
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
            <p className="text-3xl font-semibold tabular-nums">{value}</p>
            <p className={`mt-2 ${MULTISCALE_TYPE.description}`}>{label}</p>
          </div>
        ))}
      </div>
      <div className="border-l-2 border-lv-meso-line pl-4">
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

function SceneContent({
  sceneKey,
  ko,
}: {
  sceneKey: string;
  ko: boolean;
}) {
  if (sceneKey === "M2_mapping") return <M2Mapping ko={ko} />;
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
    <div className="meso-mechanism pointer-events-none absolute inset-0 z-[3]">
      <MechanismPanel
        className={`pointer-events-auto overflow-hidden ${
          isMobile ? MULTISCALE_PANEL.mobileOverlay : MULTISCALE_PANEL.desktopOverlay
        }`}
      >
        <MechanismHeader
          tone="meso"
          title={copy.title}
          description={copy.description}
          aside={<span className={MULTISCALE_TYPE.metadata}>{ko ? "메조스케일" : "MESOSCALE"}</span>}
        />
        <SceneContent sceneKey={sceneKey} ko={ko} />
      </MechanismPanel>
    </div>
  );
}
