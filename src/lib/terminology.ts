import React from "react";

/**
 * Korean → English term pairs for ruby annotation.
 * Order does not matter — the matching algorithm finds the earliest
 * occurrence in text and breaks ties by preferring the longer term.
 */
const TERMS: readonly [string, string][] = [
  // Computational Chemistry / Simulation Methods
  ["밀도범함수이론", "density functional theory"],
  ["결합 클러스터 이론", "coupled-cluster theory"],
  ["주기 경계 조건", "periodic boundary conditions"],
  ["머신러닝 역장", "machine learning force field"],
  ["신경망 퍼텐셜", "neural network potential"],
  ["기계학습 퍼텐셜", "machine-learned potential"],
  ["분산 상호작용", "dispersion interaction"],
  ["분자동역학", "molecular dynamics"],
  ["전자구조", "electronic structure"],
  ["미시유변학", "microrheology"],
  ["명시적 용매", "explicit solvent"],
  ["분산 보정", "dispersion correction"],
  ["섭동 이론", "perturbation theory"],
  ["상호작용점", "interaction site"],
  ["능동 학습", "active learning"],
  ["참조 데이터", "reference data"],
  ["표본추출", "sampling"],
  ["제일원리", "ab initio"],
  ["전원자", "all-atom"],
  ["힘장 항", "force-field term"],
  ["전이성", "transferability"],
  ["조대화", "coarse-graining"],
  ["국소 기저", "localized basis"],
  ["평면파", "plane-wave"],
  ["역장", "force field"],

  // Polymer / Materials Science
  ["삼중블록 공중합체", "triblock copolymer"],
  ["마이크로상 분리", "microphase separation"],
  ["준안정 중간체", "metastable intermediate"],
  ["고갈 상호작용", "depletion interaction"],
  ["블록 공중합체", "block copolymer"],
  ["병솔형 고분자", "bottlebrush polymer"],
  ["고분자 브러시", "polymer brush"],
  ["고분자 코팅", "polymer coating"],
  ["온도감응성", "thermoresponsive"],
  ["자기조립", "self-assembly"],
  ["거대분자", "macromolecule"],
  ["배제 부피", "excluded volume"],
  ["체심입방", "body-centered cubic"],
  ["면심입방", "face-centered cubic"],
  ["점탄성", "viscoelasticity"],
  ["가교", "crosslink"],
  ["팽윤", "swelling"],
  ["겔화", "gelation"],
  ["배좌", "conformation"],
  ["접합", "grafted"],
  ["주쇄", "backbone"],
  ["곁사슬", "side chain"],
  ["분지형", "branched"],

  // Solution Chemistry / Physical Chemistry
  ["수소결합 네트워크", "hydrogen bond network"],
  ["용매화 열역학", "solvation thermodynamics"],
  ["초임계수", "supercritical water"],
  ["유전 완화", "dielectric relaxation"],
  ["배위 껍질", "coordination shell"],
  ["이온 용해", "ion dissolution"],
  ["용존 이온", "dissolved ion"],
  ["용매화", "solvation"],
  ["점전하", "point charge"],
  ["배위", "coordination"],

  // Glass / Colloid Physics
  ["동역학적 비균질성", "dynamical heterogeneity"],
  ["능동 미시유변학", "active microrheology"],
  ["응집물질물리학", "condensed matter physics"],
  ["협동적 재배열", "cooperative rearrangement"],
  ["과냉각 액체", "supercooled liquid"],
  ["유리 전이", "glass transition"],
  ["탐침 입자", "probe particle"],
  ["정이십면체", "icosahedral"],
  ["구조색", "structural color"],
  ["사족형", "tetrapod"],
  ["회춘", "rejuvenation"],

  // Future Research
  ["강유전 스위칭", "ferroelectric switching"],
  ["그로투스 메커니즘", "Grotthuss mechanism"],
  ["스케일링 거동", "scaling behavior"],
  ["비균일 촉매", "heterogeneous catalysis"],
  ["임계 성질", "critical properties"],
  ["뉴로모픽", "neuromorphic"],
  ["상전이", "phase transition"],
];

/**
 * Scan text for Korean terms and wrap the first occurrence of each
 * in a <ruby> React element.  Already-used terms (tracked via usedTerms)
 * are skipped, so each term is annotated at most once per section.
 */
export function wrapKoreanTerms(
  text: string,
  keyPrefix: string | number,
  keyCounter: { value: number },
  usedTerms: Set<string>,
): React.ReactNode[] {
  if (!text) return [];

  // Find the earliest-occurring unused term; prefer longer at ties
  let bestIdx = Infinity;
  let bestEntry: readonly [string, string] | null = null;

  for (const entry of TERMS) {
    if (usedTerms.has(entry[0])) continue;
    const idx = text.indexOf(entry[0]);
    if (idx === -1) continue;
    if (
      idx < bestIdx ||
      (idx === bestIdx && entry[0].length > (bestEntry?.[0].length ?? 0))
    ) {
      bestIdx = idx;
      bestEntry = entry;
    }
  }

  if (!bestEntry) return [text];

  const [ko, en] = bestEntry;
  usedTerms.add(ko);

  const before = text.slice(0, bestIdx);
  const after = text.slice(bestIdx + ko.length);

  const nodes: React.ReactNode[] = [];
  if (before) nodes.push(before);

  nodes.push(
    React.createElement(
      "ruby",
      {
        key: `${keyPrefix}-rb-${keyCounter.value++}`,
        className: "term-ruby",
      },
      ko,
      React.createElement("rp", null, "("),
      React.createElement("rt", null, en),
      React.createElement("rp", null, ")"),
    ),
  );

  // Recurse on the remaining text
  nodes.push(...wrapKoreanTerms(after, keyPrefix, keyCounter, usedTerms));

  return nodes;
}
