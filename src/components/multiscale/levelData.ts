// Page-level narrative, equation, provenance, and scene choreography for the
// multiscale instrument. Each scale leads with one flagship page stating what
// only that tier can do and why we pay its price, optionally followed by one
// interactive mechanism page. Prose depth lives in the per-scale article pages
// at /[lang]/multiscale/[slug].

import type { LevelId } from "./scrollState";

export type ProvenanceKind =
  | "CALCULATED"
  | "TRAJECTORY"
  | "MECHANISM SCHEMATIC"
  | "TARGET NOT AVAILABLE";

/** The chip text per locale. The kind itself stays an English union; it is a key, not copy. */
export const PROVENANCE_KIND_LABEL: Record<ProvenanceKind, Record<"en" | "ko", string>> = {
  CALCULATED: { en: "CALCULATED", ko: "계산값" },
  TRAJECTORY: { en: "TRAJECTORY", ko: "궤적" },
  "MECHANISM SCHEMATIC": { en: "CONCEPT DIAGRAM", ko: "개념 도식" },
  "TARGET NOT AVAILABLE": { en: "NO TARGET DATA", ko: "비교 자료 없음" },
};

export interface VisualLayerProvenance {
  kind: ProvenanceKind;
  label: Record<"en" | "ko", string>;
  /** Drawn only by the stacked (phone) mechanism panel; desktop hides that panel. */
  mobileOnly?: true;
}

export type PlotType = "scf" | "allatomForceField" | "allatomCoordination";

export interface StepConfig {
  activeTerms: string[];
  equationKey?: string;
  equationDetailMode?: "single" | "grouped" | "hidden";
  showEquation?: boolean;
  title: Record<"en" | "ko", string>;
  question: Record<"en" | "ko", string>;
  concept: Record<"en" | "ko", string>;
  takeaway: Record<"en" | "ko", string>;
  systemCaption: Record<"en" | "ko", string>;
  visualLayers: VisualLayerProvenance[];
  plotType: PlotType | null;
  sceneKey: string;
}

export interface LevelChoreography {
  equationKey: string;
  steps: StepConfig[];
}

