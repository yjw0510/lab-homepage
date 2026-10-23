import type { ResearchTopic } from "@/types/topic";

export const topics: ResearchTopic[] = [
  {
    id: "self-assembly",
    title: "Self-Assembly of Nanoparticles and Colloids",
    titleKo: "나노 입자와 콜로이드의 자기조립",
    tagline:
      "Assembly and transport of nanoparticles and colloidal particles",
    taglineKo: "나노 입자와 콜로이드 입자의 조립과 수송",
    description: `Nanoparticles a few to a few tens of nanometers across stick together under strong attraction once they come close in solution, so they fail to stay evenly dispersed. One of the best known ways around this is to graft polymer chains onto the particles and tune the attraction and repulsion between them. The grafted chains engage each other at a distance, before the cores ever touch, and that early interaction keeps the particles from clustering. Our lab varies the character of the grafted polymer, for example grafting density and chain length, to determine how it shapes the self-assembled structure of the nanoparticles. We also examine which arrangement the particles adopt when confined between two parallel plates or inside a sphere, and compute thermodynamic stability to identify the stable phase as these design variables change.

The structures colloidal particles assemble into, and the way they move, depend on particle shape and size, surface properties, and the space the particles occupy. Experiments that track individual particles record this behavior directly. Explaining which conditions produce ordered structures, and why confined particles move differently than expected, requires a model. Our lab builds particle-level models of colloidal systems. We compute how shape, arrangement, surface properties, and confinement in droplets or thin liquid films relate to assembly structure, particle transport, and aggregation, and compare the results quantitatively with single-particle measurements.`,
    descriptionKo: `지름이 수 나노미터에서 수십 나노미터인 나노 입자는 용액 속에서 서로 가까워지면 강한 인력으로 달라붙어 뭉친다. 이를 피하는 잘 알려진 방법은 입자 표면에 고분자 사슬을 접합해 입자 사이의 인력과 척력을 조절하는 것이다. 접합된 사슬은 입자가 맞닿기 전부터 먼 거리에서 서로 상호작용해 입자끼리 뭉치는 것을 막는다. 우리 연구실에서는 접합 밀도와 사슬 길이 같은 고분자의 특성을 바꾸어 가며 나노 입자의 자기조립 구조가 어떻게 달라지는지를 규명한다. 또한 두 평행판 사이나 구형 공간에 갇힌 나노 입자가 어떤 배열을 이루는지 확인하고, 열역학적 안정성을 계산해 이러한 설계 변수에 따라 어떤 상이 안정한지를 밝힌다.

콜로이드 입자가 어떤 구조로 모이고 어떻게 움직이는지는 입자의 모양과 크기, 표면 특성, 입자가 놓인 공간에 따라 달라진다. 개별 입자를 추적하는 실험은 이 거동을 직접 기록한다. 어떤 조건에서 질서 있는 구조가 생기는지, 좁은 공간에 갇힌 입자가 왜 예상과 다르게 움직이는지를 설명하려면 모형이 필요하다. 우리 연구실에서는 콜로이드 계를 입자 수준 모형으로 구성해, 입자의 모양과 배열, 표면 특성, 액적이나 얇은 액체층 같은 구속 조건이 집합체의 구조, 입자의 이동·응집과 어떻게 연관되는지를 계산하고, 그 결과를 단일 입자 측정과 정량적으로 비교한다.`,
    icon: "Hexagon",
    color: "#f59e0b",
    gridSpan: [2, 2],
    tags: ["Self-Assembly", "Nanoparticle", "Colloidal Dynamics", "Nanoparticle Imaging"],
  },
  {
    id: "polymer-simulation",
    title: "Molecular Simulation of Polymers",
    titleKo: "고분자 분자 모사",
    tagline: "Chain-level simulation of polymer ordering and interactions",
    taglineKo: "사슬 수준에서 계산하는 고분자의 정렬과 상호작용",
    description: `Polymer properties are set by monomer chemistry together with chain length, connectivity, and the way chains entangle and arrange. Our lab studies this relationship with chain-level molecular simulation. Block copolymers, chains built from chemically distinct blocks, order into periodic nanostructures, and the ordering transition sits behind a free-energy barrier too large to cross in ordinary simulation time. We design order parameters that measure how far the target structure has formed. Enhanced sampling then pushes the simulation across the barrier along those parameters, and we compute the ordering pathway and its free-energy landscape.

A polymer brush, a dense layer of chains tethered by one end to a surface, also exerts forces on objects placed inside it. Chains excluded from the region around an object, or piled above it, generate attraction and repulsion between embedded objects. Our lab computes the free energy of these interactions with coarse-grained simulation and polymer theory, varying brush height, grafting density, and the size and shape of the objects, to determine the conditions under which embedded objects aggregate.`,
    descriptionKo: `고분자의 물성은 단위체의 화학과 함께 사슬의 길이와 연결 구조, 사슬들이 얽히고 배열되는 방식으로 정해진다. 우리 연구실에서는 사슬 수준의 분자 모사로 이 관계를 연구한다. 서로 다른 블록을 이어 붙인 블록 공중합체는 주기적인 나노 구조로 정렬한다. 이 정렬 과정은 자유 에너지 장벽이 높아 보통의 시뮬레이션 시간 안에는 일어나지 않는다. 목표 구조가 얼마나 형성됐는지를 재는 질서 변수를 설계하고, 이 변수를 따라 계가 장벽을 넘도록 미는 강화 샘플링으로 정렬 경로와 자유 에너지 지형을 계산한다.

사슬 한쪽 끝을 표면에 촘촘히 고정한 고분자 브러시는 그 안에 놓인 물체에도 힘을 미친다. 사슬이 물체 주위에서 배제되거나 물체 위를 덮으면서 물체 사이에 인력과 척력이 생긴다. 우리 연구실에서는 브러시의 높이와 접합 밀도, 물체의 크기와 형상을 바꾸어 가며 이 상호작용의 자유 에너지를 조대화 시뮬레이션과 고분자 이론으로 계산하고, 어떤 조건에서 물체가 응집하는지를 규명한다.`,
    icon: "Layers",
    color: "#f43f5e",
    gridSpan: [1, 1],
    tags: ["Polymer Physics", "Polymer Brush"],
  },
  {
    id: "aqueous-solution",
    title: "Aqueous Chemistry with Machine-Learning Force Fields",
    titleKo: "머신러닝 역장으로 다루는 수용액 화학",
    tagline:
      "Ion effects and solvation dynamics in liquid water",
    taglineKo: "물의 집단 운동과 이온 수화",
    description: `The measurable properties of liquid water, such as diffusion, dielectric relaxation, and the rearrangement of the hydrogen bond network, arise from many molecules moving together, so any calculation that reproduces them needs quantum-mechanical accuracy and long statistics at the same time. Direct quantum simulation supplies that accuracy for small systems over short times. Classical force fields reach long times and leave out the many-body interactions among water molecules. Machine-learning force fields trained on quantum-mechanical data remove that trade-off, so collective motion in aqueous systems can be followed at first-principles quality for as long as the statistics demand.

Our lab uses these potentials to investigate how water and dissolved ions move together. We examine how an ion reshapes the collective motion of the water around it, and why water speeds up near some ions and slows down near others as ion identity and concentration change. The same simulations follow how a solvation shell is completed, which water molecule reaches the ion and by what route, and how long it stays before exchanging with the surrounding liquid. We study how changes in physical and chemical conditions, such as ion identity and concentration, temperature and pressure, and applied electric fields, relate to the structural and dynamical behavior of water at the level of single molecules and of their collective motion.`,
    descriptionKo: `액체 상태 물의 확산, 유전 완화, 수소 결합 네트워크의 재배열은 여러 분자의 집단적인 움직임에서 나오는 양이어서, 계산으로 재현하려면 양자역학 수준의 정확도와 긴 시간의 통계가 동시에 필요하다. 양자 계산은 이 정확도를 작은 계와 짧은 시간 범위에서 제공한다. 고전 역장은 긴 시간 규모를 다루며, 물 분자 여럿이 동시에 주고받는 다체 상호작용은 빠뜨린다. 양자역학 계산을 학습한 머신러닝 역장이 이 제약을 해소하여, 수용액의 집단 운동을 제일원리 수준의 정확도로 긴 시간에 걸쳐 추적할 수 있게 되었다.

우리 연구실에서는 이 퍼텐셜로 물과 이온의 동역학을 규명한다. 용해된 이온이 주변 물의 집단 운동을 어떻게 바꾸는지, 이온의 종류와 농도에 따라 물의 확산이 빨라지거나 느려지는 현상이 어디에서 비롯되는지 확인한다. 같은 시뮬레이션으로 이온을 둘러싼 용매화 껍질이 어떤 경로로 채워지는지, 배위된 물 분자가 얼마나 머무른 뒤 주변과 교환되는지도 추적한다. 이온의 종류와 농도, 온도와 압력, 외부 전기장 같은 조건이 바뀔 때 물의 구조와 운동이 분자 하나에서 분자 집단 수준까지 어떻게 달라지는지를 계산한다.`,
    icon: "Droplets",
    color: "#3b82f6",
    gridSpan: [1, 1],
    tags: ["Water", "Dissolution"],
  },
  {
    id: "reaction-mlff",
    title: "Chemical Reaction Simulation with Ab Initio and Machine-Learning Methods",
    titleKo: "제일원리 계산과 머신러닝 역장으로 모사하는 화학 반응",
    tagline: "Reactive dynamics, pathways, and intermediates from first-principles and learned potentials",
    taglineKo: "제일원리와 학습 퍼텐셜로 계산하는 반응 동역학과 경로, 중간체",
    description: `A chemical reaction breaks and forms bonds, which fixed-bond classical force fields cannot represent. Ab initio dynamics, which solves for the electrons directly, follows a reaction as it happens in small systems over short times. A reactive machine-learning force field learns from ab initio calculations that include bond changes and carries their accuracy to larger systems and longer times. Our lab uses the two methods together to study reactions in solution and under extreme conditions. Varying temperature, pressure, and composition, we determine the intermediates and pathways through which a reaction proceeds and the conditions that control its rate and products. Because the accuracy of a predicted pathway depends on training data near transition states, we refine the model by active learning, returning high-uncertainty structures to ab initio calculation.`,
    descriptionKo: `화학 반응은 결합이 끊어지고 새로 형성되는 과정이어서, 결합을 고정해 둔 고전 역장으로는 모사할 수 없다. 전자를 직접 푸는 제일원리 동역학은 작은 계와 짧은 시간 범위에서 반응을 그대로 따라간다. 반응성 머신러닝 역장은 결합 변화가 포함된 제일원리 계산을 학습해, 그 정확도를 유지한 채 더 큰 계와 긴 시간에서 반응 동역학을 모사한다. 우리 연구실에서는 두 방법을 함께 써서 용액과 극한 조건에서 일어나는 반응을 연구한다. 온도와 압력, 반응물의 조성을 바꾸어 가며 반응이 어떤 중간체와 경로를 거쳐 진행하는지, 어떤 조건이 반응 속도와 생성물을 결정하는지를 규명한다. 반응 경로의 정확도는 전이 상태 부근의 학습 데이터가 좌우하므로, 불확실성이 큰 구조를 제일원리 계산으로 되돌려 보강하는 능동 학습으로 모형을 다듬는다.`,
    icon: "FlaskConical",
    color: "#8b5cf6",
    gridSpan: [1, 1],
    tags: ["Reaction"],
  },
  {
    id: "glass",
    title: "Glass Dynamics and Microrheology",
    titleKo: "유리의 동역학과 미시유변학",
    tagline:
      "Particle-level measurement of the glass transition",
    taglineKo: "입자 수준에서 재는 유리 전이",
    description: `A glass keeps the disordered structure of a liquid and still holds its shape the way a crystal does, and why it can do both is unsettled. The dynamics inside such a material are patchy: some regions rearrange quickly, and their neighbors stay frozen for long stretches. A measurement that presses on the whole sample returns one averaged response in which that patchwork disappears. Our lab measures locally with active microrheology. In simulation we drag a single probe particle through the material at fixed velocity and record the force acting on it, reading the resistance of the neighborhoods it crosses one at a time. Varying temperature and drag speed, we find the temperatures at which the force on the probe stays finite even as the speed approaches zero. That remaining force is a threshold, and below it the material holds the probe in place. The way the recorded force fluctuates gives the sizes and lifetimes of the slow regions. The aim is a description of the glass transition stated at the level of single particles.`,
    descriptionKo: `유리는 액체의 무질서한 구조를 그대로 지닌 채 결정처럼 형태를 유지한다. 무질서한 구조와 고체의 강성이 어떻게 양립하는지는 아직 밝혀지지 않았다. 유리 내부의 동역학은 균일하지 않아서, 빠르게 재배열되는 영역과 오랫동안 거의 움직이지 않는 영역이 한 시료 안에 공존한다. 시료 전체에 힘을 가하는 측정에서는 이러한 불균일성이 평균화되어 드러나지 않는다. 우리 연구실은 능동 미시유변학으로 이를 국소적으로 측정한다. 시뮬레이션에서 탐침 입자 하나를 일정한 속도로 재료 속에서 끌며 그 입자에 걸리는 힘을 기록하면, 탐침이 지나는 국소 영역의 저항을 순차적으로 얻는다. 온도와 끄는 속도를 바꿔 가며, 속도를 0에 가깝게 줄여도 탐침에 걸리는 힘이 0으로 줄지 않는 온도 범위를 찾는다. 이때 남는 힘이 문턱 힘이며, 이보다 약하게 끌면 탐침은 재료에 붙잡혀 제자리에 머문다. 기록한 힘의 요동에서는 느린 영역의 크기와 수명을 추출한다. 이렇게 얻은 값으로 유리 전이를 개별 입자의 운동 수준에서 기술한다.`,
    icon: "Atom",
    color: "#06b6d4",
    gridSpan: [1, 1],
    tags: ["Metallic Glass"],
  },
  {
    id: "hydrogel",
    title: "Multiscale Modeling of Hydrogels",
    titleKo: "하이드로겔 멀티스케일 모델링",
    tagline:
      "Molecular design of water-swollen polymer networks",
    taglineKo: "물을 머금은 고분자 그물의 분자 설계",
    description: `A hydrogel is a polymer network that holds water inside it. Macroscopic properties such as stiffness, gelation temperature, and swelling behavior are decided by choices made at the molecular level. They include the cross-linking density, the length and conformation of the strands between cross-links, the monomer sequence along a chain, and the water content. Chains of the same chemistry can arrange themselves in ways that give different mechanical and gelation behavior. Which of these choices to change to reach a target property remains an open question.

Our lab connects these molecular choices to gel properties with coarse-grained simulation, which groups atoms into larger interaction sites and makes a full water-swollen network tractable. The bonded and nonbonded interactions of the coarse-grained model are calibrated against atomistic reference simulations, and the mechanical response of the simulated network is compared with tensile measurements on synthesized gels. We also investigate how chain-level variables such as monomer sequence and block architecture relate to gelation behavior.`,
    descriptionKo: `하이드로겔은 다량의 물을 함유한 고분자 네트워크다. 강성, 겔화 온도, 팽윤 거동 같은 거시 물성은 분자 수준의 설계 선택으로 결정된다. 가교 밀도, 가교점 사이 사슬의 길이와 배좌, 사슬을 이루는 단위체의 배열 순서, 함수량이 대표적인 설계 변수다. 화학 조성이 같아도 사슬의 배열에 따라 역학 거동과 겔화 거동이 달라지므로, 목표 물성에 도달하려면 어느 변수를 어떻게 조절해야 하는지는 아직 체계적으로 밝혀져 있지 않다.

우리 연구실에서는 여러 원자를 하나의 상호작용 단위로 묶는 조대화 시뮬레이션으로 물을 머금은 네트워크 전체를 계산해, 이러한 분자 수준의 선택이 겔의 물성과 어떻게 이어지는지를 규명한다. 조대화 모형의 결합과 비결합 상호작용은 전원자 시뮬레이션을 기준으로 보정하고, 계산한 역학 응답은 합성한 겔의 인장 측정과 비교한다. 단위체 배열과 블록 구조 같은 사슬 수준의 변수가 겔화 거동과 어떻게 연관되는지도 확인한다.`,
    icon: "FlaskConical",
    color: "#10b981",
    gridSpan: [1, 1],
    tags: ["Hydrogel"],
  },
  {
    id: "misc",
    title: "Collaborative Projects",
    titleKo: "공동 연구",
    tagline: "Computational models for experiment-led studies",
    taglineKo: "실험 중심 연구를 위한 계산 모형",
    description: `Experiment-led collaborations use targeted models to connect observations. Simulations show that strain in a stretchable silver-gold nanowire composite concentrates in soft, polymer-rich regions, so the conductive network stays connected during stretching. A thermodynamic film model explains why a perovskite precursor moves onto water-attracting patterns and why faster spin-coating improves pattern yield. An efficiency model, checked against measured plates, estimates window-scale performance for a clear luminescent solar concentrator that guides emitted light to edge-mounted solar cells.`,
    descriptionKo: `실험 중심 공동 연구에서는 목적에 맞는 모형으로 관측 사이의 관계를 밝힌다. 시뮬레이션은 신축성 있는 은-금(Ag-Au) 나노선 복합체를 늘일 때 변형이 부드러운 고분자 영역에 모여 전도성 연결망이 끊어지지 않는다는 것을 보여 준다. 열역학 모형은 페로브스카이트 전구체가 물을 끌어당기는 패턴으로 이동하고 회전 도포 속도가 빨라질수록 패턴 형성률이 높아지는 이유를 설명한다. 측정한 시편으로 검증한 효율 모형은 방출광을 가장자리 태양전지로 보내는 투명 발광 집광판을 창문 크기로 키웠을 때의 효율을 추정한다.`,
    icon: "FlaskConical",
    color: "#9ca3af",
    gridSpan: [1, 1],
    tags: [],
    kind: "misc",
  },
  {
    id: "future",
    title: "Research Directions under Development",
    titleKo: "개발 중인 연구 방향",
    tagline: "Calculations for switching, transport, coarse-graining, and interfaces",
    taglineKo: "스위칭·수송·조대화·계면을 다루는 계산 방법 개발",
    description: `- **HfO₂ ferroelectric switching**: Hafnium oxide reverses its electrical polarization under an applied field and keeps the reversed state. The effect supports memory and brain-inspired computing. We are developing calculations of atomic rearrangement along the reversal path to identify which atomic movements control switching.
- **Proton transport under confinement**: Protons cross water by relaying charge along hydrogen bonds. We are studying how channels a few nanometers wide reorganize that relay.
- **Machine-learned coarse-grained interactions**: Grouping atoms into single beads reaches larger systems and longer time scales. We are learning effective bead interactions from atomistic trajectories.
- **Electron distribution under operating conditions**: We are developing calculations of electron distributions at device-relevant temperatures, pressures, and applied voltages.
- **Liquid metal interfaces**: We are developing reaction-rate calculations across an ensemble of continually rearranging surface structures.`,
    descriptionKo: `- **HfO₂ 강유전 스위칭**: 하프늄 산화물은 전압을 걸면 내부 전하의 치우침인 분극 방향이 뒤집히고 전압 제거 후 분극 방향을 유지한다. 메모리와 뇌 모사 연산에 쓰이는 성질이다. 분극 전환 경로에서 어떤 원자 운동이 스위칭을 좌우하는지 규명하는 계산을 개발하고 있다.
- **구속된 환경의 양성자 수송**: 양성자는 수소 결합을 따라 이웃에 전하를 넘기며 물을 건넌다. 폭이 몇 나노미터인 통로가 이 릴레이를 어떻게 재편하는지 연구하고 있다.
- **머신러닝 조대화 상호작용**: 원자 몇 개를 비드 하나로 묶으면 더 큰 계와 더 긴 시간 척도를 다룰 수 있다. 원자 단위 궤적에서 유효 비드 상호작용을 학습하고 있다.
- **작동 조건에서의 전자 분포**: 소자 작동 온도와 압력, 전압에서의 전자 분포 계산을 개발하고 있다.
- **액체 금속 계면**: 계속 재배열되는 액체 금속 표면 구조의 앙상블에서 계면 반응 속도를 추정하는 방법을 개발하고 있다.`,
    icon: "Orbit",
    color: "#a855f7",
    gridSpan: [2, 1],
    tags: [],
    kind: "future",
  },
];
