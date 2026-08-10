"use client";

import { AtomDefs, AtomPaintProvider, AtomSphere } from "./AtomSphere";
import { schematicScale } from "./schematicType";

type Pt = { x: number; y: number };

// Round to 2 decimals to avoid server/client hydration mismatches.
const R2 = (n: number) => Math.round(n * 100) / 100;

/* shared type scale — this card's viewBox width is 560 */
const TZ = schematicScale(560);

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const ATOM_GRAD: Record<string, string> = {
  c: "atomg-c",
  n: "atomg-n",
  o: "atomg-o",
  h: "atomg-h",
};
const PALETTE_KEYS = ["c", "n", "o", "h"];

function makeAtomGroup(center: Pt, idx: number) {
  const rand = mulberry32(100 + idx);
  const atomCount = 4 + Math.floor(rand() * 3);
  const orbit = 8 + rand() * 3;
  const atoms = [];
  for (let i = 0; i < atomCount; i++) {
    const a = (Math.PI * 2 * i) / atomCount + (rand() - 0.5) * 0.35;
    const rr = orbit + (rand() - 0.5) * 2.5;
    atoms.push({
      cx: R2(center.x + rr * Math.cos(a)),
      cy: R2(center.y + rr * Math.sin(a)),
      r: R2(3.2 + rand() * 1.2),
      grad: ATOM_GRAD[PALETTE_KEYS[i % PALETTE_KEYS.length]],
    });
  }
  const bonds: [number, number][] = [];
  for (let i = 0; i < atomCount - 1; i++) bonds.push([i, i + 1]);
  return { center, atoms, bonds, hull: { cx: center.x, cy: center.y, r: 15 }, delay: idx * 0.04 };
}

function trimSegment(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number, pad = 1.5) {
  const dx = x2 - x1, dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  return { x1: x1 + ux * (r1 + pad), y1: y1 + uy * (r1 + pad), x2: x2 - ux * (r2 + pad), y2: y2 - uy * (r2 + pad) };
}

// Pre-computed 2D good-solvent polymer (SAW seed 4690, ν ≈ 3/4, step=25)
const CENTERS: Pt[] = [
  { x: 167.4, y: 81.0 }, { x: 192.4, y: 82.2 }, { x: 201.1, y: 58.8 }, { x: 180.6, y: 44.4 },
  { x: 157.3, y: 35.5 }, { x: 152.3, y: 60.0 }, { x: 128.8, y: 51.3 }, { x: 126.8, y: 76.2 },
  { x: 118.3, y: 99.8 }, { x: 93.7, y: 104.1 }, { x: 92.5, y: 129.1 }, { x: 68.8, y: 137.2 },
];

// Diagonal layout positions the all-atom view upper-left and CG view lower-right.
const S = 1.5;                       // blob scale
const AT_TX = -52.5, AT_TY = -24.6;  // all-atom group: centre → (150,105)
const CG_TX = 207.5, CG_TY = 20.4;   // CG group: centre → (410,150)

