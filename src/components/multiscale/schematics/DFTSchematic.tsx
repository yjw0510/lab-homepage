"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";

/**
 * DFT essence schematic — single phase drives everything.
 *
 * Cloud: Fourier contour model with centroid lock + area preservation.
 * Ring: active sweep arc + head marker.
 * All geometry scaled uniformly by SCALE = 1.3.
 */

/* ── scale system ── */
const SCALE = 1.3;
const u = (n: number) => +(n * SCALE).toFixed(1);

/* font tokens — sized for actual render scale (viewBox 910 at ~528px = 0.58×) */
const FS_MATH = +(22 * SCALE).toFixed(1);     // 28.6 → ~16.6px rendered
const FS_CAPTION = +(18 * SCALE).toFixed(1);  // 23.4 → ~13.6px rendered
const FS_SUB = +(15 * SCALE).toFixed(1);      // 19.5 → ~11.3px rendered
const FS_FRONTIER = +(20 * SCALE).toFixed(1); // 26.0 → ~15.1px rendered
const FS_ATOM = +(13 * SCALE).toFixed(1);     // 16.9 → ~9.8px rendered

const MATH_FILL = "var(--sch-ink)";
const MATH_OPACITY = 0.85;
const MATH_WEIGHT = 500;

/* ring geometry (scaled) */
const RCX = u(340), RCY = u(100), RRX = u(115), RRY = u(70);
const TAU = Math.PI * 2;

/* ── Fourier contour helpers ── */

type Pt = { x: number; y: number };

function phaseDiff(p: number, c: number) {
  let d = p - c;
  d -= Math.round(d);
  return d;
}

function bump(p: number, c: number, w: number) {
  const z = phaseDiff(p, c) / w;
  return Math.exp(-0.5 * z * z);
}

function polygonAreaCentroid(pts: Pt[]) {
  let twiceA = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const cross = a.x * b.y - b.x * a.y;
    twiceA += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  const area = twiceA / 2;
  return { area, cx: cx / (3 * twiceA), cy: cy / (3 * twiceA) };
}

function pointsToClosedPath(pts: Pt[]) {
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ") + " Z";
}

/**
 * Molecular-orbital-like contour generator.
 *
 * r(θ) is built from:
 *   1. Atom-centered Gaussian lobes (O at θ=0,π ; C perpendicular at π/2,3π/2)
 *   2. Nodal concavities between bonds (dips at π/4, 3π/4, 5π/4, 7π/4)
 *   3. Phase-dependent asymmetric breathing (dipolar + quadrupolar)
 *   4. High-frequency texture (harmonics 5,7,9,11) for organic irregularity
 *   5. Anisotropic stretch (area-preserving exp(σ)/exp(-σ))
 *
 * No first-harmonic (cos θ, sin θ) — centroid drift suppressed analytically.
 * Residual centroid and area corrected numerically after sampling.
 */
