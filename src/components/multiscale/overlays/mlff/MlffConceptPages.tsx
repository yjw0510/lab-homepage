"use client";

type MlffConceptPageProps = {
  ko: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
};

type AtomKind = "C" | "N" | "O" | "H";

type Atom = {
  x: number;
  y: number;
  kind: AtomKind;
  r?: number;
};

const ATOM_FILL: Record<AtomKind, string> = {
  C: "#94a3b8",
  N: "#6366f1",
  O: "#fb7185",
  H: "#f8fafc",
};

const MOLECULE_CONFIGS: Atom[][] = [
  [
    { x: 24, y: 48, kind: "C", r: 7 },
    { x: 48, y: 31, kind: "N", r: 8 },
    { x: 74, y: 43, kind: "C", r: 7 },
    { x: 97, y: 27, kind: "H", r: 5 },
    { x: 101, y: 60, kind: "O", r: 7 },
    { x: 48, y: 61, kind: "H", r: 5 },
  ],
  [
    { x: 22, y: 38, kind: "C", r: 7 },
    { x: 49, y: 43, kind: "N", r: 8 },
    { x: 75, y: 27, kind: "C", r: 7 },
    { x: 95, y: 47, kind: "H", r: 5 },
    { x: 72, y: 62, kind: "O", r: 7 },
    { x: 49, y: 70, kind: "H", r: 5 },
  ],
  [
    { x: 27, y: 59, kind: "C", r: 7 },
    { x: 48, y: 37, kind: "N", r: 8 },
    { x: 77, y: 40, kind: "C", r: 7 },
    { x: 96, y: 20, kind: "H", r: 5 },
    { x: 103, y: 51, kind: "O", r: 7 },
    { x: 45, y: 68, kind: "H", r: 5 },
  ],
  [
    { x: 22, y: 29, kind: "C", r: 7 },
    { x: 51, y: 36, kind: "N", r: 8 },
    { x: 75, y: 55, kind: "C", r: 7 },
    { x: 103, y: 50, kind: "H", r: 5 },
    { x: 72, y: 76, kind: "O", r: 7 },
    { x: 49, y: 66, kind: "H", r: 5 },
  ],
];

const MOLECULE_BONDS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
  [1, 5],
];

function StageHeading({
  title,
  detail,
  centered = false,
}: {
  title: string;
  detail?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : "text-left"}>
      <p className="text-sm font-semibold leading-5 text-slate-100">{title}</p>
      {detail ? (
        <p className="mt-0.5 text-xs leading-4 text-slate-400">{detail}</p>
      ) : null}
    </div>
  );
}

