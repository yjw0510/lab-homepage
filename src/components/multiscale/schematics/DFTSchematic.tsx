"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import { MathSvg } from "./MathSvg";
import { MATH_SVG } from "./mathSvgData";
import { schematicScale } from "./schematicType";

/* shared type + spacing scale (viewBox width 760) */
const TZ = schematicScale(760);

/* place a formula centred horizontally at xc with its baseline at yb, sized to
   the shared formula role so all cards render math at one consistent size */
function fdim(key: string) {
  const [, minY, vbW, vbH] = MATH_SVG[key].viewBox.split(/\s+/).map(Number);
  const s = TZ.formulaEm / 1000;
  return { w: +(vbW * s).toFixed(1), h: +(vbH * s).toFixed(1), ascent: +(-minY * s).toFixed(1) };
}
function Fx({ k, xc, yb, color }: { k: string; xc: number; yb: number; color: string }) {
  const d = fdim(k);
  return <MathSvg formulaKey={k} x={xc} y={yb - d.ascent} width={d.w} height={d.h} color={color} anchor="middle" />;
}

/**
 * DFT essence schematic — single phase drives everything.
 *
 * Left  : nuclear configuration (fixed nuclei, external potential).
 * Center: the SCF cycle — an animated electron-density cloud (Fourier contour
 *         with centroid lock + area preservation) wrapped by a sweeping ring
 *         whose head lights up at build / solve / update stages.
 * Right : converged output — total-energy functional and the MO ladder.
 */

/* ── palette ── */
const INK = "var(--sch-ink)";
const MUTED = "var(--sch-muted)";
const BOND = "var(--sch-bond)";
const AMBER = "var(--sch-amber)";
const AMBER_LABEL = "var(--sch-amber-label)";
const DENSITY = "var(--sch-density)";
const HAIRLINE = "#cbd5e1";

/* type roles from the shared scale (viewBox width 760) */
const FS_CAPTION = TZ.labelLg;  // build · solve · update · SCF cycle
const FS_SUB = TZ.labelMd;      // badge title: nuclear configuration
const FS_FRONTIER = TZ.labelMd; // MO ladder tags: LUMO · HOMO
const FS_ATOM_C = 30;           // atom letter — sized to the sphere, not the type scale
const FS_ATOM_O = 32;

/* ── geometry ── */
const RCX = 380, RCY = 262;               // cloud / ring center
const RRX = 140, RRY = 104;               // ring radii
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
function makeCloudPath(
  p: number, centerX: number, centerY: number,
  baseRx: number, baseRy: number, targetArea: number, inner: boolean,
) {
  const N = 192;
  const gB = bump(p, 0.22, 0.10);
  const gM = bump(p, 0.50, 0.14);
  const gS = bump(p, 0.78, 0.10);
  const amp = inner ? 0.55 : 0.85;
  const sigma = (inner ? 0.7 : 1) * (0.06 + 0.03 * (gB + gS) - 0.02 * gM);
  const ex = Math.exp(sigma), ey = Math.exp(-sigma);
  const g = (x: number) => Math.exp(-(x * x));

  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const th = (TAU * i) / N;
    const thWrap = th > Math.PI ? th - TAU : th;
    const lobeR = amp * 0.50 * g(thWrap / 0.50);
    const lobeL = amp * 0.50 * g((th - Math.PI) / 0.50);
    const lobeT = amp * 0.28 * g((th - Math.PI / 2) / 0.40);
    const lobeB = amp * 0.28 * g((th - 3 * Math.PI / 2) / 0.40);
    const nodal = -amp * 0.22 * (
      g((th - Math.PI / 4) / 0.30) +
      g((th - 3 * Math.PI / 4) / 0.30) +
      g((th - 5 * Math.PI / 4) / 0.30) +
      g((th - 7 * Math.PI / 4) / 0.30)
    );
    const asym = amp * 0.25 * (gB - gS) * Math.cos(th)
               + amp * 0.14 * gM * Math.cos(2 * th);
    let texture = 0.040 * Math.sin(5 * th + 0.7 * TAU * p)
                + 0.028 * Math.cos(7 * th - 1.3 * TAU * p)
                + 0.018 * Math.sin(9 * th + 2.1 * TAU * p)
                + 0.012 * Math.cos(11 * th + 0.3);
    if (inner) texture *= 0.5;
    let rho = 1.0 + lobeR + lobeL + lobeT + lobeB + nodal + asym + texture;
    rho = Math.max(0.45, rho);
    pts.push({ x: baseRx * ex * rho * Math.cos(th), y: baseRy * ey * rho * Math.sin(th) });
  }
  const { area, cx, cy } = polygonAreaCentroid(pts);
  const s = Math.sqrt(targetArea / Math.abs(area));
  return pointsToClosedPath(
    pts.map(pt => ({ x: centerX + (pt.x - cx) * s, y: centerY + (pt.y - cy) * s })),
  );
}

