"use client";

import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";

interface Props {
  sceneKey: string;
  lang: string;
  isMobile?: boolean;
}

const COPY = {
  M2_mapping: {
    en: {
      title: "Choosing what counts as one particle",
      description:
        "Each bead averages the fast motion of its grouped atoms. The mapping determines the accessible scale and the questions the model addresses.",
    },
    ko: {
      title: "무엇을 한 입자로 셀 것인가",
      description:
        "비드는 한데 묶은 원자의 빠른 운동을 평균화한다. 매핑 방식이 계산 범위와 모형이 다룰 질문을 정한다.",
    },
  },
  M5_collective: {
    en: {
      title: "The size at which stiffness and order appear",
      description:
        "Following enough chains together reveals stiffness and ordered structure at the collective scale measured in experiments.",
    },
    ko: {
      title: "강성과 질서가 나타나는 크기",
      description:
        "충분히 많은 사슬을 함께 따라가면 실험과 같은 집단 규모에서 강성과 질서 구조가 드러난다.",
    },
  },
} as const;

function MappingDiagram({ ko }: { ko: boolean }) {
  return (
    <svg viewBox="0 0 460 180" className="h-44 w-full" role="img" aria-label={ko ? "여러 원자를 묶어 세 개의 비드로 바꾸는 과정" : "Several atoms are grouped into each of three beads"}>
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

// On a phone this band sits between the scene and the rail, so it carries only what the rail
// does not: the mapping drawn, and what the mapping keeps against what it averages. The bead
// placement sentence and the "why it gets faster" box restated the rail's concept, and the
// collective step's four word tiles were styled as metrics with no data in them.
function M2Mapping({ ko }: { ko: boolean }) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,1fr)] lg:items-center">
      <MappingDiagram ko={ko} />
      <div className="grid grid-cols-2 gap-3">
        <div className="border-t border-lv-meso-line pt-4">
          <p className={MULTISCALE_TYPE.semititle}>{ko ? "보존" : "Retained"}</p>
          <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
            {ko ? "사슬의 전체 모양, 연결 관계, 고른 구조 특징" : "overall chain shape, connections, and selected structural features"}
          </p>
        </div>
        <div className="border-t border-lv-aa-line pt-4">
          <p className={MULTISCALE_TYPE.semititle}>{ko ? "평균화" : "Averaged"}</p>
          <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
            {ko ? "원자별 위치와 빠른 내부 운동을 통계적으로 표현" : "atomic positions and fast internal motion represented statistically"}
          </p>
        </div>
      </div>
    </div>
  );
}

function M5Collective({ ko }: { ko: boolean }) {
  return (
    <div className="p-5">
      <p className={MULTISCALE_TYPE.semititle}>{ko ? "여러 가닥이 만드는 배열" : "The arrangement many chains make"}</p>
      <p className={`mt-2 ${MULTISCALE_TYPE.body}`}>
        {ko
          ? "여러 가닥이 얽히고 풀리며 만드는 배열은 재료가 얼마나 단단한지, 분자가 얼마나 쉽게 통과하는지를 좌우한다. 실험에서도 이 배열을 확인한다."
          : "The arrangement formed as many chains entangle and release affects how stiff the material is and how easily molecules pass through it. Experiments can test the same arrangement."}
      </p>
      <p className={`mt-3 ${MULTISCALE_TYPE.metadata}`}>
        {ko ? "학습용 궤적이며 실제 시간과의 대응은 모형에 따라 달라진다" : "Teaching trajectory; correspondence to physical time depends on the model"}
      </p>
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
        <SceneContent sceneKey={sceneKey} ko={ko} />
      </MechanismPanel>
    </div>
  );
}