export const CHOREOGRAPHY: Record<LevelId, LevelChoreography> = {
  dft: {
    equationKey: "frontier",
    steps: [
      {
        activeTerms: ["rhoIn", "veff", "orbitals", "rhoOut"],
        showEquation: false,
        equationKey: "scf",
        equationDetailMode: "grouped",
        title: { en: "How DFT Finds a Stable Density", ko: "DFT가 안정된 전자 밀도를 찾는 법" },
        question: {
          en: "How can a calculation find the electron distribution when each electron changes the forces acting on all the others?",
          ko: "각 전자가 받는 힘이 다른 모든 전자의 위치에 달려 있다면, 전자 분포는 어떻게 계산할까?",
        },
        concept: {
          en: "Electrons shape the potential they themselves feel, so DFT finds their distribution in a loop. It starts from an estimated electron density, computes the potential that density creates, and solves for where the electrons settle in that potential. The result becomes the next estimate, and the loop repeats until the density going in matches the density coming out. The energy and the orbitals, which describe individual electron states, then follow from that density.",
          ko: "전자는 서로가 만든 퍼텐셜 안에서 움직이므로 DFT는 전자 분포를 여러 번 고쳐 가며 구한다. 먼저 전자 밀도를 추정하고, 이 밀도가 만드는 퍼텐셜을 계산해 전자의 새 분포를 구한다. 새 분포를 다음 추정으로 삼아, 넣은 밀도와 나온 밀도가 같아질 때까지 반복한다. 이렇게 얻은 밀도에서 에너지와, 각 전자의 상태를 나타내는 오비탈이 정해진다.",
        },
        takeaway: {
          en: "Once the densities agree, DFT gives one structure's energy and the force on every atom, the examples a machine-learning force field learns from.",
          ko: "두 밀도가 같아지면 구조 하나의 에너지와 원자마다 받는 힘이 정해지고, 머신러닝 역장은 이 값을 학습한다.",
        },
        // "-\u2060" is an ASCII hyphen plus a word joiner: the narrow rail split the name as "PO-" / "T2T",
        // and the joiner keeps it whole while find-in-page still matches the ASCII "PO-T2T"
        // (the old non-breaking hyphen ‑ did not).
        systemCaption: {
          en: "Electron-density updates for PO-\u2060T2T, a 108-atom triazine molecule with three phosphine-oxide arms",
          ko: "트라이아진 중심에 포스핀 옥사이드 가지 세 개가 달린 PO-\u2060T2T 분자(원자 108개)의 전자 밀도 갱신",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Electron-density snapshots", ko: "전자 밀도 계산 장면" } },
          { kind: "CALCULATED", label: { en: "Energy change at each update", ko: "갱신마다 계산한 에너지 변화" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Density iteration loop", ko: "전자 밀도 반복 과정" }, mobileOnly: true },
        ],
        plotType: "scf",
        sceneKey: "D4_scf",
      },
      {
        activeTerms: ["rho"],
        showEquation: false,
        equationKey: "frontier",
        equationDetailMode: "grouped",
        title: { en: "What Explicit Electrons Reveal", ko: "전자를 직접 계산해 얻는 정보" },
        question: {
          en: "What information does an explicit electron distribution reveal about chemical change?",
          ko: "화학 문제에서 전자 분포 자체를 계산하면 어떤 정보를 얻을 수 있을까?",
        },
        concept: {
          en: "Electron density shows where charge is concentrated around a molecule. Two orbitals matter most for chemical change. An electron leaves first from the highest occupied molecular orbital (HOMO), and an added electron goes first into the lowest unoccupied molecular orbital (LUMO). Together they mark where the molecule gives up or accepts charge. The cost of the calculation limits this analysis to selected structures.",
          ko: "전자 밀도는 분자에서 전하가 모인 곳을 보여 준다. 전자가 채워진 가장 높은 오비탈(HOMO)에서 전자가 먼저 빠져나가고, 비어 있는 가장 낮은 오비탈(LUMO)로 새 전자가 먼저 들어간다. 두 오비탈을 함께 보면 화학 변화에서 분자가 전자를 내주거나 받는 부분이 드러난다. DFT는 계산 비용이 커서 고른 구조에만 이 분석을 적용한다.",
        },
        takeaway: {
          en: "DFT computes the electron density, HOMO, and LUMO of selected structures.",
          ko: "DFT는 고른 구조의 전자 밀도와 HOMO, LUMO를 직접 계산한다.",
        },
        systemCaption: {
          en: "Electron density, HOMO, and LUMO of the same PO-\u2060T2T molecule",
          ko: "같은 PO-\u2060T2T 분자의 전자 밀도와 HOMO, LUMO",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Electron density, HOMO, and LUMO", ko: "전자 밀도와 HOMO, LUMO" } },
        ],
        plotType: null,
        sceneKey: "D6_outputs",
      },
    ],
  },

  mlff: {
    equationKey: "mlff",
    steps: [
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "From Quantum Examples to a Force Field", ko: "양자 계산 예시에서 역장까지" },
        question: {
          en: "How can quantum energies and forces be reused across the many steps of molecular dynamics, a simulation that follows atoms through time?",
          ko: "원자의 움직임을 시간 순서로 따라가는 분자동역학에서, 양자 계산의 에너지와 힘을 수많은 스텝에 어떻게 다시 쓸까?",
        },
        concept: {
          en: "Each quantum calculation labels one atomic arrangement with its energy and the force on every atom. A machine-learning force field (MLFF) learns from many such examples how energy depends on arrangement. A prediction costs far less than a new quantum calculation, so trajectories run longer at atom-level detail, including some bond-changing reactions. The training data set the chemistry the model can be trusted for, and reference calculations check it.",
          ko: "양자 계산 한 번은 원자 배치 하나에 에너지와 각 원자가 받는 힘을 붙인다. 머신러닝 역장(MLFF)은 이런 예시를 많이 학습해 원자 배치와 에너지의 관계를 배운다. 예측 비용이 양자 계산보다 훨씬 작아, 원자 해상도로 일부 결합 변화까지 담은 긴 궤적을 계산한다. 믿을 수 있는 화학 범위는 학습 자료가 정하고, 참조 계산으로 따로 확인한다.",
        },
        takeaway: {
          en: "An MLFF reuses quantum results at far lower cost, within the chemistry its training data cover.",
          ko: "MLFF는 학습 자료가 담은 화학 범위 안에서 양자 계산 결과를 훨씬 적은 비용으로 다시 쓴다.",
        },
        systemCaption: {
          en: "Teaching diagram of quantum reference data, a learned model, and its computational reach",
          ko: "양자 참조 자료와 학습 모형, 그 계산 범위를 잇는 학습용 도식",
        },
        visualLayers: [
          { kind: "MECHANISM SCHEMATIC", label: { en: "Five arrangements of one molecule, drawn as training examples", ko: "학습 예시로 그린 한 분자의 다섯 가지 배치" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Reach of DFT, MLFF, and classical models", ko: "DFT, MLFF, 고전 역장의 계산 범위" } },
        ],
        plotType: null,
        sceneKey: "L1_why",
      },
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "How One Model Predicts Every Force", ko: "하나의 모형이 모든 힘을 예측하는 법" },
        question: {
          en: "How can one learned model give the same energy when the whole system is moved or rotated, and still scale to more atoms?",
          ko: "하나의 학습 모형이 계 전체를 옮기거나 돌려도 같은 에너지를 내고, 더 많은 원자까지 계산하려면 어떻게 해야 할까?",
        },
        concept: {
          en: "The model reads the nearby environment of each atom and assigns an energy contribution to it. Each atom sees only neighbors within a cutoff distance, so the cost grows in proportion to the number of atoms. Moving or rotating the system preserves total energy, and swapping identical atoms preserves the prediction. The representation builds in these physical symmetries. Summing atomic contributions gives one total energy; its change as each atom moves produces consistent forces on every atom.",
          ko: "모형은 원자마다 정해진 거리 안의 이웃만 읽고 에너지 기여분을 정하므로, 계산량은 원자 수에 비례해 늘어난다. 계 전체를 옮기거나 돌려도, 같은 원소의 원자끼리 자리를 바꿔도 총에너지는 그대로다. 이웃을 읽는 방식에 이 대칭이 들어 있다. 원자별 기여를 더해 총에너지를 구하고, 원자가 움직일 때 생기는 에너지 변화에서 모든 힘을 일관되게 구한다.",
        },
        takeaway: {
          en: "Local environments control computational cost, and one shared energy keeps all predicted forces physically consistent.",
          ko: "가까운 이웃만 읽어 계산량을 줄이고 하나의 총에너지에서 모든 힘을 구해 물리적 일관성을 지킨다.",
        },
        systemCaption: {
          en: "Teaching diagram of nearby atomic environments, total energy, and predicted forces",
          ko: "원자 주변 환경과 총에너지, 예측된 힘의 관계를 보여 주는 학습용 도식",
        },
        visualLayers: [
          { kind: "MECHANISM SCHEMATIC", label: { en: "Nearby atoms used for each prediction", ko: "원자별 예측에 쓰는 가까운 이웃" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Total energy and forces from its change", ko: "총에너지와 그 변화에서 얻는 힘" } },
        ],
        plotType: null,
        sceneKey: "L5_energy_force",
      },
    ],
  },

  allatom: {
    equationKey: "observable",
    steps: [
      {
        // The step's own copy is the classical potential term by term ("A bond is one spring,
        // an angle is another, and the rest is charge pulling on charge"), and the rail offers
        // "select a force-field term in the equation" as its interaction. Both were pointed at
        // the observable equation, whose only termIds are `observable` and `average`, so no
        // segment was ever interactive and the hint named something that could not be clicked.
        activeTerms: ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"],
        showEquation: false,
        equationKey: "classical",
        equationDetailMode: "grouped",
        title: { en: "Fixed Interaction Rules Reach Longer Times", ko: "고정된 상호작용으로 더 긴 움직임을 본다" },
        question: {
          en: "Why can a simulation with fixed interaction rules follow molecular motion far longer than a quantum calculation can?",
          ko: "고정된 상호작용 규칙을 쓰면 왜 양자 계산보다 훨씬 오래 분자의 움직임을 따라갈 수 있을까?",
        },
        concept: {
          en: "A classical force field writes each interaction as a simple formula: bond stretching, angle bending, rotation about bonds, short-range repulsion and attraction, and forces between charges. These formulas are cheap to evaluate, so molecular dynamics can run many more steps and sample how a liquid packs and flows. Because the bonds are fixed in advance, reactions that make or break bonds need a reactive model or an electronic calculation.",
          ko: "고전 역장은 상호작용마다 단순한 식을 쓴다. 결합 신축, 결합각 굽힘, 결합 회전, 가까운 원자 사이의 반발과 인력, 전하 사이의 힘이 각각 하나의 항이다. 식의 계산이 빨라 분자동역학을 훨씬 많은 스텝까지 진행하며 액체 분자가 자리 잡고 흐르는 모습을 따라간다. 결합은 미리 정해 두므로, 결합이 바뀌는 반응에는 반응형 모형이나 전자 계산을 쓴다.",
        },
        takeaway: {
          en: "A classical force field is cheap enough for long trajectories; reactions that change bonds need a reactive method.",
          ko: "고전 역장은 식이 단순해 긴 궤적 계산에 알맞고, 결합이 바뀌는 반응에는 반응형 방법이 필요하다.",
        },
        systemCaption: {
          en: "Liquid trajectory showing one lithium ion and nearby molecules",
          ko: "리튬 이온 하나와 주변 분자를 보여 주는 액체 궤적",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Molecules around one lithium ion", ko: "리튬 이온 하나의 주변 분자" } },
          { kind: "CALCULATED", label: { en: "Nearby oxygen contacts", ko: "가까운 산소 원자 접촉" } },
        ],
        plotType: null,
        sceneKey: "A3_forcefield",
      },
      {
        activeTerms: ["observable", "average"],
        showEquation: false,
        equationKey: "observable",
        equationDetailMode: "grouped",
        title: { en: "How a Trajectory Becomes a Measurable Value", ko: "궤적을 측정값으로 바꾸는 법" },
        question: {
          en: "How does a changing trajectory become one value that can be compared with an experiment?",
          ko: "계속 바뀌는 궤적을 실험과 비교할 하나의 값으로 어떻게 바꿀까?",
        },
        concept: {
          en: "Each frame of a trajectory is one snapshot of atomic positions. A measurable value comes from applying one counting rule to every frame. Here the rule counts the solvent C=O oxygens within 0.28 nm of each lithium ion, and each ion is colored by its count. Across the run the count averages 3.8, and the bars show how often each count occurs. Experiments that probe an ion's nearest neighbors test this average.",
          ko: "궤적의 프레임 하나는 원자 위치를 담은 한 장면이다. 모든 프레임에 같은 규칙을 적용하면 측정값이 된다. 여기서는 리튬 이온마다 0.28 nm 안에 있는 용매의 C=O 산소를 세고, 그 수로 이온의 색을 정했다. 평균은 3.8이고, 막대는 각 개수가 나타난 비율을 보여 준다. 이온 바로 옆의 원자 배치를 재는 실험으로 이 평균을 검증한다.",
        },
        takeaway: {
          en: "A simulated observable needs a clear definition, an average, and a measure of variation.",
          ko: "시뮬레이션 관측량에는 분명한 정의와 평균, 값이 흔들리는 범위가 함께 필요하다.",
        },
        systemCaption: {
          en: "Solvent C=O oxygens within 0.28 nm of each lithium ion, counted in every frame",
          ko: "프레임마다 센 리튬 이온 주변 0.28 nm 안의 용매 C=O 산소 수",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Changing number of oxygen neighbors around lithium", ko: "시간에 따라 바뀌는 리튬 주위 산소 원자 수" } },
          { kind: "CALCULATED", label: { en: "Distribution and average", ko: "분포와 평균" } },
        ],
        plotType: "allatomCoordination",
        sceneKey: "A6_observables",
      },
    ],
  },

  meso: {
    equationKey: "cgModel",
    steps: [
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "Choosing What One Bead Represents", ko: "비드 하나에 무엇을 담을까" },
        question: {
          en: "Which atomic details should each bead retain to reproduce the target behavior?",
          ko: "설명하려는 거동을 보존하려면 비드 하나에 어떤 원자 정보를 담아야 할까?",
        },
        concept: {
          en: "Coarse-graining replaces several atoms with one interaction site called a bead. It preserves selected features such as a polymer chain's overall shape and connectivity. Atom-specific positions, fast internal motion, and detailed contacts are averaged at bead resolution. With fewer particles and smoother interactions, a simulation reaches larger systems and slower collective motion. Atom-level calculations or experiments test the mapping against the target question.",
          ko: "조대화는 원자 여러 개를 비드라는 하나의 상호작용점으로 바꾼다. 고분자 사슬의 전체 모양과 연결 관계처럼 선택한 특징을 보존한다. 원자별 위치와 빠른 내부 운동, 세부 접촉은 비드 해상도에서 평균화한다. 입자가 줄고 상호작용이 부드러워져 더 큰 계와 느린 집단 운동을 볼 수 있다. 원자 계산이나 실험으로 질문에 맞는 매핑인지 확인한다.",
        },
        takeaway: {
          en: "The atom-to-bead mapping sets computational reach, retained information, and averaged detail.",
          ko: "원자-비드 매핑은 계산 범위와 보존할 정보, 평균화할 세부 정보를 함께 정한다.",
        },
        systemCaption: {
          en: "Teaching diagram of a 36-base-pair double helix mapped to one bead per base pair, about 40 atoms per bead",
          ko: "36염기쌍 이중 나선을 염기쌍마다 비드 하나(원자 약 40개)로 바꾸는 학습용 도식",
        },
        visualLayers: [
          { kind: "MECHANISM SCHEMATIC", label: { en: "Atom-to-bead mapping", ko: "원자에서 비드로 바꾸는 과정" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "What a bead retains and averages", ko: "비드가 보존하는 정보와 평균화하는 정보" }, mobileOnly: true },
        ],
        plotType: null,
        sceneKey: "M2_mapping",
      },
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "Collective Behavior Needs a Larger View", ko: "집단 거동에는 더 큰 시야가 필요하다" },
        question: {
          en: "What collective changes emerge when many molecules are modeled together over long times?",
          ko: "많은 분자를 함께 긴 시간 계산하면 어떤 집단 변화가 나타날까?",
        },
        concept: {
          en: "Collective properties emerge from molecular assemblies. Polymer chains entangle into elastic networks, block copolymers form repeating structures, and coated nanoparticles organize into lattices. Coarse-grained models reach these structures, often tens of nanometers across, by keeping chain shape and connectivity at bead resolution. Microscopy images and the repeat distances measured by scattering experiments test these predictions.",
          ko: "집단 물성은 여러 분자가 모인 구조에서 생긴다. 고분자 사슬은 얽혀 탄성 그물을 만들고, 블록 공중합체는 반복 구조를, 고분자로 감싼 나노 입자는 격자를 이룬다. 조대화 모형은 비드 해상도에서 사슬의 모양과 연결을 남겨 수십 나노미터에 이르는 이런 구조까지 계산한다. 계산 결과는 현미경으로 본 구조, 산란 실험으로 잰 반복 간격과 비교해 검증한다.",
        },
        takeaway: {
          en: "Coarse-graining reaches collective organization with explicit bead resolution and validation targets.",
          ko: "조대화는 집단 조직화를 계산하며 비드 해상도와 검증 기준을 함께 명시한다.",
        },
        systemCaption: {
          en: "Coarse-grained trajectory of a generic polymer-melt model, 100 chains of 80 beads each",
          ko: "일반 고분자 용융체 모형의 조대화 궤적(비드 80개로 된 사슬 100개)",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Coarse-grained polymer trajectory", ko: "고분자 조대화 궤적" } },
        ],
        plotType: null,
        sceneKey: "M5_collective",
      },
    ],
  },
};