function makeCloudPath(
  p: number, centerX: number, centerY: number,
  baseRx: number, baseRy: number, targetArea: number, inner: boolean,
) {
  const N = 192;
  const gB = bump(p, 0.22, 0.10);
  const gM = bump(p, 0.50, 0.14);
  const gS = bump(p, 0.78, 0.10);

  const amp = inner ? 0.55 : 0.85;

  /* anisotropic stretch — mild, avoids excessive horizontal elongation */
  const sigma = (inner ? 0.7 : 1) * (0.06 + 0.03 * (gB + gS) - 0.02 * gM);
  const ex = Math.exp(sigma), ey = Math.exp(-sigma);

  /* Gaussian helper: exp(-x²) */
  const g = (x: number) => Math.exp(-(x * x));

  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const th = (TAU * i) / N;
    const thWrap = th > Math.PI ? th - TAU : th;

    /* atom-centered lobes — large, pronounced */
    const lobeR = amp * 0.50 * g(thWrap / 0.50);
    const lobeL = amp * 0.50 * g((th - Math.PI) / 0.50);
    const lobeT = amp * 0.28 * g((th - Math.PI / 2) / 0.40);
    const lobeB = amp * 0.28 * g((th - 3 * Math.PI / 2) / 0.40);

    /* nodal concavities — deep */
    const nodal = -amp * 0.22 * (
      g((th - Math.PI / 4) / 0.30) +
      g((th - 3 * Math.PI / 4) / 0.30) +
      g((th - 5 * Math.PI / 4) / 0.30) +
      g((th - 7 * Math.PI / 4) / 0.30)
    );

    /* phase-dependent asymmetric breathing — exaggerated */
    const asym = amp * 0.25 * (gB - gS) * Math.cos(th)
               + amp * 0.14 * gM * Math.cos(2 * th);

    /* high-frequency organic texture — stronger */
    let texture = 0.040 * Math.sin(5 * th + 0.7 * TAU * p)
                + 0.028 * Math.cos(7 * th - 1.3 * TAU * p)
                + 0.018 * Math.sin(9 * th + 2.1 * TAU * p)
                + 0.012 * Math.cos(11 * th + 0.3);
    if (inner) texture *= 0.5;

    let rho = 1.0 + lobeR + lobeL + lobeT + lobeB + nodal + asym + texture;
    rho = Math.max(0.45, rho);

    pts.push({
      x: baseRx * ex * rho * Math.cos(th),
      y: baseRy * ey * rho * Math.sin(th),
    });
  }

  const { area, cx, cy } = polygonAreaCentroid(pts);
  const s = Math.sqrt(targetArea / Math.abs(area));
  return pointsToClosedPath(
    pts.map(pt => ({ x: centerX + (pt.x - cx) * s, y: centerY + (pt.y - cy) * s })),
  );
}

/* ── component ── */

