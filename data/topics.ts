import type { ResearchTopic } from "@/types/topic";

export const topics: ResearchTopic[] = [
  {
    id: "self-assembly",
    title: "Polymer-Directed Self-Assembly",
    titleKo: "고분자가 이끄는 자기조립",
    tagline:
      "Polymer chain shape determines how nanoparticles pack",
    taglineKo: "고분자 사슬 모양이 나노입자 배열을 정한다",
    description: `Attaching polymer chains to a nanoparticle changes how the particles pack. We study this with coarse-grained molecular dynamics (CGMD), which groups several atoms into one interaction site to reach larger systems. The polymer brush changes gradually: chains are crowded and stretched near the surface, then relax farther from the core. Using that crossover as an effective particle boundary gives a softness measure that predicts a dense or open arrangement. Grafting density, the number of chains per surface area, shifts the same balance because dense brushes interpenetrate less and make soft particles pack more like hard spheres.

Attaching one bottlebrush polymer, a backbone bearing dense side chains, gives the particle a preferred direction. In a layer confined to a flat surface, backbone length, side-chain length, and shell thickness select hexagonal, square, or chain-like order; missing or extra grafts shift the stable range of each arrangement. Cylinders embedded in a brush interact through regions with fewer polymer segments. The distance over which brush segments move together provides a common scale for comparing grafting densities. Competition between polymer-depleted regions beside and above the cylinders can strengthen or weaken interactions and shift them between attraction and repulsion. Simulations turn this mechanism into a biologically testable hypothesis for protein clustering beneath the glycocalyx, the polymer-rich coating on a cell surface. Enhanced sampling, which makes rare transitions easier to observe, also reveals a temporary network of misaligned cylinders as block copolymers, linked polymers with distinct sections, move toward an ordered phase.`,
    descriptionKo: `나노입자에 고분자 사슬을 붙이면 입자 배열이 달라진다. 원자 여러 개를 하나의 계산 단위로 묶어 더 큰 계를 다루는 조대화 분자동역학(CGMD)으로 이 변화를 계산한다. 나노입자 주위의 고분자 사슬층인 고분자 브러시에서는 표면 가까운 사슬이 빽빽하게 늘어나고 입자 중심에서 멀어질수록 느슨하게 풀린다. 이 전환 지점을 입자의 유효 경계로 잡으면 입자가 얼마나 무른지 나타내는 값이 나온다. 이 값으로 무작위 상태의 입자가 조밀한 배열을 만들지, 더 열린 격자를 만들지 예측한다. 표면당 사슬 수인 그래프팅 밀도가 높으면 브러시끼리 덜 파고들어 무른 입자도 단단한 구처럼 쌓인다.

곁사슬이 촘촘한 병솔형 고분자를 한 가닥 붙이면 입자에 방향성이 생긴다. 평면에 가까운 한 층에서는 주쇄와 곁사슬의 길이, 입자 껍질의 두께가 육각형, 정사각형, 사슬형 배열을 가른다. 사슬 수가 0개 또는 2개인 입자는 각 구조가 안정한 범위를 바꾼다. 고분자 브러시에 박힌 원기둥은 주변에 고분자가 적은 영역을 사이에 두고 상호작용한다. 브러시 사슬이 함께 움직이는 길이를 거리의 기준으로 삼아 그래프팅 밀도가 다른 결과를 비교한다. 원기둥 옆과 위의 고분자 빈 영역이 경쟁하며 인력과 척력의 세기와 방향을 바꾼다. 시뮬레이션은 이 원리를 세포 표면의 고분자층인 glycocalyx 아래 단백질 군집화에 적용해 생물학적으로 검증할 가설을 만든다. 드문 전환을 더 잘 포착하는 강화 샘플링에서는 서로 다른 고분자 블록을 이은 블록 공중합체가 정렬되는 도중, 어긋난 원기둥이 이어진 임시 그물도 나타났다.`,
    icon: "Hexagon",
    color: "#f59e0b",
    gridSpan: [2, 2],
    tags: ["Self-Assembly", "Polymer Brush", "Polymer Physics"],
  },
  {
    id: "aqueous-solution",
    title: "Aqueous Chemistry with Machine-Learning Force Fields",
    titleKo: "머신러닝 역장으로 다루는 수용액 화학",
    tagline:
      "Models trained on quantum calculations follow water, ions, and chemical reactions",
    taglineKo: "양자 계산을 학습한 모형으로 물과 이온의 움직임, 화학 반응을 추적한다",
    description: `A machine-learning force field (MLFF) is trained on quantum-mechanical calculations to predict atomic energies and forces. It extends aqueous and reactive simulations to larger systems and longer times than direct quantum calculations. In alkali chloride solutions, different positive ions (cations) either slow or accelerate water diffusion. The conventional force fields evaluated in this study predict slowing for every salt. An MLFF and direct quantum simulations reproduce the experimentally observed split. Correlated molecular motion distinguishes the solutions. Across the salts and model families in this study, rescaling diffusion by the distance and time over which water molecules move together places the results on a common comparison curve.

The same modeling strategy resolves distinct chemical problems. As an aluminum ion completes its surrounding water layers, coordinated motion across the first and second layers opens a site for water arriving from beyond the second layer. For pure water, a separate quantum-trained model reproduces its response to changing electric fields and connects the high-frequency signal to coupled hydrogen-bond motion. A reactive MLFF can also follow bonds breaking and forming during acetic-acid oxidation in supercritical water, meaning water at high temperature and pressure. It recovers pathways through short-lived reactive fragments and complete oxidation. Training coverage near high-energy barrier structures controls barrier accuracy; sparse coverage lowers the predicted barriers.`,
    descriptionKo: `머신러닝 역장(MLFF)은 양자역학 계산을 학습해 원자의 에너지와 힘을 예측하는 모형이다. 직접 양자 계산보다 큰 계와 긴 시간까지 수용액과 반응 시뮬레이션을 넓힌다. 알칼리 염화물 수용액에서는 양전하를 띤 이온인 양이온의 종류에 따라 물의 확산이 느려지거나 빨라진다. 이 연구에서 평가한 기존 역장은 모든 염에서 물이 느려진다고 예측했다. MLFF와 직접 양자 계산은 실험에서 관찰된 염별 차이를 재현했다. 물 분자가 서로 맞물려 움직이는 방식이 염별 차이를 가른다. 연구에서 다룬 염과 모형군의 확산을 물이 함께 움직이는 거리와 시간으로 환산해 하나의 곡선에서 비교했다.

같은 모델링 전략으로 서로 다른 화학 문제를 푼다. 알루미늄 이온을 둘러싼 물층이 완성될 때는 첫째와 둘째 물층의 움직임이 맞물려 빈자리를 열고 둘째 층 바깥에 있던 물이 들어온다. 순수한 물에서는 별도로 학습한 모형이 변하는 전기장에 대한 반응을 재현하고 고주파 신호를 수소 결합의 집단 운동과 연결한다. 반응용 MLFF는 고온·고압의 물인 초임계수에서 결합이 끊어지고 새로 생기는 과정도 따라간다. 짧은 수명의 반응성 단편과 완전 산화 경로가 궤적에 나타난다. 에너지 장벽 부근의 학습 구조가 장벽 정확도를 좌우하며 구조가 적으면 장벽을 낮게 예측한다.`,
    icon: "Droplets",
    color: "#3b82f6",
    gridSpan: [1, 1],
    tags: ["Water", "Dissolution", "MLFF"],
  },
  {
    id: "glass",
    title: "Glass Dynamics and Microrheology",
    titleKo: "유리의 동역학과 미시유변학",
    tagline:
      "One moving probe reveals how a glass resists and relaxes",
    taglineKo: "움직이는 탐침 하나로 유리가 버티고 풀리는 과정을 읽는다",
    description: `Active microrheology reads how the surrounding material responds from the force on a small driven probe. In molecular dynamics, a simulation that follows atomic motion over time, one particle is pulled at constant velocity through a model glass, a solid with disordered atomic structure. The trajectory samples differences between the neighborhoods it crosses. Deforming the whole sample provides the corresponding average response. Comparing the local friction curve with that average shows how faithfully the probe reports the material. On cooling, a threshold force appears below which the probe remains trapped. Friction relaxes in two stages: motion inside a temporary cage of neighbors, followed by escape as the structure rearranges.

A later study extracts both time scales from the friction signal of a single trajectory. As the drive slows, steady fluctuations give way to fluctuations with long-time memory. The correlated region inferred from this crossover changes sharply near the trapping boundary and grows as the glass cools. The method therefore turns one local force record into a measure of how relaxation varies across the material.`,
    descriptionKo: `능동 미시유변학은 움직이는 작은 탐침에 걸리는 힘으로 주변이 얼마나 쉽게 변형되는지 읽는다. 분자의 움직임을 시간에 따라 계산하는 분자동역학 안에서 입자 하나를 일정한 속도로 모형 유리에 끌고 간다. 유리는 원자가 불규칙하게 배열된 고체다. 탐침의 궤적은 지나간 영역마다 달라지는 반응을 보여 준다. 시료 전체를 변형한 결과에서는 평균 반응을 얻는다. 탐침 주변의 마찰 곡선을 이 평균과 비교해 탐침이 재료의 성질을 얼마나 충실히 읽는지 평가한다. 유리를 식히면 탐침이 움직이기 시작하는 임계 힘이 나타난다. 마찰이 풀리는 완화 과정은 이웃이 만든 임시 우리 안의 운동과 구조가 재배열되며 그 우리를 벗어나는 운동으로 나뉜다.

후속 연구에서는 궤적 하나의 마찰 신호에서 두 시간 척도를 분리했다. 탐침을 천천히 끌수록 일정하던 요동에 긴 시간의 기억이 생긴다. 이 전환에서 추정한 함께 움직이는 영역의 크기는 탐침이 갇히는 경계 부근에서 급격히 달라지고 유리가 식을수록 커진다. 탐침 주변의 힘 기록 하나로 재료 내부의 완화 속도가 위치마다 어떻게 다른지 측정한다.`,
    icon: "Atom",
    color: "#06b6d4",
    gridSpan: [1, 1],
    tags: ["Metallic Glass"],
  },
  {
    id: "colloidal-dynamics",
    title: "Colloidal Structure, Transport, and Optics",
    titleKo: "콜로이드의 구조·수송·광학",
    tagline:
      "Particle shape and packing control color, connected paths, and motion in tight spaces",
    taglineKo: "입자의 모양과 배열이 색과 연결 경로, 좁은 공간의 움직임을 정한다",
    description: `Colloids are small particles dispersed in a fluid. Silica particles dried inside water droplets dispersed in another liquid assemble into ordered, 20-faced icosahedral clusters when water leaves slowly; fast drying produces onion-like shells. Three-dimensional confocal microscopy images particle positions inside the droplet, molecular dynamics in a shrinking cavity builds model clusters, and electromagnetic calculations predict reflected colors that match the measurements. The ordered clusters produce stronger, more saturated color from their particle arrangement. The reflected wavelength stays similar across cluster orientations. A thin carbon shell suppresses background scattering and makes the color cleaner.

Charge moves through a colloidal nanocrystal film by jumping between particles, so conduction begins once contacts span the film. Shape-based simulations show that branched and longer-armed particles form a connected path at lower density and need fewer jumps. The simulations use this geometric network as a structural indicator of conduction. Films made from four-armed CdSe tetrapods support the connection: longer-armed particles conduct better and retain most of that conductivity when bent repeatedly. Graphene liquid-cell electron microscopy follows single nanoparticles in confined liquid. Nanoparticle mobility is reduced on average, and the trajectories contain rare, long steps. A model with an environment-dependent local diffusion rate reproduces these statistics and attributes the slowdown to strong confinement resistance. As two particles merge, surface coatings first keep them apart; the particles then rotate into contact.`,
    descriptionKo: `콜로이드는 액체에 작은 입자가 퍼져 있는 계다. 다른 액체에 물방울이 퍼진 에멀전 안의 실리카 입자는 물이 천천히 빠질 때 정이십면체 모양의 질서 있는 집합체로 조립되고 빠르게 마르면 동심 껍질 구조에 갇힌다. 물방울 내부의 입자 위치를 보는 3차원 공초점 현미경으로 조립 경로를 따라가고 줄어드는 구형 공간 안에서 분자동역학으로 모형 집합체를 만든 뒤 전자기 계산으로 반사색을 예측한다. 계산은 측정값과 잘 맞는다. 질서 있는 집합체는 입자 배열이 만드는 색이 더 선명하고 채도가 높다. 가장 강하게 반사하는 빛의 파장은 보는 방향에 따른 변화가 작다. 얇은 탄소 껍질은 배경 산란을 줄여 색을 더 또렷하게 만든다.

콜로이드 나노결정 막에서는 전하가 입자 사이를 건너뛴다. 입자 접촉이 막을 가로질러 이어져야 전도 경로가 생긴다. 입자의 모양과 접촉을 표현한 시뮬레이션에서는 가지가 많거나 팔이 긴 입자가 더 낮은 밀도에서 연결 경로를 만들고 경로를 따라 건너야 할 접촉 수도 줄었다. 이 기하학적 연결망을 전도 가능성을 나타내는 구조 지표로 사용했다. 팔이 네 개인 CdSe 테트라포드 막에서도 팔이 긴 입자가 더 잘 통하고 반복해서 굽혀도 전도도를 대부분 유지했다. 그래핀 액체 셀 전자현미경은 그래핀 사이에 액체를 가둔 뒤 나노입자를 하나씩 추적한다. 나노입자는 평균적으로 이동성이 낮았고 드물게 긴 이동을 보였다. 위치에 따라 확산 속도가 달라지는 모형은 이 통계를 재현하고 느린 움직임을 구속 저항과 연결한다. 두 입자가 합쳐질 때는 표면을 덮은 분자층이 입자 사이의 간격을 유지하는 단계를 거친 뒤 입자가 회전해 서로 붙는다.`,
    icon: "Orbit",
    color: "#f43f5e",
    gridSpan: [1, 1],
    tags: ["Colloidal Dynamics"],
  },
  {
    id: "hydrogel",
    title: "Multiscale Modeling of Hydrogels",
    titleKo: "하이드로겔 멀티스케일 모델링",
    tagline:
      "Chain shape controls stiffness; chemical sequence controls when a gel forms",
    taglineKo: "사슬 모양은 단단함을, 화학적 배열은 겔이 생기는 조건을 정한다",
    description: `A hydrogel is a water-rich polymer network. Its stiffness depends on how many links join the chains, how much water it holds, and the shape of the chain segments between those links. A coarse-grained model groups atoms into simpler units and is tuned against simulations that represent every atom, allowing it to reach larger networks. Its predicted stiffness agrees with synthesized polyacrylamide gels. At fixed water content and polymer chemistry, the balance between folded and swollen strands changes stiffness. Under tension, contacts within and between strands reorganize differently depending on whether the strands begin folded or swollen. Chain shape supplies an independent design variable at fixed composition. For PLGA-PEG-PLGA copolymers, polymers built from more than one kind of repeating chemical unit, experiments and coarse-grained simulations show that the order of those units changes how molecular clusters called micelles bridge or merge near body temperature, shifting when the gel forms and how quickly it releases a drug.`,
    descriptionKo: `하이드로겔은 물을 많이 머금은 고분자 그물이다. 단단함은 사슬을 잇는 결합의 수와 물의 양, 결합 사이에 놓인 사슬 모양에 따라 달라진다. 원자 여러 개를 단순한 단위로 묶은 조대화 모형을 모든 원자를 나타내는 전원자 시뮬레이션에 맞춰 조정해 더 큰 고분자 그물까지 계산한다. 이 모형이 예측한 단단함은 합성한 폴리아크릴아마이드 겔의 측정값과 맞았다. 물의 양과 고분자 화학을 고정하면 접힌 사슬과 물을 머금어 부푼 사슬의 비율이 단단함을 바꾼다. 잡아당길 때는 사슬 안의 접촉과 사슬 사이의 접촉이 초기 사슬 모양에 따라 다르게 재편된다. 사슬 모양은 같은 조성 안에서 조절할 수 있는 설계 변수다. 두 종류 이상의 화학 단위가 반복되는 PLGA-PEG-PLGA 공중합체에서는 실험과 조대화 시뮬레이션을 결합했다. 반복 단위의 배열이 미셀이라는 분자 집합체의 연결과 합체를 바꾸고 겔이 생기는 시점과 약물이 빠져나오는 속도도 달라졌다.`,
    icon: "FlaskConical",
    color: "#10b981",
    gridSpan: [1, 1],
    tags: ["Hydrogel"],
  },
  {
    id: "misc",
    title: "Collaborative Projects",
    titleKo: "공동 연구",
    tagline: "Targeted models connect observations in experiment-led studies",
    taglineKo: "목적에 맞는 계산 모형으로 실험 관측을 잇는다",
    description: `Experiment-led collaborations use targeted models to connect observations. Simulations locate strain in soft, polymer-rich regions of a stretchable silver-gold nanowire composite. The conductive network remains intact during extension. A thermodynamic film model explains why a perovskite precursor moves onto water-attracting patterns and why faster spinning improves yield. An optical model, checked against measured plates, estimates window-scale efficiency for a clear luminescent solar concentrator that guides emitted light to edge-mounted solar cells.`,
    descriptionKo: `실험 중심 공동 연구에서는 목적에 맞는 모형으로 관측 사이의 관계를 밝힌다. 시뮬레이션은 늘어나는 은-금(Ag-Au) 나노선 복합체의 변형이 부드러운 고분자 영역에 모이는 과정을 보여 줬다. 재료가 늘어나는 동안 전도성 연결망은 유지됐다. 열역학 모형은 페로브스카이트 전구체가 물을 끌어당기는 패턴으로 이동하고 회전 속도가 빨라질수록 패턴 형성률이 높아지는 이유를 설명한다. 측정한 시편으로 검증한 광학 모형은 방출광을 가장자리 태양전지로 보내는 투명 발광 집광판을 창문 크기로 키웠을 때의 효율을 추정한다.`,
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
    tagline: "Developing calculations for switching, transport, coarse-graining, and interfaces",
    taglineKo: "스위칭·수송·조대화·계면을 위한 계산 방법을 개발한다",
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
