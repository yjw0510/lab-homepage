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

export interface VisualLayerProvenance {
  kind: ProvenanceKind;
  label: Record<"en" | "ko", string>;
}

export type PlotType = "scf" | "allatomForceField" | "allatomReadout";

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
        activeTerms: ["rho"],
        equationKey: "frontier",
        equationDetailMode: "grouped",
        title: { en: "The Only Tier With Explicit Electrons", ko: "전자를 직접 다루는 유일한 계층" },
        question: {
          en: "When the result turns on where the electrons go, only the tier that actually solves for them can produce it, because every cheaper model has parameterized the electrons away.",
          ko: "결과가 전자의 거동에 달린 순간에는 전자를 직접 푸는 이 계층만이 그 답을 내며, 더 싼 모형에는 그 전자가 이미 남아 있지 않다.",
        },
        concept: {
          en: "This is the one tier where electrons are computed, not assumed. Reach for it when bonding, charge transfer, spin, or orbital character controls the result, because no cheaper model can produce those quantities. A DFT calculation keeps the electrons responsive to the nuclear geometry and returns the electron density together with the total energy and the force on every atom. The surface here cycles through that density and the signed HOMO and LUMO orbitals from a single B3LYP/6-31G* solve on metal-free phthalocyanine: the density shows where charge collects, and the frontier orbitals show which regions set reactivity. The price of that explicitness is steep, so only selected configurations are solved and the system stays small.",
          ko: "이 계층은 전자를 가정하지 않고 직접 계산하는 유일한 층이다. 결합 생성과 절단, 전하 이동, 스핀, 오비탈 성격이 결과를 좌우할 때 여기서 시작한다. 더 싼 모형으로는 그 양들을 만들어 낼 수 없기 때문이다. DFT 계산은 원자 구조에 반응하는 전자를 그대로 두고 전자 밀도와 총에너지, 원자마다 작용하는 힘을 함께 내놓는다. 화면의 표면은 금속 없는 프탈로시아닌을 B3LYP/6-31G*로 한 번 계산한 결과에서 그 밀도와 부호를 가진 HOMO·LUMO 오비탈을 차례로 보여 준다. 밀도는 전하가 어디에 모이는지 드러내고, 프런티어 오비탈은 어느 영역이 반응성을 정하는지 드러낸다. 전자를 직접 다루는 대가가 커서 선택한 소수의 구조만 풀고 계는 작게 유지한다.",
        },
        takeaway: {
          en: "What crosses to the next tier is a provenance-bearing record: atomic numbers and coordinates paired with a total energy, forces, and the full calculation protocol. The electronic solve itself stays here, in the reference tier.",
          ko: "다음 계층으로는 출처가 붙은 레코드가 넘어간다. 원자 번호와 좌표에 총에너지, 힘, 계산 프로토콜을 붙인 것이다. 전자구조 계산 자체는 참조 계층에 남는다.",
        },
        systemCaption: {
          en: "Calculated density / HOMO / LUMO · values read from one B3LYP/6-31G* asset",
          ko: "계산된 밀도 / HOMO / LUMO · 하나의 B3LYP/6-31G* 자산에서 읽은 값",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Density and frontier orbitals", ko: "전자 밀도와 프런티어 오비탈" } },
        ],
        plotType: null,
        sceneKey: "D6_outputs",
      },
      {
        activeTerms: ["rhoIn", "veff", "orbitals", "rhoOut"],
        equationKey: "scf",
        equationDetailMode: "grouped",
        title: { en: "How the Density Is Actually Solved", ko: "밀도를 실제로 푸는 방법" },
        question: {
          en: "A DFT result earns its place in the reference record only once the density it came from is self-consistent, so this convergence loop is the gate every electronic answer must clear.",
          ko: "DFT 결과는 그 밀도가 자기일관에 이른 뒤에야 참조 레코드에 들어갈 자격을 얻으므로, 이 수렴 고리는 모든 전자구조 답이 통과해야 하는 관문이다.",
        },
        concept: {
          en: "The electronic solve is self-consistent. Start from a trial density, build the density-dependent Hamiltonian, solve its orbitals, form a new density, apply the solver's update, and test convergence. Drag the control to step through actual SCF iterations and watch the total-density snapshots settle while the energy-change trace falls. Convergence is the numerical gate a result must pass before it enters the reference record. The displayed density surfaces use changing stated isovalues, so they are not meant for quantitative area comparison.",
          ko: "전자구조 계산은 자기일관적이다. 시험 전자 밀도에서 시작해 밀도에 의존하는 해밀토니안을 만들고, 오비탈을 푼 뒤 새 밀도를 구성하고, 갱신 연산자를 적용해 수렴을 검사한다. 조절기를 움직이면 실제 SCF 반복을 하나씩 지나며 총밀도 스냅샷이 안정되고 에너지 변화 곡선이 내려가는 과정을 볼 수 있다. 수렴은 결과가 참조 레코드에 들어가기 전에 통과해야 하는 수치적 관문이다. 화면의 밀도 표면은 표시 등치값이 달라 면적을 정량 비교하기 위한 것은 아니다.",
        },
        takeaway: {
          en: "SCF convergence is the numerical gate applied before an electronic result enters our reference record.",
          ko: "SCF 수렴은 전자구조 결과를 참조 레코드에 넣기 전에 통과해야 하는 수치적 관문이다.",
        },
        systemCaption: {
          en: "Calculated SCF density snapshots · synchronized energy-change trace",
          ko: "계산된 SCF 총밀도 스냅샷 · 동기화된 에너지 변화 곡선",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "SCF total-density snapshots", ko: "SCF 총밀도 스냅샷" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "SCF loop", ko: "SCF 반복 고리" } },
        ],
        plotType: "scf",
        sceneKey: "D4_scf",
      },
    ],
  },

  mlff: {
    equationKey: "mlff",
    steps: [
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "From DFT Data to a Learned Potential", ko: "DFT 데이터에서 학습 퍼텐셜까지" },
        question: {
          en: "Reach for a learned potential when you need DFT-level forces over more steps and larger systems than DFT can afford, across chemistry a fixed classical force field cannot represent.",
          ko: "DFT로는 감당 못 할 만큼 많은 스텝과 큰 계에서, 고정된 고전 역장으로는 담지 못하는 화학까지, DFT 수준의 힘이 필요할 때 학습 퍼텐셜을 꺼내 든다.",
        },
        concept: {
          en: "DFT supplies reference configurations together with their total energies and atom-resolved forces. An MLFF fits a differentiable approximation to the potential energy surface covered by those examples. Once trained, the same model evaluates new configurations far more cheaply than solving the electronic structure again, so its forces can advance a long MD trajectory. The speedup is useful only within chemical and configurational regions represented and validated by the reference set.",
          ko: "DFT는 여러 참조 배치와 함께 각 배치의 총에너지 및 원자별 힘을 제공한다. MLFF는 이 예시들이 덮는 퍼텐셜 에너지면을 미분 가능한 함수로 근사한다. 학습이 끝나면 전자구조를 매번 다시 풀지 않고도 새 배치의 에너지와 힘을 빠르게 평가하므로 긴 MD 궤적을 전개할 수 있다. 다만 이 속도와 정확도는 참조 데이터가 대표하고 검증한 화학적·구조적 영역 안에서만 유효하다.",
        },
        takeaway: {
          en: "MLFF carries DFT-quality labels into the repeated force evaluations needed for reactive or chemically complex atomistic sampling.",
          ko: "MLFF는 DFT 수준의 참조값을 반응성·복잡 화학의 반복적인 원자별 힘 계산으로 확장한다.",
        },
        systemCaption: {
          en: "Concept schematic using teaching geometries; no project benchmark values are reported",
          ko: "학습용 기하를 사용한 개념 도식이며 프로젝트 벤치마크 값은 표시하지 않음",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "DFT configurations with energy and force labels", ko: "에너지와 힘이 부여된 DFT 배치" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Learned PES, trajectory, and predicted forces", ko: "학습된 PES, 궤적, 예측 힘" } },
        ],
        plotType: null,
        sceneKey: "L1_why",
      },
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "Inside the Machine Learning Force Field", ko: "머신러닝 역장 내부의 계산 흐름" },
        question: {
          en: "The learned forces can be trusted at DFT accuracy because the model reads each atom's neighborhood through a symmetry-preserving descriptor and takes every force as the exact gradient of one scalar energy.",
          ko: "학습된 힘을 DFT 정확도로 믿을 수 있는 이유는, 모델이 각 원자의 이웃을 대칭성을 보존하는 descriptor로 읽고 모든 힘을 하나의 스칼라 에너지의 정확한 기울기로 얻기 때문이다.",
        },
        concept: {
          en: "For each atom, the model reads only neighbors inside a cutoff and converts their relative arrangement into a symmetry-preserving descriptor. Translation, rotation, and reordering of equivalent atoms therefore do not create a different physical input. A neural network maps each descriptor to an atomic energy contribution, and the contributions are summed into one total energy. Forces come from the negative gradient of that same learned energy, which keeps energy and force predictions mutually consistent.",
          ko: "모델은 각 원자를 중심으로 차단 반경 안의 이웃만 읽고, 상대적 배열을 대칭성을 보존하는 descriptor로 바꾼다. 따라서 구조 전체를 이동하거나 회전하고 동일 원자의 순서를 바꾸어도 물리적으로 같은 입력은 같은 표현을 갖는다. 신경망은 각 descriptor를 원자별 에너지 기여로 변환하고, 이를 합해 하나의 총에너지를 만든다. 힘은 같은 학습 에너지의 음의 기울기에서 얻으므로 에너지와 힘 예측이 서로 일관된다.",
        },
        takeaway: {
          en: "Locality controls cost, symmetry controls physical consistency, and energy differentiation supplies every atomic force.",
          ko: "국소성은 계산량을, 대칭성은 물리적 일관성을 제어하며 에너지 미분이 모든 원자의 힘을 제공한다.",
        },
        systemCaption: {
          en: "Atom-centered representation and energy-conserving force construction shown schematically",
          ko: "원자 중심 표현과 에너지 보존형 힘 계산을 설명한 개념 도식",
        },
        visualLayers: [
          { kind: "MECHANISM SCHEMATIC", label: { en: "Cutoff neighborhood and symmetry-preserving descriptor", ko: "차단 반경 이웃과 대칭성 보존 descriptor" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Atomic-energy sum and forces from its gradient", ko: "원자별 에너지 합과 그 기울기에서 얻는 힘" } },
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
        activeTerms: ["observable", "average"],
        equationKey: "observable",
        equationDetailMode: "grouped",
        title: { en: "Where Sampling Becomes the Answer", ko: "표본이 곧 답이 되는 계층" },
        question: {
          en: "When the answer is a statistical average over millions of fixed-chemistry configurations, only an analytic force field is cheap enough to sample that deeply, a reach even MLFF cannot afford.",
          ko: "답이 화학이 고정된 수백만 배치의 통계 평균일 때, 그만큼 깊이 표본화할 만큼 값싼 것은 해석적 역장뿐이며 이는 MLFF조차 감당하지 못하는 도달 범위다.",
        },
        concept: {
          en: "This tier exists for statistics. An analytic force field fixes the chemistry and topology, which makes each force evaluation cheap enough to integrate for millions of steps. A single configuration is not the result here; the result is an ensemble average over many correlated frames. Select a readout to project the same production trajectory into a measurable quantity, such as a contact or packing metric, and watch its time trace and distribution build up. Every atom stays explicit, exactly as in MLFF-driven MD, but the potential is analytic with its own parameter provenance. The gain is the sheer reach of sampling; the cost is bond breaking, explicit electrons, and transferability beyond the parameterized chemistry.",
          ko: "이 계층은 통계를 위해 존재한다. 해석적 역장이 화학과 위상을 고정하면 힘 계산 하나하나가 싸져서 수백만 스텝을 적분할 수 있다. 여기서는 배치 하나가 결과가 아니라, 서로 상관된 많은 프레임을 평균한 앙상블 값이 결과다. 관측량을 선택하면 같은 생산 궤적이 접촉·밀집 지표 같은 측정 가능한 양으로 투영되고, 그 시간 추이와 분포가 쌓이는 모습을 볼 수 있다. MLFF 기반 MD와 똑같이 모든 원자는 명시적으로 남지만, 퍼텐셜은 자기 나름의 모수 출처를 가진 해석적 함수다. 표본의 폭넓은 도달 범위를 얻는 대신 결합 생성과 절단, 명시적 전자, 모수화 영역 밖의 전달성을 내준다.",
        },
        takeaway: {
          en: "A short single trajectory shows fluctuation but leaves converged uncertainty unresolved; independent blocks or replicas are the next check. MLFF and classical force fields remain parallel atomistic engines. When the observable turns collective, this trajectory hands a mapping and target observables down to the coarse-grained tier.",
          ko: "짧은 단일 궤적은 요동을 보여 주지만 수렴 불확실도는 남겨 둔다. 다음 검사는 독립 블록이나 반복 시뮬레이션이다. MLFF와 고전 역장은 여전히 병렬 원자 해상도 엔진이다. 관측량이 집단적 성격으로 바뀌면 이 궤적은 매핑과 목표 관측량을 조대화 계층으로 넘긴다.",
        },
        systemCaption: {
          en: "Trajectory-derived readouts · caffeine/water OpenMM example · convergence check is schematic",
          ko: "궤적에서 계산한 관측량 · 카페인/물 OpenMM 예시 · 수렴 검사는 도식",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Frame-linked observables", ko: "프레임과 연결된 관측량" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Block/replica convergence requirement", ko: "블록/반복 수렴 요구" } },
        ],
        plotType: "allatomReadout",
        sceneKey: "A6_observables",
      },
      {
        activeTerms: ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"],
        equationKey: "classical",
        equationDetailMode: "grouped",
        title: { en: "What the Analytic Force Field Models", ko: "해석적 역장이 담는 것" },
        question: {
          en: "That depth of sampling is affordable only because a fixed analytic energy replaces the electronic solve, and its declared bonded and nonbonded terms are exactly what define and bound the trajectory.",
          ko: "이만한 깊이의 표본화가 가능한 것은 고정된 해석적 에너지가 전자구조 계산을 대신하기 때문이며, 명시된 결합·비결합 항이 궤적을 규정하는 동시에 한계 짓는다.",
        },
        concept: {
          en: "The force field replaces the electronic solve with a fixed analytic energy, and that is what makes the sampling above affordable. Bond, angle, and torsion terms preserve the chosen molecular topology; Lennard-Jones and electrostatic terms govern nonbonded packing and orientation. Select a term in the equation or the diagram to isolate its contribution. Either nonbonded contribution can be attractive or repulsive depending on distance and charge. The selectable overlays use schematic cue values; the periodic trajectory itself evaluates long-range electrostatics with PME, and the displayed pair kernel only explains the local interaction form.",
          ko: "역장은 전자구조 계산을 고정된 해석적 에너지로 대신하며, 바로 그 덕분에 앞의 넓은 표본이 가능해진다. 결합, 결합각, 비틀림 항은 정해진 분자 위상을 유지하고, Lennard-Jones와 정전기 항은 비결합 밀집과 배향을 결정한다. 식이나 도식의 항을 선택하면 각 항의 기여를 따로 볼 수 있다. 두 비결합 항 모두 거리와 전하에 따라 인력이나 반발이 될 수 있다. 선택 가능한 오버레이의 값은 설명용 근사다. 주기 궤적 자체는 장거리 정전기를 PME로 계산하며, 화면의 쌍 커널은 국소 상호작용 형태만 설명한다.",
        },
        takeaway: {
          en: "The classical atomistic branch uses a declared analytic energy model with independently documented parameters.",
          ko: "고전 원자 해상도 분기는 독립적으로 기록된 매개변수를 가진 해석적 에너지 모형을 사용한다.",
        },
        systemCaption: {
          en: "Trajectory base + mechanism overlays · overlay parameters are schematic",
          ko: "궤적 기반 + 메커니즘 오버레이 · 오버레이 모수는 설명용",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Caffeine/water local frames", ko: "카페인/물 국소 프레임" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Force-field term cues", ko: "역장 항 단서" } },
        ],
        plotType: "allatomForceField",
        sceneKey: "A3_forcefield",
      },
    ],
  },

  meso: {
    equationKey: "cgModel",
    steps: [
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "Where Collective Behavior Emerges", ko: "집단 거동이 창발하는 계층" },
        question: {
          en: "When the behavior only emerges at sizes and times no atomistic run can reach, keeping every atom is not an option, and coarse-graining is the only route to the scale where that behavior lives.",
          ko: "그 거동이 어떤 원자 계산으로도 닿지 못하는 크기와 시간에서만 나타난다면 모든 원자를 유지하는 선택지는 없고, 그 거동이 사는 규모에 이르는 길은 조대화뿐이다.",
        },
        concept: {
          en: "Some behavior only appears once the atoms are gone. Reach for a coarse-grained model when morphology, packing, entanglement, or phase behavior needs sizes and effective evolution beyond feasible atomistic sampling. Selected collective variables stay explicit while fast, local degrees of freedom are integrated out. The active trajectory is a generic linear-polymer melt of 100 chains, 80 beads each, over 500 stored frames. Reducing the degrees of freedom makes an 8,000-bead collective field affordable and exposes chains entangling and rearranging, motion no atomistic run of this reach could follow. The gain is reach; the cost is atomistic uniqueness, transferability across state points, and a direct map from simulated to physical time.",
          ko: "어떤 거동은 원자를 없앤 뒤에야 나타난다. 형태, 밀집, 얽힘, 상거동 같은 관측량이 전원자 표본의 한계를 넘어선 크기와 유효한 시간 진화를 요구할 때 조대화 모형을 고른다. 선택한 집단 변수만 명시적으로 남기고 빠르고 국소적인 자유도는 평균화한다. 현재 궤적은 80비드 사슬 100개로 이루어진 일반 선형 고분자 용융계이며 500개 프레임에 걸쳐 있다. 자유도를 줄인 덕분에 8,000비드 규모의 집단 장이 가능해지고, 사슬이 얽히고 재배열되는 운동이 드러난다. 이만한 크기는 전원자 계산으로는 따라갈 수 없다. 더 큰 범위를 얻는 대신 원자 수준의 유일성, 상태점 간 전달성, 시뮬레이션 시간과 실제 시간의 직접 대응을 잃는다.",
        },
        takeaway: {
          en: "This tier reaches sizes and collective motion the atomistic tiers cannot, while keeping its system size and nominal duration stated explicitly.",
          ko: "이 계층은 계 크기와 명목 시간을 명시한 채, 원자 해상도 계층이 닿지 못하는 크기와 집단 운동에 도달한다.",
        },
        systemCaption: {
          en: "Trajectory · generic linear-polymer melt · 100×80 beads · 500 frames · nominal 1 ns",
          ko: "궤적 · 일반 선형 고분자 용융계 · 100×80비드 · 500프레임 · 명목상 1 ns",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "8,000-bead collective trajectory", ko: "8,000비드 집단 궤적" } },
        ],
        plotType: null,
        sceneKey: "M5_collective",
      },
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "How Coarse-Graining Buys That Reach", ko: "조대화가 그 도달 범위를 얻는 방식" },
        question: {
          en: "The mapping that folds several atoms into one bead is what buys the longer timestep and larger system, and that same choice fixes how much atomic fidelity is traded for the reach.",
          ko: "여러 원자를 비드 하나로 접는 매핑이 더 긴 적분 스텝과 더 큰 계를 사들이며, 바로 그 선택이 도달 범위를 위해 내주는 원자 수준 충실도를 정한다.",
        },
        concept: {
          en: "A coarse-grained bead stands in for a chosen group of atoms, and its position follows from a fixed mapping such as the group's center of mass. Averaging the fast internal motion out of the model leaves fewer particles, softer effective forces, and a longer stable timestep, and those three compounding factors are what turn atomistic reach into mesoscale reach. The motif here fades one atomistic chain into its bead representation: the retained contour and connectivity are what later carry collective structure, while atom-specific packing and bond vibrations are deliberately dropped. The speedup is not a single fixed number, since it scales with how many atoms each bead absorbs and how soft the effective interactions become. What it consistently buys is access to chain counts, system sizes, and relaxation times no atomistic run of comparable cost could follow, paid for in atom-level detail and a direct map back to physical time.",
          ko: "조대화 비드 하나는 선택한 원자 그룹을 대표하고, 그 위치는 그룹의 질량 중심 같은 고정된 매핑으로 정해진다. 빠른 내부 운동을 모형에서 평균해 없애면 입자 수가 줄고 유효 힘이 부드러워지며 안정적인 적분 스텝이 길어진다. 이 세 요인이 겹쳐 원자 해상도의 도달 범위를 메조스케일의 범위로 바꾼다. 화면의 모티프는 원자 사슬 하나가 그 비드 표현으로 서서히 바뀌는 과정을 보여 준다. 남긴 윤곽과 연결성은 뒤에서 집단 구조를 실어 나르고, 원자별 배치와 결합 진동은 의도적으로 버린다. 가속 배수는 하나로 정해지지 않는다. 비드 하나가 흡수하는 원자 수와 유효 상호작용이 부드러워지는 정도에 따라 달라진다. 그 대신 꾸준히 얻는 것은 같은 비용의 원자 계산으로는 따라갈 수 없는 사슬 수, 계 크기, 완화 시간이고, 값은 원자 수준 세부와 실제 시간으로의 직접 대응으로 치른다.",
        },
        takeaway: {
          en: "The mapping is a modeling choice, so a coarse-grained model is only as trustworthy as the atomistic or experimental targets its effective interactions were tuned to reproduce.",
          ko: "매핑은 모형화 선택이므로, 조대화 모형의 신뢰도는 유효 상호작용을 맞춘 전원자 또는 실험 목표만큼만 확보된다.",
        },
        systemCaption: {
          en: "Mapping-teaching motif · one chain to its bead representation · speedup is regime-dependent, not a reported benchmark",
          ko: "매핑 학습용 모티프 · 사슬 하나의 비드 표현 · 가속은 조건에 따라 다르며 보고된 벤치마크가 아님",
        },
        visualLayers: [
          { kind: "MECHANISM SCHEMATIC", label: { en: "Atom-to-bead mapping motif", ko: "원자→비드 매핑 모티프" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "Degrees of freedom removed and the reach gained", ko: "제거된 자유도와 늘어난 도달 범위" } },
        ],
        plotType: null,
        sceneKey: "M2_mapping",
      },
    ],
  },
};