/* ── dimensional CPK atom ── */
function Atom({
  cx, cy, r, grad, label, fs,
}: {
  cx: number; cy: number; r: number; grad: string; label?: string; fs: number;
}) {
  return (
    <g>
      {/* contact shadow */}
      <ellipse cx={cx} cy={cy + r * 0.96} rx={r * 0.8} ry={r * 0.2}
        fill="rgba(15,23,42,0.2)" filter="url(#dft-atom-shadow)" />
      {/* sphere body */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${grad})`} />
      {/* rim */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(17,20,28,0.14)" strokeWidth={Math.max(0.5, r * 0.045)} />
      {/* soft highlight */}
      <ellipse cx={cx - r * 0.28} cy={cy - r * 0.32} rx={r * 0.52} ry={r * 0.42} fill="url(#dft-atom-hl)" />
      {/* crisp specular hotspot */}
      <circle cx={cx - r * 0.36} cy={cy - r * 0.4} r={Math.max(0.8, r * 0.12)} fill="#ffffff" fillOpacity="0.9" />
      {label ? (
        <text x={cx} y={cy + fs * 0.34} textAnchor="middle" fontSize={fs} fontWeight="600" fill="#ffffff" fillOpacity="0.92">{label}</text>
      ) : null}
    </g>
  );
}

/* ── component ── */

export function DFTSchematic({ active, ko = false }: { active: boolean; ko?: boolean }) {
  const reducedMotion = useReducedMotion();
  const phase = useMotionValue(0);

  useEffect(() => {
    if (!active || reducedMotion) { phase.set(0); return; }
    const c = animate(phase, 1, { duration: 6, ease: "linear", repeat: Infinity, repeatType: "loop" });
    return () => c.stop();
  }, [active, reducedMotion, phase]);

  const outerD = useTransform(phase, p =>
    makeCloudPath(p, RCX, RCY, 96, 90, Math.PI * 96 * 90, false));
  const innerD = useTransform(phase, p =>
    makeCloudPath(p, RCX, RCY, 66, 62, Math.PI * 66 * 62, true));
  const outerOp = useTransform(phase, [0, 0.22, 0.5, 0.78, 1], [0.75, 1.0, 0.85, 1.0, 0.75]);
  const innerOp = useTransform(phase, [0, 0.22, 0.5, 0.78, 1], [0.70, 1.0, 0.80, 1.0, 0.70]);

  const sweepD = useTransform(phase, v => {
    const head = Math.PI / 2 + v * TAU, tail = head - 0.6;
    return `M${(RCX + RRX * Math.cos(tail)).toFixed(1)},${(RCY + RRY * Math.sin(tail)).toFixed(1)} `
      + `A${RRX},${RRY} 0 0,1 ${(RCX + RRX * Math.cos(head)).toFixed(1)},${(RCY + RRY * Math.sin(head)).toFixed(1)}`;
  });
  const ghostD = useTransform(phase, v => {
    const head = Math.PI / 2 + v * TAU, gt = head - 2.0, gh = head - 0.6;
    return `M${(RCX + RRX * Math.cos(gt)).toFixed(1)},${(RCY + RRY * Math.sin(gt)).toFixed(1)} `
      + `A${RRX},${RRY} 0 0,1 ${(RCX + RRX * Math.cos(gh)).toFixed(1)},${(RCY + RRY * Math.sin(gh)).toFixed(1)}`;
  });
  const headX = useTransform(phase, v => RCX + RRX * Math.cos(Math.PI / 2 + v * TAU));
  const headY = useTransform(phase, v => RCY + RRY * Math.sin(Math.PI / 2 + v * TAU));
  const headGlowR = useTransform(phase, v => {
    const d = Math.min(Math.abs(v - 0.22), Math.abs(v - 0.50), Math.abs(v - 0.78), Math.abs(v), Math.abs(v - 1));
    return 6 + 7 * Math.max(0, 1 - d * 14);
  });
  const headGlowOp = useTransform(phase, v => {
    const d = Math.min(Math.abs(v - 0.22), Math.abs(v - 0.50), Math.abs(v - 0.78), Math.abs(v), Math.abs(v - 1));
    return 0.15 + 0.2 * Math.max(0, 1 - d * 14);
  });

  const f = active ? "animate-fade-in" : "opacity-0";

  /* left badge (wide enough for the title role + {R_A,Z_A}) */
  const LBX = 18, LBY = 128, LBW = 188, LBH = 268, LCX = LBX + LBW / 2;
  /* right badge */
  const RBX = 554, RBW = 188, RBY = 128, RBH = 268, RBCX = RBX + RBW / 2;
  /* mini molecule bond geometry */
  const mOD = 34, mOR = 12, mCR = 10.5;

  return (
    <svg viewBox="0 96 760 344" className="w-full h-auto" style={{ shapeRendering: "geometricPrecision" }}
      role="img" aria-label="DFT self-consistency cycle: electron density around fixed nuclei converging to total energy and orbital levels">
      <defs>
        <marker id="dft-a" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill={MUTED} />
        </marker>
        <marker id="dft-al" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill={AMBER} />
        </marker>
        <radialGradient id="dft-co" cx="50%" cy="50%">
          <stop offset="0%" stopColor={DENSITY} stopOpacity="0.48" />
          <stop offset="35%" stopColor={DENSITY} stopOpacity="0.32" />
          <stop offset="65%" stopColor={DENSITY} stopOpacity="0.16" />
          <stop offset="88%" stopColor={DENSITY} stopOpacity="0.05" />
          <stop offset="100%" stopColor={DENSITY} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dft-cin" cx="50%" cy="50%">
          <stop offset="0%" stopColor={DENSITY} stopOpacity="0.52" />
          <stop offset="40%" stopColor={DENSITY} stopOpacity="0.30" />
          <stop offset="75%" stopColor={DENSITY} stopOpacity="0.10" />
          <stop offset="100%" stopColor={DENSITY} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dft-o-sphere" cx="34%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffe6e6" />
          <stop offset="26%" stopColor="#f77a7a" />
          <stop offset="62%" stopColor="#dd4141" />
          <stop offset="86%" stopColor="#b62828" />
          <stop offset="100%" stopColor="#8d1b1b" />
        </radialGradient>
        <radialGradient id="dft-c-sphere" cx="34%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#eef1f5" />
          <stop offset="28%" stopColor="#adb4bf" />
          <stop offset="64%" stopColor="#6f7783" />
          <stop offset="88%" stopColor="#454c57" />
          <stop offset="100%" stopColor="#2a2f38" />
        </radialGradient>
        <radialGradient id="dft-atom-hl" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="dft-cb"><feGaussianBlur stdDeviation="10" /></filter>
        <filter id="dft-sb"><feGaussianBlur stdDeviation="3.4" /></filter>
        <filter id="dft-atom-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* ═══ 1. Nuclear configuration ═══ */}
      <g className={f} style={{ animationDelay: "0.1s" }}>
        <rect x={LBX} y={LBY} width={LBW} height={LBH} rx={18}
          fill="none" stroke={HAIRLINE} strokeWidth="1.4" />
        <text x={LCX} y={LBY + 28} textAnchor="middle" fontSize={FS_SUB} fill={MUTED} fillOpacity="0.7" fontWeight="500">{ko ? "핵 배치" : "nuclear"}</text>
        <text x={LCX} y={LBY + 28 + FS_SUB} textAnchor="middle" fontSize={FS_SUB} fill={MUTED} fillOpacity="0.7" fontWeight="500">{ko ? "배치" : "configuration"}</text>

        {/* mini O=C=O */}
        {(() => {
          const MY = LBY + 118;
          return <>
            <line x1={LCX - mOD + mOR} y1={MY - 3} x2={LCX - mCR} y2={MY - 3} stroke={BOND} strokeWidth="2" strokeLinecap="round" />
            <line x1={LCX - mOD + mOR} y1={MY + 3} x2={LCX - mCR} y2={MY + 3} stroke={BOND} strokeWidth="2" strokeLinecap="round" />
            <line x1={LCX + mCR} y1={MY - 3} x2={LCX + mOD - mOR} y2={MY - 3} stroke={BOND} strokeWidth="2" strokeLinecap="round" />
            <line x1={LCX + mCR} y1={MY + 3} x2={LCX + mOD - mOR} y2={MY + 3} stroke={BOND} strokeWidth="2" strokeLinecap="round" />
            <Atom cx={LCX - mOD} cy={MY} r={mOR} grad="dft-o-sphere" fs={0} />
            <Atom cx={LCX} cy={MY} r={mCR} grad="dft-c-sphere" fs={0} />
            <Atom cx={LCX + mOD} cy={MY} r={mOR} grad="dft-o-sphere" fs={0} />
          </>;
        })()}

        <Fx k="ra_za" xc={LCX} yb={LBY + 186} color={INK} />
        <Fx k="vext" xc={LCX} yb={LBY + 186 + TZ.formulaStack} color={INK} />
      </g>

      {/* arrow → cloud */}
      <path d={`M${LBX + LBW + 8},${RCY} L${RCX - RRX - 12},${RCY}`} stroke={MUTED} strokeWidth="2"
        fill="none" markerEnd="url(#dft-a)" className={f} style={{ animationDelay: "0.18s" }} />

      {/* ═══ 2. Density cloud ═══ */}
      <g className={active ? "animate-scale-in" : "opacity-0"} style={{ animationDelay: "0.25s", transformOrigin: `${RCX}px ${RCY}px` }}>
        <motion.path d={outerD} fill={DENSITY} fillOpacity={0.14} filter="url(#dft-cb)" />
        <motion.path d={outerD} fill="url(#dft-co)" style={{ opacity: outerOp }} />
        <motion.path d={innerD} fill="url(#dft-cin)" style={{ opacity: innerOp }} />
      </g>

      {/* ═══ O=C=O at nuclei ═══ */}
      <g className={f} style={{ animationDelay: "0.3s" }}>
        <line x1={RCX - 66 + 17} y1={RCY - 4} x2={RCX - 16} y2={RCY - 4} stroke={BOND} strokeWidth="3" strokeOpacity="0.72" strokeLinecap="round" />
        <line x1={RCX - 66 + 17} y1={RCY + 4} x2={RCX - 16} y2={RCY + 4} stroke={BOND} strokeWidth="3" strokeOpacity="0.72" strokeLinecap="round" />
        <line x1={RCX + 16} y1={RCY - 4} x2={RCX + 66 - 17} y2={RCY - 4} stroke={BOND} strokeWidth="3" strokeOpacity="0.72" strokeLinecap="round" />
        <line x1={RCX + 16} y1={RCY + 4} x2={RCX + 66 - 17} y2={RCY + 4} stroke={BOND} strokeWidth="3" strokeOpacity="0.72" strokeLinecap="round" />
        <Atom cx={RCX - 66} cy={RCY} r={17} grad="dft-o-sphere" label="O" fs={FS_ATOM_O} />
        <Atom cx={RCX + 66} cy={RCY} r={17} grad="dft-o-sphere" label="O" fs={FS_ATOM_O} />
        <Atom cx={RCX} cy={RCY} r={15} grad="dft-c-sphere" label="C" fs={FS_ATOM_C} />
      </g>

      {/* update ρ(r) */}
      <g className={f} style={{ animationDelay: "0.35s" }}>
        <text x={RCX - 46} y={RCY + RRY + 40} textAnchor="end" fontSize={FS_CAPTION} fill={AMBER_LABEL} fillOpacity="0.6" fontWeight="500" letterSpacing="0.5">{ko ? "갱신" : "update"}</text>
        <Fx k="rho" xc={RCX + 16} yb={RCY + RRY + 40} color={INK} />
      </g>

      {/* ═══ 3. SCF ring ═══ */}
      <path d={`M${RCX - 6},${RCY + RRY} A${RRX},${RRY} 0 1,1 ${RCX + 6},${RCY + RRY}`}
        fill="none" stroke={AMBER} strokeWidth="1.6" strokeOpacity="0.2" markerEnd="url(#dft-al)"
        className={f} style={{ animationDelay: "0.45s" }} />
      <g className={f} style={{ animationDelay: "0.45s" }}>
        {[0.22, 0.50, 0.78].map((p, i) => {
          const a = Math.PI / 2 + p * TAU;
          return <circle key={`sa${i}`} cx={Math.round(RCX + RRX * Math.cos(a))} cy={Math.round(RCY + RRY * Math.sin(a))} r={3} fill={AMBER} fillOpacity={0.35} />;
        })}
      </g>
      <g className={f} style={{ animationDelay: "0.6s" }}>
        <motion.path d={ghostD} fill="none" stroke={AMBER} strokeWidth="7" strokeOpacity={0.06} strokeLinecap="round" filter="url(#dft-sb)" />
        <motion.path d={sweepD} fill="none" stroke={AMBER} strokeWidth="14" strokeOpacity={0.12} strokeLinecap="round" filter="url(#dft-sb)" />
        <motion.path d={sweepD} fill="none" stroke={AMBER} strokeWidth="4" strokeOpacity={0.9} strokeLinecap="round" />
        <motion.circle cx={headX} cy={headY} r={headGlowR} fill={AMBER} style={{ fillOpacity: headGlowOp }} filter="url(#dft-sb)" />
        <motion.circle cx={headX} cy={headY} r={4} fill={AMBER} />
      </g>

      {/* ring labels — top row, clear of badges and ring */}
      <g className={f} style={{ animationDelay: "0.45s" }}>
        <text x={RCX} y={132} textAnchor="middle" fontSize={FS_CAPTION} fill={AMBER_LABEL} fillOpacity="0.45" fontWeight="400" letterSpacing="0.5">{ko ? "SCF 순환" : "SCF cycle"}</text>
        <text x={264} y={124} textAnchor="middle" fontSize={FS_CAPTION} fill={AMBER_LABEL} fillOpacity="0.6" fontWeight="500" letterSpacing="0.5">{ko ? "구성" : "build"}</text>
        <Fx k="veff" xc={264} yb={124 + TZ.labelToFormula} color={INK} />
        <text x={496} y={124} textAnchor="middle" fontSize={FS_CAPTION} fill={AMBER_LABEL} fillOpacity="0.6" fontWeight="500" letterSpacing="0.5">{ko ? "풀이" : "solve"}</text>
        <Fx k="phi_eps" xc={496} yb={124 + TZ.labelToFormula} color={INK} />
      </g>

      {/* arrow → output */}
      <path d={`M${RCX + RRX + 12},${RCY} L${RBX - 8},${RCY}`} stroke={MUTED} strokeWidth="2"
        fill="none" markerEnd="url(#dft-a)" className={f} style={{ animationDelay: "0.5s" }} />

      {/* ═══ 4. Output — E[ρ] + MO ladder ═══ */}
      <g className={f} style={{ animationDelay: "0.55s" }}>
        <rect x={RBX} y={RBY} width={RBW} height={RBH} rx={18} fill="none" stroke={HAIRLINE} strokeWidth="1.4" />
        <Fx k="erho" xc={RBCX} yb={RBY + 40} color={INK} />
        {(() => {
          const LX = RBX + 20, LW = 52, LBLX = LX + LW + 10;
          const top = RBY + 74, gap = 20;
          return <>
            {[0, 1, 2].map((i) => (
              <line key={`v${i}`} x1={LX} x2={LX + LW} y1={top + i * gap} y2={top + i * gap} stroke={HAIRLINE} strokeWidth="1.6" strokeOpacity="0.8" />
            ))}
            <line x1={LX} x2={LX + LW} y1={top + 3.4 * gap} y2={top + 3.4 * gap} stroke="#94a3b8" strokeWidth="3.2" strokeLinecap="round" />
            <text x={LBLX} y={top + 3.4 * gap + 6} fontSize={FS_FRONTIER} fontWeight="500" fill="#94a3b8">LUMO</text>
            <line x1={LX} x2={LX + LW} y1={top + 4.9 * gap} y2={top + 4.9 * gap} stroke="#f97316" strokeWidth="3.2" strokeLinecap="round" />
            <text x={LBLX} y={top + 4.9 * gap + 6} fontSize={FS_FRONTIER} fontWeight="500" fill="#f97316">HOMO</text>
            {[0, 1, 2].map((i) => (
              <line key={`o${i}`} x1={LX} x2={LX + LW} y1={top + (6.3 + i) * gap} y2={top + (6.3 + i) * gap} stroke={HAIRLINE} strokeWidth="1.6" strokeOpacity="0.8" />
            ))}
          </>;
        })()}
      </g>
    </svg>
  );
}