function MiniMolecule({
  variant,
  className = "h-full w-full",
  embedded = false,
}: {
  variant: number;
  className?: string;
  embedded?: boolean;
}) {
  const atoms = MOLECULE_CONFIGS[variant % MOLECULE_CONFIGS.length];
  return (
    <svg
      viewBox="0 0 124 88"
      className={embedded ? undefined : className}
      width={embedded ? 124 : undefined}
      height={embedded ? 88 : undefined}
      aria-hidden="true"
    >
      {MOLECULE_BONDS.map(([left, right], index) => (
        <line
          key={`bond-${index}`}
          x1={atoms[left].x}
          y1={atoms[left].y}
          x2={atoms[right].x}
          y2={atoms[right].y}
          stroke="#cbd5e1"
          strokeOpacity="0.58"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      {atoms.map((atom, index) => {
        const radius = atom.r ?? 6;
        return (
          <g key={`atom-${index}`}>
            <circle
              cx={atom.x}
              cy={atom.y}
              r={radius + 2.5}
              fill={ATOM_FILL[atom.kind]}
              fillOpacity="0.12"
            />
            <circle cx={atom.x} cy={atom.y} r={radius} fill={ATOM_FILL[atom.kind]} />
            <circle
              cx={atom.x - radius * 0.28}
              cy={atom.y - radius * 0.28}
              r={radius * 0.34}
              fill="white"
              fillOpacity="0.42"
            />
          </g>
        );
      })}
    </svg>
  );
}

function FlowConnector({
  vertical,
  reducedMotion,
  id,
}: {
  vertical: boolean;
  reducedMotion: boolean;
  id: string;
}) {
  const markerId = `${id}-arrow`;
  return (
    <svg
      viewBox={vertical ? "0 0 30 34" : "0 0 46 30"}
      className={vertical ? "h-7 w-full" : "h-8 w-full"}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.22" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0.9" />
        </linearGradient>
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 Z" fill="#a78bfa" fillOpacity="0.9" />
        </marker>
      </defs>
      <path
        d={vertical ? "M15 2 V28" : "M3 15 H39"}
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth="2"
        markerEnd={`url(#${markerId})`}
      />
      {!reducedMotion ? (
        <circle r="2.6" fill="#67e8f9">
          <animateMotion
            dur="1.7s"
            repeatCount="indefinite"
            path={vertical ? "M15 2 V27" : "M3 15 H38"}
          />
        </circle>
      ) : null}
    </svg>
  );
}

function NeuralNetworkGlyph({
  compact = false,
  label,
}: {
  compact?: boolean;
  label: string;
}) {
  const layers = compact
    ? [
        { x: 28, ys: [32, 62, 92, 122] },
        { x: 78, ys: [24, 52, 80, 108, 136] },
        { x: 130, ys: [46, 80, 114] },
      ]
    : [
        { x: 27, ys: [28, 58, 88, 118] },
        { x: 82, ys: [20, 46, 72, 98, 124] },
        { x: 137, ys: [34, 70, 106] },
      ];
  const width = compact ? 158 : 168;
  const height = 150;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={compact ? "mlff-nn-compact" : "mlff-nn-overview"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {layers.slice(0, -1).flatMap((layer, layerIndex) =>
        layer.ys.flatMap((y, nodeIndex) =>
          layers[layerIndex + 1].ys.map((nextY, nextIndex) => (
            <line
              key={`${layerIndex}-${nodeIndex}-${nextIndex}`}
              x1={layer.x + 5}
              y1={y}
              x2={layers[layerIndex + 1].x - 5}
              y2={nextY}
              stroke={layerIndex === 0 ? "#22d3ee" : "#a78bfa"}
              strokeOpacity="0.18"
              strokeWidth="1"
            />
          )),
        ),
      )}
      {layers.flatMap((layer, layerIndex) =>
        layer.ys.map((y, nodeIndex) => (
          <g key={`${layerIndex}-${nodeIndex}`}>
            <circle
              cx={layer.x}
              cy={y}
              r="9"
              fill={layerIndex === layers.length - 1 ? "#a78bfa" : "#071426"}
              stroke={`url(#${compact ? "mlff-nn-compact" : "mlff-nn-overview"})`}
              strokeWidth="2.4"
            />
            <circle cx={layer.x - 2.5} cy={y - 2.5} r="2.5" fill="white" fillOpacity="0.32" />
          </g>
        )),
      )}
    </svg>
  );
}

function PesOutputGlyph({ ko, reducedMotion }: { ko: boolean; reducedMotion: boolean }) {
  const arrowId = "mlff-overview-force-arrow";
  return (
    <svg
      viewBox="0 0 330 190"
      className="h-full w-full"
      role="img"
      aria-label={ko ? "학습된 퍼텐셜 에너지면 위의 분자와 예측된 힘" : "molecule and predicted forces on a learned potential energy surface"}
    >
      <defs>
        <linearGradient id="mlff-pes-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="mlff-pes-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#67e8f9" />
        </marker>
        <filter id="mlff-pes-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <path
        d="M8 154 C48 108 81 126 114 147 C151 170 184 117 219 100 C258 81 283 109 326 54 L326 186 L8 186 Z"
        fill="url(#mlff-pes-fill)"
      />
      {[
        "M7 157 C47 111 81 129 114 150 C152 174 184 120 219 103 C258 84 283 112 326 57",
        "M9 168 C50 129 83 144 117 161 C153 179 190 139 224 121 C259 102 291 120 326 83",
        "M15 181 C57 151 95 160 130 174 C168 188 202 158 236 143 C272 127 300 139 326 111",
      ].map((path, index) => (
        <path
          key={path}
          d={path}
          fill="none"
          stroke={index === 0 ? "url(#mlff-pes-stroke)" : "#60a5fa"}
          strokeOpacity={0.7 - index * 0.17}
          strokeWidth={index === 0 ? 2 : 1}
        />
      ))}
      <ellipse cx="228" cy="151" rx="56" ry="17" fill="none" stroke="#a78bfa" strokeOpacity="0.42" />
      <ellipse cx="228" cy="151" rx="34" ry="9" fill="none" stroke="#c4b5fd" strokeOpacity="0.34" />

      <path
        d="M36 151 C87 125 116 126 155 103 C190 82 218 79 252 69"
        fill="none"
        stroke="#67e8f9"
        strokeOpacity="0.8"
        strokeWidth="2.2"
        strokeDasharray="7 6"
        className={reducedMotion ? "" : "animate-signal"}
      />

      <g transform="translate(184 38) scale(.84)">
        <MiniMolecule variant={2} embedded />
      </g>

      {[
        [204, 82, 185, 63],
        [229, 67, 231, 42],
        [252, 78, 274, 59],
        [270, 96, 297, 94],
        [232, 103, 227, 128],
      ].map(([x1, y1, x2, y2], index) => (
        <line
          key={`force-${index}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#67e8f9"
          strokeWidth="2"
          markerEnd={`url(#${arrowId})`}
        />
      ))}

      <circle cx="252" cy="69" r="22" fill="#22d3ee" fillOpacity="0.08" filter="url(#mlff-pes-soft-glow)" />
      <text x="20" y="26" fill="#a5f3fc" fontSize="13" fontWeight="600">
        {ko ? "근사 PES" : "learned PES"}
      </text>
      <text x="267" y="31" fill="#c4b5fd" fontSize="13" fontWeight="600">
        E, F
      </text>
    </svg>
  );
}

export function MlffOverviewFlow({ ko, isMobile, reducedMotion }: MlffConceptPageProps) {
  const connector = (id: string) => (
    <FlowConnector vertical={isMobile} reducedMotion={reducedMotion} id={id} />
  );

  return (
    <div
      className={isMobile ? "flex flex-col gap-2 px-4 py-4" : "grid items-center gap-3 px-5 py-4"}
      style={
        isMobile
          ? undefined
          : { gridTemplateColumns: "minmax(13rem,1.05fr) 2.5rem minmax(9rem,.72fr) 2.5rem minmax(17rem,1.32fr)" }
      }
    >
      <section aria-label={ko ? "DFT 참조 데이터" : "DFT reference data"} className="min-w-0">
        <StageHeading
          title={ko ? "DFT 참조 데이터" : "DFT reference data"}
          detail={ko ? "서로 다른 배치의 에너지와 원자별 힘" : "energies and atomic forces across configurations"}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MOLECULE_CONFIGS.map((_, index) => (
            <div
              key={index}
              className="h-[4.6rem] border border-cyan-200/18 bg-cyan-300/[0.035] px-1.5"
            >
              <MiniMolecule variant={index} />
            </div>
          ))}
        </div>
      </section>

      {connector("mlff-overview-input")}

      <section aria-label={ko ? "머신러닝 역장" : "machine learning force field"} className="min-w-0">
        <StageHeading
          title={ko ? "학습된 MLFF" : "learned MLFF"}
          detail={ko ? "구조에서 퍼텐셜을 학습" : "learn the potential from structure"}
          centered
        />
        <div className={isMobile ? "mx-auto mt-1 h-36 w-44" : "mx-auto mt-2 h-40 w-full max-w-48"}>
          <NeuralNetworkGlyph label={ko ? "층으로 구성된 신경망" : "layered neural network"} />
        </div>
      </section>

      {connector("mlff-overview-output")}

      <section aria-label={ko ? "학습된 퍼텐셜과 분자 운동" : "learned potential and molecular motion"} className="min-w-0">
        <StageHeading
          title={ko ? "PES 위의 분자 운동" : "motion on the learned PES"}
          detail={ko ? "에너지와 힘을 빠르게 평가해 MD를 전개" : "evaluate energy and forces to advance MD"}
        />
        <div className={isMobile ? "mt-1 h-44" : "mt-1 h-48"}>
          <PesOutputGlyph ko={ko} reducedMotion={reducedMotion} />
        </div>
      </section>
    </div>
  );
}

function LocalEnvironmentGlyph({ ko }: { ko: boolean }) {
  const center = { x: 88, y: 86 };
  const neighbors = [
    { x: 43, y: 45, kind: "O" as const },
    { x: 92, y: 30, kind: "H" as const },
    { x: 140, y: 51, kind: "C" as const },
    { x: 147, y: 105, kind: "C" as const },
    { x: 104, y: 138, kind: "H" as const },
    { x: 40, y: 119, kind: "C" as const },
  ];
  return (
    <svg
      viewBox="0 0 180 170"
      className="h-full w-full"
      role="img"
      aria-label={ko ? "차단 반경 안의 원자 중심 국소 환경" : "atom-centered local environment inside a cutoff"}
    >
      <defs>
        <radialGradient id="mlff-local-density">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="0.52" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={center.x} cy={center.y} r="72" fill="url(#mlff-local-density)" stroke="#a5f3fc" strokeOpacity="0.42" strokeDasharray="5 5" />
      {[28, 48, 66].map((radius) => (
        <circle key={radius} cx={center.x} cy={center.y} r={radius} fill="none" stroke="#67e8f9" strokeOpacity={radius === 66 ? 0.12 : 0.2} />
      ))}
      {neighbors.map((atom, index) => (
        <g key={index}>
          <line
            x1={center.x}
            y1={center.y}
            x2={atom.x}
            y2={atom.y}
            stroke="#cbd5e1"
            strokeOpacity="0.36"
            strokeWidth="2"
            strokeDasharray="3 4"
          />
          <circle cx={atom.x} cy={atom.y} r="8" fill={ATOM_FILL[atom.kind]} />
          <circle cx={atom.x - 2} cy={atom.y - 2} r="2.5" fill="white" fillOpacity="0.42" />
        </g>
      ))}
      <circle cx={center.x} cy={center.y} r="15" fill="#22d3ee" fillOpacity="0.16" />
      <circle cx={center.x} cy={center.y} r="10" fill="#38bdf8" />
      <circle cx={center.x - 3} cy={center.y - 3} r="3" fill="white" fillOpacity="0.5" />
      <path d="M139 40 L156 24" stroke="#a5f3fc" strokeWidth="1.5" />
      <text x="143" y="20" fill="#a5f3fc" fontSize="12" fontStyle="italic">r<tspan baselineShift="sub" fontSize="12">cut</tspan></text>
    </svg>
  );
}

function SymmetryVariant({
  label,
  mode,
}: {
  label: string;
  mode: "rotation" | "translation" | "permutation";
}) {
  const transform =
    mode === "rotation"
      ? "rotate(32 44 37)"
      : mode === "translation"
        ? "translate(7 -3)"
        : undefined;
  const outer = mode === "permutation" ? [2, 0, 3, 1] : [0, 1, 2, 3];
  const points = [
    [20, 18],
    [68, 17],
    [69, 56],
    [18, 57],
  ];

  return (
    <div className="border border-white/12 bg-white/[0.025] px-1.5 py-1.5">
      <svg viewBox="0 0 88 72" className="h-14 w-full" aria-hidden="true">
        <g transform={transform}>
          {outer.map((pointIndex, index) => {
            const [x, y] = points[pointIndex];
            return (
              <g key={index}>
                <line x1="44" y1="37" x2={x} y2={y} stroke="#cbd5e1" strokeOpacity="0.34" strokeWidth="1.5" />
                <circle cx={x} cy={y} r="5.5" fill={index === 1 ? "#fb7185" : index === 2 ? "#f8fafc" : "#94a3b8"} />
              </g>
            );
          })}
          <circle cx="44" cy="37" r="8" fill="#38bdf8" />
        </g>
        {mode === "rotation" ? (
          <path d="M23 61 C31 70 53 71 65 60" fill="none" stroke="#67e8f9" strokeWidth="1.4" strokeDasharray="3 3" />
        ) : null}
      </svg>
      <p className="text-center text-xs leading-4 text-slate-300">{label}</p>
    </div>
  );
}

function DescriptorGlyph({ label }: { label: string }) {
  const values = [0.82, 0.55, 0.7, 0.32, 0.93, 0.46, 0.64, 0.76];
  return (
    <svg viewBox="0 0 90 170" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id="mlff-descriptor-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="23" y="9" width="44" height="148" fill="#081426" stroke="#67e8f9" strokeOpacity="0.52" />
      {values.map((value, index) => (
        <g key={index}>
          <rect x="31" y={20 + index * 16} width="28" height="8" fill="white" fillOpacity="0.055" />
          <rect x="31" y={20 + index * 16} width={28 * value} height="8" fill="url(#mlff-descriptor-fill)" fillOpacity="0.9" />
        </g>
      ))}
      <text x="45" y="169" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontStyle="italic">dᵢ</text>
    </svg>
  );
}

function EnergyForcesGlyph({ ko }: { ko: boolean }) {
  const arrowId = "mlff-inside-force-arrow";
  return (
    <svg
      viewBox="0 0 220 180"
      className="h-full w-full"
      role="img"
      aria-label={ko ? "원자별 에너지를 합한 총에너지와 그 기울기에서 얻는 힘" : "total energy assembled from atomic energies and forces derived from its gradient"}
    >
      <defs>
        <marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#67e8f9" />
        </marker>
      </defs>
      <rect x="8" y="8" width="50" height="34" fill="#8b5cf6" fillOpacity="0.13" stroke="#c4b5fd" strokeOpacity="0.6" />
      <text x="33" y="31" textAnchor="middle" fill="#ddd6fe" fontSize="18" fontStyle="italic">eᵢ</text>
      <text x="72" y="30" fill="#94a3b8" fontSize="13">e₁ + e₂ + … + eₙ</text>
      <path d="M33 48 C50 70 74 70 92 79" fill="none" stroke="#a78bfa" strokeOpacity="0.68" strokeWidth="1.6" />
      <path d="M164 39 C143 61 121 67 101 79" fill="none" stroke="#a78bfa" strokeOpacity="0.48" strokeWidth="1.6" />
      <rect x="72" y="70" width="76" height="43" fill="#22d3ee" fillOpacity="0.08" stroke="#67e8f9" strokeOpacity="0.62" />
      <text x="110" y="97" textAnchor="middle" fill="#e0f2fe" fontSize="20" fontWeight="600">E = Σ eᵢ</text>

      <g transform="translate(64 108) scale(.68)">
        <MiniMolecule variant={0} embedded />
      </g>
      {[
        [82, 142, 65, 129],
        [108, 132, 108, 117],
        [132, 140, 149, 127],
        [143, 156, 163, 159],
        [105, 162, 102, 176],
      ].map(([x1, y1, x2, y2], index) => (
        <line
          key={index}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#67e8f9"
          strokeWidth="1.8"
          markerEnd={`url(#${arrowId})`}
        />
      ))}
      <text x="159" y="137" fill="#a5f3fc" fontSize="12" fontStyle="italic">Fᵢ = -∇ᵢE</text>
    </svg>
  );
}

export function MlffInsideFlow({ ko, isMobile, reducedMotion }: MlffConceptPageProps) {
  const connector = (id: string) => (
    <FlowConnector vertical={isMobile} reducedMotion={reducedMotion} id={id} />
  );
  const symmetryLabels = {
    rotation: ko ? "회전" : "rotation",
    translation: ko ? "이동" : "translation",
    permutation: ko ? "원자 순서" : "permutation",
  };

  return (
    <div
      className={isMobile ? "flex flex-col gap-1 px-4 py-3" : "grid items-center gap-2 px-5 py-4"}
      style={
        isMobile
          ? undefined
          : { gridTemplateColumns: "minmax(9rem,1.05fr) 1.5rem minmax(8.5rem,.9fr) 1.5rem minmax(4.8rem,.46fr) 1.5rem minmax(8rem,.82fr) 1.5rem minmax(12rem,1.18fr)" }
      }
    >
      <section className="min-w-0" aria-label={ko ? "원자 중심 국소 환경" : "atom-centered local environment"}>
        <StageHeading
          title={ko ? "원자 중심 국소 환경" : "atom-centered environment"}
          detail={ko ? "차단 반경 안의 이웃 분포" : "neighbor distribution inside the cutoff"}
        />
        <div className={isMobile ? "mx-auto h-40 w-44" : "mt-1 h-44 w-full"}>
          <LocalEnvironmentGlyph ko={ko} />
        </div>
      </section>

      {connector("mlff-inside-local")}

      <section className="min-w-0" aria-label={ko ? "물리 대칭성" : "physical symmetries"}>
        <StageHeading
          title={ko ? "같은 물리는 같은 표현" : "same physics, same representation"}
          centered
        />
        <div className={isMobile ? "mt-2 grid grid-cols-3 gap-1.5" : "mt-2 grid gap-1.5"}>
          <SymmetryVariant label={symmetryLabels.rotation} mode="rotation" />
          <SymmetryVariant label={symmetryLabels.translation} mode="translation" />
          <SymmetryVariant label={symmetryLabels.permutation} mode="permutation" />
        </div>
        <p className="mt-1.5 text-center text-xs font-medium leading-4 text-cyan-200">
          {ko ? "동일한 descriptor" : "same descriptor"}
        </p>
      </section>

      {connector("mlff-inside-symmetry")}

      <section className="min-w-0" aria-label={ko ? "대칭성 보존 descriptor" : "symmetry-preserving descriptor"}>
        <StageHeading title="descriptor" centered />
        <div className={isMobile ? "mx-auto h-28 w-20" : "mx-auto mt-1 h-44 w-full max-w-20"}>
          <DescriptorGlyph label={ko ? "대칭성 보존 descriptor 벡터" : "symmetry-preserving descriptor vector"} />
        </div>
      </section>

      {connector("mlff-inside-descriptor")}

      <section className="min-w-0" aria-label={ko ? "신경망" : "neural network"}>
        <StageHeading title={ko ? "신경망" : "neural network"} centered />
        <div className={isMobile ? "mx-auto h-32 w-40" : "mx-auto mt-1 h-44 w-full"}>
          <NeuralNetworkGlyph compact label={ko ? "descriptor를 원자별 에너지로 바꾸는 신경망" : "neural network mapping a descriptor to atomic energy"} />
        </div>
      </section>

      {connector("mlff-inside-network")}

      <section className="min-w-0" aria-label={ko ? "원자별 에너지, 총에너지와 힘" : "atomic energy, total energy, and forces"}>
        <StageHeading
          title={ko ? "원자별 에너지에서 힘까지" : "atomic energy to forces"}
          detail={ko ? "합으로 에너지를 만들고 기울기로 힘을 계산" : "sum energies, differentiate once for consistent forces"}
        />
        <div className={isMobile ? "mx-auto h-44 w-full max-w-64" : "mt-1 h-48 w-full"}>
          <EnergyForcesGlyph ko={ko} />
        </div>
      </section>
    </div>
  );
}
