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
        title: { en: "Atomistic Starting Point", ko: "전원자 출발점" },
        concept: {
          en: "This teaching system begins with an atomistic DNA model so the change in resolution stays visible. Coarse-graining then replaces groups of atoms with simplified particles called beads, each representing a cluster that moves together. The fine atomic detail is compressed, but chain connectivity and overall shape are retained. This is a deliberate change of resolution: by omitting fast atomic vibrations that do not control larger structure, the model can follow the slower collective organization that matters at mesoscopic length scales. The next steps use dissipative particle dynamics (DPD) to explain that trade-off alongside other coarse-grained frameworks used in the lab, including MARTINI and Kremer-Grest models.",
          ko: "이 학습용 계는 해상도 변화가 분명히 보이도록 먼저 전원자 DNA 모형에서 시작한다. 조대화는 함께 움직이는 원자 묶음을 비드(bead)라는 단순화된 입자로 바꾸는 과정이다. 원자 수준의 세부 구조는 압축되지만 사슬의 연결 관계와 전체 형태는 남는다. 이는 해상도를 의도적으로 바꾸는 일이다. 대규모 구조를 좌우하지 않는 빠른 원자 진동을 생략하면, 메조스케일에서 중요한 느린 집단적 배열을 더 효율적으로 따라갈 수 있다. 다음 단계에서는 소산 입자 동역학(DPD)을 예로 들어 이 절충을 설명하며, MARTINI와 Kremer-Grest 모형도 함께 참고한다.",
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
          ko: "계를 비드로 표현한 뒤 가장 먼저 정해야 할 것은 직접 결합되지 않은 비드 사이의 상호작용이다. 강조된 비결합 항 $\\mathbf{F}_{ij}^{\\mathrm{nb}}$와 화면의 비드 간 연결선에서 보듯, 메조스케일 구조는 비드 사이의 유효 상호작용으로 결정된다. 개별 원자 접촉을 일일이 따지지는 않는다. 이 해상도에서 쌍 퍼텐셜은 이웃한 비드 유형이 서로 가까워지려 하는지, 멀어지려 하는지, 혹은 어떤 특정 거리에서 밀집하는지를 요약한다. 단순화된 모형이 집단적 배열을 재현하게 만드는 장치가 바로 이것이다.",
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
          ko: "결합 항 $\\mathbf{F}_{ij}^{\\mathrm{bond}}$는 원자 수준의 세부 구조를 제거한 뒤에도 조대화된 사슬의 연결 관계를 붙들어 둔다. 메조스케일에서 결합 퍼텐셜은 빠른 내부 진동을 하나하나 되살리려 하지 않는다. 대신 사슬의 위상, 즉 어떤 비드가 어떤 비드에 연결되어 있는지와 물리적으로 의미 있는 형태를 지켜, 더 큰 스케일의 운동이 잘 정의된 상태로 유지되게 한다.",
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
          ko: "쌍 상관 함수 $g(r)$는 기준 비드에서 거리 $r$만큼 떨어진 곳에서 다른 비드가 발견될 빈도를, 입자가 균일하게 분포된 경우와 비교하여 나타낸다. $g(r)$의 피크는 비드가 선호하는 간격과 국소적 밀집 구조를 드러내고, 먼 거리에서 $g(r)=1$로 감쇠하는 구간은 공간적 질서가 사라지는 영역이다. 메조스케일에서 중요한 것은 이런 공간 상관과 밀집 경향을 재현하는 일이다. 특정 순간의 정확한 원자 배치를 그대로 맞추는 일은 그만큼 결정적이지 않을 때가 많다.",
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
          ko: "이제 세 가지 힘 요소가 함께 작동한다. 비결합 상호작용이 비드의 공간 배열을 결정하고, 결합 상호작용이 사슬의 연결 관계를 유지하며, 온도 조절이 물리적으로 의미 있는 열적 요동을 이어 간다. 조대화 모형의 강점은 현재 해상도에서 물리적으로 중요한 정보만 남기고 나머지 자유도는 덜어 낸다는 점이다. 세부 항목을 줄이기만 하는 것과는 다르다. 이렇게 추려 둔 덕분에, 앞 단계에서 만든 연결 관계와 공간 배열을 그대로 둔 채 더 큰 계와 더 긴 시간 규모로 시뮬레이션을 확장할 수 있다.",
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
          ko: "전원자 분자동역학은 서술 수준을 고정하는 데서 시작한다. 모든 원자는 명시적으로 남고, 용매는 실제 물 분자로 다룬다. 시뮬레이션 상자는 벌크 액체에서 잘라 온 작은 한 조각이며, 그 주변으로 같은 액체가 끝없이 이어진다고 본다. 출발점을 정의하는 세 요소는 전원자 수준의 기하 구조, 명시적 용매, 그리고 공간을 빈틈없이 채워 계가 훨씬 큰 부피의 일부인 것처럼 거동하게 하는 주기 셀이다.",
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
          ko: "전원자 궤적을 좌우하는 것은 고전 퍼텐셜이다. 결합항(신축, 굽힘, 비틀림)은 화학적으로 의미 있는 기하 구조를 유지하고, 비결합항(반데르발스 인력, 정전기적 반발)은 분자들이 어떻게 밀집하고, 밀어내고, 서로를 향해 배향하는지를 정한다. 모든 항은 매 시간 단계마다 한꺼번에 평가된다. 전원자 운동은 이 에너지 분해로 이해한다. 각 힘에는 물리적 기원이 있고, 궤적은 여러 힘이 함께 작용한 결과로 나타난다.",
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
          ko: "거시적으로 보면 전원자 액체는 균일하다. 그러나 어떤 분자도 균일한 이웃 환경 속에 있지 않다. 몇몇 용매 분자는 가까이 다가오고, 나머지는 멀리 떨어져 있으며, 접근 방향도 고르지 않다. 화면에서 강조한 물 분자는 같은 액체 안에 여러 종류의 국소 환경이 한순간에 공존한다는 증거다. 환경마다 일시적인 기하 구조와 접촉 패턴이 제각각이다.",
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
          ko: "오른쪽 밀도 곡선은 준비 과정의 추이를 따라간다. 본격적인 표본 추출에 앞서 좌표를 완화하고, 시뮬레이션 셀을 액체 밀도까지 압축한 뒤, 제어된 온도와 압력에서 평형에 도달시킨다. 평형이 끝난 뒤 떼어 온 한 프레임이 전원자 스냅샷이다. 이렇게 얻은 각 프레임은 물리적으로 의미 있는 배치, 즉 계가 점유하도록 준비된 열역학적 앙상블(통계적 분포)에서 뽑은 하나의 표본이다.",
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
          en: "The same atomistic trajectory yields several independent observables at once. Hydration contacts count nearby solvent contacts around the solute, the local packing score tracks how tightly neighbors crowd a site, and the caffeine neighbor count records nearby molecules around the solute. The three readout tracks show how these quantities fluctuate across one short time window. They are different measurements of the same frames, not different simulations.",
          ko: "같은 전원자 궤적에서 여러 독립적인 관측량을 한꺼번에 얻는다. 수화 접촉 수는 용질 주변의 가까운 용매 접촉을 세고, 국소 밀집도 점수는 이웃 분자가 한 자리를 얼마나 촘촘히 둘러싸는지 나타내며, 카페인 이웃 수는 용질 주변의 가까운 분자 수를 기록한다. 세 줄의 그래프는 하나의 짧은 시간 구간에서 이 값들이 어떻게 요동하는지 보여 준다. 서로 다른 시뮬레이션이 아니라 같은 프레임을 다른 방식으로 읽은 결과다.",
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
          ko: "고전 역장은 상호작용을 유형별로 갈라 다룬다. 결합에 방정식 하나, 각도에 또 하나, 비결합 접촉에 또 하나를 쓴다. 머신러닝 역장은 이 분할을 버리고, 국소적 원자 기하 구조에서 양자역학 기반의 에너지와 힘 값으로 이어지는 단일 매핑을 통째로 학습한다. 입력은 기하 구조, 출력은 양자역학 참조 데이터로 훈련된 퍼텐셜 에너지면이다. 전원자 해상도는 그대로 가져가되, 고전 역장이 미리 정해 둔 해석적 함수 형태를 학습 가능한 국소 표현으로 대체한다.",
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
          ko: "$E(\\mathbf{R})$는 계 전체의 에너지다. 모형은 구조를 국소 이웃으로 쪼개어 이 전체 에너지를 평가한다. 각 원자의 기여는 일정 차단 반경 안에 든 원자들에만 의존하며, 멀리 떨어진 원자는 끌어들이지 않는다. 이런 국소성 가정을 두면 화학적 상호작용이 실제로 작용하는 공간 규모를 유지하면서도 계산량이 감당할 만한 수준으로 떨어진다.",
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
          ko: "국소 이웃이 정해지면 다음은 그것을 모형이 다룰 수 있는 수치 표현으로 바꾸는 일이다. 식에서 $\\mathcal{N}_i$가 바로 이 국소 환경을 가리킨다. 이때 인코딩은 물리적 대칭을 지켜야 한다. 분자를 회전하거나 평행이동해도 예측 에너지는 같아야 한다는 뜻이다. MACE, NequIP, DeePMD 같은 모형이 쓰는 대칭 인식 인코딩은 설계 단계에서부터 이 조건을 충족하도록 만들어졌다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "L3_graph",
      },
      {
        activeTerms: ["Ei"],
        title: { en: "Per-Atom Energy", ko: "원자별 에너지" },
        concept: {
          en: "Each encoded local environment produces a scalar energy contribution $E_i$. The total energy of the system is the sum of these per-atom values. The illustrative parity diagram places predicted per-atom energies against DFT reference values. In a measured result, points near the diagonal would indicate agreement. At this stage the model converts geometric information into energy, and that conversion can be evaluated against held-out reference data.",
          ko: "인코딩된 국소 환경 하나하나가 스칼라 에너지 기여 $E_i$를 내놓고, 계의 총 에너지는 이 원자별 값을 모두 더한 값이다. 설명용 패리티 도표는 예측된 원자별 에너지와 DFT 참조값을 나란히 놓는다. 실제 측정 결과에서는 점이 대각선에 가까울수록 두 값의 일치를 뜻한다. 이 단계에서 모형은 기하학적 정보를 에너지로 옮기며, 그 변환은 별도로 남겨 둔 참조 데이터와 비교해 평가할 수 있다.",
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
          ko: "힘은 에너지면의 기울기에서 나온다. 관계식 $\\mathbf{F}_i = -\\partial E / \\partial \\mathbf{R}_i$가 원자 위치에 대한 에너지의 기울기(그래디언트)로 힘을 정의한다. 즉 에너지 지형이 공간에서 어떻게 휘어 있는지가 그대로 힘이 된다. 모형이 일관된 에너지면을 학습해 두면, 힘은 그 공간 미분에서 저절로 따라 나온다.",
        },
        plotType: "parity",
        paperSlug: null,
        sceneKey: "L5_forces",
      },
      {
        activeTerms: [],
        title: { en: "Accuracy and Cost", ko: "정확도와 비용" },
        concept: {
          en: "A learned local model sits between two established regimes. Classical force fields evaluate faster but may lack the flexibility to represent many-body electronic effects. Direct electronic-structure calculations capture those effects but cost far more per time step. For atomic environments represented in training, an MLFF can preserve atomistic detail and target near-reference accuracy at a lower cost. Its range of reliable use must still be checked against the reference data.",
          ko: "국소 학습 모형은 두 기존 영역 사이에 자리 잡는다. 고전 역장은 평가가 빠르지만 다체 전자 효과를 표현하는 유연성이 부족할 수 있고, 전자구조 직접 계산은 그 효과를 담지만 시간 단계당 비용이 훨씬 크다. 학습에 포함된 원자 환경에서는 MLFF가 전원자 해상도를 유지하면서 더 낮은 비용으로 참조 수준에 가까운 정확도를 목표로 할 수 있다. 다만 신뢰할 수 있는 적용 범위는 참조 데이터와 대조해 확인해야 한다.",
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
          ko: "시뮬레이션에 실제로 투입되는 양은 에너지-힘 쌍 $(E, \\mathbf{F})$이다. 배포에 앞서 이 쌍은 여러 원자 환경에 걸친 양자역학 참조 데이터에 맞추어 학습된다. 파이프라인은 국소 환경을 인코딩하고, 원자별 에너지를 예측하고, 에너지 기울기에서 힘을 끌어낸 다음, 기준 계산과 대조해 검증한다. 마지막으로 패리티 도표에서 모형 예측과 DFT 참조값이 얼마나 맞아떨어지는지 확인한다.",
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
          ko: "DFT 수준에서 다루는 중심 대상은 유효 일전자 양자 방정식이다. Kohn-Sham 방정식은 전자 사이의 상호작용을 하나의 유효 퍼텐셜로 접어 넣은 뒤, 일전자 오비탈과 총 전자 밀도를 자기일관적으로 구한다. 각 전자가 다른 모든 전자와 맺는 상호작용을 일일이 추적할 필요가 없어진다. 오른쪽 식에는 네 가지 기여가 들어 있다: 운동 에너지 항, 핵 인력, 평균장 형태의 전자-전자 반발, 그리고 교환-상관 퍼텐셜이라 불리는 양자역학적 보정항이다. Kohn-Sham DFT는 여러 제일원리 접근법 중 하나로, 이어지는 단계는 이를 대표 사례로 삼아 비경험적(ab initio) 전자 구조 계산이 어떻게 작동하는지 따라간다.",
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
          ko: "운동 에너지 연산자 $-\\tfrac{1}{2}\\nabla^2$는 오비탈의 공간적 곡률을 측정한다. 곡률이 클수록, 즉 전자가 한 곳에 강하게 몰릴수록 이 항은 큰 벌점을 매긴다. 그래서 나머지 해밀토니안이 허용하는 범위에서는 더 부드럽고 넓게 퍼진 전자 구조가 유리해진다. Kohn-Sham 체계에서 이 항은 전자의 국소화와 비국소화 사이의 균형을 잡는 기본 항 중 하나이다.",
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
          ko: "외부 퍼텐셜 $V_{\\mathrm{ext}}$는 원자핵이 전자를 끌어당기는 인력이다. 그 크기는 분자 기하 구조와 핵 전하가 직접 정한다. 원자 위치를 바꾸면 이 항도 따라 바뀐다. 제일원리 계산에서 전자 구조와 분자 기하 구조가 단단히 맞물려 있는 까닭이다.",
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
          ko: "Hartree 항 $V_{\\mathrm{H}}$는 전자 밀도가 스스로 만들어 내는 고전적 쿨롱장이다. 이 평균장 기여에서 각 전자는 전자 구름 전체가 만드는 분포된 전하에 반응한다. 다른 전자와 일으키는 충돌을 하나하나 분해하지 않고도 그렇게 반응한다. 전자-전자 반발은 이렇게 이미 유효장 수준에서 Kohn-Sham 문제 안으로 들어온다.",
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
          ko: "교환-상관 퍼텐셜 $V_{\\mathrm{xc}}$는 평균장이 놓치는 부분을 메운다. Hartree 항은 전자 밀도만으로 정확히 적을 수 있다. 이 항은 정확한 형태가 알려져 있지 않아 언제나 근사가 필요하다. 교환 항은 같은 상태를 두 전자가 점유할 수 없다는 양자역학의 반대칭성을 강제하고, 상관 항은 평균장 반발만으로는 설명되지 않는 전자 간 회피 경향까지 담아낸다. 그래서 어떤 근사를 쓰느냐(LDA, GGA, meta-GGA)가 DFT 계산에서 가장 무게 있는 결정 가운데 하나가 된다.",
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
          ko: "SCF 반복은 전자 밀도를 단계마다 조금씩 갱신한다. 반복 $i$에서 밀도 잔차는 현재 전자 밀도가 자기일관 해에서 얼마나 떨어져 있는지를 가늠한다. 초기 반복에서는 그 차이가 꽤 클 수 있다. 반복이 거듭될수록 잔차는 0을 향해 줄어든다. 오른쪽 수렴 곡선에서 같은 과정을 $|\\Delta E|$로 따라갈 수 있다.",
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
          ko: "HOMO는 바닥 상태에서 에너지가 가장 높은 전자가 점유하는 분자 오비탈이다. 빨간색과 파란색 영역으로 나뉜 부호 구조와 공간 분포를 보면 이 전자 상태가 어디에 집중되어 있는지 드러난다. 오비탈 에너지는 오른쪽 도표에서 점유 에너지 준위의 맨 위에 해당한다. HOMO 같은 프런티어 오비탈은 전체 양자 해를 전자적 성격이 담긴 공간 분포로 요약한다.",
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
          ko: "LUMO는 점유 준위 바로 위에 자리한 첫 번째 비점유 분자 오비탈이다. 도표에 표시된 HOMO와 LUMO 사이의 에너지 차이는 분자의 전자적 들뜸 가능성을 가늠하는 지표로 자주 쓰인다. 간격이 작으면 분자가 낮은 에너지의 빛을 흡수하고 화학적 반응성이 높아지며, 간격이 크면 분자가 안정하다는 뜻이다. 정확한 간격 값은 어떤 교환-상관 범함수를 고르느냐에 따라 달라진다. 다만 프런티어 준위의 정성적 순서는 대체로 흔들리지 않는다.",
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
          ko: "네 가지 해밀토니안 항이 모두 합쳐지고 자기일관 반복이 수렴하면, DFT 계산은 주어진 원자 배치에 대해 에너지와 힘, 오비탈, 전자 밀도에서 유도되는 관측량을 내놓는다. 이 값은 그대로 해석에 쓰거나, 위 단계의 머신러닝 역장을 훈련하고 검증하는 참조 데이터로 삼는다.",
        },
        plotType: null,
        paperSlug: null,
        sceneKey: "D9_settle",
      },
    ],
  },
};
