"use client";

function trimSegment(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  pad = 1.2,
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

function segPath(x1: number, y1: number, x2: number, y2: number) {
  return `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
}

export function MLFFSchematic({ active }: { active: boolean }) {
  // Three-stage pipeline: Atoms → Local representation → E_global, E_i, F_i
  // Stage 1: caffeine (C8H10N4O2), 24 atoms, RDKit 2D coords, 1.7x expanded

  const atoms = [
    { cx: 120.4, cy: 88.9, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 106.1, cy: 74.6, r: 5.5, color: "#3b82f6" }, // N
    { cx: 109.3, cy: 54.5, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 91.2, cy: 45.3, r: 5.5, color: "#3b82f6" }, // N
    { cx: 76.8, cy: 59.6, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 86.0, cy: 77.7, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 74.9, cy: 94.7, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 84.1, cy: 112.8, r: 5.5, color: "#ef4444" }, // O
    { cx: 54.7, cy: 93.7, r: 5.5, color: "#3b82f6" }, // N
    { cx: 45.5, cy: 75.5, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 25.2, cy: 74.5, r: 5.5, color: "#ef4444" }, // O
    { cx: 56.5, cy: 58.5, r: 5.5, color: "#3b82f6" }, // N
    { cx: 47.3, cy: 40.4, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 43.6, cy: 110.7, r: 5.5, color: "var(--sch-carbon)" }, // C
    { cx: 134.8, cy: 103.3, r: 3.5, color: "#9ca3af" }, // H
    { cx: 134.8, cy: 74.6, r: 3.5, color: "#9ca3af" }, // H
    { cx: 106.1, cy: 103.3, r: 3.5, color: "#9ca3af" }, // H
    { cx: 127.4, cy: 45.3, r: 3.5, color: "#9ca3af" }, // H
    { cx: 38.1, cy: 22.3, r: 3.5, color: "#9ca3af" }, // H
    { cx: 65.4, cy: 31.2, r: 3.5, color: "#9ca3af" }, // H
    { cx: 29.2, cy: 49.6, r: 3.5, color: "#9ca3af" }, // H
    { cx: 32.5, cy: 127.7, r: 3.5, color: "#9ca3af" }, // H
    { cx: 26.6, cy: 99.6, r: 3.5, color: "#9ca3af" }, // H
    { cx: 60.6, cy: 121.8, r: 3.5, color: "#9ca3af" }, // H
  ];

  const atomBonds: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [5, 6], [6, 7], [6, 8], [8, 9], [9, 10],
    [9, 11], [11, 12], [8, 13], [5, 1], [11, 4],
    [0, 14], [0, 15], [0, 16], [2, 17], [12, 18],
    [12, 19], [12, 20], [13, 21], [13, 22], [13, 23],
  ];

  // Stage 2a: Descriptor — center + 10 neighbors, cutoff r=40
  const descCenter = { cx: 232, cy: 72, r: 8 };
  const descNeighbors = [
    { cx: 261.4, cy: 78.0, r: 5.0 },
    { cx: 256.3, cy: 98.5, r: 4.5 },
    { cx: 235.2, cy: 100.3, r: 4.5 },
    { cx: 220.0, cy: 93.3, r: 5.0 },
    { cx: 202.0, cy: 85.7, r: 4.5 },
    { cx: 197.9, cy: 65.1, r: 4.5 },
    { cx: 214.6, cy: 53.0, r: 5.0 },
    { cx: 229.0, cy: 45.9, r: 4.5 },
    { cx: 249.3, cy: 41.4, r: 4.5 },
    { cx: 261.5, cy: 58.6, r: 5.0 },
  ];

  // Stage 2b: Graph — center + 10 outer nodes, complex connectivity
  const graphCenter = { cx: 340, cy: 72, r: 8 };
  const graphOuter = [
    { cx: 373.8, cy: 84.3, r: 5.0 },
    { cx: 354.2, cy: 93.1, r: 4.5 },
    { cx: 339.1, cy: 97.6, r: 4.5 },
    { cx: 317.8, cy: 100.3, r: 5.0 },
    { cx: 315.6, cy: 79.0, r: 4.5 },
    { cx: 315.9, cy: 63.2, r: 4.5 },
    { cx: 319.9, cy: 42.1, r: 5.0 },
    { cx: 340.9, cy: 46.8, r: 4.5 },
    { cx: 355.9, cy: 51.7, r: 4.5 },
    { cx: 374.6, cy: 62.1, r: 5.0 },
  ];
  const graphEdges: [number, number][] = [
    [0, 1], [0, 2], [0, 9], [1, 2], [1, 3],
    [1, 9], [2, 3], [2, 4], [3, 4], [4, 5],
    [4, 6], [5, 6], [5, 7], [6, 7], [6, 8],
    [7, 8], [7, 9], [8, 9],
  ];
  const graphCenterEdges: number[] = [1, 2, 4, 5, 7, 8];

  // Stage 3: Output — same caffeine positions shifted right, original colors
  // Force arrows colored by magnitude: blue (#3b82f6) → red (#ef4444)
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

  return (
    <svg viewBox="0 0 600 170" className="w-full h-32 sm:h-40" style={{ shapeRendering: "geometricPrecision" }}>
      <defs>
        {/* Stage-transition arrow: stable size via userSpaceOnUse */}
        <marker id="mlff-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" fillOpacity="0.7" />
        </marker>
        <filter id="pktGlow">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>

      {/* Stage 1: Atom bonds (trimmed, #2B2D42) */}
      {atomBonds.map(([a, b], i) => {
        const seg = trimSegment(
          atoms[a].cx, atoms[a].cy, atoms[a].r,
          atoms[b].cx, atoms[b].cy, atoms[b].r,
          0.8,
        );
        return (
          <line
            key={`ab-${i}`}
            x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
            stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round"
            className={active ? "animate-fade-in" : "opacity-0"}
            style={{ animationDelay: `${i * 0.015}s` }}
          />
        );
      })}

      {/* Stage 1: Atoms (opaque + highlight) */}
      {atoms.map((a, i) => (
        <g key={`atom-${i}`}>
          <circle
            cx={a.cx} cy={a.cy} r={a.r}
            fill={a.color} fillOpacity="1"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{ animationDelay: `${i * 0.015}s`, transformOrigin: `${a.cx}px ${a.cy}px` }}
          />
          <circle
            cx={a.cx - 0.22 * a.r} cy={a.cy - 0.22 * a.r} r={0.46 * a.r}
            fill="white" fillOpacity="0.10"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{ animationDelay: `${i * 0.015}s`, transformOrigin: `${a.cx}px ${a.cy}px` }}
          />
        </g>
      ))}

      {/* Arrow 1 */}
      <g className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.3s" }}>
        <line x1="148" y1="75" x2="190" y2="75" stroke="#06b6d4" strokeWidth="2.2" strokeOpacity="0.7" markerEnd="url(#mlff-arrow)" />
      </g>

      {/* Stage 2a: Descriptor — cutoff glow + dashed circle */}
      <circle
        cx={descCenter.cx} cy={descCenter.cy} r="42"
        fill="none" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.08"
        filter="url(#pktGlow)"
        className={active ? "animate-fade-in" : "opacity-0"}
        style={{ animationDelay: "0.36s" }}
      />
      <circle
        cx={descCenter.cx} cy={descCenter.cy} r="42"
        fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.35"
        className={active ? "animate-fade-in" : "opacity-0"}
        style={{ animationDelay: "0.36s" }}
      />

      {/* Stage 2a: Descriptor — spokes with packet animation converging to center */}
      {descNeighbors.map((n, i) => {
        const seg = trimSegment(
          n.cx, n.cy, n.r,
          descCenter.cx, descCenter.cy, descCenter.r,
          0.9,
        );
        const d = segPath(seg.x1, seg.y1, seg.x2, seg.y2);
        const L = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1).toFixed(1);

        return (
          <g key={`spoke-${i}`} className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: `${0.38 + i * 0.02}s` }}>
            {/* base spoke */}
            <path d={d} fill="none" stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.3" strokeLinecap="round" />
            {/* glow packet → center (cardinal red) */}
            <path d={d} fill="none" stroke="#C41E3A" strokeWidth="5" strokeOpacity="0.18" strokeLinecap="round" filter="url(#pktGlow)" strokeDasharray={`3 ${L}`}>
              <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.4s" begin={`${0.7 + i * 0.12}s`} repeatCount="indefinite" />
            </path>
            {/* bright packet → center */}
            <path d={d} fill="none" stroke="#C41E3A" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" strokeDasharray={`2 ${L}`}>
              <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.4s" begin={`${0.7 + i * 0.12}s`} repeatCount="indefinite" />
            </path>
          </g>
        );
      })}

      {/* Stage 2a: Descriptor — neighbor atoms */}
      {descNeighbors.map((n, i) => (
        <g key={`dn-${i}`}>
          <circle cx={n.cx} cy={n.cy} r={n.r} fill="#06b6d4" fillOpacity="1"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{ animationDelay: `${0.4 + i * 0.025}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
          <circle cx={n.cx - 0.22 * n.r} cy={n.cy - 0.22 * n.r} r={0.46 * n.r}
            fill="white" fillOpacity="0.10"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{ animationDelay: `${0.4 + i * 0.025}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
        </g>
      ))}

      {/* Stage 2a: Descriptor — center atom (amber) */}
      <g>
        <circle cx={descCenter.cx} cy={descCenter.cy} r={descCenter.r + 3}
          fill="#f59e0b" fillOpacity="0.12" filter="url(#pktGlow)"
          className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.42s" }}
        />
        <circle cx={descCenter.cx} cy={descCenter.cy} r={descCenter.r}
          fill="#f59e0b" fillOpacity="1"
          className={active ? "animate-scale-in" : "opacity-0"}
          style={{ animationDelay: "0.42s", transformOrigin: `${descCenter.cx}px ${descCenter.cy}px` }}
        />
        <circle cx={descCenter.cx - 0.22 * descCenter.r} cy={descCenter.cy - 0.22 * descCenter.r} r={0.46 * descCenter.r}
          fill="white" fillOpacity="0.15"
          className={active ? "animate-scale-in" : "opacity-0"}
          style={{ animationDelay: "0.42s", transformOrigin: `${descCenter.cx}px ${descCenter.cy}px` }}
        />
      </g>

      {/* Stage 2b: Graph — all edges with packet animation on every edge */}
      {graphEdges.map(([a, b], i) => {
        const seg = trimSegment(
          graphOuter[a].cx, graphOuter[a].cy, graphOuter[a].r,
          graphOuter[b].cx, graphOuter[b].cy, graphOuter[b].r,
          0.9,
        );
        const d = segPath(seg.x1, seg.y1, seg.x2, seg.y2);
        const L = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1).toFixed(1);

        return (
          <g key={`ge-${i}`} className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: `${0.36 + i * 0.02}s` }}>
            <path d={d} fill="none" stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.25" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#C41E3A" strokeWidth="5" strokeOpacity="0.15" strokeLinecap="round" filter="url(#pktGlow)" strokeDasharray={`3 ${L}`}>
              <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.7 + i * 0.08}s`} repeatCount="indefinite" />
            </path>
            <path d={d} fill="none" stroke="#C41E3A" strokeWidth="2" strokeOpacity="0.75" strokeLinecap="round" strokeDasharray={`2 ${L}`}>
              <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.7 + i * 0.08}s`} repeatCount="indefinite" />
            </path>
          </g>
        );
      })}

      {/* Stage 2b: Graph — center-to-outer edges with packets */}
      {graphCenterEdges.map((oi, i) => {
        const seg = trimSegment(
          graphCenter.cx, graphCenter.cy, graphCenter.r,
          graphOuter[oi].cx, graphOuter[oi].cy, graphOuter[oi].r,
          0.9,
        );
        const d = segPath(seg.x1, seg.y1, seg.x2, seg.y2);
        const L = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1).toFixed(1);

        return (
          <g key={`gce-${i}`} className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: `${0.38 + i * 0.025}s` }}>
            <path d={d} fill="none" stroke="var(--sch-bond)" strokeWidth="1.8" strokeOpacity="0.25" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#C41E3A" strokeWidth="5" strokeOpacity="0.15" strokeLinecap="round" filter="url(#pktGlow)" strokeDasharray={`3 ${L}`}>
              <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.8 + i * 0.1}s`} repeatCount="indefinite" />
            </path>
            <path d={d} fill="none" stroke="#C41E3A" strokeWidth="2" strokeOpacity="0.75" strokeLinecap="round" strokeDasharray={`2 ${L}`}>
              <animate attributeName="stroke-dashoffset" from="0" to={`-${L}`} dur="1.2s" begin={`${0.8 + i * 0.1}s`} repeatCount="indefinite" />
            </path>
          </g>
        );
      })}

      {/* Stage 2b: Graph — outer nodes */}
      {graphOuter.map((n, i) => (
        <g key={`gn-${i}`}>
          <circle cx={n.cx} cy={n.cy} r={n.r} fill="#06b6d4" fillOpacity="1"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{ animationDelay: `${0.4 + i * 0.03}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
          <circle cx={n.cx - 0.22 * n.r} cy={n.cy - 0.22 * n.r} r={0.46 * n.r}
            fill="white" fillOpacity="0.10"
            className={active ? "animate-scale-in" : "opacity-0"}
            style={{ animationDelay: `${0.4 + i * 0.03}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
        </g>
      ))}

      {/* Stage 2b: Graph — center atom (amber) */}
      <g>
        <circle cx={graphCenter.cx} cy={graphCenter.cy} r={graphCenter.r + 3}
          fill="#f59e0b" fillOpacity="0.12" filter="url(#pktGlow)"
          className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.44s" }}
        />
        <circle cx={graphCenter.cx} cy={graphCenter.cy} r={graphCenter.r}
          fill="#f59e0b" fillOpacity="1"
          className={active ? "animate-scale-in" : "opacity-0"}
          style={{ animationDelay: "0.44s", transformOrigin: `${graphCenter.cx}px ${graphCenter.cy}px` }}
        />
        <circle cx={graphCenter.cx - 0.22 * graphCenter.r} cy={graphCenter.cy - 0.22 * graphCenter.r} r={0.46 * graphCenter.r}
          fill="white" fillOpacity="0.15"
          className={active ? "animate-scale-in" : "opacity-0"}
          style={{ animationDelay: "0.44s", transformOrigin: `${graphCenter.cx}px ${graphCenter.cy}px` }}
        />
      </g>

      {/* Arrow 2 */}
      <g className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.7s" }}>
        <line x1="390" y1="75" x2="430" y2="75" stroke="#06b6d4" strokeWidth="2.2" strokeOpacity="0.7" markerEnd="url(#mlff-arrow)" />
      </g>

      {/* Stage 3: E_global label — "global" not italic */}
      <text
        x="500" y="8" textAnchor="middle"
        className={`fill-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.78s" }}
      >
        <tspan fontSize="15" fontWeight="bold" fontStyle="italic">E</tspan>
        <tspan fontSize="10" fontStyle="normal" dy="3">global</tspan>
      </text>

      {/* Stage 3: Force arrows first (below atoms) */}
      <g className={active ? "animate-fade-in" : "opacity-0"} style={{ animationDelay: "0.8s" }}>
        {outputAtoms.map((a, i) => {
          const mag = Math.hypot(a.dx, a.dy);
          const ux = a.dx / mag;
          const uy = a.dy / mag;
          // Shaft starts at atom edge, extends 1px into head for seamless join
          const sx = a.cx + ux * (a.r + 0.5);
          const sy = a.cy + uy * (a.r + 0.5);
          const tx = a.cx + a.dx;
          const ty = a.cy + a.dy;
          const hl = 4.5; // head length
          const hw = 2.8; // head half-width
          return (
            <g key={`force-${i}`}>
              {/* shaft extends 1px past head base for overlap */}
              <line x1={sx} y1={sy} x2={tx - (hl - 1) * ux} y2={ty - (hl - 1) * uy}
                stroke={a.fc} strokeWidth="1.8" strokeLinecap="round" />
              {/* head polygon — no stroke, same fill as shaft */}
              <polygon
                points={`${tx.toFixed(1)},${ty.toFixed(1)} ${(tx - hl * ux + hw * uy).toFixed(1)},${(ty - hl * uy - hw * ux).toFixed(1)} ${(tx - hl * ux - hw * uy).toFixed(1)},${(ty - hl * uy + hw * ux).toFixed(1)}`}
                fill={a.fc} />
            </g>
          );
        })}
        {/* Atoms on top (original colors, opaque) */}
        {outputAtoms.map((a, i) => (
          <g key={`out-${i}`}>
            <circle cx={a.cx} cy={a.cy} r={a.r} fill={a.color} fillOpacity="1" />
            <circle cx={a.cx - 0.22 * a.r} cy={a.cy - 0.22 * a.r} r={0.46 * a.r}
              fill="white" fillOpacity="0.10" />
          </g>
        ))}
      </g>

      {/* Labels */}
      <text x="80" y="150" textAnchor="middle" fontSize="13"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.15s" }}>Atoms</text>

      <text x="232" y="126" textAnchor="middle" fontSize="10"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.55s" }}>Descriptor</text>

      <text x="340" y="126" textAnchor="middle" fontSize="10"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.55s" }}>Graph</text>

      <text x="286" y="143" textAnchor="middle" fontSize="11.5" fontWeight="600"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.58s" }}>Local representation</text>

      <text x="500" y="150" textAnchor="middle" fontSize="13"
        className={`fill-muted-foreground ${active ? "animate-fade-in" : "opacity-0"}`}
        style={{ animationDelay: "0.85s" }}>
        E
        <tspan fontSize="9" dy="2">i</tspan>
        <tspan dy="-2">, F</tspan>
        <tspan fontSize="9" dy="2">i</tspan>
      </text>
    </svg>
  );
}
