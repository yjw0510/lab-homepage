"use client";

import { type AllAtomForceFieldTerm } from "../allatom/allAtomConfig";
import { MechanismHeader, MechanismPanel } from "../MechanismPanel";
import { MULTISCALE_PANEL, MULTISCALE_TYPE } from "../visualRules";

/**
 * The force-field step's term picker.
 *
 * The observables step has no band. Its readout used to be a caffeine-in-water trace
 * (metrics.json: water contacts, alignment, neighbours) drawn under the LiPF6 / EC / EMC cell,
 * with tabs for measures this system never computed. The rail's coordination histogram is the
 * step's measurement.
 */
export interface AllAtomMechanismProps {
  lang: string;
  isMobile?: boolean;
  activeTerm?: AllAtomForceFieldTerm | null;
  onTermChange?: (term: AllAtomForceFieldTerm) => void;
}

// The step's prose already says bond changes need a reactive model, twice; the band names the
// five tiles below it and stops.
const COPY = {
  en: {
    title: "Five terms in a classical force field",
    description:
      "Bond, angle, and bond-rotation terms hold each molecule's shape. Short-range and electrostatic terms set contacts between atoms.",
  },
  ko: {
    title: "고전 역장을 이루는 다섯 항",
    description:
      "결합, 결합각, 결합 회전 항은 분자 모양을 유지하고, 단거리 힘과 정전기 항은 원자 사이 접촉을 정한다.",
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
              // Label over family tag. Side by side, a two-column grid at 390px pushed
              // "contacts" past the tile edge and wrapped "Short-range forces" to three lines.
              className={`grid min-h-12 content-center gap-0.5 border px-3 py-2 text-left transition-colors ${
                selectedNow ? tone[item.color] : tone.neutral
              }`}
            >
              <span className="font-semibold leading-snug">{item.label[ko ? "ko" : "en"]}</span>
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

export function AllAtomMechanism({
  lang,
  isMobile = false,
  activeTerm = "Ubond",
  onTermChange,
}: AllAtomMechanismProps) {
  const ko = lang.toLowerCase().startsWith("ko");
  const copy = COPY[ko ? "ko" : "en"];

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
        <A3ForceField ko={ko} activeTerm={activeTerm ?? "Ubond"} onTermChange={onTermChange} />
      </MechanismPanel>
    </div>
  );
}
