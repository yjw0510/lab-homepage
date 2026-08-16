"use client";

import {
  type AllAtomForceFieldTerm,
  type AllAtomReadoutId,
  type AllAtomSceneKey,
} from "../allatom/allAtomConfig";
import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";
import { ObservableTrace } from "./allatom/ObservableTrace";

export interface AllAtomMechanismProps {
  sceneKey: AllAtomSceneKey;
  lang: string;
  reducedMotion?: boolean;
  isMobile?: boolean;
  activeTerm?: AllAtomForceFieldTerm | null;
  activeReadout?: AllAtomReadoutId | null;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
  onReadoutChange?: (readout: AllAtomReadoutId) => void;
}

const COPY: Record<
  AllAtomSceneKey,
  {
    en: { title: string; description: string };
    ko: { title: string; description: string };
  }
> = {
  A3_forcefield: {
    en: {
      title: "Questions answered by fixed interaction rules",
      description:
        "Separate terms set molecular shape and intermolecular contacts. The model covers shape and solubility for systems with a fixed bonding pattern; bond changes use a reactive model.",
    },
    ko: {
      title: "고정된 상호작용으로 답할 수 있는 범위",
      description:
        "각 항은 분자 모양과 분자 사이 접촉을 정한다. 고정된 결합 구조의 형태와 용해도를 계산하며 결합 변화에는 반응형 모형을 적용한다.",
    },
  },
  A6_observables: {
    en: {
      title: "Turning a trajectory into something measurable",
      description:
        "The number of nearby solvent molecules or the lifetime of a contact comes from many frames, producing values that experiments can test.",
    },
    ko: {
      title: "궤적을 측정 가능한 값으로 바꾸기",
      description:
        "주변 용매 분자 수나 접촉이 이어지는 시간은 여러 프레임에서 구한다. 같은 종류의 실험값과 비교한다.",
    },
  },
};

// Legacy color keys; every selected state uses the 전원자 level triad (lv-aa).
const tone = {
  cyan: "border-lv-aa-line bg-lv-aa-wash text-lv-aa",
  violet: "border-lv-aa-line bg-lv-aa-wash text-lv-aa",
  amber: "border-lv-aa-line bg-lv-aa-wash text-lv-aa",
  rose: "border-lv-aa-line bg-lv-aa-wash text-lv-aa",
  neutral: "border-border bg-muted/40 text-foreground",
} as const;

const FORCE_TERMS: Record<
  AllAtomForceFieldTerm,
  {
    label: { en: string; ko: string };
    family: { en: string; ko: string };
    meaning: { en: string; ko: string };
    color: keyof typeof tone;
  }
> = {
  Ubond: {
    label: { en: "Bond", ko: "결합" },
    family: { en: "shape", ko: "분자 모양" },
    meaning: { en: "Penalizes stretching away from the reference bond length.", ko: "결합 길이가 기준값에서 벗어날 때 에너지가 증가한다." },
    color: "cyan",
  },
  Uangle: {
    label: { en: "Angle", ko: "결합각" },
    family: { en: "shape", ko: "분자 모양" },
    meaning: { en: "Maintains local molecular geometry around a central atom.", ko: "중심 원자 주변의 국소 분자 구조를 유지한다." },
    color: "violet",
  },
  Udihedral: {
    label: { en: "Bond rotation", ko: "결합 회전" },
    family: { en: "shape", ko: "분자 모양" },
    meaning: { en: "Controls rotation and conformational preferences around bonds.", ko: "결합 주위 회전과 선호하는 분자 형태를 정한다." },
    color: "amber",
  },
  UvdW: {
    label: { en: "Short-range forces", ko: "단거리 힘" },
    family: { en: "contacts", ko: "원자 사이" },
    meaning: { en: "Atoms repel at very short distances and attract a little farther apart.", ko: "원자는 아주 가까우면 밀어내고 조금 멀어지면 끌어당긴다." },
    color: "rose",
  },
  UCoul: {
    label: { en: "Electrostatics", ko: "정전기" },
    family: { en: "contacts", ko: "원자 사이" },
    meaning: { en: "Opposite charges attract; like charges repel.", ko: "서로 다른 전하는 끌어당기고 같은 전하는 밀어낸다." },
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
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="tablist" aria-label={ko ? "분자 상호작용 항" : "molecular interaction terms"}>
        {(Object.keys(FORCE_TERMS) as AllAtomForceFieldTerm[]).map((term) => {
          const item = FORCE_TERMS[term];
          const selectedNow = activeTerm === term;
          return (
            <button
              key={term}
              type="button"
              role="tab"
              aria-selected={selectedNow}
              // The two spans below are adjacent grid children with no text node
              // between them, so the computed name ran them together: "결합결합 항",
              // "Bondbonded". Naming the tab explicitly puts the separator back.
              aria-label={`${item.label[ko ? "ko" : "en"]}, ${item.family[ko ? "ko" : "en"]}`}
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
        <p className={`mt-3 ${MULTISCALE_TYPE.body}`}>{selected.meaning[ko ? "ko" : "en"]}</p>
      </div>
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
    en: ["Repeated contacts", "Count contact patterns that recur between nearby molecules."],
    ko: ["반복 접촉", "가까운 분자 사이에서 되풀이되는 접촉 형태를 센다."],
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
      <div className="border border-border bg-muted/30 p-3">
        <ObservableTrace lang={lang} reducedMotion={reducedMotion} />
      </div>
      <div className="grid content-start gap-2">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1" role="tablist" aria-label={ko ? "궤적에서 얻는 측정값" : "measurements from the trajectory"}>
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
        <div className="mt-2 border-t border-lv-aa-line pt-4">
          <p className={MULTISCALE_TYPE.semititle}>{selected[0]}</p>
          <p className={`mt-2 ${MULTISCALE_TYPE.description}`}>{selected[1]}</p>
        </div>
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
  if (sceneKey === "A3_forcefield") {
    return <A3ForceField ko={ko} activeTerm={activeTerm} onTermChange={onTermChange} />;
  }

  return (
    <A6Observables
      ko={ko}
      reducedMotion={reducedMotion}
      activeReadout={activeReadout}
      onReadoutChange={onReadoutChange}
      lang={lang}
    />
  );
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
  const ko = lang.toLowerCase().startsWith("ko");
  const copy = COPY[sceneKey][ko ? "ko" : "en"];

  return (
    <div className={`allatom-mechanism z-[3] ${isMobile ? "relative" : "pointer-events-none absolute inset-0"}`}>
      <MechanismPanel
        className={`pointer-events-auto overflow-hidden ${
          isMobile ? MULTISCALE_PANEL.mobileBand : MULTISCALE_PANEL.desktopOverlay
        }`}
      >
        <MechanismHeader
          tone="amber"
          title={copy.title}
          description={copy.description}
          aside={
            <span className={MULTISCALE_TYPE.metadata}>
              {ko ? "전원자 MD" : "ALL-ATOM MD"}
            </span>
          }
        />
        <SceneContent
          sceneKey={sceneKey}
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
