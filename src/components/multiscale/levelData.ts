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
          ko: "전자 하나가 다른 전자 모두의 힘을 바꾼다면 전자 분포는 어떻게 계산할까?",
        },
        concept: {
          en: "DFT begins with an estimate of where electrons are likely to be. It recalculates that distribution, compares the new answer with the estimate, and repeats. The difference becomes smaller with each pass. When the two distributions agree, the energy and orbitals, mathematical descriptions of electron states, belong to one consistent electronic state.",
          ko: "DFT는 전자가 어디에 있을지 먼저 추정한다. 그 분포를 다시 계산해 새 결과와 추정치를 비교하는 과정을 반복한다. 반복할수록 두 값의 차이가 줄어든다. 두 분포가 일치한 뒤 에너지와 전자 상태를 나타내는 수학적 기술인 오비탈을 하나의 일관된 결과로 해석한다.",
        },
        takeaway: {
          en: "Agreement between input and output electron densities makes the energy and orbitals self-consistent.",
          ko: "입력과 출력 전자 밀도의 일치가 에너지와 오비탈의 자기일관성을 정한다.",
        },
        systemCaption: {
          en: "Electron-density updates for a metal-free phthalocyanine molecule",
          ko: "금속이 없는 프탈로시아닌 분자의 전자 밀도 갱신",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Electron-density snapshots", ko: "전자 밀도 계산 장면" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Density iteration loop", ko: "전자 밀도 반복 과정" } },
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
          en: "Electron density shows where charge is concentrated around a molecule. Two orbitals, mathematical descriptions of electron states, are especially useful: the highest filled state and the lowest empty state, shown here as HOMO and LUMO. Comparing them helps locate regions involved when a molecule gives up or accepts charge. DFT applies this computationally demanding analysis to selected structures.",
          ko: "전자 밀도는 분자 안에서 전하가 모인 곳을 보여 준다. 전자 상태를 나타내는 오비탈 가운데 가장 높은 채운 상태를 HOMO, 가장 낮은 빈 상태를 LUMO라 부른다. 두 상태를 비교하면 분자가 전자를 내놓거나 받을 때 먼저 관여할 영역을 찾을 수 있다. 계산량이 큰 DFT는 이 분석을 신중하게 고른 구조에 적용한다.",
        },
        takeaway: {
          en: "DFT calculates charge distribution and boundary orbitals for selected structures.",
          ko: "DFT는 선택한 구조의 전하 분포와 경계 오비탈을 직접 계산한다.",
        },
        systemCaption: {
          en: "Electron density and boundary orbitals of metal-free phthalocyanine",
          ko: "금속이 없는 프탈로시아닌의 전자 밀도와 경계 오비탈",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Electron density and boundary orbitals", ko: "전자 밀도와 경계 오비탈" } },
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
          en: "How can quantum energies and forces be reused across the many steps of molecular dynamics?",
          ko: "양자 계산에서 얻은 에너지와 힘을 분자동역학의 수많은 스텝에 어떻게 다시 쓸 수 있을까?",
        },
        concept: {
          en: "Each quantum calculation labels one atomic arrangement with an energy and forces. A machine-learning force field, or MLFF, learns the relationship between arrangement and energy, then predicts forces across many simulation steps. The model supports longer atom-level trajectories and some bond-changing reactions. Training coverage defines its reliable chemistry, and separate reference calculations test that range.",
          ko: "양자 계산은 원자 배치 하나에 에너지와 힘을 붙인다. 머신러닝 역장(MLFF)은 원자 배치와 에너지의 관계를 배워 여러 시뮬레이션 스텝의 힘을 예측한다. 이 모형은 일부 결합 변화까지 원자 해상도의 긴 궤적으로 계산한다. 신뢰 범위는 학습 자료에 포함된 화학 환경으로 정하고 별도의 참조 계산으로 확인한다.",
        },
        takeaway: {
          en: "MLFF predicts forces with a trained model, and reference tests define its working range.",
          ko: "MLFF는 학습 모형으로 여러 스텝의 힘을 예측하며 별도 참조 계산이 적용 범위를 정한다.",
        },
        systemCaption: {
          en: "Teaching diagram of quantum reference data, a learned model, and predicted forces",
          ko: "양자 참조 자료와 학습 모형, 예측된 힘을 잇는 학습용 도식",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Quantum configurations with energy and force labels", ko: "에너지와 힘이 붙은 양자 계산 배치" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Learned energy surface and trajectory", ko: "학습된 에너지면과 궤적" } },
        ],
        plotType: null,
        sceneKey: "L1_why",
      },
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "How One Model Predicts Every Force", ko: "하나의 모형이 모든 힘을 예측하는 법" },
        question: {
          en: "How can one learned model preserve physical symmetry across a larger system?",
          ko: "하나의 학습 모형이 위치와 방향에 불변인 에너지를 유지하며 더 큰 계를 다루려면 무엇이 필요할까?",
        },
        concept: {
          en: "The model reads the nearby environment of each atom and assigns an energy contribution to it. Moving or rotating the system preserves total energy, and swapping identical atoms preserves the prediction. The representation builds in these physical symmetries. Summing atomic contributions gives one total energy; its change as each atom moves produces consistent forces on every atom.",
          ko: "모형은 원자마다 가까운 이웃을 읽고 에너지 기여분을 정한다. 계 전체의 이동과 회전에 총에너지는 불변이며 동일 원소의 교환에도 예측은 불변이다. 표현 방식에 이런 물리적 대칭을 담는다. 원자별 기여를 더해 총에너지를 구하고 각 원자가 움직일 때 생기는 에너지 변화에서 모든 원자의 힘을 일관되게 계산한다.",
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
        title: { en: "Fixed Interaction Rules Follow Longer Motion", ko: "고정된 상호작용으로 더 긴 움직임을 본다" },
        question: {
          en: "How do fixed interaction rules extend molecular-dynamics trajectories?",
          ko: "고정된 상호작용 규칙이 분자의 긴 움직임에 적합한 이유는 무엇일까?",
        },
        concept: {
          en: "A classical force field supplies equations for interactions between bonded atoms and nearby nonbonded atoms. These fixed rules let molecular dynamics follow many steps and collect the configurations needed for liquid structure and transport. A fixed bond topology supports nonreactive molecular motion. Bond-changing chemistry uses a reactive potential or an electronic method.",
          ko: "고전 역장은 결합으로 이어진 원자와 가까이 다가온 비결합 원자의 상호작용을 정한 수학식이다. 이 규칙으로 분자동역학을 오래 계산해 액체 구조와 이동을 분석할 표본을 모은다. 고정된 결합 관계는 비반응성 분자 운동을 다룬다. 결합이 바뀌는 화학에는 반응형 퍼텐셜이나 전자 계산을 쓴다.",
        },
        takeaway: {
          en: "Fixed interaction rules cover long trajectories with stable bonding patterns; reactive methods cover bond changes.",
          ko: "고정 상호작용은 안정된 결합의 긴 원자 궤적에, 반응형 방법은 결합 변화에 쓴다.",
        },
        systemCaption: {
          en: "Illustrative liquid trajectory showing one lithium ion and nearby molecules",
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
          en: "Each frame gives atomic positions. Motion-based properties come from many frames. A coordination count records how many chosen atoms lie near an ion; diffusion describes how particles spread. The analysis evaluates the same measure throughout the trajectory and reports its average and variation. The stated neighbor-distance rule fixes how the coordination count is measured.",
          ko: "각 프레임은 원자의 위치를 보여 준다. 움직임을 나타내는 물성은 여러 프레임에서 구한다. 배위수는 이온 근처의 특정 원자 수를 세고 확산은 입자가 퍼져 나가는 정도를 나타낸다. 같은 양을 궤적 전체에서 계산해 평균과 변동을 함께 본다. 명시한 이웃 거리 기준이 배위수를 세는 방식을 정한다.",
        },
        takeaway: {
          en: "A simulated observable needs a clear definition, an average, and a measure of variation.",
          ko: "시뮬레이션 관측량에는 분명한 정의와 평균, 값이 흔들리는 범위가 함께 필요하다.",
        },
        systemCaption: {
          en: "Number of oxygen neighbors around lithium across the trajectory, with the counting rule stated",
          ko: "이웃을 세는 기준과 함께 표시한 궤적 전체의 리튬 주위 산소 원자 수",
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
          en: "Coarse-graining replaces several atoms with one interaction site called a bead. It preserves selected features such as a polymer chain's overall shape and connectivity. Atom-specific positions, fast internal motion, and detailed contacts are averaged at bead resolution. Fewer particles and smoother interactions extend the accessible size and collective motion. Atom-level calculations or experiments test the mapping against the target question.",
          ko: "조대화는 원자 여러 개를 비드라는 하나의 상호작용점으로 바꾼다. 고분자 사슬의 전체 모양과 연결 관계처럼 선택한 특징을 보존한다. 원자별 위치와 빠른 내부 운동, 세부 접촉은 비드 해상도에서 평균화한다. 입자가 줄고 상호작용이 부드러워져 더 큰 계와 느린 집단 운동을 볼 수 있다. 원자 계산이나 실험으로 질문에 맞는 매핑인지 확인한다.",
        },
        takeaway: {
          en: "The atom-to-bead mapping sets computational reach, retained information, and averaged detail.",
          ko: "원자-비드 매핑은 계산 범위와 보존할 정보, 평균화할 세부 정보를 함께 정한다.",
        },
        systemCaption: {
          en: "Teaching diagram of one polymer chain mapped from atoms to beads",
          ko: "고분자 사슬 하나를 원자에서 비드로 바꾸는 학습용 도식",
        },
        visualLayers: [
          { kind: "MECHANISM SCHEMATIC", label: { en: "Atom-to-bead mapping", ko: "원자에서 비드로 바꾸는 과정" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Bead resolution and computational range", ko: "비드 해상도와 계산 범위" } },
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
          en: "Collective properties emerge from molecular assemblies. Polymer chains entangle into elastic networks, block copolymers form repeating structures, and coated nanoparticles organize into lattices. Coarse-grained models reach these sizes by retaining chain shape and connectivity at bead resolution. Their predictions can be compared with structures from microscopy or repeat distances from scattering experiments.",
          ko: "집단 물성은 여러 분자의 조직에서 생긴다. 고분자 사슬은 얽혀 탄성 그물을 만들고 블록 공중합체는 반복 구조를 이루며 고분자로 감싼 나노입자는 격자로 배열된다. 조대화 모형은 비드 해상도에서 사슬의 모양과 연결 관계를 표현해 이 크기에 도달한다. 계산 결과를 현미경 구조나 산란 실험의 반복 간격과 비교한다.",
        },
        takeaway: {
          en: "Coarse-graining reaches collective organization with explicit bead resolution and validation targets.",
          ko: "조대화는 집단 조직화를 계산하며 비드 해상도와 검증 기준을 함께 명시한다.",
        },
        systemCaption: {
          en: "Illustrative coarse-grained polymer trajectory showing collective chain motion",
          ko: "여러 고분자 사슬의 집단 운동을 보여 주는 조대화 궤적",
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
