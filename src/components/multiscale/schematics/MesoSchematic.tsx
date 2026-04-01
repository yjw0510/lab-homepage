"use client";

type Pt = { x: number; y: number };

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const ATOM_PALETTE = [
  "var(--sch-carbon)", // C — grey
  "#7c8db0", // N — muted blue
  "#b07c7c", // O — muted red
  "#9ca3af", // H — light grey
];

function makeAtomGroup(center: Pt, idx: number) {
  const rand = mulberry32(100 + idx);
  const atomCount = 4 + Math.floor(rand() * 3);
  const orbit = 8 + rand() * 3;
  const atoms = [];

  for (let i = 0; i < atomCount; i++) {
    const a = (Math.PI * 2 * i) / atomCount + (rand() - 0.5) * 0.35;
    const rr = orbit + (rand() - 0.5) * 2.5;
    atoms.push({
      cx: center.x + rr * Math.cos(a),
      cy: center.y + rr * Math.sin(a),
      r: 3.2 + rand() * 1.2,
      fill: ATOM_PALETTE[i % ATOM_PALETTE.length],
    });
  }

  const bonds: [number, number][] = [];
  for (let i = 0; i < atomCount - 1; i++) {
    bonds.push([i, i + 1]);
  }

  return {
    center,
    atoms,
    bonds,
    hull: { cx: center.x, cy: center.y, r: 15 },
    delay: idx * 0.04,
  };
}

function trimSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number,
  pad = 1.5,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;

  return {
    x1: x1 + ux * (r1 + pad),
    y1: y1 + uy * (r1 + pad),
    x2: x2 - ux * (r2 + pad),
    y2: y2 - uy * (r2 + pad),
  };
}

// Pre-computed 2D good-solvent polymer (SAW seed 4690, ν ≈ 3/4, step=25)
const CENTERS: Pt[] = [
  { x: 167.4, y: 81.0 },
  { x: 192.4, y: 82.2 },
  { x: 201.1, y: 58.8 },
  { x: 180.6, y: 44.4 },
  { x: 157.3, y: 35.5 },
  { x: 152.3, y: 60.0 },
  { x: 128.8, y: 51.3 },
  { x: 126.8, y: 76.2 },
  { x: 118.3, y: 99.8 },
  { x: 93.7, y: 104.1 },
  { x: 92.5, y: 129.1 },
  { x: 68.8, y: 137.2 },
];