export function MesoSchematic({ active, ko = false }: { active: boolean; ko?: boolean }) {
  const clusters = CENTERS.map((c, i) => makeAtomGroup(c, i));
  const beads = CENTERS.map((p, i) => ({
    cx: p.x, cy: p.y, r: i % 2 === 0 ? 10 : 8.5, delay: 0.52 + i * 0.035,
  }));

  const fade = active ? "animate-fade-in" : "opacity-0";
  const scaleIn = active ? "animate-scale-in" : "opacity-0";

  return (
    <svg viewBox="24 4 531 248" className="w-full h-auto" style={{ shapeRendering: "geometricPrecision" }}
      role="img" aria-label={ko
        ? "메조 조립화: 전원자 고분자를 연결된 조립 비드로 사상하는 과정"
        : "Mesoscale coarse-graining: an all-atom polymer mapped to connected coarse-grained beads"}>
      <AtomPaintProvider>
      <defs>
        <AtomDefs />
        <filter id="cgGlow"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>

      {/* ═══ All-atom blob (upper-left) ═══ */}
      <g transform={`translate(${AT_TX},${AT_TY}) scale(${S})`}>
        {/* hull rings with dashed transport packets */}
        {clusters.map((cluster, ci) => {
          const r = cluster.hull.r;
          const C = (2 * Math.PI * r).toFixed(1);
          const color = ci % 2 === 1 ? "var(--sch-amber-bright)" : "var(--sch-amber)";
          return (
            <g key={`hull-${ci}`} className={fade} style={{ animationDelay: `${cluster.delay}s` }}>
              <circle cx={cluster.hull.cx} cy={cluster.hull.cy} r={r} fill={color} fillOpacity="0.06" />
              <circle cx={cluster.hull.cx} cy={cluster.hull.cy} r={r} fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="4 3" strokeOpacity="0.22" />
              <circle cx={cluster.hull.cx} cy={cluster.hull.cy} r={r} fill="none" stroke="var(--sch-amber-bright)" strokeWidth="2" strokeOpacity="0.6" strokeLinecap="round" strokeDasharray={`7 ${C}`}>
                <animate attributeName="stroke-dashoffset" from="0" to={`-${C}`} dur="1.8s" begin={`${0.62 + ci * 0.08}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
        {/* inter-cluster backbone bonds */}
        {clusters.slice(0, -1).map((c, i) => {
          const n = clusters[i + 1];
          let bestD = Infinity, bestA = c.atoms[0], bestB = n.atoms[0];
          for (const a of c.atoms) for (const b of n.atoms) {
            const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
            if (d < bestD) { bestD = d; bestA = a; bestB = b; }
          }
          const seg = trimSegment(bestA.cx, bestA.cy, bestB.cx, bestB.cy, bestA.r, bestB.r, 0.5);
          return <line key={`bb-${i}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#9ca3af" strokeWidth="1.5" strokeOpacity="0.42" className={fade} style={{ animationDelay: `${0.04 + i * 0.03}s` }} />;
        })}
        {/* clusters: bonds + dimensional atoms */}
        {clusters.map((cluster, ci) => (
          <g key={`cluster-${ci}`}>
            {cluster.bonds.map(([a, b], bi) => {
              const A = cluster.atoms[a], B = cluster.atoms[b];
              const seg = trimSegment(A.cx, A.cy, B.cx, B.cy, A.r, B.r, 0.5);
              return <line key={`cb-${ci}-${bi}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#9ca3af" strokeWidth="1.5" strokeOpacity="0.4" className={fade} style={{ animationDelay: `${cluster.delay}s` }} />;
            })}
            {cluster.atoms.map((atom, ai) => (
              <g key={`a-${ci}-${ai}`} className={scaleIn} style={{ animationDelay: `${cluster.delay + ai * 0.03}s`, transformOrigin: `${atom.cx}px ${atom.cy}px` }}>
                <AtomSphere cx={atom.cx} cy={atom.cy} r={atom.r} grad={atom.grad} shadow={false} />
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* ═══ CG arrow (diagonal, all-atom → CG) ═══ */}
      <g className={fade} style={{ animationDelay: "0.42s" }}>
        <line x1="250" y1="150" x2="326" y2="176" stroke="var(--sch-amber-bright)" strokeWidth="3" strokeOpacity="0.72" strokeLinecap="round" />
        <polygon points="326,169 340,178 324,183" fill="var(--sch-amber-bright)" fillOpacity="0.72" />
        <text x="278" y="150" textAnchor="middle" fontSize={TZ.labelLg} fontWeight="700" className="fill-foreground">CG</text>
      </g>

      {/* ═══ CG-bead blob (lower-right) ═══ */}
      <g transform={`translate(${CG_TX},${CG_TY}) scale(${S})`}>
        {beads.slice(0, -1).map((a, i) => {
          const b = beads[i + 1];
          const seg = trimSegment(a.cx, a.cy, b.cx, b.cy, a.r, b.r, 1.2);
          return <line key={`cg-bond-${i}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="var(--sch-bond)" strokeWidth="2.6" strokeOpacity="0.75" strokeLinecap="round" className={fade} style={{ animationDelay: "0.55s" }} />;
        })}
        {beads.map((b, i) => (
          <g key={`bead-${i}`} className={scaleIn} style={{ animationDelay: `${b.delay}s`, transformOrigin: `${b.cx}px ${b.cy}px` }}>
            <AtomSphere cx={b.cx} cy={b.cy} r={b.r} grad="atomg-amber" />
          </g>
        ))}
      </g>

      {/* labels */}
      <text x="150" y="206" textAnchor="middle" fontSize={TZ.labelLg} className={`fill-muted-foreground ${fade}`} style={{ animationDelay: "0.25s" }}>{ko ? "전원자" : "All-atom"}</text>
      <text x="410" y="244" textAnchor="middle" fontSize={TZ.labelLg} className={`fill-muted-foreground ${fade}`} style={{ animationDelay: "0.85s" }}>{ko ? "조대 비드" : "CG beads"}</text>
      </AtomPaintProvider>
    </svg>
  );
}
