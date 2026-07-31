import type { ResearchTopic } from "@/types/topic";

export const topics: ResearchTopic[] = [
  {
    id: "self-assembly",
    title: "Polymer-Grafted Nanoparticles & Brush Physics",
    titleKo: "고분자 접합 나노입자와 브러시 물리",
    tagline:
      "How the polymer coating on a nanoparticle decides the pattern it forms",
    taglineKo: "나노입자를 감싼 고분자 코팅이 입자의 배열을 정하는 원리",
    description: `A nanoparticle is a solid grain thousands of times smaller than the width of a hair. Polymers, long chain-shaped molecules, can be attached to its surface, and when many chains are attached they stand out like the bristles of a brush; this layer is called a polymer brush. Particles carrying such brushes gather into regular arrangements, and the arrangement changes with the state of the brush.

We study which properties of the brush determine how the particles arrange, using simulations that represent every attached chain. The balance between the dense inner part of the brush and the sparse outer part sets an effective size for each particle, and this size decides whether the particles stack loosely or densely. Attaching a single branched, bottlebrush-shaped chain breaks the particle's symmetry and produces flat, two-dimensional arrangements that uniform coatings cannot make.

A polymer brush also creates forces between objects placed inside it. When two objects sit close together, the chains pushed out of the gap between them produce a force that can pull the objects together or apart, and we calculate how this force changes with the height of the brush. The same kind of force is thought to help gather proteins in the polymer layer that covers living cells. We also study block copolymers, chains made of two different polymers joined into one, which separate on their own into regular nanometer-scale patterns; our simulations follow how these patterns form, including short-lived intermediate stages that experiments have difficulty catching.`,
    descriptionKo: `나노입자는 머리카락 굵기보다 수천 배 작은 고체 알갱이다. 그 표면에는 사슬 모양의 분자인 고분자를 붙일 수 있는데, 사슬 여러 가닥이 붙으면 솔처럼 뻗어 나온 층이 생긴다. 이 층을 고분자 브러시라고 한다. 브러시를 단 입자들은 서로 모여 규칙적인 배열을 이루며, 배열의 모양은 브러시의 상태에 따라 달라진다.

우리는 사슬 하나하나를 그대로 반영한 시뮬레이션으로 브러시의 어떤 성질이 입자의 배열을 정하는지 연구한다. 표면 가까이의 촘촘한 부분과 바깥쪽의 성긴 부분이 이루는 균형이 입자의 유효 크기를 정하고, 이 크기에 따라 입자가 성기게 쌓일지 빽빽하게 쌓일지 갈린다. 여러 갈래로 가지 친 병솔 모양 사슬 하나만 붙이면 입자의 대칭이 깨져, 균일한 코팅으로는 나오지 않는 평면 배열이 만들어진다.

고분자 브러시는 그 안에 놓인 물체들 사이에 힘도 만든다. 두 물체가 가까이 놓이면 좁은 틈에서 밀려난 사슬 때문에 서로 당기거나 미는 힘이 생기고, 우리는 이 힘이 브러시 높이에 따라 어떻게 변하는지 계산한다. 살아 있는 세포를 덮은 고분자 층이 단백질을 한데 모으는 현상도 같은 종류의 힘으로 설명된다. 서로 다른 두 고분자를 하나로 이어 붙인 블록 공중합체도 연구한다. 이 사슬은 저절로 나노미터 규모의 규칙적인 무늬로 나뉘는데, 시뮬레이션으로 무늬가 만들어지는 과정과 실험으로는 붙잡기 어려운 짧은 중간 단계를 따라간다.`,
    icon: "Hexagon",
    color: "#f59e0b",
    gridSpan: [2, 2],
    tags: ["Self-Assembly", "Polymer Brush", "Polymer Physics"],
  },
  {
    id: "aqueous-solution",
    title: "Machine-Learning Force Fields for Water & Reactions",
    titleKo: "물과 반응을 위한 머신러닝 역장",
    tagline:
      "Machine-learning force fields for water, ions, and chemical reactions",
    taglineKo: "물·이온·화학 반응을 계산하는 머신러닝 역장",
    description: `Dissolving salt in water changes how the water molecules move. Some salts slow the water down and others speed it up, and why this happens has long gone unexplained. Molecular simulations run on a set of rules for how atoms push and pull on one another, called a force field, and the simple force fields in common use do not reproduce these salt effects correctly.

We study how water and the ions dissolved in it move, and how chemical reactions proceed in water. For this we use machine-learning force fields trained on quantum-mechanical calculations, which are accurate yet fast enough to follow many molecules for a long time, capturing the subtle ways groups of water molecules move together. These force fields reproduce the measured differences between salts that speed water up and salts that slow it down, and the cause lies in the collective motion of many molecules at once. When water fills in around a dissolved aluminum ion, for example, the incoming molecule skips the water right next to the ion and arrives from farther out, carried by several molecules moving in step.

The same approach extends to chemical reactions. We study how organic matter decomposes in supercritical water, a hot, high-pressure form of water, and how water responds to electric fields.`,
    descriptionKo: `물에 소금을 녹이면 물 분자의 움직임이 달라진다. 어떤 소금은 물을 더 느리게, 어떤 소금은 더 빠르게 움직이게 하는데, 왜 그런지는 오랫동안 제대로 설명되지 않았다. 분자 시뮬레이션은 원자들이 서로 밀고 당기는 방식을 정해 놓은 규칙을 바탕으로 돌아가며, 이 규칙을 역장이라고 한다. 지금까지 널리 쓰인 간단한 역장은 이 소금 효과를 정확히 재현하지 못한다.

우리는 물과 그 속에 녹은 이온이 어떻게 움직이는지, 그리고 물속에서 화학 반응이 어떻게 일어나는지 연구한다. 이를 위해 양자역학 계산 결과를 학습시킨 머신러닝 역장을 쓰는데, 정확하면서도 많은 분자를 오래 계산할 수 있어 물 분자 여럿이 함께 움직이는 미세한 차이까지 담아낸다. 이 역장은 소금 종류에 따라 물이 빨라지거나 느려지는 실험 결과를 재현하며, 그 원인은 물 분자들이 무리 지어 움직이는 방식에 있다. 예를 들어 알루미늄 이온 주위에 물 분자가 채워질 때, 바로 옆의 물을 건너뛰고 조금 떨어진 물이 여러 분자의 동시 움직임에 실려 들어온다.

같은 방법은 화학 반응으로도 이어진다. 고온·고압의 특수한 물인 초임계수에서 유기물이 분해되는 과정과, 물이 전기장에 반응하는 방식을 연구한다.`,
    icon: "Droplets",
    color: "#3b82f6",
    gridSpan: [1, 1],
    tags: ["Water", "Dissolution", "MLFF"],
  },
  {
    id: "glass",
    title: "Glass Transition & Microrheology",
    titleKo: "유리 전이와 미시유변학",
    tagline: "Molecular-level structure and dynamics of glassy materials",
    taglineKo: "유리 물질의 구조와 동역학을 분자 수준에서 이해하기",
    description: `When most liquids cool slowly, their atoms line up into an orderly solid, the way salt or a metal does; this is a crystal. If the cooling is fast enough, the atoms freeze in place before they can line up, leaving a disordered solid. That is a glass, and window glass and hard plastics are everyday examples. Why a glass can be as disordered as a liquid and as rigid as a solid is not yet fully understood.

We characterize glassy materials and work toward a theoretical and physicochemical understanding of their structure and dynamics at the level of atoms and molecules, combining molecular dynamics simulation with machine-learning techniques. One of our methods is active microrheology: a single particle is moved through the glass while its interaction with the surrounding material is recorded (for example, the force on it when dragged at a constant speed), giving information about the interior. Conventional measurements press on the whole sample at once, washing out regional differences and deforming the glass; this method avoids both problems.

Measured this way, the particle passes easily through the glass at higher temperatures, but below a certain temperature it is caught by its neighbors and moves only under large force. This boundary corresponds to the temperature at which a liquid becomes a glass. The interior of a glass is also not uniform: regions that move quickly and regions that move slowly coexist, and the slow regions widen as the temperature falls.`,
    descriptionKo: `물질을 이루는 원자나 분자는 천천히 식으면 대개 규칙적으로 줄을 맞춰 단단한 고체가 된다. 이것을 결정이라 하고, 소금이나 금속이 여기에 해당한다. 반면 아주 빠르게 식히면 원자가 줄을 맞추지 못하고 흐트러진 상태로 굳는다. 이렇게 무질서하게 굳은 고체를 유리라 하며, 창유리나 단단한 플라스틱이 이에 속한다. 유리가 액체처럼 무질서하면서도 고체처럼 단단한 이유는 아직 충분히 밝혀지지 않았다.

우리는 유리 물질의 특성을 규명하고, 원자·분자 수준의 구조와 동역학을 이론과 물리화학으로 이해하려 한다. 분자동역학 시뮬레이션과 머신러닝 기법을 함께 쓰며, 그중 한 가지 방법이 능동 미시유변학이다. 유리 속에서 입자 하나를 움직이며, 입자가 유리와 주고받는 상호작용(예를 들어 일정한 속도로 끌 때 받는 힘)을 기록해 유리 내부의 정보를 얻어낸다. 기존 측정법은 시료 전체에 힘을 가해 부분별 차이를 뭉개고 유리 자체를 변형시키는데, 이 방법은 그런 한계를 피한다.

이 방법으로 재면 온도가 높을 때는 입자가 유리 속을 쉽게 지나가지만, 어느 온도 아래에서는 이웃 입자에 붙들려 큰 힘을 줘야 움직인다. 이 경계가 액체가 유리로 바뀌는 온도에 해당한다. 굳은 유리는 내부도 균일하지 않아서, 빠르게 움직이는 부분과 느리게 움직이는 부분이 함께 있고 느린 부분은 온도가 낮아질수록 넓어진다.`,
    icon: "Atom",
    color: "#06b6d4",
    gridSpan: [1, 1],
    tags: ["Metallic Glass"],
  },
  {
    id: "colloidal-dynamics",
    title: "Colloidal Structure, Transport & Optics",
    titleKo: "콜로이드의 구조·수송·광학",
    tagline:
      "How the shape and packing of tiny particles produce color, conductivity, and motion",
    taglineKo: "작은 입자의 모양과 배열이 색·전도·움직임을 만드는 방식",
    description: `A colloid is a liquid with very small particles scattered through it; milk and paint are familiar examples. The properties of such particles depend not only on what they are made of but also on their shape and on how they gather.

We study, together with experimental groups, what structures colloidal particles form, how they move, and how they interact with light and electricity. Thousands of small spheres trapped in a slowly shrinking droplet gather into a regular cluster, and because the cluster reflects only one color of light, it shows vivid blue, green, or red depending on the size of the spheres, without any pigment. Semiconductor particles shaped like four-armed stars form an electrically conducting network with far less material than round particles, because the arms reach neighbors easily and complete paths for the current; this property is useful for bendable electronic devices.

At a smaller scale, we analyze the motion of individual gold nanoparticles alongside real-time imaging experiments. At this size the motion departs from the textbook prediction: the distance moved varies from moment to moment as the surroundings change, and two colliding particles align their orientation before merging into one.`,
    descriptionKo: `액체 속에 아주 작은 입자가 흩어져 떠 있는 상태를 콜로이드라고 한다. 우유나 물감이 그런 예다. 이런 입자의 성질은 무엇으로 만들어졌는지뿐 아니라 입자의 모양과 모이는 방식에도 달려 있다.

우리는 콜로이드 입자가 어떤 구조로 모이고, 어떻게 움직이고, 빛·전기와 어떻게 상호작용하는지를 실험 그룹과 함께 시뮬레이션으로 연구한다. 작은 구슬 수천 개를 천천히 줄어드는 물방울 안에 가두면 규칙적인 덩어리로 모이는데, 이 덩어리는 한 가지 색의 빛만 반사해 색소 없이도 구슬 크기에 따라 파랑·초록·빨강의 선명한 색을 낸다. 팔이 네 개 달린 별 모양 반도체 입자는 둥근 입자보다 훨씬 적은 양으로 전기가 통하는 그물을 이룬다. 팔이 이웃에 잘 닿아 전기가 지나갈 길이 쉽게 이어지기 때문이며, 이 성질은 휘어지는 전자 소자에 쓸 수 있다.

더 작은 규모에서는 금 나노입자 하나하나의 움직임을 실시간 관찰 실험과 함께 분석한다. 이 크기에서는 입자의 움직임이 교과서의 예측과 어긋난다. 주변 환경이 순간순간 바뀌면서 이동 폭이 그때그때 달라지고, 두 입자가 부딪히면 서로 방향을 맞춘 뒤에야 하나로 합쳐진다.`,
    icon: "Orbit",
    color: "#f43f5e",
    gridSpan: [1, 1],
    tags: ["Colloidal Dynamics"],
  },
  {
    id: "hydrogel",
    title: "Hydrogel Mechanics",
    titleKo: "하이드로겔 역학",
    tagline:
      "Predicting how soft, water-filled gels set and how firm they become",
    taglineKo: "물을 머금은 부드러운 겔이 굳는 과정과 단단함을 예측하기",
    description: `A hydrogel is a network of polymer chains holding a large amount of water; jelly and contact lenses are made of such material. A gel for delivering drugs must flow like a liquid through a needle and then set inside the body. How firm the gel becomes depends on the makeup of the network: how tightly the chains are tied together and how much water the network holds.

We predict the properties of a gel from the makeup of its network, using simulations that group several molecules into single units. For polyacrylamide, a common gel, the calculations reproduce the firmness measured in experiments, and the more water the gel holds, the faster it softens. A gel shaped before it sets becomes firmer in one direction than another, a property useful for scaffolds that stand in for body tissue.

In a temperature-sensitive gel called PLGA-PEG-PLGA, whether it sets sharply or gradually depends on the order of the building blocks along the chain. This order is hard to control in ordinary synthesis, and it changes how fast a drug is released in the body.`,
    descriptionKo: `하이드로겔은 물을 많이 머금은 고분자 그물로, 젤리나 콘택트렌즈가 이런 소재다. 약물 전달에 쓰는 겔은 주삿바늘을 지날 때는 액체처럼 흐르다가 몸 안에서는 굳어야 한다. 겔이 얼마나 단단해지는지는 그물의 짜임새에 달려 있다. 사슬을 얼마나 촘촘히 엮었는지, 물을 얼마나 머금는지가 여기에 관여한다.

우리는 분자 여러 개를 한 단위로 묶어 단순화한 시뮬레이션으로, 그물의 짜임새로부터 겔의 성질을 예측한다. 폴리아크릴아마이드라는 대표적인 겔을 계산하면 실험에서 잰 단단함이 재현되고, 물을 많이 머금을수록 겔은 그보다 빠르게 물러진다. 굳기 전에 미리 형태를 잡은 겔은 방향에 따라 단단함이 달라지는데, 이 성질은 생체 조직을 대신하는 지지체에 쓸모가 있다.

온도에 반응하는 PLGA-PEG-PLGA라는 겔에서는, 겔이 급하게 굳는지 천천히 굳는지가 사슬을 따라 늘어선 구성 단위의 순서에 달려 있다. 이 순서는 보통의 합성으로는 조절하기 어렵지만, 약물이 몸속에서 풀려나는 속도를 바꾼다.`,
    icon: "FlaskConical",
    color: "#10b981",
    gridSpan: [1, 1],
    tags: ["Hydrogel"],
  },
  {
    id: "misc",
    title: "Misc.",
    titleKo: "기타",
    tagline: "Collaborative simulation and theory in materials and devices",
    taglineKo: "소재·소자 분야의 공동 시뮬레이션과 이론",
    description: `Outside the lab's main themes, we contribute simulation and theory to experiment-led collaborations. These include a stretchable silver-gold nanowire composite for wearable and implantable electronics, the patterning of perovskite films for image sensors, and a transparent light-collecting material for solar energy.`,
    descriptionKo: `연구실의 주요 주제 밖에서, 실험 중심의 공동 연구에 시뮬레이션과 이론으로 참여한 작업이다. 몸에 착용하거나 이식하는 전자소자를 위한 신축성 은·금 나노선 복합체, 이미지 센서를 만들기 위한 페로브스카이트 박막의 패턴 형성, 빛을 모으는 투명한 태양광 소재 등이 여기에 해당한다.`,
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
- **Ab initio modeling under operando conditions**: Most quantum-mechanical simulations assume zero temperature and vacuum, conditions far from reality. We use first-principles calculations to model chemical processes under the temperatures, pressures, and electric fields present during actual device operation.
- **Surface reactions at liquid metal interfaces**: Studying reactivity at the boundary between liquid metals and their environment, relevant to heterogeneous catalysis, corrosion, and emerging liquid metal battery technologies.`,
    descriptionKo: `- **HfO₂ 강유전 스위칭**: 하프늄 산화물은 외부 전기장으로 전기 분극을 반전시킬 수 있는 강유전 물질로, 나노 규모 스위치처럼 작동한다. 기존 메모리 커패시터 유전체의 대체재이자 뉴로모픽(뇌 모사) 컴퓨팅 소자 후보로 검토되고 있으며, 이 분극 스위칭의 분자 수준 메커니즘을 연구한다.
- **구속 환경에서의 그로투스 메커니즘**: 물 속 양성자는 수소결합 사슬을 따라 호핑으로 이동할 수 있다. 분자 하나가 통째로 움직이지 않고 결합을 따라 양성자만 차례로 전달되는 릴레이 과정이며, 이를 그로투스 메커니즘이라 한다. 물이 나노미터 규모 채널에 구속될 때 이 수송이 어떻게 변하는지 연구한다. 연료전지 막과 생물학적 이온 채널에 직결되는 문제이다.
- **머신러닝 조대화 역장**: 상세한 원자 수준 시뮬레이션에서 단순화된 입자 간 상호작용을 직접 학습하는 신경망 모형 개발. 원자 수준 물리의 정확도를 유지하면서 더 큰 시스템을 더 긴 시간에 걸쳐 시뮬레이션할 수 있게 한다.
- **작동 조건의 제일원리 모형화**: 대부분의 양자역학 시뮬레이션은 현실과 동떨어진 0 K 진공을 가정한다. 제일원리 계산으로 실제 소자 작동 중의 온도, 압력, 전기장 하에서 일어나는 화학 과정을 모형화한다.
- **액체 금속 계면에서의 표면 반응**: 액체 금속과 주변 환경이 맞닿는 경계에서 일어나는 반응성 연구. 불균일 촉매, 부식, 신규 액체 금속 배터리 기술과 맞닿아 있다.`,
    icon: "Orbit",
    color: "#a855f7",
    gridSpan: [2, 1],
    tags: [],
    kind: "future",
  },
];
