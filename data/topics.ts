import type { ResearchTopic } from "@/types/topic";

export const topics: ResearchTopic[] = [
  {
    id: "self-assembly",
    title: "Grafted Nanoparticle Self-Assembly",
    titleKo: "접합 나노입자 자기조립",
    tagline:
      "How polymer coatings on nanoparticles determine what crystal structure they form",
    taglineKo:
      "고분자 코팅이 나노입자 결정 구조를 정하는 원리",
    description: `The same gold nanoparticles, placed in the same solvent, can spontaneously organize into entirely different crystal structures. The only variable is the polymer coating on each particle's surface. These polymer-grafted nanoparticles carry chains of repeating molecular units that act as a tunable shell, mediating how neighboring particles interact. Adjusting the coating properties (the number of chains, their length, or their branching architecture) shifts the assembly between crystal symmetries, from a loosely packed body-centered cubic arrangement to a tightly packed face-centered cubic or hexagonal structure.

This matters because nanoscale crystal symmetry directly determines bulk material properties, including how the material interacts with light. Tuning the polymer shell at the molecular level therefore provides a design handle on macroscopic optical and mechanical behavior.

A particularly striking case arises when linear chains are replaced with bottlebrush polymers, branched molecules with side chains extending from a central backbone. The asymmetry of the bottlebrush coating breaks the particle's spherical symmetry and opens access to two-dimensional assembly patterns that isotropic coatings cannot produce: hexagonal arrays, square lattices, and linear clusters.`,
    descriptionKo: `같은 금 나노입자를 같은 용매에 넣어도 전혀 다른 결정 구조로 자발 조립될 수 있다. 유일한 변수는 입자 표면의 고분자 코팅이다. 이 고분자 접합 나노입자는 반복 분자 단위로 이루어진 사슬을 달고 있으며, 이 사슬이 조절 가능한 껍질로서 이웃 입자와의 상호작용을 매개한다. 코팅의 성질(사슬 수, 길이, 분지 구조)을 조절하면 느슨한 체심입방 배열에서 조밀한 면심입방 또는 육방 구조로의 결정 대칭 전이가 일어난다.

이것이 중요한 이유는 나노 규모의 결정 대칭이 빛과의 상호작용을 포함한 벌크 물성을 직접 결정하기 때문이다. 분자 수준에서 고분자 껍질을 조절하면 거시적 광학·역학 거동의 설계 수단이 된다.

특히 주목할 경우는 선형 사슬을 병솔형 고분자(중심 주쇄에서 곁사슬이 뻗어 나온 분지형 분자)로 교체할 때이다. 병솔형 코팅의 비대칭이 입자의 구형 대칭을 깨면서, 등방성 코팅으로는 불가능한 2차원 조립 패턴, 즉 육방 배열, 정방 격자, 선형 클러스터가 가능해진다.`,
    icon: "Hexagon",
    color: "#f59e0b",
    gridSpan: [2, 2],
    tags: ["Self-Assembly", "Nanoparticle"],
  },
  {
    id: "polymer-physics",
    title: "Computational Polymer Physics",
    titleKo: "전산 고분자 물리학",
    tagline:
      "Polymer brush interactions, block copolymer phase behavior, and macromolecular architecture",
    taglineKo:
      "고분자 브러시 상호작용, 블록 공중합체 상 거동, 거대분자 구조",
    description: `Polymer brushes, dense layers of polymer chains anchored to surfaces, line the inside of biological joints, cover cell membranes, and coat engineered nanoparticles. Despite their ubiquity, predicting the forces they create between objects embedded in the brush remains an open problem. When proteins or nanoparticles sit within a brush layer, surrounding chains are partially excluded from the space between them, generating an effective force that can be attractive or repulsive depending on the geometry of the embedded objects. This dependence is richer than classical excluded-volume theories predict, and it governs processes from membrane protein organization to colloidal stabilization.

Block copolymers present a different kind of self-organization. These chains are built from two or more chemically distinct segments joined end to end. Because the segments repel each other, they separate spontaneously into periodic nanostructures — alternating layers, packed cylinders, or interconnected channel networks — whose geometry depends on the relative lengths and compositions of the blocks. We use computational methods to map the transition pathways between disordered and ordered states, resolving not only the final structure but also metastable intermediates: transient states along the path to equilibrium that experiments detect but cannot characterize in molecular detail.`,
    descriptionKo: `고분자 브러시, 즉 표면에 고정된 고분자 사슬의 조밀층은 생체 관절 내부, 세포막, 나노입자 표면에 두루 존재한다. 이처럼 흔하지만, 브러시 안에 삽입된 물체 사이에 생기는 힘을 예측하는 것은 여전히 미해결 문제이다. 단백질이나 나노입자가 브러시 층 안에 놓이면 주변 사슬이 두 물체 사이 공간에서 부분적으로 배제되면서 유효한 힘이 발생하는데, 이 힘의 인력·척력 여부는 삽입된 물체의 기하에 따라 달라진다. 이 의존성은 고전적 배제 부피 이론의 예측보다 복잡하며, 막단백질 배열에서 콜로이드 안정화까지 다양한 과정을 지배한다.

블록 공중합체는 다른 방식의 자기조직화를 보여준다. 화학적으로 구별되는 두 개 이상의 분절이 끝과 끝으로 연결된 이 사슬에서 분절들은 서로 밀어내기 때문에 교대 층, 원통 배열, 연결된 채널 네트워크 등의 주기적 나노구조로 자발 분리된다. 어떤 구조가 형성되는지는 블록의 상대적 길이와 조성에 달려 있다. 전산 방법으로 무질서에서 질서로의 전이 경로를 규명하며, 최종 구조뿐 아니라 준안정 중간체, 즉 실험에서 감지되지만 분자 수준 특성 규명은 어려운 평형 도달 경로상의 일시적 상태도 분해한다.`,
    icon: "Layers",
    color: "#8b5cf6",
    gridSpan: [1, 2],
    tags: ["Polymer Brush", "Polymer Physics"],
  },
  {
    id: "aqueous-solution",
    title: "Aqueous Solution Physical Chemistry",
    titleKo: "수용액 물리화학",
    tagline:
      "How dissolved ions reshape water's structure, dynamics, and reactivity",
    taglineKo:
      "용존 이온이 물의 구조·동역학·반응성을 재편하는 원리",
    description: `Water is not a passive solvent. When ions dissolve, they reorganize the surrounding hydrogen bond network, the web of weak attractions between water molecules that gives liquid water its unusual properties. This reorganization alters how water conducts heat, how fast dissolved substances move, and how water responds to electric fields. The effects depend on the ion: some ions strengthen local water ordering and slow molecular motion, while others disrupt ordering and can accelerate it.

Classical molecular simulations model water as rigid charged particles connected by springs. This approximation works for many purposes but cannot distinguish one salt's effect from another at the level needed to match experiments. Neural network force fields, computational models trained on quantum-mechanical calculations, reproduce the experimentally observed differences in water transport across salt types and trace them to how water molecules move rather than how they are arranged: the static structure around different ions looks nearly identical, but the dynamics are qualitatively different.

The same approach reveals unexpected mechanisms in ion dissolution. When trivalent aluminum ions dissolve, the entering water molecule arrives not from the nearest surrounding water layer but from farther out, guided by a synchronized motion of already-coordinated molecules. We also study how water responds to electromagnetic radiation across the microwave-to-terahertz spectrum, and how organic molecules decompose in supercritical water, water above 374 °C and 22 MPa where it becomes a medium capable of breaking down organic waste through radical chemistry.`,
    descriptionKo: `물은 수동적인 용매가 아니다. 이온이 녹으면 수소결합 네트워크, 즉 액체 물에 특이한 성질을 부여하는 물 분자 사이의 약한 인력 그물을 재조직한다. 이 재조직은 물의 열전도, 용질 이동 속도, 전기장에 대한 응답을 바꾼다. 효과는 이온 종류에 따라 다르다: 일부 이온은 국소 물 질서를 강화하고 분자 운동을 감속시키며, 다른 이온은 질서를 교란하고 운동을 가속시킬 수 있다.

고전적 분자 시뮬레이션은 물을 스프링으로 연결된 강체 점전하로 다루는데, 여러 목적에 유용하지만 실험과 맞는 수준에서 염 종류 간 차이를 구별하지 못한다. 신경망 역장, 즉 양자역학 계산으로 훈련하여 분자 상호작용을 예측하는 전산 모형을 사용하면 염 종류에 따른 물 수송의 실험적 차이를 재현하고, 이것이 물 분자의 배열이 아닌 움직임의 차이에서 비롯됨을 밝힐 수 있다. 서로 다른 이온 주변의 정적 구조는 거의 동일하지만, 동역학은 질적으로 다르다.

같은 접근으로 이온 용해의 예상치 못한 메커니즘도 드러난다. 3가 알루미늄 이온이 용해될 때, 들어오는 물 분자는 가장 가까운 물 층이 아니라 더 먼 곳에서, 이미 배위된 분자의 동기화된 운동에 이끌려 도달한다. 마이크로파에서 테라헤르츠까지의 전자기 복사에 대한 물의 응답, 그리고 초임계수(374 °C, 22 MPa 이상에서 라디칼 화학으로 유기 폐기물을 분해할 수 있는 매체)에서의 유기 분자 분해도 연구한다.`,
    icon: "Droplets",
    color: "#3b82f6",
    gridSpan: [1, 1],
    tags: ["Water", "Dissolution", "MLFF"],
  },
  {
    id: "colloidal-dynamics",
    title: "Colloidal Nanoparticle Dynamics",
    titleKo: "콜로이드 나노입자 동역학",
    tagline:
      "Structure, transport, and optical properties of colloidal particles",
    taglineKo:
      "콜로이드 입자의 구조·수송·광학 물성 연구",
    description: `Trap a few thousand silica particles inside a slowly shrinking droplet and they assemble into an icosahedral cluster, a sphere-like arrangement with twenty crystalline wedges and fivefold symmetry. Because the internal lattice is ordered, each cluster scatters light at a single wavelength while transmitting all others, producing vivid structural color (blue, green, or red depending on particle diameter) from geometry alone, without chemical dyes.

Shape controls more than color. Semiconductor nanocrystals shaped like tetrapods, four-armed particles resembling jacks, form electrically conductive networks at far lower concentrations than spheres. Their arms reach more neighbors with fewer particles, reducing the number of hops an electron must take across the network. CdSe tetrapods with 90 nm arms achieve seven times the conductivity of spherical nanocrystals at the same volume fraction, making them candidates for flexible thin-film electronics.

At still smaller scales, gold nanoparticles tracked in real time inside a graphene microscopy cell reveal that Brownian motion, the random thermal motion of suspended particles, departs from textbook predictions at the nanoscale. Average displacements grow as expected, but individual steps are occasionally much larger or smaller than the average, because each particle's local environment fluctuates as surrounding water molecules rearrange. When two nanoparticles collide, they do not merge immediately but form a transient contact pair and must rotate into crystallographic alignment before fusing.`,
    descriptionKo: `수천 개의 실리카 입자를 천천히 수축하는 액적 안에 가두면, 20개의 결정성 쐐기와 5회 대칭을 가진 구형 배열인 정이십면체 클러스터로 조립된다. 내부 격자가 질서 정연하여 하나의 파장에서만 빛을 산란하고 나머지를 투과시키며, 화학 염료 없이 입자 지름에 따라 파란색·초록색·빨간색의 선명한 구조색을 기하학만으로 만들어 낸다.

형상이 제어하는 것은 색만이 아니다. 사족형 반도체 나노결정, 잭스 놀이 도구를 닮은 네 팔 입자는 구형 입자보다 훨씬 낮은 농도에서 전기 전도 네트워크를 형성한다. 팔이 더 적은 수의 입자로 더 많은 이웃에 도달하여 전자가 네트워크를 통해 호핑하는 단계가 줄어든다. 90 nm 팔을 가진 CdSe 사족형은 같은 부피 분율의 구형 나노결정 대비 7배 높은 전도도를 보여, 유연한 박막 전자 소자의 후보가 된다.

더 작은 규모에서, 그래핀 현미경 셀 안에서 실시간 추적한 금 나노입자는 브라운 운동(부유 입자의 무작위 열운동)이 나노 규모에서 교과서 예측에서 벗어남을 보여준다. 평균 변위는 예상대로 증가하지만, 주변 물 분자가 재배열되면서 각 입자의 국소 환경이 요동치기 때문에 개별 걸음이 간혹 평균보다 훨씬 크거나 작다. 두 나노입자가 충돌하면 바로 합쳐지지 않고 일시적 접촉 쌍을 이루어, 결정학적 정렬을 이룬 후에야 융합한다.`,
    icon: "Orbit",
    color: "#f43f5e",
    gridSpan: [1, 1],
    tags: ["Colloidal Dynamics"],
  },
  {
    id: "glass",
    title: "Glass Transition & Microrheology",
    titleKo: "유리 전이 및 미시유변학",
    tagline:
      "Probing the mechanical properties of glasses one particle at a time",
    taglineKo:
      "단일 입자 수준에서 밝히는 유리의 역학 물성",
    description: `When a liquid is cooled fast enough to avoid crystallization, it becomes a glass: still disordered like a liquid but mechanically rigid like a solid. Understanding why and how this transition occurs remains one of the oldest unsolved problems in condensed matter physics. Conventional mechanical testing applies force to the entire sample, which averages over all local environments and can even rejuvenate the glass by injecting energy, obscuring the very features researchers want to study.

Active microrheology takes a different approach. A single nanoscale probe particle is pulled through the glass at a controlled speed, and the resistance it encounters encodes the glass transition directly. Above a certain temperature the probe slides freely; below it, a threshold force is needed to dislodge the probe from its cage of neighboring particles. The transition between these two regimes shows the hallmarks of a continuous phase transition, with systematic scaling behavior and well-defined critical properties. Conventional bulk measurements cannot resolve it because the applied force itself partially melts the glass.

Analyzing the probe's friction signal over time reveals two distinct relaxation processes: a fast rattling within the local cage of neighbors and a slow cooperative rearrangement involving many surrounding particles. As the glass cools further, these cooperative regions grow in size, providing direct evidence that different regions of a glass relax at dramatically different rates. This is a central prediction of the dynamical heterogeneity hypothesis, one that bulk experiments can only infer indirectly.`,
    descriptionKo: `액체를 결정화를 피할 만큼 빠르게 냉각하면 유리가 된다. 액체처럼 무질서하지만 고체처럼 역학적으로 강한 상태이다. 이 전이가 왜, 어떻게 일어나는지 이해하는 것은 응집물질물리학에서 가장 오래된 미해결 문제 중 하나이다. 통상적 역학 시험은 시료 전체에 힘을 가하므로 모든 국소 환경을 평균화하고, 에너지를 공급하여 유리를 회춘시킬 수도 있어 관찰하려는 바로 그 특성을 가리게 된다.

능동 미시유변학은 다른 접근을 취한다. 단일 나노 규모 탐침 입자를 제어된 속도로 유리 안에서 끌어 저항을 측정하면, 이 저항이 유리 전이를 직접 반영한다. 특정 온도 위에서는 탐침이 자유롭게 미끄러지고, 그 아래에서는 이웃 입자들의 우리에서 탐침을 빼내기 위한 문턱 힘이 필요하다. 이 두 영역 사이의 전이는 연속적 상전이의 특징, 즉 체계적인 스케일링 거동과 잘 정의된 임계 성질을 보인다. 통상적 벌크 측정은 가해진 힘 자체가 유리를 부분적으로 녹이므로 이 전이를 분해할 수 없다.

시간에 따른 탐침의 마찰 신호를 분석하면 두 가지 구별되는 완화 과정이 드러난다: 이웃 입자로 이루어진 국소 우리 안에서의 빠른 진동과, 주변 많은 입자가 관여하는 느린 협동적 재배열이다. 유리가 더 냉각될수록 이 협동적 영역의 크기가 커지며, 이는 유리의 서로 다른 영역이 극적으로 다른 속도로 완화된다는 동역학적 비균질성 가설의 직접적 증거이다. 벌크 실험으로는 간접적으로만 추론할 수 있는 현상이다.`,
    icon: "Atom",
    color: "#06b6d4",
    gridSpan: [1, 1],
    tags: ["Metallic Glass"],
  },
  {
    id: "hydrogel",
    title: "Hydrogel Physics & Mechanics",
    titleKo: "하이드로겔 물리 및 역학",
    tagline:
      "Predicting how polymer network structure controls gel stiffness and thermal response",
    taglineKo:
      "고분자 네트워크 구조가 겔의 강성과 열적 응답을 제어하는 원리 예측",
    description: `Injectable drug delivery systems need a material that flows as a liquid through a syringe but solidifies once inside the body. Hydrogels, three-dimensional polymer networks swollen with water, can do exactly this, and their softness lets them conform to living tissue while remaining strong enough to hold their shape. The central challenge is predicting stiffness from the molecular recipe: the density of crosslinks (chemical bonds connecting polymer chains into a network), the stiffness of those chains, and how much water the network absorbs.

Our coarse-grained simulations of polyacrylamide gels, a widely used model system, reproduce experimentally measured stiffness values and reveal that swelling reduces chain entanglements nonlinearly: doubling the water content does more than halve the stiffness. Gels shaped before crosslinking can develop direction-dependent elasticity, becoming stiffer along one axis than another. This property is absent in flat gels and potentially useful for tissue scaffolds that must match the directional stiffness of biological tissue.

Thermoresponsive PLGA-PEG-PLGA triblock copolymer hydrogels offer a particularly elegant design route. The polymer dissolves at room temperature but forms a gel near body temperature: liquid during injection, solid in the body. Whether gelation is sharp or gradual depends on the arrangement of building blocks along the polymer backbone. Uniform blocks produce a sharp transition and a stiffer gel; randomly mixed blocks produce a gradual transition and a softer gel.`,
    descriptionKo: `주사형 약물 전달 시스템에는 주사기를 통과할 때는 액체로 흐르지만 체내에 들어가면 굳는 소재가 필요하다. 하이드로겔, 즉 물로 팽윤된 3차원 고분자 네트워크가 바로 이 역할을 할 수 있으며, 유연하여 생체 조직에 맞으면서도 형태를 유지할 만큼 강하다. 핵심 과제는 분자 수준 제조법, 즉 가교 밀도(고분자 사슬을 네트워크로 연결하는 화학 결합의 밀도), 사슬의 강성, 네트워크가 흡수하는 물의 양으로부터 강성을 예측하는 것이다.

폴리아크릴아마이드 겔(널리 사용되는 모형 시스템)의 조대화 시뮬레이션은 실험 측정 강성을 재현하며, 팽윤이 사슬 얽힘을 비선형적으로 감소시킴을 보인다: 물 함량을 두 배로 늘리면 강성이 절반 이상으로 떨어진다. 가교 전에 형태를 잡은 겔은 한 축으로 다른 축보다 더 단단한 방향 의존적 탄성을 보이며, 이는 평평한 겔에서는 나타나지 않고 생체 조직의 방향성 강성에 맞춰야 하는 조직 스캐폴드에 유용할 수 있다.

PLGA-PEG-PLGA 삼중블록 공중합체 기반 온도감응성 하이드로겔은 특히 우아한 설계 경로를 제공한다. 고분자는 실온에서 녹아 있다가 체온 근처에서 겔을 형성하여, 주사 시에는 액체이고 체내에서는 고체이다. 겔화가 날카롭게 일어나느냐 서서히 일어나느냐는 고분자 주쇄를 따른 구성 단위의 배열에 달려 있다: 균일한 블록은 날카로운 전이와 단단한 겔을, 무작위 혼합은 점진적 전이와 약한 겔을 만든다.`,
    icon: "FlaskConical",
    color: "#10b981",
    gridSpan: [1, 1],
    tags: ["Hydrogel"],
  },
  {
    id: "misc",
    title: "Misc.",
    titleKo: "기타",
    tagline: "Cross-cutting and collaborative work",
    taglineKo: "학제간 공동 연구",
    description: `Publications that span multiple research areas or represent collaborative contributions to fields outside the lab's primary focus. These include a review article surveying how experimental and computational methods provide complementary views of macromolecular self-assembly across dendrimers, star polymers, and bottlebrush polymers; computational support for stretchable bioelectronic devices (Ag-Au core-sheath nanowire composites); thermodynamic modeling of perovskite thin film patterning for image sensor arrays; and luminescent solar concentrator development.`,
    descriptionKo: `여러 연구 주제에 걸치거나 외부 공동연구로 발표한 논문이다. 덴드리머·성형 고분자·병솔형 고분자의 자기조립을 실험과 시뮬레이션 양쪽에서 조망한 리뷰 논문, 신축성 생체전자 소자(Ag-Au 코어-쉘 나노와이어 복합체)의 전산 해석, 이미지 센서 배열용 페로브스카이트 박막 패터닝의 열역학적 모형화, 발광 태양광 집광기 개발 등을 포함한다.`,
    icon: "FlaskConical",
    color: "#9ca3af",
    gridSpan: [1, 1],
    tags: [],
    kind: "misc",
  },
  {
    id: "future",
    title: "Ongoing & Future Topics",
    titleKo: "진행 중 및 향후 연구 주제",
    tagline: "Current and planned research directions",
    taglineKo: "현재 진행 중이거나 계획된 연구 방향",
    description: `- **HfO₂ ferroelectric switching**: Hafnium oxide is a ferroelectric material, one whose electrical polarization can be reversed by an applied field, like a nanoscale switch. It is under consideration for replacing conventional memory capacitor dielectrics and for neuromorphic (brain-inspired) computing elements. We study the molecular-level mechanisms of this polarization switching.
- **Grotthuss mechanism under confinement**: Protons in water can move by hopping along chains of hydrogen bonds rather than traveling as intact molecules, a relay process called the Grotthuss mechanism. We study how this transport changes when water is confined to nanometer-scale channels, a question relevant to fuel cell membranes and biological ion channels.
- **Machine learning coarse-grained force fields**: Developing neural network models that learn simplified particle-to-particle interactions directly from detailed atomistic simulations, making it possible to simulate larger systems over longer times while retaining the accuracy of the underlying atomic-level physics.
- **Ab initio explanation of operando conditions**: Most quantum-mechanical simulations assume zero temperature and vacuum, conditions far from reality. We use first-principles calculations to model chemical processes under the temperatures, pressures, and electric fields present during actual device operation.
- **Surface reactions at liquid metal interfaces**: Studying reactivity at the boundary between liquid metals and their environment, relevant to heterogeneous catalysis, corrosion, and emerging liquid metal battery technologies.`,
    descriptionKo: `- **HfO₂ 강유전 스위칭**: 하프늄 산화물은 외부 전기장으로 전기 분극을 반전시킬 수 있는 강유전 물질로, 나노 규모 스위치처럼 작동한다. 기존 메모리 커패시터 유전체의 대체재이자 뉴로모픽(뇌 모사) 컴퓨팅 소자 후보로 검토되고 있으며, 이 분극 스위칭의 분자 수준 메커니즘을 연구한다.
- **구속 환경에서의 그로투스 메커니즘**: 물 속 양성자는 온전한 분자로 이동하는 대신 수소결합 사슬을 따라 호핑으로 이동할 수 있는데, 이 릴레이 과정을 그로투스 메커니즘이라 한다. 물이 나노미터 규모 채널에 구속될 때 이 수송이 어떻게 변하는지 연구하며, 연료전지 막과 생물학적 이온 채널에 관련된다.
- **기계학습 조대화 힘장**: 상세한 원자 수준 시뮬레이션에서 단순화된 입자 간 상호작용을 직접 학습하는 신경망 모형 개발. 원자 수준 물리의 정확도를 유지하면서 더 큰 시스템을 더 긴 시간에 걸쳐 시뮬레이션할 수 있게 한다.
- **작동 조건의 제일원리 설명**: 대부분의 양자역학 시뮬레이션은 0 K 진공을 가정하며, 이는 현실과 동떨어진 조건이다. 제일원리 계산으로 실제 소자 작동 중의 온도, 압력, 전기장 하에서 일어나는 화학 과정을 모형화한다.
- **액체 금속 계면에서의 표면 반응**: 액체 금속과 주변 환경 사이 경계에서의 반응성 연구. 비균일 촉매, 부식, 신규 액체 금속 배터리 기술에 관련된다.`,
    icon: "Orbit",
    color: "#a855f7",
    gridSpan: [2, 1],
    tags: [],
    kind: "future",
  },
];
