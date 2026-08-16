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

// Legacy color key; the selected state uses the 메조 level triad (lv-meso).
const tone = {
  amber: "border-lv-meso-line bg-lv-meso-wash text-lv-meso",
  neutral: "border-border bg-muted/40 text-foreground",
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

function M2Mapping({ ko, isMobile }: { ko: boolean; isMobile: boolean }) {
  const speedupFactors = [
    {
      label: ko ? "입자 수 감소" : "Fewer particles",
      note: ko ? "여러 원자가 비드 하나로" : "several atoms per bead",
    },
    {
      label: ko ? "단순해진 운동" : "Smoother motion",
      note: ko ? "빠른 내부 운동을 평균화" : "fast internal motion is averaged",
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
          <div className={`border border-lv-meso-line bg-lv-meso-wash p-4 ${isMobile ? MULTISCALE_TYPE.description : MULTISCALE_TYPE.body}`}>
            {ko
              ? "비드의 위치는 함께 묶은 원자들의 전체 위치를 대표한다."
              : "Each bead is placed to represent the atoms grouped into it."}
          </div>
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
            ? "세 변화가 함께 작용해 더 큰 계와 느린 집단 운동을 따라갈 수 있다. 얼마나 범위가 넓어지는지는 원자를 묶는 방식에 따라 달라진다."
            : "Together, these changes let the model follow larger systems and slower collective motion. The gain depends on how the atoms are grouped."}
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
          [ko ? "다수" : "many", ko ? "고분자 사슬" : "polymer chains"],
          [ko ? "비드" : "beads", ko ? "단순화한 단위" : "simplified units"],
          [ko ? "형태" : "shape", ko ? "보존하는 정보" : "information retained"],
          [ko ? "운동" : "motion", ko ? "집단 거동" : "collective behavior"],
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
            ? "여러 가닥이 얽히고 풀리며 만드는 배열은 재료가 얼마나 단단한지, 분자가 얼마나 쉽게 통과하는지를 좌우한다. 실험에서도 이 배열을 확인한다."
            : "The arrangement formed as many chains entangle and release affects how stiff the material is and how easily molecules pass through it. Experiments can test the same arrangement."}
        </p>
        <p className={`mt-3 ${MULTISCALE_TYPE.metadata}`}>
          {ko ? "학습용 궤적이며 실제 시간과의 대응은 모형에 따라 달라진다" : "Teaching trajectory; correspondence to physical time depends on the model"}
        </p>
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
