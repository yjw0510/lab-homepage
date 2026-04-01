// Per-level step choreography config.
// Each step defines: equation state, concept text, plot type, paper slug, and 3D instruction key.

import type { LevelId } from "./scrollState";

export interface StepConfig {
  /** Which equation terms are active (highlighted) */
  activeTerms: string[];
  /** How much detail to show below the main equation */
  equationDetailMode?: "single" | "grouped" | "hidden";
  /** Whether to render the equation card at all */
  showEquation?: boolean;
  /** Short title displayed over the 3D scene */
  title: Record<"en" | "ko", string>;
  /** Concept text shown in right rail — bilingual, supports $...$ for inline KaTeX */
  concept: Record<"en" | "ko", string>;
  /** Plot component key to render */
  plotType: string | null;
  /** Paper slug to show in card, or null */
  paperSlug: string | null;
  /** Key sent to the 3D scene to drive sub-step visuals */
  sceneKey: string;
}

export interface LevelChoreography {
  /** Primary equation config key */
  equationKey: string;
  /** Ordered steps within this level */
  steps: StepConfig[];
}

export const CHOREOGRAPHY: Record<LevelId, LevelChoreography> = {
  // ─── MESOSCALE (6 steps) ───
  meso: {
    equationKey: "cg",
    steps: [
      {
        activeTerms: [],
        title: { en: "Coarse-Graining", ko: "조대화" },
        concept: {
          en: "Coarse-graining replaces groups of atoms with simplified particles called beads, each representing a cluster of atoms that move together. The colored envelopes on screen show how local chemical structure maps onto these beads: the fine atomic detail is compressed, but the overall chain connectivity and shape are preserved. Coarse-graining is not a loss of information so much as a deliberate change of resolution. By discarding fast atomic vibrations that do not affect large-scale structure, the model becomes efficient enough to simulate the slow, collective organization that matters at mesoscopic length scales. The steps that follow illustrate this idea through dissipative particle dynamics (DPD), one of several coarse-grained frameworks used in this lab alongside MARTINI and Kremer-Grest models.",
          ko: "조대화란 함께 움직이는 원자 묶음을 비드(bead)라 부르는 단순화된 입자 하나로 치환하는 것이다. 화면에서 각 비드를 감싸는 색이 입혀진 외피는 국소적 화학 구조가 비드 하나로 어떻게 대응되는지를 나타낸다. 원자 수준의 세부 구조는 압축되지만 사슬의 연결 관계와 전체 형태는 그대로 남는다. 조대화가 정보를 잃는 것은 아니다. 해상도를 의도적으로 낮추는 것이다. 대규모 구조에 영향을 주지 않는 빠른 원자 진동을 생략함으로써, 메조스케일에서 중요한 느린 집단적 배열을 효율적으로 시뮬레이션할 수 있다. 이어지는 단계들은 이 개념을 소산 입자 동역학(DPD)을 통해 설명하는데, DPD는 이 연구실에서 MARTINI, Kremer-Grest 모형과 함께 사용하는 여러 조대화 체계 중 하나이다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "M1_atoms",
      },
      {
        activeTerms: ["Fnb"],
        title: { en: "Pair Potential", ko: "쌍 퍼텐셜" },
        concept: {
          en: "Once the system is written in beads, the first question is how those beads interact when they are not directly bonded. The highlighted non-bonded term $\\mathbf{F}_{ij}^{\\mathrm{nb}}$ and the dense network of pair connections indicate that mesoscale structure is driven by effective bead-bead interactions rather than detailed atomic contacts. At this level, the purpose of the pair potential is to encode whether neighboring bead types prefer to approach, avoid, or pack at characteristic distances. It is the main mechanism by which a reduced model still produces meaningful collective organization.",
          ko: "계를 비드로 표현한 뒤 가장 먼저 정해야 할 것은 직접 결합되지 않은 비드 사이의 상호작용이다. 강조된 비결합 항 $\\mathbf{F}_{ij}^{\\mathrm{nb}}$와 화면의 비드 간 연결선은 메조스케일 구조가 개별 원자 접촉이 아니라 비드 사이의 유효 상호작용으로 결정됨을 보여준다. 이 해상도에서 쌍 퍼텐셜은 이웃한 비드 유형이 서로 가까워지려 하는지, 멀어지려 하는지, 혹은 어떤 특정 거리에서 밀집하는지를 요약한다. 단순화된 모형이 집단적 배열을 재현하게 만드는 핵심 장치이다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "M2_hulls",
      },
      {
        activeTerms: ["Fbond"],
        title: { en: "Bond Potential", ko: "결합 퍼텐셜" },
        concept: {
          en: "The bonded term $\\mathbf{F}_{ij}^{\\mathrm{bond}}$ keeps the coarse-grained chain connected after the atomistic details have been compressed away. At mesoscale resolution it is not meant to reproduce every fast internal vibration. Its role is to preserve the reduced topology and the physically meaningful contour of the chain so that larger-scale motion remains well defined.",
          ko: "결합 항 $\\mathbf{F}_{ij}^{\\mathrm{bond}}$는 원자 수준의 세부 구조를 제거한 뒤에도 조대화된 사슬의 연결 관계를 유지한다. 메조스케일에서 결합 퍼텐셜의 목적은 빠른 내부 진동 하나하나를 재현하는 것이 아니다. 사슬의 위상(어떤 비드가 어떤 비드에 연결되어 있는지)과 물리적으로 의미 있는 형태를 보존하여, 더 큰 스케일의 운동을 잘 정의된 상태로 유지하는 것이다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "M3_beads",
      },
      {
        activeTerms: ["Fthermo"],
        title: { en: "Temperature Control", ko: "온도 조절" },
        concept: {
          en: "The thermostat term $\\mathbf{F}_i^{\\mathrm{thermo}}$ injects and removes energy according to the fluctuation-dissipation relation $\\sigma^2 = 2\\gamma k_B T$, which links the strength of random thermal kicks to the rate at which energy is dissipated. After coarse-graining, the fast microscopic motions that originally maintained thermal equilibrium are no longer represented explicitly. The thermostat replaces them: it ensures that the beads collectively sample the correct distribution of configurations at a given temperature, rather than drifting into unrealistic motion.",
          ko: "온도 조절 항 $\\mathbf{F}_i^{\\mathrm{thermo}}$는 요동-소산 관계 $\\sigma^2 = 2\\gamma k_B T$에 따라 에너지를 넣고 뺀다. 이 관계는 무작위 열적 충격의 세기와 에너지가 흩어지는 속도를 연결한다. 조대화를 거치면 원래 열적 평형을 유지하던 빠른 미시적 운동이 명시적으로 남지 않으므로, 이를 대체할 장치가 필요하다. 온도 조절 항이 그 역할을 맡아, 비드들이 설정 온도에 맞는 통계적 분포를 올바르게 재현하고 비물리적인 운동 상태로 빠지지 않도록 한다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "M4_fullCG",
      },
      {
        activeTerms: [],
        title: { en: "Pair Correlation g(r)", ko: "쌍 상관 함수 g(r)" },
        concept: {
          en: "The pair correlation function $g(r)$ measures how likely it is to find another bead at distance $r$, compared to a random uniform distribution. Peaks in $g(r)$ reveal preferred separation distances and local packing structure; the curve's decay toward $g(r)=1$ at larger distances shows where spatial order fades. At mesoscale resolution, reproducing these spatial correlations and packing trends is often more important than reproducing any single instantaneous configuration.",
          ko: "쌍 상관 함수 $g(r)$는 기준 비드로부터 거리 $r$에서 다른 비드가 발견될 빈도를, 입자가 균일하게 분포된 경우와 비교하여 나타낸다. $g(r)$의 피크는 비드가 선호하는 간격과 국소적 밀집 구조를 드러내고, 먼 거리에서 $g(r)=1$로 감쇠하는 구간은 공간적 질서가 사라지는 영역이다. 메조스케일에서는 특정 순간의 정확한 원자 배치보다 이러한 공간 상관과 밀집 경향을 재현하는 것이 더 중요할 때가 많다.",
        },
        plotType: "beadRDF",
        paperSlug: null,
        sceneKey: "M5_boundary",
      },
      {
        activeTerms: ["Fnb", "Fbond", "Fthermo"],
        title: { en: "CG Simulation", ko: "CG 시뮬레이션" },
        concept: {
          en: "All three force components now act together. Non-bonded interactions organize the beads into a spatial arrangement, bonded interactions preserve chain connectivity, and the thermostat sustains physically meaningful thermal fluctuations. The value of the coarse-grained model is not that it contains fewer details, but that it retains exactly the details relevant at this resolution and discards the rest. That trade-off is what allows mesoscale simulation to reach larger system sizes and longer effective times while preserving the structural logic built up in the preceding steps.",
          ko: "세 가지 힘 요소가 함께 작동한다. 비결합 상호작용이 비드의 공간 배열을 결정하고, 결합 상호작용이 사슬의 연결 관계를 유지하며, 온도 조절이 물리적으로 의미 있는 열적 요동을 지속시킨다. 조대화 모형의 강점은 단순히 화학적 세부를 줄인다는 데 있지 않다. 현재 해상도에서 물리적으로 중요한 정보만 정확히 남기고, 그렇지 않은 자유도는 과감히 제거한다는 데 있다. 이 선택이 앞 단계에서 쌓은 구조적 논리를 유지한 채 더 큰 계와 더 긴 시간 규모로 확장할 수 있게 한다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "M6_settle",
      },
    ],
  },

  // ─── ALL-ATOM (5 steps) ───
  allatom: {
    equationKey: "classical",
    steps: [
      {
        activeTerms: [],
        equationDetailMode: "hidden",
        showEquation: false,
        title: { en: "Atomistic Resolution", ko: "전원자 해상도" },
        concept: {
          en: "All-atom molecular dynamics begins by fixing the level of description. Every atom remains explicit, solvent is kept as real water molecules rather than an implicit continuum, and the simulation box represents a small piece of bulk liquid rather than an isolated cluster. Three ingredients define the starting point: atomistic geometry, explicit solvent, and a periodic cell that tiles space so the system behaves as if it were part of a much larger volume.",
          ko: "전원자 분자동역학은 서술 수준을 고정하는 데서 시작한다. 모든 원자를 명시적으로 유지하고, 용매도 암묵적 연속체가 아닌 실제 물 분자로 두며, 시뮬레이션 상자는 고립된 덩어리가 아니라 벌크 액체의 작은 일부를 나타낸다. 출발점을 정의하는 세 요소는 전원자 수준의 기하 구조, 명시적 용매, 그리고 공간을 채워 계가 훨씬 큰 부피의 일부인 것처럼 거동하게 하는 주기 셀이다.",
        },
        plotType: "allatomResolution",
        paperSlug: null,
        sceneKey: "A1_resolution",
      },
      {
        activeTerms: ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"],
        equationDetailMode: "grouped",
        showEquation: true,
        title: { en: "Force-Field Philosophy", ko: "힘장의 철학" },
        concept: {
          en: "The atomistic trajectory is not governed by a storyboard but by a classical potential. Bonded terms (stretching, bending, torsion) keep chemically meaningful geometry intact, while non-bonded terms (van der Waals attraction, electrostatic repulsion) decide how molecules pack, repel, and orient around each other. All terms are evaluated together at every time step. Atomistic motion is best understood through this energy decomposition: each force has a physical origin, and the trajectory emerges from their combined action.",
          ko: "전원자 궤적은 미리 짜인 장면이 아니라 고전 퍼텐셜에 의해 결정된다. 결합항(신축, 굽힘, 비틀림)은 화학적으로 의미 있는 기하 구조를 유지하고, 비결합항(반데르발스 인력, 정전기적 반발)은 분자들이 어떻게 밀집하고, 밀어내고, 서로에 대해 배향하는지를 결정한다. 모든 항은 매 시간 단계마다 함께 평가된다. 전원자 운동은 이 에너지 분해를 통해 이해할 수 있다. 각 힘에는 물리적 기원이 있고, 궤적은 그 힘들의 결합된 작용으로부터 나온다.",
        },
        plotType: "allatomForceField",
        paperSlug: null,
        sceneKey: "A2_forcefield",
      },
      {
        activeTerms: [],
        equationDetailMode: "hidden",
        showEquation: false,
        title: { en: "Local Non-Uniformity", ko: "국소 비균일성" },
        concept: {
          en: "An atomistic liquid may look uniform in bulk, but no molecule sees a uniform neighborhood. A few solvent molecules come close, others stay away, and approach directions are uneven. The highlighted waters are not a special motif. They are evidence that the same liquid contains many different local environments at any given instant, each with its own transient geometry and contact pattern.",
          ko: "전원자 액체는 거시적으로 균일해 보이지만, 어떤 분자도 균일한 이웃 환경 속에 있지 않다. 몇몇 용매 분자는 가까이 다가오고, 나머지는 멀리 남으며, 접근 방향도 고르지 않다. 강조된 물 분자들은 특별한 예외가 아니다. 같은 액체 안에도 여러 종류의 국소 환경이 동시에 존재하며, 각각 고유한 일시적 기하 구조와 접촉 패턴을 가진다.",
        },
        plotType: "allatomNonUniformity",
        paperSlug: null,
        sceneKey: "A3_nonuniformity",
      },
      {
        activeTerms: [],
        equationDetailMode: "hidden",
        showEquation: false,
        title: { en: "Thermal Motion and Ensemble", ko: "열적 운동과 앙상블" },
        concept: {
          en: "Every atomistic snapshot is one frame from a prepared thermal trajectory, not a hand-built still life. Before production sampling begins, the coordinates are relaxed, the simulation cell is compressed to liquid density, and the system equilibrates at a controlled temperature and pressure. The density curve in the plot tracks this progression. After equilibration, each frame represents a physically meaningful configuration: one sample from the thermodynamic ensemble the system was prepared to occupy.",
          ko: "전원자 스냅샷은 손으로 만든 정지 모형이 아니라 준비된 열적 궤적의 한 프레임이다. 본격적인 표본 추출 전에 좌표를 완화하고, 시뮬레이션 셀을 액체 밀도까지 압축한 뒤, 제어된 온도와 압력에서 평형에 도달시킨다. 오른쪽 밀도 곡선이 이 과정의 추이를 보여준다. 평형 이후의 각 프레임은 물리적으로 의미 있는 배치, 즉 계가 점유하도록 준비된 열역학적 앙상블(통계적 분포)에서 추출된 하나의 표본이다.",
        },
        plotType: "allatomEnsemble",
        paperSlug: null,
        sceneKey: "A4_ensemble",
      },
      {
        activeTerms: [],
        equationDetailMode: "hidden",
        showEquation: false,
        title: { en: "Local Observables", ko: "국소 관측량" },
        concept: {
          en: "The same atomistic trajectory yields several independent observables at once. Solvent orientation tracks how water molecules align around the solute; local packing captures how tightly neighbors crowd a given site; contact motifs record which molecular fragments sit within bonding distance at each instant. The three readout tracks in the plot show these quantities fluctuating across a short time window, each telling a different story about the same set of frames.",
          ko: "같은 전원자 궤적에서 여러 독립적인 관측량을 동시에 얻을 수 있다. 용매 배향은 물 분자가 용질 주변에서 어떻게 정렬되는지를, 국소 밀집도는 이웃 분자가 특정 자리를 얼마나 촘촘히 둘러싸는지를, 접촉 모티프는 매 순간 어떤 분자 조각이 결합 거리 안에 놓이는지를 기록한다. 오른쪽 세 줄의 그래프가 이 세 가지 양이 짧은 시간 구간에 걸쳐 요동하는 모습을 보여 주며, 같은 프레임들로부터 각각 다른 이야기를 읽어 낸다.",
        },
        plotType: "allatomReadout",
        paperSlug: null,
        sceneKey: "A5_readout",
      },
    ],
  },

  // ─── MLFF (7 steps) ───
  mlff: {
    equationKey: "mlff",
    steps: [
      {
        activeTerms: [],
        title: { en: "Learned Potential", ko: "학습된 퍼텐셜" },
        concept: {
          en: "A classical force field assigns interactions by type: one equation for bonds, another for angles, another for non-bonded contacts. A machine learning force field takes a different approach. It learns a single mapping from local atomic geometry to quantum-derived energy and force values, without separating the contribution by category. The input is geometry; the output is a potential energy surface trained on quantum-mechanical reference data. Atomistic resolution is preserved, but the fixed analytic forms of classical force fields are replaced with a trainable local representation.",
          ko: "고전 역장은 상호작용을 유형별로 지정한다. 결합에 하나의 방정식, 각도에 다른 방정식, 비결합 접촉에 또 다른 방정식을 쓴다. 머신러닝 역장은 다른 접근을 취한다. 기여를 유형별로 분리하지 않고, 국소적 원자 기하 구조로부터 양자역학 기반의 에너지와 힘 값으로의 단일 매핑을 학습한다. 입력은 기하 구조이고 출력은 양자역학 참조 데이터로 훈련된 퍼텐셜 에너지면이다. 전원자 해상도는 유지하되, 고전 역장의 고정된 해석적 함수 형태를 학습 가능한 국소 표현으로 대체한다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "L1_clouds",
      },
      {
        activeTerms: ["ER"],
        title: { en: "Local Neighborhood", ko: "국소 이웃" },
        concept: {
          en: "The total-energy expression $E(\\mathbf{R})$ is global, but the model evaluates it by decomposing the structure into local neighborhoods. Each atom's contribution depends only on the atoms within a cutoff radius, not on every distant atom in the system. This locality assumption keeps the computation tractable while staying close to the spatial scale at which chemical interactions operate.",
          ko: "전체 에너지 식 $E(\\mathbf{R})$는 계 전체에 대한 양이지만, 모형은 구조를 국소 이웃으로 분해하여 평가한다. 각 원자의 기여는 일정 차단 반경 안의 원자들에만 의존하며, 계 내 모든 먼 원자를 고려하지 않는다. 이 국소성 가정 덕분에 화학적 상호작용이 실제로 작용하는 공간 규모를 유지하면서도 계산이 가능해진다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "L2_neighborhoods",
      },
      {
        activeTerms: ["Ni"],
        title: { en: "Neighborhood Encoding", ko: "이웃 인코딩" },
        concept: {
          en: "Once a neighborhood has been defined, it must be converted into a numerical representation the model can process. The symbol $\\mathcal{N}_i$ denotes this local environment. The encoding must respect physical symmetries: rotating or translating the molecule should not change the predicted energy. Symmetry-aware encodings (such as those used in MACE, NequIP, and DeePMD) satisfy this constraint by construction.",
          ko: "국소 이웃이 정의되면, 그것을 모형이 처리할 수 있는 수치적 표현으로 변환해야 한다. 식에서 $\\mathcal{N}_i$가 이 국소 환경을 나타낸다. 이 인코딩은 물리적 대칭을 만족해야 한다. 분자를 회전하거나 이동해도 예측되는 에너지가 바뀌어서는 안 된다. MACE, NequIP, DeePMD 등에서 사용하는 대칭 인식 인코딩은 이 조건을 구조적으로 충족한다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "L3_graph",
      },
      {
        activeTerms: ["Ei"],
        title: { en: "Per-Atom Energy", ko: "원자별 에너지" },
        concept: {
          en: "Each encoded local environment produces a scalar energy contribution $E_i$. The total energy of the system is the sum of these per-atom values. The parity plot compares predicted per-atom energies against DFT reference values; points near the diagonal indicate accurate predictions. At this stage the model converts geometric information into energy, and the quality of that conversion is directly measurable.",
          ko: "인코딩된 각 국소 환경은 하나의 스칼라 에너지 기여 $E_i$를 생성한다. 계의 총 에너지는 이 원자별 값들의 합이다. 오른쪽 패리티 도표는 예측된 원자별 에너지를 DFT 참조값과 비교하며, 대각선에 가까운 점일수록 예측이 정확하다. 이 단계에서 모형은 기하학적 정보를 에너지로 변환하고, 그 변환의 품질을 직접 측정할 수 있다.",
        },
        plotType: "parity",
        paperSlug: null,
        sceneKey: "L4_energies",
      },
      {
        activeTerms: ["Fi"],
        title: { en: "Force from Energy", ko: "에너지로부터 힘" },
        concept: {
          en: "The relation $\\mathbf{F}_i = -\\partial E / \\partial \\mathbf{R}_i$ obtains forces as the gradient of the energy with respect to atomic position. Forces are not predicted independently; they follow from how the energy landscape changes in space. Once the model has learned a consistent energy surface, forces emerge automatically from its spatial derivatives.",
          ko: "관계식 $\\mathbf{F}_i = -\\partial E / \\partial \\mathbf{R}_i$는 원자 위치에 대한 에너지의 기울기(그래디언트)로부터 힘을 구한다. 힘은 에너지와 별개로 독립 예측되는 것이 아니라, 에너지 지형이 공간에서 어떻게 변하는지로부터 따라 나온다. 모형이 일관된 에너지면을 학습하면, 힘은 그 공간 미분으로부터 자동으로 결정된다.",
        },
        plotType: "parity",
        paperSlug: null,
        sceneKey: "L5_forces",
      },
      {
        activeTerms: [],
        title: { en: "Accuracy and Cost", ko: "정확도와 비용" },
        concept: {
          en: "A learned local model sits between two established regimes. Classical force fields evaluate faster but lack the flexibility to capture many-body electronic effects. Direct electronic-structure calculations capture those effects but cost orders of magnitude more per time step. MLFFs preserve atomistic detail and approach quantum reference quality while remaining fast enough for nanosecond-scale production simulations.",
          ko: "국소 학습 모형은 두 기존 영역 사이에 놓인다. 고전 역장은 평가 속도가 빠르지만 다체 전자 효과를 포착할 유연성이 부족하다. 전자구조 직접 계산은 그 효과를 포착하지만 시간 단계당 비용이 수 자릿수 더 크다. MLFF는 전원자 수준의 정밀도를 유지하면서 양자 기준 품질에 근접하고, 나노초 규모 시뮬레이션에 충분한 속도를 유지한다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "L6_comparison",
      },
      {
        activeTerms: ["ER", "Fi"],
        title: { en: "Training Pipeline", ko: "훈련 파이프라인" },
        concept: {
          en: "In simulation, the deployed quantities are the energy-force pair $(E, \\mathbf{F})$. These are fitted to quantum reference data across many atomic environments before deployment. The pipeline runs: encode local environments, predict per-atom energies, derive forces from the energy gradient, and validate against reference calculations. The parity plot shows the final agreement between model predictions and DFT reference values.",
          ko: "시뮬레이션에 실제로 투입되는 양은 에너지-힘 쌍 $(E, \\mathbf{F})$이다. 이 값들은 배포 전에 다양한 원자 환경에 대한 양자역학 참조 데이터에 맞추어 학습된다. 파이프라인은 국소 환경 인코딩, 원자별 에너지 예측, 에너지 기울기로부터 힘 도출, 기준 계산 대비 검증 순서로 진행된다. 패리티 도표는 모형 예측과 DFT 참조값 사이의 최종 일치도를 보여 준다.",
        },
        plotType: "parity",
        paperSlug: null,
        sceneKey: "L7_settle",
      },
    ],
  },

  // ─── DFT (9 steps) ───
  dft: {
    equationKey: "ks",
    steps: [
      {
        activeTerms: [],
        title: { en: "Kohn-Sham DFT", ko: "Kohn-Sham DFT" },
        concept: {
          en: "At the DFT level, the central object is an effective one-electron quantum equation. Rather than tracking each electron's interaction with every other electron explicitly, the Kohn-Sham equation folds those interactions into an effective potential and solves for one-electron orbitals and the total electron density self-consistently. The equation on the right contains four contributions: a kinetic term, nuclear attraction, electron-electron repulsion in mean-field form, and a quantum correction called the exchange-correlation potential. Kohn-Sham DFT is one of several first-principles approaches; the steps that follow use it as a representative example of how ab initio electronic structure calculations work.",
          ko: "DFT 수준에서 중심이 되는 것은 유효 일전자 양자 방정식이다. 각 전자가 다른 모든 전자와 맺는 상호작용을 하나씩 추적하는 대신, Kohn-Sham 방정식은 그 상호작용들을 유효 퍼텐셜로 접어 넣고 일전자 오비탈과 총 전자 밀도를 자기일관적으로 구한다. 오른쪽 식에는 네 가지 기여가 들어 있다: 운동 에너지 항, 핵 인력, 평균장 형태의 전자-전자 반발, 그리고 교환-상관 퍼텐셜이라 불리는 양자역학적 보정항이다. Kohn-Sham DFT는 여러 제일원리 접근법 중 하나이며, 이어지는 단계들은 이를 대표적 예로 삼아 비경험적(ab initio) 전자 구조 계산이 어떻게 작동하는지를 보여 준다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D1_transition",
      },
      {
        activeTerms: ["kinetic"],
        title: { en: "Kinetic Energy", ko: "운동 에너지" },
        concept: {
          en: "The kinetic operator $-\\tfrac{1}{2}\\nabla^2$ measures the spatial curvature of the orbitals. It penalizes overly sharp localization and favors smoother, more delocalized electronic structure when the rest of the Hamiltonian permits it. In the Kohn-Sham picture, this is one of the basic terms balancing localization against spreading.",
          ko: "운동 에너지 연산자 $-\\tfrac{1}{2}\\nabla^2$는 오비탈의 공간적 곡률을 측정한다. 이 항은 지나치게 강한 국소화를 벌주고, 나머지 해밀토니안이 허용하는 범위에서 더 부드럽고 퍼진 전자 구조를 선호하게 만든다. Kohn-Sham 체계에서 이것은 전자의 국소화와 비국소화 사이의 균형을 이루는 기본 항 중 하나이다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D2_kinetic",
      },
      {
        activeTerms: ["Vext"],
        title: { en: "Nuclear Attraction", ko: "핵 인력" },
        concept: {
          en: "The external potential $V_{\\mathrm{ext}}$ is the attraction exerted by the nuclei on the electrons. It is fixed directly by the molecular geometry and nuclear charges. Move the atoms, and this term changes with them. That is why electronic structure and molecular geometry are tightly coupled in first-principles calculations.",
          ko: "외부 퍼텐셜 $V_{\\mathrm{ext}}$는 원자핵이 전자에 가하는 인력이다. 분자 기하 구조와 핵 전하에 의해 직접 정해진다. 원자 위치를 바꾸면 이 항도 함께 바뀐다. 제일원리 계산에서 전자 구조와 분자 기하 구조가 강하게 결합되어 있는 이유이다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D3_Vext",
      },
      {
        activeTerms: ["Hartree"],
        title: { en: "Hartree Potential", ko: "Hartree 퍼텐셜" },
        concept: {
          en: "The Hartree term $V_{\\mathrm{H}}$ is the classical Coulomb field generated by the electron density itself. In this mean-field contribution, each electron responds to the distributed charge of all electrons rather than to explicitly resolved pair collisions. Electron-electron repulsion therefore enters the Kohn-Sham problem already at the level of an effective field.",
          ko: "Hartree 항 $V_{\\mathrm{H}}$는 전자 밀도 자체가 생성하는 고전적 쿨롱장이다. 이 평균장 기여에서 각 전자는 다른 전자들과의 개별 충돌을 명시적으로 분해하지 않고, 전자 구름 전체가 만드는 분포된 전하에 반응한다. 전자-전자 반발은 이미 유효장 수준에서 Kohn-Sham 문제 안에 포함된다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D4_Hartree",
      },
      {
        activeTerms: ["Vxc"],
        title: { en: "Exchange-Correlation", ko: "교환-상관" },
        concept: {
          en: "The exchange-correlation potential $V_{\\mathrm{xc}}$ corrects what the mean-field picture misses. Unlike the Hartree term, it cannot be written down exactly from the density alone. Exchange enforces the antisymmetry required by quantum mechanics (no two electrons occupy the same state), while correlation captures the tendency of electrons to avoid each other beyond what mean-field repulsion accounts for. Both effects must be approximated, and the choice of approximation (LDA, GGA, meta-GGA) is one of the main decisions in any DFT calculation.",
          ko: "교환-상관 퍼텐셜 $V_{\\mathrm{xc}}$는 평균장이 놓치는 부분을 보정한다. Hartree 항과 달리 전자 밀도만으로 정확하게 쓸 수 없다. 교환 항은 양자역학이 요구하는 반대칭성(같은 상태를 두 전자가 점유할 수 없다는 조건)을 적용하고, 상관 항은 평균장 반발이 설명하지 못하는 전자 간 회피 경향을 포착한다. 두 효과 모두 근사가 필요하며, 근사 방법의 선택(LDA, GGA, meta-GGA)이 DFT 계산에서 핵심적인 결정 사항 중 하나이다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D5_Vxc",
      },
      {
        activeTerms: ["rho"],
        title: { en: "Self-Consistent Density", ko: "자기일관 전자 밀도" },
        concept: {
          en: "In the SCF cycle, the electron density is obtained iteratively rather than all at once. At iteration $i$, the residual density measures how far the current density remains from the self-consistent solution. Early iterations can differ substantially; as the cycle converges, that residual shrinks toward zero. The accompanying SCF curve tracks the same convergence process through $|\\Delta E|$.",
          ko: "SCF 반복에서는 전자 밀도가 한 번에 주어지는 것이 아니라 반복적으로 갱신된다. 반복 $i$에서 밀도 잔차는 현재 전자 밀도가 자기일관 해와 얼마나 차이나는지를 나타낸다. 초기 반복에서는 차이가 클 수 있고, 반복이 진행될수록 그 잔차는 0으로 줄어든다. 오른쪽 수렴 곡선은 같은 과정을 $|\\Delta E|$로 추적한다.",
        },
        plotType: "scf",
        paperSlug: null,
        sceneKey: "D6_density",
      },
      {
        activeTerms: ["phi"],
        title: { en: "HOMO", ko: "HOMO" },
        concept: {
          en: "HOMO is the highest occupied molecular orbital, the quantum state occupied by the most energetic electrons in the ground state. Its sign structure (red and blue lobes) and spatial distribution show where this electronic state is concentrated, while its orbital energy marks the top of the occupied energy levels shown in the plot. Frontier orbitals like the HOMO compress the full quantum solution into a spatial map of electronic character.",
          ko: "HOMO는 바닥 상태에서 가장 에너지가 높은 전자가 점유하는 분자 오비탈이다. 부호 구조(빨간색과 파란색 영역)와 공간 분포는 이 전자 상태가 어디에 집중되어 있는지를 보여주고, 오비탈 에너지는 오른쪽 도표에서 점유 에너지 준위의 맨 위를 나타낸다. HOMO 같은 프런티어 오비탈은 전체 양자 해를 전자적 성격의 공간 지도로 압축한다.",
        },
        plotType: "moLevels",
        paperSlug: null,
        sceneKey: "D7_bands",
      },
      {
        activeTerms: [],
        title: { en: "LUMO", ko: "LUMO" },
        concept: {
          en: "LUMO is the lowest unoccupied molecular orbital, the first available state above the occupied levels. The energy difference between HOMO and LUMO, shown in the plot, is often used as a measure of a molecule's electronic excitability: a small gap means the molecule absorbs lower-energy light and is more chemically reactive, while a large gap indicates stability. The exact gap value depends on the choice of exchange-correlation functional, but the qualitative ordering of frontier levels is typically robust.",
          ko: "LUMO는 점유 준위 바로 위의 첫 번째 비점유 분자 오비탈이다. 도표에 표시된 HOMO와 LUMO 사이의 에너지 차이는 분자의 전자적 들뜸 가능성을 나타내는 지표로 자주 쓰인다. 간격이 작으면 분자가 낮은 에너지의 빛을 흡수하고 화학적 반응성이 높으며, 간격이 크면 안정성을 뜻한다. 간격의 정확한 수치는 교환-상관 범함수의 선택에 따라 달라지지만, 프런티어 준위의 정성적 순서는 대체로 안정적이다.",
        },
        plotType: "orbitalGap",
        paperSlug: null,
        sceneKey: "D8_dos",
      },
      {
        activeTerms: ["kinetic", "Vext", "Hartree", "Vxc"],
        title: { en: "DFT Outputs", ko: "DFT 출력" },
        concept: {
          en: "With all four Hamiltonian terms combined and the self-consistent cycle converged, the DFT calculation yields energies, forces, orbitals, and density-derived observables for a specific atomic configuration. These quantities can be interpreted directly or used as reference data to train and validate the machine learning force fields in the level above.",
          ko: "네 가지 해밀토니안 항이 모두 합쳐지고 자기일관 반복이 수렴하면, DFT 계산은 주어진 원자 배치에 대해 에너지, 힘, 오비탈, 그리고 전자 밀도로부터 유도되는 관측량을 산출한다. 이 양들은 직접 해석하거나, 위 단계의 머신러닝 역장을 훈련·검증하기 위한 참조 데이터로 사용할 수 있다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D9_settle",
      },
    ],
  },
};
