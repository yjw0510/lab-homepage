"use client";

import { AtomDefs, AtomPaintProvider, AtomSphere } from "./AtomSphere";
import { MathSvg } from "./MathSvg";
import { MATH_SVG } from "./mathSvgData";
import { schematicScale } from "./schematicType";

/* shared type + spacing scale (this card's viewBox width is 540) */
const TZ = schematicScale(540);

// Round to 2 decimals to avoid server/client hydration mismatches
const R2 = (n: number) => Math.round(n * 100) / 100;

function trimSegment(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number, pad = 1.2,
) {
  const dx = x2 - x1, dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  return {
    x1: R2(x1 + ux * (r1 + pad)), y1: R2(y1 + uy * (r1 + pad)),
    x2: R2(x2 - ux * (r2 + pad)), y2: R2(y2 - uy * (r2 + pad)),
  };
}
function segPath(x1: number, y1: number, x2: number, y2: number) {
  return `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
}

/* CPK colour → shared gradient id */
const GRAD: Record<string, string> = {
  "var(--sch-carbon)": "atomg-c",
  "#3b82f6": "atomg-n",
  "#ef4444": "atomg-o",
  "#9ca3af": "atomg-h",
};
const gradOf = (c: string) => GRAD[c] ?? "atomg-c";

/* formula sizing — shared scale, so math renders at the same px as every card */
const INK = "var(--sch-ink)";
function Fx({ k, xc, yb }: { k: string; xc: number; yb: number }) {
  const [, minY, vbW, vbH] = MATH_SVG[k].viewBox.split(/\s+/).map(Number);
  const s = TZ.formulaEm / 1000;
  return (
    <MathSvg formulaKey={k} x={xc} y={yb - (-minY * s)} width={vbW * s} height={vbH * s} color={INK} anchor="middle" />
  );
}

export function MLFFSchematic({ active, ko = false }: { active: boolean; ko?: boolean }) {
  // Stage 1 / 3: caffeine (C8H10N4O2), RDKit 2D coords
  const atoms = [
    { cx: 120.4, cy: 88.9, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 106.1, cy: 74.6, r: 5.5, color: "#3b82f6" },
    { cx: 109.3, cy: 54.5, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 91.2, cy: 45.3, r: 5.5, color: "#3b82f6" },
    { cx: 76.8, cy: 59.6, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 86.0, cy: 77.7, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 74.9, cy: 94.7, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 84.1, cy: 112.8, r: 5.5, color: "#ef4444" },
    { cx: 54.7, cy: 93.7, r: 5.5, color: "#3b82f6" },
    { cx: 45.5, cy: 75.5, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 25.2, cy: 74.5, r: 5.5, color: "#ef4444" },
    { cx: 56.5, cy: 58.5, r: 5.5, color: "#3b82f6" },
    { cx: 47.3, cy: 40.4, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 43.6, cy: 110.7, r: 5.5, color: "var(--sch-carbon)" },
    { cx: 134.8, cy: 103.3, r: 3.5, color: "#9ca3af" },
    { cx: 134.8, cy: 74.6, r: 3.5, color: "#9ca3af" },
    { cx: 106.1, cy: 103.3, r: 3.5, color: "#9ca3af" },
    { cx: 127.4, cy: 45.3, r: 3.5, color: "#9ca3af" },
    { cx: 38.1, cy: 22.3, r: 3.5, color: "#9ca3af" },
    { cx: 65.4, cy: 31.2, r: 3.5, color: "#9ca3af" },
    { cx: 29.2, cy: 49.6, r: 3.5, color: "#9ca3af" },
    { cx: 32.5, cy: 127.7, r: 3.5, color: "#9ca3af" },
    { cx: 26.6, cy: 99.6, r: 3.5, color: "#9ca3af" },
    { cx: 60.6, cy: 121.8, r: 3.5, color: "#9ca3af" },
  ];
  const atomBonds: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8], [8, 9], [9, 10],
    [9, 11], [11, 12], [8, 13], [5, 1], [11, 4], [0, 14], [0, 15], [0, 16], [2, 17], [12, 18],
    [12, 19], [12, 20], [13, 21], [13, 22], [13, 23],
  ];

  const descCenter = { cx: 232, cy: 72, r: 8 };
  const descNeighbors = [
    { cx: 261.4, cy: 78.0, r: 5.0 }, { cx: 256.3, cy: 98.5, r: 4.5 }, { cx: 235.2, cy: 100.3, r: 4.5 },
    { cx: 220.0, cy: 93.3, r: 5.0 }, { cx: 202.0, cy: 85.7, r: 4.5 }, { cx: 197.9, cy: 65.1, r: 4.5 },
    { cx: 214.6, cy: 53.0, r: 5.0 }, { cx: 229.0, cy: 45.9, r: 4.5 }, { cx: 249.3, cy: 41.4, r: 4.5 },
    { cx: 261.5, cy: 58.6, r: 5.0 },
  ];

  const graphCenter = { cx: 340, cy: 72, r: 8 };
  const graphOuter = [
    { cx: 373.8, cy: 84.3, r: 5.0 }, { cx: 354.2, cy: 93.1, r: 4.5 }, { cx: 339.1, cy: 97.6, r: 4.5 },
    { cx: 317.8, cy: 100.3, r: 5.0 }, { cx: 315.6, cy: 79.0, r: 4.5 }, { cx: 315.9, cy: 63.2, r: 4.5 },
    { cx: 319.9, cy: 42.1, r: 5.0 }, { cx: 340.9, cy: 46.8, r: 4.5 }, { cx: 355.9, cy: 51.7, r: 4.5 },
    { cx: 374.6, cy: 62.1, r: 5.0 },
  ];
  const graphEdges: [number, number][] = [
    [0, 1], [0, 2], [0, 9], [1, 2], [1, 3], [1, 9], [2, 3], [2, 4], [3, 4], [4, 5],
    [4, 6], [5, 6], [5, 7], [6, 7], [6, 8], [7, 8], [7, 9], [8, 9],
  ];
  const graphCenterEdges: number[] = [1, 2, 4, 5, 7, 8];

  const outputAtoms = [
    { cx: 540.4, cy: 88.9, r: 5.5, color: "var(--sch-carbon)", dx: -5.3, dy: -6.4, fc: "#3e80f2" },
    { cx: 526.1, cy: 74.6, r: 5.5, color: "#3b82f6", dx: -1.7, dy: 11.0, fc: "#6374ce" },
    { cx: 529.3, cy: 54.5, r: 5.5, color: "var(--sch-carbon)", dx: -1.5, dy: -17.4, fc: "#b7577a" },
    { cx: 511.2, cy: 45.3, r: 5.5, color: "#3b82f6", dx: 8.3, dy: -6.7, fc: "#497ce7" },
    { cx: 496.8, cy: 59.6, r: 5.5, color: "var(--sch-carbon)", dx: -9.0, dy: 4.8, fc: "#3f80f1" },
    { cx: 506.0, cy: 77.7, r: 5.5, color: "var(--sch-carbon)", dx: 3.0, dy: 14.8, fc: "#97629a" },
    { cx: 494.9, cy: 94.7, r: 5.5, color: "var(--sch-carbon)", dx: 10.6, dy: 1.8, fc: "#5e75d2" },
    { cx: 504.1, cy: 112.8, r: 5.5, color: "#ef4444", dx: -9.2, dy: -12.6, fc: "#9f5f92" },
    { cx: 474.7, cy: 93.7, r: 5.5, color: "#3b82f6", dx: 3.0, dy: 16.0, fc: "#a75c8a" },
    { cx: 465.5, cy: 75.5, r: 5.5, color: "var(--sch-carbon)", dx: 3.0, dy: -7.5, fc: "#3b82f6" },
    { cx: 445.2, cy: 74.5, r: 5.5, color: "#ef4444", dx: 6.1, dy: -16.7, fc: "#bb5576" },
    { cx: 476.5, cy: 58.5, r: 5.5, color: "#3b82f6", dx: -5.5, dy: 8.6, fc: "#5678da" },
    { cx: 467.3, cy: 40.4, r: 5.5, color: "var(--sch-carbon)", dx: 12.3, dy: -3.4, fc: "#786cb9" },
    { cx: 463.6, cy: 110.7, r: 5.5, color: "var(--sch-carbon)", dx: 7.8, dy: 5.1, fc: "#4b7ce5" },
    { cx: 554.8, cy: 103.3, r: 3.5, color: "#9ca3af", dx: 9.5, dy: -13.5, fc: "#aa5b88" },
    { cx: 554.8, cy: 74.6, r: 3.5, color: "#9ca3af", dx: 6.4, dy: -17.1, fc: "#c15370" },
    { cx: 526.1, cy: 103.3, r: 3.5, color: "#9ca3af", dx: -21.1, dy: -4.9, fc: "#ef4444" },
    { cx: 547.4, cy: 45.3, r: 3.5, color: "#9ca3af", dx: -11.4, dy: 10.9, fc: "#a05f91" },
    { cx: 458.1, cy: 22.3, r: 3.5, color: "#9ca3af", dx: 8.0, dy: -14.6, fc: "#ac5a85" },
    { cx: 485.4, cy: 31.2, r: 3.5, color: "#9ca3af", dx: 10.4, dy: -12.3, fc: "#a55d8c" },
    { cx: 449.2, cy: 49.6, r: 3.5, color: "#9ca3af", dx: -2.4, dy: -8.3, fc: "#427fee" },
    { cx: 452.5, cy: 127.7, r: 3.5, color: "#9ca3af", dx: 1.7, dy: 11.9, fc: "#6f6fc1" },
    { cx: 446.6, cy: 99.6, r: 3.5, color: "#9ca3af", dx: 9.9, dy: 5.4, fc: "#6573cc" },
    { cx: 480.6, cy: 121.8, r: 3.5, color: "#9ca3af", dx: 9.6, dy: 7.1, fc: "#6d70c4" },
  ];

  const fade = active ? "animate-fade-in" : "opacity-0";
  const scale = active ? "animate-scale-in" : "opacity-0";

  return (
    <svg viewBox="6 14 540 244" className="w-full h-auto" style={{ shapeRendering: "geometricPrecision" }}
      role="img" aria-label={ko
        ? "머신러닝 역장이 각 원자 주변을 읽어 전체 에너지와 원자에 작용하는 힘을 예측하는 과정"
        : "A machine-learning force field reads the atoms nearby to predict total energy and the force on each atom"}>
      <AtomPaintProvider>
      <defs>
        <AtomDefs />
        <marker id="mlff-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" fillOpacity="0.75" />
        </marker>
        <filter id="pktGlow"><feGaussianBlur stdDeviation="1.8" /></filter>
      </defs>

      {/* ═══ Col 1: Atoms ═══ */}
      <g transform="translate(-10,36.8) scale(1.35)">
        {atomBonds.map(([a, b], i) => {
          const s = trimSegment(atoms[a].cx, atoms[a].cy, atoms[a].r, atoms[b].cx, atoms[b].cy, atoms[b].r, 0.8);
          return <line key={`ab-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="var(--sch-bond)" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round"
            className={fade} style={{ animationDelay: `${i * 0.015}s` }} />;
        })}
        {atoms.map((a, i) => (
          <g key={`atom-${i}`} className={scale} style={{ animationDelay: `${i * 0.015}s`, transformOrigin: `${a.cx}px ${a.cy}px` }}>
            <AtomSphere cx={a.cx} cy={a.cy} r={a.r} grad={gradOf(a.color)} />
          </g>
        ))}
      </g>

      {/* arrow 1 */}
      <line x1="178" y1="140" x2="214" y2="140" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.75"
        markerEnd="url(#mlff-arrow)" className={fade} style={{ animationDelay: "0.3s" }} />

      {/* ═══ Col 2 top: Descriptor ═══ */}
      <g transform="translate(60.8,20.6) scale(0.88)">
        <circle cx={descCenter.cx} cy={descCenter.cy} r="42" fill="none" stroke="var(--sch-amber-bright)" strokeWidth="4" strokeOpacity="0.08" filter="url(#pktGlow)" className={fade} style={{ animationDelay: "0.36s" }} />
        <circle cx={descCenter.cx} cy={descCenter.cy} r="42" fill="none" stroke="var(--sch-amber-bright)" strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.35" className={fade} style={{ animationDelay: "0.36s" }} />
        {descNeighbors.map((n, i) => {
          const s = trimSegment(n.cx, n.cy, n.r, descCenter.cx, descCenter.cy, descCenter.r, 0.9);
          const d = segPath(s.x1, s.y1, s.x2, s.y2);
          const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1).toFixed(1);
          return (
            <g key={`spoke-${i}`} className={fade} style={{ animationDelay: `${0.38 + i * 0.02}s` }}>
              <path d={d} fill="none" stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.3" strokeLinecap="round" />
              <path d={d} fill="none" stroke="var(--sch-packet)" strokeWidth="5" strokeOpacity="0.18" strokeLinecap="round" filter="url(#pktGlow)" strokeDasharray={`3 ${L}`}>
                <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.4s" begin={`${0.7 + i * 0.12}s`} repeatCount="indefinite" />
              </path>
              <path d={d} fill="none" stroke="var(--sch-packet)" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" strokeDasharray={`2 ${L}`}>
                <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.4s" begin={`${0.7 + i * 0.12}s`} repeatCount="indefinite" />
              </path>
            </g>
          );
        })}
        {descNeighbors.map((n, i) => (
          <g key={`dn-${i}`} className={scale} style={{ animationDelay: `${0.4 + i * 0.025}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}>
            <AtomSphere cx={n.cx} cy={n.cy} r={n.r} grad="atomg-cyan" />
          </g>
        ))}
        <circle cx={descCenter.cx} cy={descCenter.cy} r={descCenter.r + 3} fill="var(--sch-amber-bright)" fillOpacity="0.12" filter="url(#pktGlow)" className={fade} style={{ animationDelay: "0.42s" }} />
        <g className={scale} style={{ animationDelay: "0.42s", transformOrigin: `${descCenter.cx}px ${descCenter.cy}px` }}>
          <AtomSphere cx={descCenter.cx} cy={descCenter.cy} r={descCenter.r} grad="atomg-amber" />
        </g>
      </g>

      {/* descriptor → graph connector */}
      <line x1="265" y1="128" x2="265" y2="158" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.6"
        markerEnd="url(#mlff-arrow)" className={fade} style={{ animationDelay: "0.5s" }} />

      {/* ═══ Col 2 bottom: Graph ═══ */}
      <g transform="translate(-34.2,132.6) scale(0.88)">
        {graphEdges.map(([a, b], i) => {
          const s = trimSegment(graphOuter[a].cx, graphOuter[a].cy, graphOuter[a].r, graphOuter[b].cx, graphOuter[b].cy, graphOuter[b].r, 0.9);
          const d = segPath(s.x1, s.y1, s.x2, s.y2);
          const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1).toFixed(1);
          return (
            <g key={`ge-${i}`} className={fade} style={{ animationDelay: `${0.36 + i * 0.02}s` }}>
              <path d={d} fill="none" stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.25" strokeLinecap="round" />
              <path d={d} fill="none" stroke="var(--sch-packet)" strokeWidth="5" strokeOpacity="0.15" strokeLinecap="round" filter="url(#pktGlow)" strokeDasharray={`3 ${L}`}>
                <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.7 + i * 0.08}s`} repeatCount="indefinite" />
              </path>
              <path d={d} fill="none" stroke="var(--sch-packet)" strokeWidth="2" strokeOpacity="0.75" strokeLinecap="round" strokeDasharray={`2 ${L}`}>
                <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.7 + i * 0.08}s`} repeatCount="indefinite" />
              </path>
            </g>
          );
        })}
        {graphCenterEdges.map((oi, i) => {
          const s = trimSegment(graphCenter.cx, graphCenter.cy, graphCenter.r, graphOuter[oi].cx, graphOuter[oi].cy, graphOuter[oi].r, 0.9);
          const d = segPath(s.x1, s.y1, s.x2, s.y2);
          const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1).toFixed(1);
          return (
            <g key={`gce-${i}`} className={fade} style={{ animationDelay: `${0.38 + i * 0.025}s` }}>
              <path d={d} fill="none" stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.25" strokeLinecap="round" />
              <path d={d} fill="none" stroke="var(--sch-packet)" strokeWidth="2" strokeOpacity="0.75" strokeLinecap="round" strokeDasharray={`2 ${L}`}>
                <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.8 + i * 0.1}s`} repeatCount="indefinite" />
              </path>
            </g>
          );
        })}
        {graphOuter.map((n, i) => (
          <g key={`gn-${i}`} className={scale} style={{ animationDelay: `${0.4 + i * 0.03}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}>
            <AtomSphere cx={n.cx} cy={n.cy} r={n.r} grad="atomg-cyan" />
          </g>
        ))}
        <circle cx={graphCenter.cx} cy={graphCenter.cy} r={graphCenter.r + 3} fill="var(--sch-amber-bright)" fillOpacity="0.12" filter="url(#pktGlow)" className={fade} style={{ animationDelay: "0.44s" }} />
        <g className={scale} style={{ animationDelay: "0.44s", transformOrigin: `${graphCenter.cx}px ${graphCenter.cy}px` }}>
          <AtomSphere cx={graphCenter.cx} cy={graphCenter.cy} r={graphCenter.r} grad="atomg-amber" />
        </g>
      </g>

      {/* arrow 2 */}
      <line x1="322" y1="140" x2="360" y2="140" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.75"
        markerEnd="url(#mlff-arrow)" className={fade} style={{ animationDelay: "0.7s" }} />

      {/* ═══ Col 3: Output — forces + atoms ═══ */}
      <g transform="translate(-235.7,36.8) scale(1.35)">
        <g className={fade} style={{ animationDelay: "0.8s" }}>
          {outputAtoms.map((a, i) => {
            const FS = 0.6; // illustrative arrow length — trimmed so tips clear the E labels
            const mag = Math.hypot(a.dx, a.dy), ux = a.dx / mag, uy = a.dy / mag;
            const sx = a.cx + ux * (a.r + 0.5), sy = a.cy + uy * (a.r + 0.5);
            const tx = a.cx + a.dx * FS, ty = a.cy + a.dy * FS, hl = 4.5, hw = 2.8;
            return (
              <g key={`force-${i}`}>
                <line x1={sx} y1={sy} x2={tx - (hl - 1) * ux} y2={ty - (hl - 1) * uy} stroke={a.fc} strokeWidth="1.8" strokeLinecap="round" />
                <polygon points={`${tx.toFixed(1)},${ty.toFixed(1)} ${(tx - hl * ux + hw * uy).toFixed(1)},${(ty - hl * uy - hw * ux).toFixed(1)} ${(tx - hl * ux - hw * uy).toFixed(1)},${(ty - hl * uy + hw * ux).toFixed(1)}`} fill={a.fc} />
              </g>
            );
          })}
        </g>
        <g className={fade} style={{ animationDelay: "0.82s" }}>
          {outputAtoms.map((a, i) => <AtomSphere key={`out-${i}`} cx={a.cx} cy={a.cy} r={a.r} grad={gradOf(a.color)} />)}
        </g>
      </g>

      {/* labels */}
      <text x="98" y="242" textAnchor="middle" fontSize={TZ.labelLg} className={`fill-muted-foreground ${fade}`} style={{ animationDelay: "0.15s" }}>{ko ? "원자" : "Atoms"}</text>
      <text x="265" y="40" textAnchor="middle" fontSize={TZ.labelMd} className={`fill-muted-foreground ${fade}`} style={{ animationDelay: "0.55s" }}>{ko ? "가까운 원자" : "Nearby atoms"}</text>
      <text x="308" y="200" textAnchor="start" fontSize={TZ.labelMd} className={`fill-muted-foreground ${fade}`} style={{ animationDelay: "0.55s" }}>{ko ? "연결 관계" : "Connections"}</text>
      <text x="265" y="250" textAnchor="middle" fontSize={TZ.labelLg} fontWeight="600" className={`fill-muted-foreground ${fade}`} style={{ animationDelay: "0.58s" }}>{ko ? "학습용 설명" : "Learned description"}</text>

      <g className={fade} style={{ animationDelay: "0.78s" }}><Fx k="eglobal" xc={440} yb={40} /></g>
      <g className={fade} style={{ animationDelay: "0.85s" }}><Fx k="ei_fi" xc={440} yb={248} /></g>
      </AtomPaintProvider>
    </svg>
  );
}
