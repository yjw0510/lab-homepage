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
  "MECHANISM SCHEMATIC": { en: "MECHANISM SCHEMATIC", ko: "원리 도식" },
  "TARGET NOT AVAILABLE": { en: "TARGET NOT AVAILABLE", ko: "목표값 없음" },
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
        equationKey: "scf",
        equationDetailMode: "grouped",
        title: { en: "How the Density Is Actually Solved", ko: "밀도를 실제로 푸는 방법" },
        question: {
          en: "Electrons repel one another, so where any one of them sits depends on where all the others are. You would need the answer in order to work the answer out.",
          ko: "전자는 서로 밀어내니, 한 전자가 어디 놓일지는 나머지 전자가 모두 어디 있느냐에 달려 있다. 답을 알아야 답을 구하는 셈이다.",
        },
        concept: {
          en: "The force on any one electron is set by the nuclei and by all the other electrons together, and where those others are is the electron density, the very thing being solved for. So a plausible density is put in, and where the electrons settle under the force it makes is worked out again. A new density comes out, and feeding that straight back overshoots, so it is blended with the previous one before the next pass. Move the control and the real iterations go by one at a time. The density surface shifts less and less, and the energy change, after one large early excursion, drops by orders of magnitude. One isovalue is held across the whole run, so the surface growing is the density filling in rather than the contour being redrawn. The density and the orbital energies on the next page become that molecule's own only once they are through this loop. When it will not come through, suspect the starting guess or the mixing scheme first.",
          ko: "전자 하나가 받는 힘은 원자핵과 다른 전자들이 함께 만든다. 그 다른 전자들이 어디 있는지가 전자 밀도이고, 그게 지금 구하려는 값이다. 그래서 그럴듯한 밀도를 하나 놓고, 그 밀도가 만드는 힘 아래에서 전자가 어디 놓일지 다시 푼다. 새로 나온 밀도를 그대로 되먹이면 값이 튀므로, 앞 밀도와 섞어 다음 입력으로 쓴다. 조절기를 움직이면 반복이 하나씩 지나간다. 밀도 표면은 갈수록 덜 움직이고, 에너지 변화는 초반에 크게 튄 뒤로 자릿수를 떨어뜨린다. 등치값은 전 구간 하나로 고정하니, 표면이 커지면 밀도가 그만큼 차오른 것이다. 다음 장의 밀도와 오비탈 에너지도 이 고리를 빠져나와야 그 분자의 값이 된다. 좀처럼 못 빠져나오면 초기 추정과 섞는 방식을 먼저 의심한다.",
        },
        takeaway: {
          en: "Only once the density stops moving do the energy and orbitals read here belong to that molecule.",
          ko: "밀도가 더 움직이지 않을 때까지 돌리고 나서야, 여기서 읽은 에너지와 오비탈이 그 분자의 값이 된다.",
        },
        systemCaption: {
          en: "All 59 SCF iterations from the HCore guess · synchronized energy-change trace",
          ko: "HCore 추정에서 시작한 SCF 반복 59회 전체 · 동기화된 에너지 변화 곡선",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "SCF total-density snapshots", ko: "SCF 총밀도 스냅샷" } },
          { kind: "MECHANISM SCHEMATIC", label: { en: "SCF loop", ko: "SCF 반복 고리" } },
        ],
        plotType: "scf",
        sceneKey: "D4_scf",
      },
      {
        activeTerms: ["rho"],
        equationKey: "frontier",
        equationDetailMode: "grouped",
        title: { en: "The Only Tier With Explicit Electrons", ko: "전자를 직접 다루는 유일한 계층" },
        question: {
          en: "When the result turns on where the electrons go, only the tier that solves for them can answer; every cheaper model has parameterized them away.",
          ko: "결과가 전자의 거동에 달린 순간에는 전자를 직접 푸는 이 계층만이 그 답을 내며, 더 싼 모형에는 그 전자가 이미 남아 있지 않다.",
        },
        concept: {
          en: "A structural formula ends a bond at a line, and what that line stands for is electron density spread between two nuclei. Where it thins, the bond gives way first; where it piles up, a reagent comes in. This tier solves for that distribution directly, which is how a reactive site can be named on a molecule nobody has synthesized, and how readily it will surrender an electron estimated in advance. The numbers that come out sit next to the absorption wavelengths and oxidation potentials a spectrometer and a potentiostat hand back. They are expensive enough that the system stays small and only selected structures are solved. On screen the surface shows where charge has collected, then which regions move first as an electron leaves or arrives.",
          ko: "구조식에서 결합은 선 하나로 끝나지만, 그 선이 대신하는 것은 두 원자핵 사이에 퍼져 있는 전자다. 그 전자가 얇아진 자리에서 결합이 먼저 풀리고, 두껍게 고인 자리로 시약이 다가온다. 이 계층은 그 분포를 직접 푼다. 그래서 아직 합성해 보지 않은 분자를 두고도 어느 자리가 먼저 반응할지, 전자를 얼마나 선선히 내놓을지 미리 가늠할 수 있다. 그렇게 나온 수치는 분광기와 전위 측정기가 돌려주는 흡수 파장이나 산화 전위 옆에 그대로 놓인다. 그만큼 계산이 비싸서 계는 작게 두고 고른 몇 개 구조만 푼다. 화면의 표면은 전하가 고인 자리와, 전자를 주고받을 때 가장 먼저 움직이는 영역을 차례로 보여 준다.",
        },
        takeaway: {
          en: "What crosses to the next tier is a provenance-bearing record: atomic numbers and coordinates paired with a total energy, forces, and the full calculation protocol. The electronic solve itself stays here, in the reference tier.",
          ko: "다음 계층으로는 출처가 붙은 레코드가 넘어간다. 원자 번호와 좌표에 총에너지, 힘, 계산 프로토콜을 붙인 것이다. 전자구조 계산 자체는 참조 계층에 남는다.",
        },
        systemCaption: {
          en: "Calculated density / HOMO / LUMO · ORCA wB97M-V/def2-TZVP on PO-T2T, 108 atoms",
          ko: "계산된 밀도 / HOMO / LUMO · PO-T2T 108원자 ORCA wB97M-V/def2-TZVP",
        },
        visualLayers: [
          { kind: "CALCULATED", label: { en: "Density and frontier orbitals", ko: "전자 밀도와 프런티어 오비탈" } },
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
        title: { en: "From DFT Data to a Learned Potential", ko: "DFT 데이터에서 학습 퍼텐셜까지" },
        question: {
          en: "Reach for a learned potential when you need DFT-level forces at a scale DFT cannot afford, on chemistry a fixed force field cannot hold.",
          ko: "DFT로는 감당 못 할 만큼 많은 스텝과 큰 계에서, 고정된 고전 역장으로는 담지 못하는 화학까지, DFT 수준의 힘이 필요할 때 학습 퍼텐셜을 꺼내 든다.",
        },
        concept: {
          en: "Move an atom slightly and DFT starts the calculation over. The answer from the configuration it has just solved has nowhere to go. An MLFF treats those solved configurations as points and fits an energy surface through them. Once trained, the model skips the electronic structure and returns forces directly. A bond breaking and reforming, or an ion swapping its coordination shell in an electrolyte, can be watched long enough for statistics to accumulate. Diffusion coefficients and vibrational spectra come out of those trajectories, and because both are measured too, a disagreement shows up immediately. What the model knows ends where its training data ends, and outside that the forces go wrong. The domain of use is therefore checked continually against separate reference calculations.",
          ko: "원자가 조금만 움직여도 DFT는 계산을 처음부터 다시 한다. 앞서 푼 배치의 답은 다음 배치에 물려줄 데가 없다. MLFF는 그렇게 풀어 둔 배치를 점 삼아 그 사이를 지나는 에너지면을 맞춘다. 학습이 끝난 모델은 전자구조를 건너뛰고 곧장 힘을 내놓는다. 결합이 끊어졌다 다시 붙는 과정도, 전해질에서 이온이 배위 껍질을 갈아타는 과정도 통계가 쌓일 만큼 오래 지켜볼 수 있다. 그 궤적에서 확산 계수가 나오고 진동 스펙트럼이 나온다. 둘 다 측정으로도 얻는 값이라 어긋나면 어디가 어긋났는지 바로 드러난다. 모델이 아는 것은 학습 데이터가 덮은 영역까지이고, 그 밖에서는 힘이 틀어진다. 그래서 적용 범위는 별도의 참조 계산으로 계속 점검한다.",
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
          en: "The learned forces hold at DFT accuracy because each neighborhood is read symmetry-preserving and every force is one scalar energy's gradient.",
          ko: "학습된 힘이 DFT 정확도를 지키는 것은, 모델이 원자의 이웃을 대칭 보존 표현으로 읽고 힘을 하나의 스칼라 에너지의 기울기로 얻기 때문이다.",
        },
        concept: {
          en: "What the model reads around any one atom is the few angstroms nearest to it, and nothing else. A model trained on a hundred atoms therefore runs on tens of thousands, and an unfamiliar molecule still gets an answer as long as its local environments are familiar. Rotating the whole system, moving it, or relabelling two atoms of the same element leaves the chemistry unchanged. A model that does not know this relearns the same chemistry in every new orientation and needs a far larger training set to do it. Predict energy and forces separately and the two drift apart, so the total energy of a long MD run will not stay put. Take the forces by differentiating that one energy and the drift has no way in.",
          ko: "모델이 원자 하나를 두고 읽는 것은 그 주위 몇 옹스트롬이 전부다. 그 덕에 원자 100개로 배운 모델을 원자 수만 개짜리 계에 그대로 쓴다. 처음 보는 분자라도 국소 환경이 익숙하면 답이 나온다. 계를 통째로 돌리거나 옮겨도 화학은 그대로고, 같은 원소끼리 번호를 바꿔 달아도 마찬가지다. 이 사실을 모르는 모델은 방향이 바뀔 때마다 같은 화학을 처음부터 다시 배우고, 그만큼 훨씬 많은 학습 데이터를 요구한다. 에너지와 힘을 따로 내놓게 하면 둘이 어긋나 긴 MD에서 총에너지가 한쪽으로 흐른다. 힘을 같은 총에너지의 기울기에서 얻으면 그런 어긋남이 없다.",
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
        // The step's own copy is the classical potential term by term ("A bond is one spring,
        // an angle is another, and the rest is charge pulling on charge"), and the rail offers
        // "select a force-field term in the equation" as its interaction. Both were pointed at
        // the observable equation, whose only termIds are `observable` and `average`, so no
        // segment was ever interactive and the hint named something that could not be clicked.
        activeTerms: ["Ubond", "Uangle", "Udihedral", "UvdW", "UCoul"],
        equationKey: "classical",
        equationDetailMode: "grouped",
        title: { en: "Fixing the Chemistry to Buy Steps", ko: "화학을 고정해 스텝을 버는 계층" },
        question: {
          en: "When a value only appears after millions of configurations have been averaged, it is reached by the tier that froze the chemistry into a formula and made a single step cheap.",
          ko: "값이 수백만 번의 배치를 평균해야 비로소 나오는 것이라면, 화학을 식으로 고정해 한 스텝을 싸게 만든 계층이 그 표본을 쌓는다.",
        },
        concept: {
          en: "A bond is one spring, an angle is another, and the rest is charge pulling on charge. That list is the whole of the force, so no step solves for an electron and a step costs almost nothing. What a cheap step buys is sample size. A box of ten thousand atoms has to be run millions of times before an arrangement worth calling a liquid accumulates. Held at a temperature and a pressure, the box loses the way it was first packed and moves to the arrangement that force produces. Whether that arrangement is the real liquid is checked against a quantity the experiment also measures, density among them. The same list is the ceiling: a bond breaking and reforming cannot be written with this force. On screen is one ion out of that box, shown with the molecules around it.",
          ko: "결합은 용수철 하나, 각도는 또 다른 용수철, 나머지는 전하와 전하 사이의 힘이다. 이 목록이 힘의 전부여서 전자를 푸는 단계가 들어설 자리가 없고, 그만큼 한 스텝이 싸다. 싼 스텝이 사는 것은 표본이다. 원자 만 개쯤 되는 상자를 수백만 번 굴려야 액체라 부를 만한 배열이 쌓인다. 항온기와 항압기를 걸어 두면 상자는 처음 채워 넣은 방식을 잃고 그 힘이 만드는 배열로 옮겨 간다. 그 배열이 실제 액체인지는 밀도처럼 실험이 재어 주는 양을 견주어 확인한다. 같은 목록이 천장이기도 해서, 결합이 끊어지고 새로 붙는 일은 이 힘으로 쓸 수 없다. 화면은 그 상자에서 이온 하나를 골라 지금 그것을 둘러싼 분자들과 함께 보여 준다.",
        },
        takeaway: {
          en: "What passes downward is an observable with its criterion and its spread attached. The effective interactions a coarse-grained model is fitted to are matched against the structure obtained here.",
          ko: "이 계층이 다음으로 넘기는 것은 기준이 적힌 관측량과 그 폭이다. 조대화 모형이 맞추는 유효 상호작용도 여기서 얻은 구조를 목표로 삼는다.",
        },
        systemCaption: {
          en: "ByteFF-Pol polarizable force field · OpenMM NPT 298 K · 2.45 ns · barostat density 1.212 g/mL against measured ~1.20 · 200 frames over 30 ps exported for the web",
          ko: "ByteFF-Pol 편극 역장 · OpenMM NPT 298 K · 2.45 ns · 압력 조절 밀도 1.212 g/mL, 실측 약 1.20 · 웹 표시용 30 ps 200프레임",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Coordinated carbonyls of one Li+", ko: "리튬 하나가 붙든 카보닐" } },
          { kind: "CALCULATED", label: { en: "Per-frame 2.8 A contact test, minimum image", ko: "프레임마다 2.8 A 접촉 판정, 최소 이미지" } },
        ],
        plotType: null,
        sceneKey: "A3_forcefield",
      },
      {
        activeTerms: ["observable", "average"],
        equationKey: "observable",
        equationDetailMode: "grouped",
        title: { en: "How a Trajectory Yields an Observable", ko: "궤적에서 관측량을 얻는 방식" },
        question: {
          en: "The coordinates of a single frame are exact and answer nothing on their own, so a value from this tier arrives only once a mean and a spread have been drawn from the whole trajectory.",
          ko: "한 프레임의 좌표는 정확하지만 그것 하나로는 답이 되지 않으므로, 이 계층의 값은 궤적 전체에서 평균과 폭을 함께 거두어야 나온다.",
        },
        concept: {
          en: "A liquid has a different shape every instant, so holding on to the present configuration only means a different one arrives at the next. A quantity readable from coordinates is fixed instead, evaluated on every frame, and averaged over a long run. Coordination number, the count of oxygens within 2.8 angstrom of an ion, is such a quantity, and the count is undefined until the distance being measured is written down. Keeping only the mean erases how much the liquid moves, so the width of the distribution is recorded with it. Neighbouring frames resemble one another, so the uncertainty is taken by splitting the trajectory into long blocks and comparing them. MLFF counts the same quantity, and freezing the chemistry into a formula is what accumulates enough sample here for a distribution to converge. In the cell on screen each lithium takes its colour from the count it is holding.",
          ko: "액체는 매 순간 다른 모양이어서, 지금 이 배치를 붙들어도 다음 순간이면 다른 배치가 온다. 그래서 좌표에서 읽히는 양을 하나 정하고, 프레임마다 그 값을 구해 길게 평균 낸다. 이온 둘레 2.8 옹스트롬 안의 산소를 세는 배위수가 그런 양이고, 재는 거리를 적어 두지 않으면 수도 정해지지 않는다. 평균만 남기면 액체가 얼마나 움직이는지가 지워지므로, 분포의 폭도 함께 적는다. 이웃한 프레임끼리는 서로 닮아 있어, 오차는 궤적을 긴 구간으로 갈라 견주어 얻는다. MLFF도 같은 양을 세지만, 화학을 식으로 고정한 덕에 여기서는 분포가 수렴할 만큼 표본이 쌓인다. 화면의 셀에서는 리튬마다 지금 세고 있는 개수로 색이 갈린다.",
        },
        takeaway: {
          en: "An observable means something only with its criterion written beside it, and changing the criterion changes the value.",
          ko: "관측량은 기준과 함께 적힐 때만 뜻을 가지며, 기준을 바꾸면 값도 따라 바뀐다.",
        },
        systemCaption: {
          en: "Per-ion coordination over the full 2.45 ns trajectory · criterion carbonyl O within 2.8 A · 68 ions, resolution 1 in 68",
          ko: "전체 2.45 ns 궤적에서 계산한 이온별 배위수 · 기준 카보닐 산소 2.8 A · 이온 68개, 분해능 68분의 1",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "Per-ion instantaneous coordination, 68 Li+", ko: "이온별 순간 배위수, 리튬 68개" } },
          { kind: "CALCULATED", label: { en: "Run histogram and block-averaged mean", ko: "전체 궤적 분포와 블록 평균" } },
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
        title: { en: "The Tier That Folds Atoms Into Beads", ko: "여러 원자를 한 비드로 접는 계층" },
        question: {
          en: "Folding several atoms into one bead buys the longer timestep and the larger system, and that same choice fixes what atomic detail is given up.",
          ko: "여러 원자를 비드 하나로 접는 매핑이 더 긴 적분 스텝과 더 큰 계를 가능하게 하고, 그 도달 범위의 값으로 내주는 원자 수준 충실도까지 같은 선택이 정한다.",
        },
        concept: {
          en: "How many atoms a single bead may hold has to be settled before any of this runs. Group them by centre of mass and the fast rattling inside each group leaves the model; with fewer particles and softer forces the timestep can be stretched. That is how the reach on the next page is bought. What it costs is settled in the same place. The chain's contour and connectivity survive, so how a melt entangles is still answerable, while which hydrogen bond formed and when is no longer a question the model can take. The clock stretches too. Smoothing the fast motion makes simulated time run ahead of real time by a factor the mapping fixes, so a relaxation time from here is read as a trend. On screen, one chain dissolving into its beads is that decision made visible.",
          ko: "비드 하나에 원자를 몇 개까지 담을지는 계산을 시작하기 전에 정해야 한다. 질량 중심으로 묶고 나면 그 안에서 떨리던 빠른 운동이 모형에서 빠져나가고, 입자 수가 줄고 힘이 부드러워지면서 적분 스텝을 길게 잡을 수 있다. 다음 장의 도달 범위는 이 대가로 얻는다. 내주는 것도 이 결정에서 함께 정해진다. 사슬의 윤곽과 연결성을 남겼으니 용융체가 어떻게 얽히는지는 여전히 답하지만, 어느 수소결합이 언제 생겼는지는 더 물을 수 없다. 빠른 운동을 뭉갠 만큼 시뮬레이션 시간이 실제보다 앞서 흐르고 그 배수도 매핑이 정하므로, 여기서 나온 완화 시간은 경향으로 읽는다. 화면에서 사슬 하나가 비드로 풀어지는 장면이 그 결정을 그대로 보여 준다.",
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
      {
        activeTerms: [],
        showEquation: false,
        title: { en: "How That Reach Yields Collective Behavior", ko: "그 도달 범위에서 집단 거동이 나오는 방식" },
        question: {
          en: "When the behavior emerges only at sizes and times no atomistic run reaches, coarse-graining is the only route to the scale it lives on.",
          ko: "그 거동이 어떤 원자 계산으로도 닿지 못하는 크기와 시간에서만 나타난다면 모든 원자를 유지하는 선택지는 없고, 그 거동이 사는 규모에 이르는 길은 조대화뿐이다.",
        },
        concept: {
          en: "One polymer chain is a long piece of thread and little else. Put a few thousand of them in the same box and, threading past one another, they acquire properties no single strand has. A melt that stops flowing and holds like rubber comes out of that entanglement. A block copolymer sorting itself into periodic layers takes the same crowd to happen at all. Counting atoms one at a time runs out of time long before it reaches this scale, so the mapping on the previous page is applied and the system grows on what it keeps, the chain's contour and its connectivity. What moves on screen is a hundred chains obtained that way, and a scattering experiment hands back the same arrangement they make together.",
          ko: "고분자 사슬 하나는 긴 실에 지나지 않는다. 그런 실을 수천 가닥 같은 통에 넣으면 서로를 꿰고 지나가면서 한 가닥에는 없던 성질이 생긴다. 용융체가 흐르다 말고 고무처럼 버티는 것이 그 얽힘에서 나온다. 블록 공중합체가 저절로 주기적인 층으로 갈라서는 것도 여럿이 모여야 일어나는 일이다. 원자를 하나씩 세는 계산은 이 규모에 닿기 전에 시간이 먼저 바닥난다. 그래서 앞 장의 매핑을 적용해 사슬의 윤곽과 연결성만 남긴 채 계를 키운다. 움직이는 것은 그렇게 얻은 사슬 100가닥이고, 산란 실험이 되돌려 주는 것도 이 사슬들이 함께 이룬 배열이다.",
        },
        takeaway: {
          en: "This tier reaches sizes and collective motion the atomistic tiers cannot, while keeping its system size and nominal duration stated explicitly.",
          ko: "이 계층은 계 크기와 명목 시간을 명시한 채, 원자 해상도 계층이 닿지 못하는 크기와 집단 운동에 도달한다.",
        },
        systemCaption: {
          en: "Trajectory · generic linear-polymer melt · 100×80 beads · 500 frames · nominal 1 ns",
          ko: "궤적 · 일반 선형 고분자 용융체 · 100×80비드 · 500프레임 · 명목상 1 ns",
        },
        visualLayers: [
          { kind: "TRAJECTORY", label: { en: "8,000-bead collective trajectory", ko: "8,000비드 집단 궤적" } },
        ],
        plotType: null,
        sceneKey: "M5_collective",
      },
    ],
  },
};
