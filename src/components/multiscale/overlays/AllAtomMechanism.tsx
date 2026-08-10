"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
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
  A3_forcefield: {
    en: {
      title: "The range of answers five terms allow",
      description:
        "Bonded terms hold a molecule's shape and nonbonded terms set how closely molecules come together. Conformation and solubility are therefore answerable; bond breaking sits outside the model.",
    },
    ko: {
      title: "다섯 항이 정하는 답의 범위",
      description:
        "결합 항은 분자의 모양을 붙잡고, 비결합 항은 분자끼리 다가서는 방식을 정한다. 그래서 배좌와 용해도는 물을 수 있고, 결합이 끊어지는 일만 이 모형 밖에 있다.",
    },
  },
  A6_observables: {
    en: {
      title: "Turning a trajectory into something measurable",
      description:
        "A hydration number or a contact lifetime comes out of thousands of frames averaged together, in the form an NMR or scattering measurement reports it.",
    },
    ko: {
      title: "궤적을 측정 가능한 값으로 바꾸기",
      description:
        "수화수나 접촉 수명은 프레임 수천 장을 평균해서 얻는다. NMR과 산란이 내놓는 값과 같은 형태다.",
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
      <div className="border border-border bg-muted/30 p-3">
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
              {ko ? "고전 전원자" : "CLASSICAL ALL-ATOM"}
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