export function MesoSchematic({ active }: { active: boolean }) {
  const clusters = CENTERS.map((c, i) => makeAtomGroup(c, i));

  const beads = CENTERS.map((p, i) => ({
    cx: p.x + 280,
    cy: p.y,
    r: i % 2 === 0 ? 10 : 8.5,
    color: i % 2 === 0 ? "#f59e0b" : "#d97706",
    delay: 0.52 + i * 0.035,
  }));

  return (
    <svg viewBox="0 0 560 160" className="w-full h-32 sm:h-40" style={{ shapeRendering: "geometricPrecision" }}>
      <defs>
        <filter id="cgGlow">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* Left: hull circles around clusters (animated dash transport) */}
      {clusters.map((cluster, ci) => {
        const r = cluster.hull.r;
        const C = (2 * Math.PI * r).toFixed(1);
        const color = ci % 2 === 1 ? "#f59e0b" : "#d97706";

        return (
          <g
            key={`hull-${ci}`}
            className={active ? "animate-fade-in" : "opacity-0"}
            style={{ animationDelay: `${cluster.delay}s` }}
          >
            {/* fill */}
            <circle
              cx={cluster.hull.cx}
              cy={cluster.hull.cy}
              r={r}
              fill={color}
              fillOpacity="0.06"
              stroke="none"
            />

            {/* base dashed ring */}
            <circle
              cx={cluster.hull.cx}
              cy={cluster.hull.cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeOpacity="0.22"
            />

            {/* glow packet */}
            <circle
              cx={cluster.hull.cx}
              cy={cluster.hull.cy}
              r={r}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4.5"
              strokeOpacity="0.12"
              strokeLinecap="round"
              strokeDasharray={`9 ${C}`}
              filter="url(#cgGlow)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to={`-${C}`}
                dur="1.8s"
                begin={`${0.62 + ci * 0.08}s`}
                repeatCount="indefinite"
              />
            </circle>

            {/* bright packet */}
            <circle
              cx={cluster.hull.cx}
              cy={cluster.hull.cy}
              r={r}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.2"
              strokeOpacity="0.7"
              strokeLinecap="round"
              strokeDasharray={`7 ${C}`}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to={`-${C}`}
                dur="1.8s"
                begin={`${0.62 + ci * 0.08}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}

      {/* Left: inter-group bonds (closest atom pair, trimmed to surfaces) */}
      {clusters.slice(0, -1).map((c, i) => {
        const n = clusters[i + 1];
        let bestD = Infinity;
        let bestA = c.atoms[0];
        let bestB = n.atoms[0];
        for (const a of c.atoms) {
          for (const b of n.atoms) {
            const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
            if (d < bestD) { bestD = d; bestA = a; bestB = b; }
          }
        }
        const seg = trimSegment(bestA.cx, bestA.cy, bestB.cx, bestB.cy, bestA.r, bestB.r, 0.5);

        return (
          <line
            key={`bb-${i}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke="#9ca3af"
            strokeWidth="1.8"
            strokeOpacity="0.42"
            className={active ? "animate-fade-in" : "opacity-0"}
            style={{ animationDelay: `${0.04 + i * 0.03}s` }}
          />
        );
      })}

      {/* Left: atomistic clusters */}
      {clusters.map((cluster, ci) => (
        <g key={`cluster-${ci}`}>
          {/* Intra-cluster bonds (trimmed to atom surfaces) */}
          {cluster.bonds.map(([a, b], bi) => {
            const atomA = cluster.atoms[a];
            const atomB = cluster.atoms[b];
            const seg = trimSegment(atomA.cx, atomA.cy, atomB.cx, atomB.cy, atomA.r, atomB.r, 0.5);
            return (
              <line
                key={`cb-${ci}-${bi}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke="#9ca3af"
                strokeWidth="1.8"
                strokeOpacity="0.4"
                className={active ? "animate-fade-in" : "opacity-0"}
                style={{ animationDelay: `${cluster.delay}s` }}
              />
            );
          })}
          {/* Atoms */}
          {cluster.atoms.map((atom, ai) => (
            <circle
              key={`a-${ci}-${ai}`}
              cx={atom.cx}
              cy={atom.cy}
              r={atom.r}
              fill={atom.fill}
              fillOpacity="0.85"
              className={active ? "animate-scale-in" : "opacity-0"}
              style={{
                animationDelay: `${cluster.delay + ai * 0.03}s`,
                transformOrigin: `${atom.cx}px ${atom.cy}px`,
              }}
            />
          ))}
        </g>
      ))}

      {/* Label: All-atom */}
      <text
        x="140"
        y="148"
        textAnchor="middle"
        fontSize="18"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.25s" }}
      >
        All-atom
      </text>

      {/* Center: CG arrow */}
      <g
        className={active ? "animate-fade-in" : "opacity-0"}
        style={{ animationDelay: "0.42s" }}
      >
        <line
          x1="240"
          y1="78"
          x2="316"
          y2="78"
          stroke="#f59e0b"
          strokeWidth="3.2"
          strokeOpacity="0.72"
        />
        <polygon
          points="316,71 330,78 316,85"
          fill="#f59e0b"
          fillOpacity="0.72"
        />
        <text
          x="278"
          y="66"
          textAnchor="middle"
          fontSize="21"
          fontWeight="600"
          className="fill-foreground"
        >
          CG
        </text>
      </g>

      {/* Right: CG bead connectors (solid lines) */}
      {beads.slice(0, -1).map((a, i) => {
        const b = beads[i + 1];
        const seg = trimSegment(a.cx, a.cy, b.cx, b.cy, a.r, b.r, 1.2);

        return (
          <line
            key={`cg-bond-${i}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke="var(--sch-bond)"
            strokeWidth="3.5"
            strokeOpacity="0.75"
            strokeLinecap="round"
            className={active ? "animate-fade-in" : "opacity-0"}
            style={{ animationDelay: "0.55s" }}
          />
        );
      })}

      {/* Right: CG beads */}
      {beads.map((b, i) => (
        <g key={`bead-${i}`}>
          <circle
            cx={b.cx}
            cy={b.cy}
            r={b.r}
            fill={b.color}
            fillOpacity="1"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{
              animationDelay: `${b.delay}s`,
              transformOrigin: `${b.cx}px ${b.cy}px`,
            }}
          />
          <circle
            cx={b.cx}
            cy={b.cy}
            r={b.r * 0.92}
            fill="white"
            fillOpacity="0.08"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{
              animationDelay: `${b.delay}s`,
              transformOrigin: `${b.cx}px ${b.cy}px`,
            }}
          />
        </g>
      ))}

      {/* Label: CG beads */}
      <text
        x="420"
        y="148"
        textAnchor="middle"
        fontSize="18"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.85s" }}
      >
        CG beads
      </text>
    </svg>
  );
}