export function DFTSchematic({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion();
  const phase = useMotionValue(0);

  useEffect(() => {
    if (!active || reducedMotion) { phase.set(0); return; }
    const c = animate(phase, 1, {
      duration: 6, ease: "linear", repeat: Infinity, repeatType: "loop",
    });
    return () => c.stop();
  }, [active, reducedMotion, phase]);

  /* ── derived motion values ── */
  const outerD = useTransform(phase, p =>
    makeCloudPath(p, RCX, RCY, u(76), u(72), Math.PI * u(76) * u(72), false),
  );
  const innerD = useTransform(phase, p =>
    makeCloudPath(p, RCX, RCY, u(52), u(48), Math.PI * u(52) * u(48), true),
  );
  const outerOp = useTransform(phase, [0, 0.22, 0.5, 0.78, 1], [0.75, 1.0, 0.85, 1.0, 0.75]);
  const innerOp = useTransform(phase, [0, 0.22, 0.5, 0.78, 1], [0.70, 1.0, 0.80, 1.0, 0.70]);

  const sweepD = useTransform(phase, v => {
    const head = Math.PI / 2 + v * TAU, tail = head - 0.6;
    const x0 = (RCX + RRX * Math.cos(tail)).toFixed(1);
    const y0 = (RCY + RRY * Math.sin(tail)).toFixed(1);
    const x1 = (RCX + RRX * Math.cos(head)).toFixed(1);
    const y1 = (RCY + RRY * Math.sin(head)).toFixed(1);
    return `M${x0},${y0} A${RRX},${RRY} 0 0,1 ${x1},${y1}`;
  });
  const ghostD = useTransform(phase, v => {
    const head = Math.PI / 2 + v * TAU, gt = head - 2.0, gh = head - 0.6;
    const x0 = (RCX + RRX * Math.cos(gt)).toFixed(1);
    const y0 = (RCY + RRY * Math.sin(gt)).toFixed(1);
    const x1 = (RCX + RRX * Math.cos(gh)).toFixed(1);
    const y1 = (RCY + RRY * Math.sin(gh)).toFixed(1);
    return `M${x0},${y0} A${RRX},${RRY} 0 0,1 ${x1},${y1}`;
  });

  const headX = useTransform(phase, v => RCX + RRX * Math.cos(Math.PI / 2 + v * TAU));
  const headY = useTransform(phase, v => RCY + RRY * Math.sin(Math.PI / 2 + v * TAU));
  const headGlowR = useTransform(phase, v => {
    const d = Math.min(
      Math.abs(v - 0.22), Math.abs(v - 0.50), Math.abs(v - 0.78),
      Math.abs(v), Math.abs(v - 1),
    );
    return u(5) + u(5) * Math.max(0, 1 - d * 14);
  });
  const headGlowOp = useTransform(phase, v => {
    const d = Math.min(
      Math.abs(v - 0.22), Math.abs(v - 0.50), Math.abs(v - 0.78),
      Math.abs(v), Math.abs(v - 1),
    );
    return 0.15 + 0.2 * Math.max(0, 1 - d * 14);
  });

  const f = active ? "animate-fade-in" : "opacity-0";

  /* badge anchor for output ladder */
  const BX = u(510), BY = u(36);

  return (
    <svg viewBox="0 0 910 300" className="w-full h-44 sm:h-56" style={{ shapeRendering: "geometricPrecision" }}
      role="img" aria-label="DFT self-consistency cycle: electron density around fixed nuclei converging to total energy">
      <defs>
        <marker id="dft-a" markerWidth={u(8)} markerHeight={u(8)} refX={u(7)} refY={u(4)} orient="auto">
          <path d={`M0,0 L${u(8)},${u(4)} L0,${u(8)} z`} fill="var(--sch-muted)" />
        </marker>
        <marker id="dft-al" markerWidth={u(8)} markerHeight={u(8)} refX={u(7)} refY={u(4)} orient="auto">
          <path d={`M0,0 L${u(8)},${u(4)} L0,${u(8)} z`} fill="#d97706" />
        </marker>
        <radialGradient id="dft-co" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.48" />
          <stop offset="35%" stopColor="#1d4ed8" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#1d4ed8" stopOpacity="0.16" />
          <stop offset="88%" stopColor="#1d4ed8" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dft-cin" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.52" />
          <stop offset="40%" stopColor="#1d4ed8" stopOpacity="0.30" />
          <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>
        <filter id="dft-cb"><feGaussianBlur stdDeviation={u(8)} /></filter>
        <filter id="dft-sb"><feGaussianBlur stdDeviation={u(3)} /></filter>
      </defs>

      {/* ═══ 1. Nuclei badge ═══ */}
      {(() => {
        const NX = u(2);            // box left
        const NY = u(30);           // box top
        const NW = u(148);          // box width (wider for margin)
        const NH = u(140);          // box height (taller for margin)
        const NCX = NX + NW / 2;    // center x

        return <g className={f} style={{ animationDelay: "0.1s" }}>
          <rect x={NX} y={NY} width={NW} height={NH} rx={u(16)}
            fill="none" stroke="#cbd5e1" strokeWidth={u(1.5)} />

          {/* title */}
          <text x={NCX} y={NY + u(20)} textAnchor="middle" fontSize={FS_CAPTION}
            fill="var(--sch-muted)" fillOpacity="0.7" fontWeight="500">nuclear</text>
          <text x={NCX} y={NY + u(34)} textAnchor="middle" fontSize={FS_CAPTION}
            fill="var(--sch-muted)" fillOpacity="0.7" fontWeight="500">configuration</text>

          {/* mini O=C=O — proportional to center molecule, double bonds */}
          {(() => {
            const MY = NY + u(54);   // molecule y center
            const OD = u(27);        // O-C distance (proportional to center: 27/50 ≈ 7/13)
            const OR = u(7);         // O radius
            const CR = u(6);         // C radius
            const BD = u(2.5);       // bond line offset from center (for double bond)

            return <>
              {/* left O=C double bond */}
              <line x1={NCX - OD + OR} y1={MY - BD} x2={NCX - CR} y2={MY - BD}
                stroke="var(--sch-bond)" strokeWidth={u(1.6)} />
              <line x1={NCX - OD + OR} y1={MY + BD} x2={NCX - CR} y2={MY + BD}
                stroke="var(--sch-bond)" strokeWidth={u(1.6)} />
              {/* right C=O double bond */}
              <line x1={NCX + CR} y1={MY - BD} x2={NCX + OD - OR} y2={MY - BD}
                stroke="var(--sch-bond)" strokeWidth={u(1.6)} />
              <line x1={NCX + CR} y1={MY + BD} x2={NCX + OD - OR} y2={MY + BD}
                stroke="var(--sch-bond)" strokeWidth={u(1.6)} />
              {/* atoms */}
              <circle cx={NCX - OD} cy={MY} r={OR} fill="#ef4444" fillOpacity="0.7" />
              <circle cx={NCX} cy={MY} r={CR} fill="var(--sch-carbon)" fillOpacity="0.7" />
              <circle cx={NCX + OD} cy={MY} r={OR} fill="#ef4444" fillOpacity="0.7" />
              <text x={NCX - OD} y={MY + u(3)} textAnchor="middle" fontSize={u(8)}
                fontWeight="700" fill="white" fillOpacity="0.8">O</text>
              <text x={NCX} y={MY + u(3)} textAnchor="middle" fontSize={u(8)}
                fontWeight="700" fill="white" fillOpacity="0.8">C</text>
              <text x={NCX + OD} y={MY + u(3)} textAnchor="middle" fontSize={u(8)}
                fontWeight="700" fill="white" fillOpacity="0.8">O</text>
            </>;
          })()}

          {/* {R_A, Z_A} — gap below molecule */}
          <text x={NCX} y={NY + u(90)} textAnchor="middle"
            fontSize={FS_MATH} fill={MATH_FILL} fillOpacity={MATH_OPACITY} fontWeight={MATH_WEIGHT}>
            {"{"}
            <tspan fontStyle="italic">R</tspan>
            <tspan fontSize={FS_SUB} dy={u(4)}>A</tspan>
            <tspan dy={-u(4)}>,{" "}</tspan>
            <tspan fontStyle="italic">Z</tspan>
            <tspan fontSize={FS_SUB} dy={u(4)}>A</tspan>
            <tspan dy={-u(4)}>{"}"}</tspan>
          </text>

          {/* V_ext(r) */}
          <text x={NCX} y={NY + u(116)} textAnchor="middle"
            fontSize={FS_MATH} fill={MATH_FILL} fillOpacity={MATH_OPACITY} fontWeight={MATH_WEIGHT}>
            <tspan fontStyle="italic">V</tspan>
            <tspan fontSize={FS_SUB} dy={u(3)}>ext</tspan>
            <tspan dy={-u(3)}>(</tspan>
            <tspan fontStyle="italic">r</tspan>
            <tspan>)</tspan>
          </text>
        </g>;
      })()}

      {/* ═══ Arrow: nuclei → density ═══ */}
      <path d={`M${u(152)},${u(100)} L${u(222)},${u(100)}`} stroke="var(--sch-muted)" strokeWidth={u(2)}
        fill="none" markerEnd="url(#dft-a)" className={f} style={{ animationDelay: "0.18s" }} />

      {/* ═══ 2. Cloud — Fourier contour ═══ */}
      <g className={active ? "animate-scale-in" : "opacity-0"}
        style={{ animationDelay: "0.25s", transformOrigin: `${RCX}px ${RCY}px` }}>
        <motion.path d={outerD} fill="#1d4ed8" fillOpacity={0.14} filter="url(#dft-cb)" />
        <motion.path d={outerD} fill="url(#dft-co)" style={{ opacity: outerOp }} />
        <motion.path d={innerD} fill="url(#dft-cin)" style={{ opacity: innerOp }} />
      </g>

      {/* ═══ O=C=O — radii reflect C(77pm)>O(73pm), scaled ~40% for bond visibility ═══ */}
      <g className={f} style={{ animationDelay: "0.3s" }}>
        {/* double bonds: dark navy, thicker for visibility */}
        <line x1={u(290) + u(13)} y1={u(96)} x2={u(340) - u(12)} y2={u(96)}
          stroke="var(--sch-bond)" strokeWidth={u(2.5)} strokeOpacity="0.7" />
        <line x1={u(290) + u(13)} y1={u(104)} x2={u(340) - u(12)} y2={u(104)}
          stroke="var(--sch-bond)" strokeWidth={u(2.5)} strokeOpacity="0.7" />
        <line x1={u(340) + u(12)} y1={u(96)} x2={u(390) - u(13)} y2={u(96)}
          stroke="var(--sch-bond)" strokeWidth={u(2.5)} strokeOpacity="0.7" />
        <line x1={u(340) + u(12)} y1={u(104)} x2={u(390) - u(13)} y2={u(104)}
          stroke="var(--sch-bond)" strokeWidth={u(2.5)} strokeOpacity="0.7" />
        {/* O atoms: r_O ∝ 73pm → u(13) */}
        <circle cx={u(290)} cy={u(100)} r={u(13)} fill="#ef4444" fillOpacity="0.85" />
        <circle cx={u(390)} cy={u(100)} r={u(13)} fill="#ef4444" fillOpacity="0.85" />
        {/* C atom: r_C ∝ 77pm → u(12) (slightly smaller circle for visual, C<O in VdW) */}
        <circle cx={u(340)} cy={u(100)} r={u(12)} fill="var(--sch-carbon)" fillOpacity="0.85" />
        <text x={u(290)} y={u(100) + u(5)} textAnchor="middle" fontSize={FS_ATOM} fontWeight="700"
          fill="white" fillOpacity="0.9">O</text>
        <text x={u(340)} y={u(100) + u(4.5)} textAnchor="middle" fontSize={FS_ATOM} fontWeight="700"
          fill="white" fillOpacity="0.9">C</text>
        <text x={u(390)} y={u(100) + u(5)} textAnchor="middle" fontSize={FS_ATOM} fontWeight="700"
          fill="white" fillOpacity="0.9">O</text>
      </g>

      {/* ρ(r) + update tag */}
      <g className={f} style={{ animationDelay: "0.35s" }}>
        <text x={u(282)} y={u(192)} textAnchor="end" fontSize={FS_CAPTION} fill="#92400e"
          fillOpacity="0.6" fontWeight="500" letterSpacing="0.5">update</text>
        <text x={u(340)} y={u(192)} textAnchor="middle"
          fontSize={FS_MATH} fontWeight={MATH_WEIGHT} fill={MATH_FILL} fillOpacity={MATH_OPACITY}>
          <tspan fontStyle="italic">ρ</tspan>
          <tspan fontStyle="normal">(</tspan>
          <tspan fontStyle="italic">r</tspan>
          <tspan fontStyle="normal">)</tspan>
        </text>
      </g>

      {/* ═══ 3. SCF ring — base ═══ */}
      <path d={`M${RCX - u(6)},${RCY + RRY} A${RRX},${RRY} 0 1,1 ${RCX + u(6)},${RCY + RRY}`}
        fill="none" stroke="#d97706" strokeWidth={u(1.5)} strokeOpacity="0.2"
        markerEnd="url(#dft-al)" className={f} style={{ animationDelay: "0.45s" }} />

      {/* stage anchor dots */}
      <g className={f} style={{ animationDelay: "0.45s" }}>
        {[0.22, 0.50, 0.78].map((p, i) => {
          const a = Math.PI / 2 + p * TAU;
          return (
            <circle key={`sa${i}`}
              cx={Math.round(RCX + RRX * Math.cos(a))}
              cy={Math.round(RCY + RRY * Math.sin(a))}
              r={u(2.5)} fill="#d97706" fillOpacity={0.35} />
          );
        })}
      </g>

      {/* ═══ 3b. Active sweep ═══ */}
      <g className={f} style={{ animationDelay: "0.6s" }}>
        <motion.path d={ghostD} fill="none" stroke="#d97706" strokeWidth={u(6)}
          strokeOpacity={0.06} strokeLinecap="round" filter="url(#dft-sb)" />
        <motion.path d={sweepD} fill="none" stroke="#d97706" strokeWidth={u(12)}
          strokeOpacity={0.12} strokeLinecap="round" filter="url(#dft-sb)" />
        <motion.path d={sweepD} fill="none" stroke="#d97706" strokeWidth={u(3.5)}
          strokeOpacity={0.9} strokeLinecap="round" />
        <motion.circle cx={headX} cy={headY} r={headGlowR} fill="#d97706"
          style={{ fillOpacity: headGlowOp }} filter="url(#dft-sb)" />
        <motion.circle cx={headX} cy={headY} r={u(3.2)} fill="#d97706" />
      </g>

      {/* ═══ Ring labels — pushed away from ring to avoid overlap ═══ */}
      <g className={f} style={{ animationDelay: "0.45s" }}>
        <text x={u(340)} y={u(10)} textAnchor="middle" fontSize={FS_CAPTION} fill="#92400e"
          fillOpacity="0.45" fontWeight="400" letterSpacing="0.5">
          SCF cycle
        </text>

        {/* build V_eff[ρ] — upper-left, well above ring */}
        <text x={u(238)} y={u(22)} textAnchor="middle" fontSize={FS_CAPTION} fill="#92400e"
          fillOpacity="0.6" fontWeight="500" letterSpacing="0.5">build</text>
        <text x={u(238)} y={u(40)} textAnchor="middle"
          fontSize={FS_MATH} fill={MATH_FILL} fillOpacity={MATH_OPACITY} fontWeight={MATH_WEIGHT}>
          <tspan fontStyle="italic">V</tspan>
          <tspan fontSize={FS_SUB} dy={u(4)}>eff</tspan>
          <tspan dy={-u(4)}>[ρ]</tspan>
        </text>

        {/* solve φ_i, ε_i — upper-right, well above ring */}
        <text x={u(442)} y={u(22)} textAnchor="middle" fontSize={FS_CAPTION} fill="#92400e"
          fillOpacity="0.6" fontWeight="500" letterSpacing="0.5">solve</text>
        <text x={u(442)} y={u(40)} textAnchor="middle"
          fontSize={FS_MATH} fill={MATH_FILL} fillOpacity={MATH_OPACITY} fontWeight={MATH_WEIGHT}
          fontStyle="italic">
          φ<tspan fontSize={FS_SUB} dy={u(4)}>i</tspan>
          <tspan dy={-u(4)}>,{" "}ε</tspan>
          <tspan fontSize={FS_SUB} dy={u(4)}>i</tspan>
        </text>
      </g>

      {/* ═══ Arrow: density → output ═══ */}
      <path d={`M${u(458)},${u(100)} L${u(507)},${u(100)}`} stroke="var(--sch-muted)" strokeWidth={u(2)}
        fill="none" markerEnd="url(#dft-a)" className={f} style={{ animationDelay: "0.5s" }} />

      {/* ═══ 4. Output badge ═══ */}
      <g className={f} style={{ animationDelay: "0.55s" }}>
        {(() => {
          const BW = u(155) + 14;
          const BH = u(130) + 36;
          const BCX = BX + BW / 2;
          const LX = BX + 24;       // lines start (left side)
          const LW = 70;             // faint line width
          const LWF = 80;            // frontier line width
          const LBX = LX + LWF + 12; // label x (right of lines)

          return <>
            <rect x={BX} y={BY} width={BW} height={BH} rx={u(18)}
              fill="none" stroke="#cbd5e1" strokeWidth={u(1.5)} />

            {/* E[ρ] — upper center */}
            <text x={BCX} y={BY + u(32)} textAnchor="middle"
              fontSize={FS_MATH} fontWeight={MATH_WEIGHT} fill={MATH_FILL} fillOpacity={MATH_OPACITY}>
              <tspan fontStyle="italic">E</tspan>
              <tspan fontStyle="normal">[</tspan>
              <tspan fontStyle="italic">ρ</tspan>
              <tspan fontStyle="normal">]</tspan>
            </text>

            {/* MO ladder: all lines same width (LW), HOMO/LUMO thicker stroke */}
            {/* even spacing: 15px between each level */}
            {[68, 83, 98].map((dy, i) => (
              <line key={`virt-${i}`}
                x1={LX} x2={LX + LW} y1={BY + dy} y2={BY + dy}
                stroke="#cbd5e1" strokeWidth={u(1.4)} strokeOpacity="0.8" />
            ))}

            <line x1={LX} x2={LX + LW} y1={BY + 113} y2={BY + 113}
              stroke="#94a3b8" strokeWidth={u(2.8)} />
            <text x={LBX} y={BY + 119} fontSize={FS_FRONTIER}
              fontWeight="500" fill="#94a3b8">LUMO</text>

            <line x1={LX} x2={LX + LW} y1={BY + 143} y2={BY + 143}
              stroke="#f97316" strokeWidth={u(2.8)} />
            <text x={LBX} y={BY + 149} fontSize={FS_FRONTIER}
              fontWeight="500" fill="#f97316">HOMO</text>

            {[158, 173, 188].map((dy, i) => (
              <line key={`occ-${i}`}
                x1={LX} x2={LX + LW} y1={BY + dy} y2={BY + dy}
                stroke="#cbd5e1" strokeWidth={u(1.4)} strokeOpacity="0.8" />
            ))}
          </>;
        })()}
      </g>
    </svg>
  );
}
