"use client";

import { useEffect, useRef } from "react";
import { MathSvg } from "./MathSvg";
import { MATH_SVG } from "./mathSvgData";
import { AtomDefs, AtomPaintProvider, AtomSphere } from "./AtomSphere";

/**
 * AllAtomSchematic — Propanal force-field diagram.
 *
 * Animated glowing packet patrols Ha→Ox and circles around each.
 * viewBox 700×420. Content scaled by K=1.2, centered.
 */

const R = (n: number) => Math.round(n * 10) / 10;
const K = 1.2; // global scale factor (1.5 × 0.8 = 1.2)
const u = (n: number) => +(n * K).toFixed(1);

// ═══ Design tokens (all ×1.5) ═══

const S = {
  bond: u(3.0),
  shell: u(2.4),
  guideLJ: u(3.0),
  guideCoul: u(3.0),
  arc: u(5.0),
  tick: u(2.2),
  torsFront: u(4.5),
  torsBack: u(3.0),
  arrow: u(3.2),
};

// Five long display equations share this compact local scale so their leader
// lines remain inside the schematic viewBox. The svg is width-bound at every breakpoint
// (308px wide on a 390px phone, about 0.36px per unit), so `sub` and the formula em are set
// to clear the 9px floor there. The formulas grow less than `sub`: at 1.3x the LJ block runs
// into the non-bonded label and the torsion block leaves the viewBox.
const T = {
  atom: u(23 * 1.4),
  term: u(18 * 1.4),
  var: u(24),
  sub: u(12 * 1.4 * 1.3),
  formulaEm: u(12 * 1.4 * 1.12 * 1.12),
  delta: u(16 * 1.4),
  desc: u(14 * 1.4),
};

const C = {
  ink: "var(--sch-ink)",
  muted: "var(--sch-muted)",
  bond: "var(--sch-bond)",
  stretch: "var(--sch-stretch)",
  angle: "var(--sch-angle)",
  torsion: "var(--sch-amber)",
  // Nonbonded — modern accessible palette
  lj: "var(--sch-lj)",              // Deep Amethyst (Lennard-Jones)
  coulomb: "var(--sch-coulomb)",    // Electric Indigo (Coulombic force)
  deltaPlus: "var(--sch-delta-plus)",   // Sapphire Blue (δ+)
  deltaMinus: "var(--sch-delta-minus)", // Vibrant Fuchsia (δ−)
  oxygen: "#dc2626",
  carbon: "var(--sch-carbon)",
  hydrogen: "#f1f5f9",
};

// ═══ Atoms (all coords and radii ×1.5) ═══

const Ca   = { cx: u(270), cy: u(225), r: u(25.5) };
const Cp   = { cx: u(438), cy: u(214), r: u(25.5) };
const Ox   = { cx: u(468), cy: u(116), r: u(26.5) };
const Ha   = { cx: u(232), cy: u(142), r: u(11.5) };
const Cb   = { cx: u(188), cy: u(322), r: u(24.5) };
const Ha2  = { cx: u(282), cy: u(292), r: u(6.8) };
const Hald = { cx: u(460), cy: u(269), r: u(6.8) };
const Hm1  = { cx: u(192), cy: u(371), r: u(6.8) };
const Hm2  = { cx: u(155), cy: u(360), r: u(6.8) };
const Hm3  = { cx: u(138), cy: u(325), r: u(6.8) };

// ═══ Geometry ═══

function v(a: { cx: number; cy: number }, b: { cx: number; cy: number }) {
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const L = Math.sqrt(dx * dx + dy * dy);
  return { dx, dy, L, ux: dx / L, uy: dy / L };
}

function bline(a: typeof Ca, b: typeof Ca) {
  const { ux, uy } = v(a, b);
  return {
    x1: R(a.cx + a.r * ux), y1: R(a.cy + a.r * uy),
    x2: R(b.cx - b.r * ux), y2: R(b.cy - b.r * uy),
  };
}

/** C-shaped cubic Bézier (single-arc, no inflection). bulge = perpendicular offset. */
function makeCCurve(x1: number, y1: number, x2: number, y2: number, bulge: number) {
  const mx = (x1 + x2) / 2 + bulge;
  return `M ${R(x1)} ${R(y1)} C ${R(mx)} ${R(y1)}, ${R(mx)} ${R(y2)}, ${R(x2)} ${R(y2)}`;
}

// Non-bonded label anchor (left edge and baseline), shared by the label and its leader.
const NB_LABEL_X = u(240);
const NB_LABEL_Y = u(47);
// Centre of the Coulomb-coloured word ("charges" / "전하 힘") from the label's left edge, measured
// in Pretendard (EN 460-556, KO 414-489 user units). The Coulomb leader starts under that word;
// started at the label's left edge it ran out from under LJ's closing bracket and read as LJ's.
const NB_CHARGES_DX = { en: 220, ko: 163 };

// ═══ Label stack helper ═══

function LabelStack({ x, y, term, variable, vColor }: {
  x: number; y: number; term: string; variable: string; vColor: string;
}) {
  return (
    <text x={x} y={y} textAnchor="middle">
      <tspan fill={C.ink} fontSize={T.term} fontWeight="600">{term}</tspan>
      <tspan x={x} dy={u(26)} fill={vColor} fontSize={T.var} fontWeight="700" fontStyle="italic">{variable}</tspan>
    </text>
  );
}

// ═══ Component ═══

export function AllAtomSchematic({ active, ko = false }: { active: boolean; ko?: boolean }) {
  const anim = (delay: number) =>
    active
      ? ({ className: "animate-fade-in", style: { animationDelay: `${delay}s` } } as const)
      : ({ className: "opacity-0" } as const);

  // Animated glowing packet — patrols Ha↔Ox, circles each atom
  const packetRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const rafRef = useRef(0);

  // Pre-compute emitter geometry at module level for initial positions
  const emAngHO = Math.atan2(Ox.cy - Ha.cy, Ox.cx - Ha.cx);
  const emAngOH = emAngHO + Math.PI;
  const emHR = u(30), emOR = u(38);
  // Ha orbit starts at the Ox-facing point; Ox orbit starts at the Ha-facing point
  const emHaStart = { x: R(Ha.cx + emHR * Math.cos(emAngHO)), y: R(Ha.cy + emHR * Math.sin(emAngHO)) };
  const emOxStart = { x: R(Ox.cx + emOR * Math.cos(emAngOH)), y: R(Ox.cy + emOR * Math.sin(emAngOH)) };

  useEffect(() => {
    if (!active) return;
    let t = 0;
    const HX = Ha.cx, HY = Ha.cy, OX = Ox.cx, OY = Ox.cy;

    // Cycle: orbit Ha (full circle) → transit → orbit Ox (full circle) → transit
    // Both orbits start/end at the Ox-facing / Ha-facing point (on the connecting line)
    // Transit is a straight line between shell boundaries (follows the guide line)
    const step = () => {
      t += 0.004;
      const phase = t % 3.0;
      let px: number, py: number;

      if (phase < 1.0) {
        // Orbit around Ha: starts at angHO (Ox-facing), full CCW circle
        const a = emAngHO + phase * Math.PI * 2;
        px = HX + emHR * Math.cos(a);
        py = HY + emHR * Math.sin(a);
      } else if (phase < 1.5) {
        // Transit: straight line from Ha shell to Ox shell (along guide line)
        const f = (phase - 1.0) / 0.5;
        px = emHaStart.x + f * (emOxStart.x - emHaStart.x);
        py = emHaStart.y + f * (emOxStart.y - emHaStart.y);
      } else if (phase < 2.5) {
        // Orbit around Ox: starts at angOH (Ha-facing), full CCW circle
        const a = emAngOH + (phase - 1.5) * Math.PI * 2;
        px = OX + emOR * Math.cos(a);
        py = OY + emOR * Math.sin(a);
      } else {
        // Transit: straight line from Ox shell back to Ha shell
        const f = (phase - 2.5) / 0.5;
        px = emOxStart.x + f * (emHaStart.x - emOxStart.x);
        py = emOxStart.y + f * (emHaStart.y - emOxStart.y);
      }

      const pxR = Math.round(px * 10) / 10;
      const pyR = Math.round(py * 10) / 10;
      packetRef.current?.setAttribute("cx", String(pxR));
      packetRef.current?.setAttribute("cy", String(pyR));
      glowRef.current?.setAttribute("cx", String(pxR));
      glowRef.current?.setAttribute("cy", String(pyR));
      rafRef.current = requestAnimationFrame(step);
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(step);
    }, 900);

    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [active, emAngHO, emAngOH, emHR, emOR, emHaStart.x, emHaStart.y, emOxStart.x, emOxStart.y]);

  const bond = v(Ca, Cp);

  const cbCa = v(Cb, Ca);
  const cbCaN = { x: -cbCa.uy, y: cbCa.ux };

  const cpO = v(Cp, Ox);
  const dblN = { x: -cpO.uy, y: cpO.ux };

  const angO  = Math.atan2(Ox.cy - Cp.cy, Ox.cx - Cp.cx);
  const angCa = Math.atan2(Ca.cy - Cp.cy, Ca.cx - Cp.cx);
  const arcR  = u(50);
  const pArcO  = { x: R(Cp.cx + arcR * Math.cos(angO)),  y: R(Cp.cy + arcR * Math.sin(angO)) };
  const pArcCa = { x: R(Cp.cx + arcR * Math.cos(angCa)), y: R(Cp.cy + arcR * Math.sin(angCa)) };

  const coMidX = (Cp.cx + Ox.cx) / 2;
  const coMidY = (Cp.cy + Ox.cy) / 2;
  const angleLabelX = R(coMidX + u(75) * (-cpO.uy));
  const angleLabelY = R(coMidY + u(75) * cpO.ux);

  const caHa = v(Ca, Ha);
  const wN = { x: -caHa.uy, y: caHa.ux };

  const caHa2 = v(Ca, Ha2);
  const dN = { x: -caHa2.uy, y: caHa2.ux };

  const colCx = (Ca.cx + Cp.cx) / 2;
  const colCy = (Ca.cy + Cp.cy) / 2;
  const colRx = u(16), colRy = u(30);
  const bAngDeg = R(Math.atan2(bond.dy, bond.dx) * 180 / Math.PI);
  const tEnd = 1.25;
  const tPx = R(colRx * Math.cos(tEnd));
  const tPy = R(colRy * Math.sin(tEnd));
  const tdx = -colRx * Math.sin(tEnd), tdy = colRy * Math.cos(tEnd);
  const tL = Math.sqrt(tdx * tdx + tdy * tdy);
  const tnx = tdx / tL, tny = tdy / tL;
  const ah = u(10), aw = u(5);
  const tipX = tPx + tnx * ah, tipY = tPy + tny * ah;
  const bsX = tPx - tnx * u(2), bsY = tPy - tny * u(2);

  const stretchOff = u(15);
  const strNx = -cbCaN.x, strNy = -cbCaN.y;
  const strSx = Cb.cx + (Cb.r + u(8)) * cbCa.ux + stretchOff * strNx;
  const strSy = Cb.cy + (Cb.r + u(8)) * cbCa.uy + stretchOff * strNy;
  const strEx = Ca.cx - (Ca.r + u(8)) * cbCa.ux + stretchOff * strNx;
  const strEy = Ca.cy - (Ca.r + u(8)) * cbCa.uy + stretchOff * strNy;

  const dblS = { x: Cp.cx + Cp.r * cpO.ux, y: Cp.cy + Cp.r * cpO.uy };
  const dblE = { x: Ox.cx - Ox.r * cpO.ux, y: Ox.cy - Ox.r * cpO.uy };

  // Left edge at -78, not -50. The LJ/Coulomb block starts at ljLx = u(-25) = -30 and the content
  // group is translated -40, so its left edge lands at -70 in viewBox units and the viewport
  // cropped the leading U of U_LJ and U_Coul. Widening the box moves nothing relative to anything
  // else; it only stops the crop.
  // The box is the drawn extent (LJ block -69, angle leader 776, label top 8, torsion bottom
  // 469) plus 6 units, and the height follows the width. A fixed h-64 letterboxed the
  // width-bound drawing and left this row 90px taller than the other three.
  return (
    <svg viewBox="-76 2 858 474" className="w-full h-auto" style={{ shapeRendering: "geometricPrecision" }}
      role="img" aria-label={ko
        ? "결합의 길이와 각도, 결합 주위 회전, 가까운 원자 사이 힘을 합쳐 분자의 에너지를 계산한다"
        : "Molecular energy combines bond lengths and angles, rotation around bonds, and forces between nearby atoms"}>
      <AtomPaintProvider>
      <defs>
        <AtomDefs />
        <mask id="aa-mask">
          <rect x="-50" width="850" height="480" fill="white" />
          {[Ca, Cp, Ox, Ha].map((a, i) => (
            <circle key={i} cx={a.cx} cy={a.cy} r={a.r + u(3)} fill="black" />
          ))}
        </mask>
        <radialGradient id="aa-glow">
          <stop offset="0%" stopColor={C.coulomb} stopOpacity="0.45" />
          <stop offset="50%" stopColor={C.coulomb} stopOpacity="0.15" />
          <stop offset="100%" stopColor={C.coulomb} stopOpacity="0" />
        </radialGradient>
        <marker id="aa-arr" markerUnits="userSpaceOnUse"
          markerWidth={u(14)} markerHeight={u(10)} refX={u(2)} refY={u(4.5)}
          orient="auto-start-reverse">
          <path d={`M0,0 L${u(12)},${u(4.5)} L0,${u(9)} L${u(3)},${u(4.5)} Z`} fill={C.stretch} />
        </marker>
      </defs>

      {/* Center the 1.5×-scaled content in the 700×420 viewBox */}
      <g transform="translate(-40,-20)">

      {/* ═══ L1: Peripheral ═══ */}
      <g opacity={0.12} {...anim(0.1)}>
        {([[Cb, Ca], [Cb, Hm1], [Cb, Hm2], [Cb, Hm3], [Cp, Hald]] as [typeof Ca, typeof Ca][]).map(([a, b], i) => {
          const bl = bline(a, b);
          return <line key={`q${i}`} {...bl} stroke="var(--sch-peripheral)" strokeWidth={S.bond} strokeLinecap="round" />;
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const tS = Ca.r / caHa2.L, tE = 1 - Ha2.r / caHa2.L;
          const t = tS + ((i + 1.25) / 8) * (tE - tS);
          const x = Ca.cx + t * caHa2.dx, y = Ca.cy + t * caHa2.dy;
          const w = u(3.5) * ((t - tS) / (tE - tS));
          return <line key={`d${i}`}
            x1={R(x + w * dN.x)} y1={R(y + w * dN.y)}
            x2={R(x - w * dN.x)} y2={R(y - w * dN.y)}
            stroke="var(--sch-peripheral)" strokeWidth={u(1.3)} strokeLinecap="round" />;
        })}
        {([
          { a: Cb, grad: "atomg-c", label: "C" },
          { a: Ha2, grad: "atomg-h" }, { a: Hald, grad: "atomg-h" },
          { a: Hm1, grad: "atomg-h" }, { a: Hm2, grad: "atomg-h" }, { a: Hm3, grad: "atomg-h" },
        ] as const).map((item, i) => (
          <AtomSphere key={`n${i}`} cx={item.a.cx} cy={item.a.cy} r={item.a.r} grad={item.grad}
            label={"label" in item ? item.label : undefined} fs={u(22)} shadow={false} />
        ))}
      </g>

      {/* ═══ L2: 1-4 nonbonded ═══ */}
      <g {...anim(0.85)}>
        <circle cx={Ha.cx} cy={Ha.cy} r={u(30)} fill="none"
          stroke={C.lj} strokeWidth={S.shell} strokeDasharray={`${u(6)} ${u(4)}`} strokeOpacity="0.32" />
        <circle cx={Ox.cx} cy={Ox.cy} r={u(38)} fill="none"
          stroke={C.lj} strokeWidth={S.shell} strokeDasharray={`${u(6)} ${u(4)}`} strokeOpacity="0.32" />
        {/* Guide lines end at shell boundaries, not atom centers */}
        {(() => {
          const dx = Ox.cx - Ha.cx, dy = Ox.cy - Ha.cy;
          const L = Math.sqrt(dx*dx + dy*dy);
          const eux = dx/L, euy = dy/L;
          const hR = u(30), oR = u(38); // shell radii
          return <>
            <line x1={R(Ha.cx + hR*eux)} y1={R(Ha.cy + hR*euy)}
                  x2={R(Ox.cx - oR*eux)} y2={R(Ox.cy - oR*euy)}
              stroke={C.lj} strokeWidth={S.guideLJ} strokeDasharray={`${u(6)} ${u(5)}`} strokeOpacity="0.30" />
            <line x1={R(Ha.cx + hR*eux + u(3))} y1={R(Ha.cy + hR*euy + u(5))}
                  x2={R(Ox.cx - oR*eux + u(3))} y2={R(Ox.cy - oR*euy + u(5))}
              stroke={C.coulomb} strokeWidth={S.guideCoul} strokeDasharray={`${u(8)} ${u(5)}`} strokeOpacity="0.40" />
          </>;
        })()}
        {/* Animated glowing packet */}
        <circle ref={glowRef} cx={emHaStart.x} cy={emHaStart.y} r={u(14)}
          fill="url(#aa-glow)" />
        <circle ref={packetRef} cx={emHaStart.x} cy={emHaStart.y} r={u(3.5)}
          fill={C.coulomb} fillOpacity="0.85" />
      </g>

      {/* ═══ L3: Quartet bonds ═══ */}
      <g {...anim(0.2)}>
        {(() => { const b = bline(Ca, Cp); return <line {...b} stroke={C.bond} strokeWidth={S.bond} strokeLinecap="round" />; })()}
        <line x1={R(dblS.x + u(3) * dblN.x)} y1={R(dblS.y + u(3) * dblN.y)}
              x2={R(dblE.x + u(3) * dblN.x)} y2={R(dblE.y + u(3) * dblN.y)}
              stroke={C.bond} strokeWidth={S.bond} strokeLinecap="round" />
        <line x1={R(dblS.x - u(3) * dblN.x)} y1={R(dblS.y - u(3) * dblN.y)}
              x2={R(dblE.x - u(3) * dblN.x)} y2={R(dblE.y - u(3) * dblN.y)}
              stroke={C.bond} strokeWidth={S.bond} strokeLinecap="round" />
        <polygon points={[
          `${R(Ca.cx + Ca.r * caHa.ux)},${R(Ca.cy + Ca.r * caHa.uy)}`,
          `${R(Ha.cx - (Ha.r - u(2)) * caHa.ux + u(3.5) * wN.x)},${R(Ha.cy - (Ha.r - u(2)) * caHa.uy + u(3.5) * wN.y)}`,
          `${R(Ha.cx - (Ha.r - u(2)) * caHa.ux - u(3.5) * wN.x)},${R(Ha.cy - (Ha.r - u(2)) * caHa.uy - u(3.5) * wN.y)}`,
        ].join(" ")} fill={C.bond} />
      </g>

      {/* ═══ L4: Glyphs (masked) ═══ */}
      <g mask="url(#aa-mask)">
        <g {...anim(0.5)}>
          <line x1={R(strSx)} y1={R(strSy)} x2={R(strEx)} y2={R(strEy)}
            stroke={C.stretch} strokeWidth={S.arrow} strokeOpacity="0.85" strokeLinecap="round"
            markerStart="url(#aa-arr)" markerEnd="url(#aa-arr)" />
        </g>

        <g {...anim(0.6)}>
          <path d={`M${Cp.cx},${Cp.cy} L${pArcO.x},${pArcO.y} A${arcR},${arcR} 0 0,0 ${pArcCa.x},${pArcCa.y} Z`}
            fill={C.angle} fillOpacity="0.08" />
          <path d={`M${pArcO.x},${pArcO.y} A${arcR},${arcR} 0 0,0 ${pArcCa.x},${pArcCa.y}`}
            fill="none" stroke={C.angle} strokeWidth={S.arc} strokeLinecap="round" strokeOpacity="0.6" />
          {[0.25, 0.5, 0.75].map((t, i) => {
            const span = 2 * Math.PI - (angCa - angO);
            const a = angO - t * span;
            return <line key={`t${i}`}
              x1={R(Cp.cx + (arcR - u(4)) * Math.cos(a))} y1={R(Cp.cy + (arcR - u(4)) * Math.sin(a))}
              x2={R(Cp.cx + (arcR + u(5)) * Math.cos(a))} y2={R(Cp.cy + (arcR + u(5)) * Math.sin(a))}
              stroke={C.angle} strokeWidth={S.tick} strokeOpacity="0.5" strokeLinecap="round" />;
          })}
        </g>

        <g {...anim(0.7)} transform={`translate(${R(colCx)},${R(colCy)}) rotate(${bAngDeg})`}>
          <path d={`M0,-${colRy} A${colRx},${colRy} 0 0,0 0,${colRy}`}
            fill="none" stroke={C.torsion} strokeWidth={S.torsBack} strokeDasharray={`${u(5)} ${u(3)}`}
            strokeOpacity="0.4" strokeLinecap="round" />
          <path d={`M0,-${colRy} A${colRx},${colRy} 0 0,1 ${tPx},${tPy}`}
            fill="none" stroke={C.torsion} strokeWidth={S.torsFront} strokeLinecap="round"
            strokeOpacity="0.7" />
          <polygon points={[
            `${R(tipX)},${R(tipY)}`,
            `${R(bsX + tny * aw)},${R(bsY - tnx * aw)}`,
            `${R(bsX - tny * aw)},${R(bsY + tnx * aw)}`,
          ].join(" ")} fill={C.torsion} stroke={C.torsion} strokeWidth={u(1.5)}
            strokeLinejoin="round" fillOpacity="0.7" />
        </g>
      </g>

      {/* ═══ L5: Quartet atoms ═══ */}
      <g {...anim(0.15)}>
        {([
          { a: Ca, grad: "atomg-c", label: "C" },
          { a: Cp, grad: "atomg-c", label: "C" },
          { a: Ox, grad: "atomg-o", label: "O" },
          { a: Ha, grad: "atomg-h", label: "" },
        ]).map(({ a, grad, label }, i) => (
          <AtomSphere key={`a${i}`} cx={a.cx} cy={a.cy} r={a.r} grad={grad} label={label || undefined} fs={T.atom} />
        ))}
      </g>

      {/* ═══ L6: Labels ═══ */}
      <g {...anim(1.0)}>
        {/* Flush left at a fixed x so the leader start does not depend on the language, and
            raised so the wider sub-label clears the O shell below it and the LJ block beside it. */}
        <text x={NB_LABEL_X} y={NB_LABEL_Y}>
          <tspan fill={C.ink} fontSize={T.term} fontWeight="600">{ko ? "비결합 원자 사이" : "non-bonded atoms"}</tspan>
          <tspan x={NB_LABEL_X} dy={u(22)} fontSize={T.sub} fontWeight="500">
            <tspan fill={C.lj}>{ko ? "단거리 힘" : "short-range"}</tspan>
            <tspan fill={C.muted}> + </tspan>
            <tspan fill={C.coulomb}>{ko ? "전하 힘" : "charges"}</tspan>
          </tspan>
        </text>

        <text x={u(138)} y={u(253)} textAnchor="middle">
          <tspan fill={C.ink} fontSize={T.term} fontWeight="600">{ko ? "결합 신축" : "bond stretch"}</tspan>
          <tspan fill={C.stretch} fontSize={T.var} fontWeight="700" fontStyle="italic" dx={u(8)}>r</tspan>
        </text>

        <LabelStack x={angleLabelX} y={angleLabelY} term={ko ? "각 굽힘" : "angle bend"} variable="θ" vColor={C.angle} />

        <text x={colCx + u(12)} y={colCy + u(64)} textAnchor="middle">
          <tspan fill={C.ink} fontSize={T.term} fontWeight="600">{ko ? "결합 회전" : "bond rotation"}</tspan>
          <tspan x={colCx + u(12)} dy={u(26)} fill={C.torsion} fontSize={T.var} fontWeight="700" fontStyle="italic">φ</tspan>
        </text>

        <text x={Ha.cx - u(28) - 25} y={Ha.cy - u(16) + 25} textAnchor="middle"
          fontSize={T.delta} fill={C.deltaPlus} fontWeight="600">δ+</text>
        <text x={u(518)} y={u(96)} textAnchor="middle"
          fontSize={T.delta} fill={C.deltaMinus} fontWeight="600">δ−</text>
      </g>

      {/* ═══ L7: Formula Leader Lines + MathJax SVG ═══ */}
      {(() => {
        // MathJax SVG uses 1000 internal units per em (documented).
        // targetEm: the em-size we want in parent SVG user units.
        // width = vbW × targetEm / 1000, height = vbH × targetEm / 1000
        const FORMULA_EM = T.formulaEm;

        const formulaBox = (key: string) => {
          const [, , vbW, vbH] = MATH_SVG[key].viewBox.split(/\s+/).map(Number);
          const scale = FORMULA_EM / 1000;
          return { w: R(vbW * scale), h: R(vbH * scale) };
        };
        const lj = formulaBox("lj"), coul = formulaBox("coulomb");
        const bnd = formulaBox("bond"), ang = formulaBox("angle"), dih = formulaBox("dihedral");

        // ─── Formula positions ───
        // LJ + Coulomb: left-aligned, pushed left. Phantom in LJ aligns "=" with Coulomb.
        // LJ sits level with the non-bonded label it ends beside, so it needs no leader of its
        // own; Coulomb is stacked close under it so its leader can pass below LJ's last bracket.
        const ljLx  = u(-25);
        const ljY   = u(27);
        const coulY = ljY + lj.h + u(2) + 20;

        const bndLx = u(55);
        const bndY  = u(365) + 15;

        const angLx = u(481);
        const angY  = u(58) - 10;

        const dihLx = u(410);
        const dihY  = u(365);

        // ─── Leader line start: mean y of label, with gap from text ───
        const gap = u(5); // small gap between text edge and curve start
        const nbStartX = NB_LABEL_X + NB_CHARGES_DX[ko ? "ko" : "en"];
        const nbStartY = NB_LABEL_Y + u(22) + u(8); // below the sub-label's descenders

        const bsStartX = u(60) - gap;
        const bsStartY = u(253);

        const abStartX = R(angleLabelX + u(75) + gap);
        const abStartY = angleLabelY;

        // Under the φ, which is centred on the label at either language. The old start sat
        // inside the label's span, above its baseline, so the leader grew out of "rotation".
        const dhStartX = R(colCx + u(12));
        const dhStartY = R(colCy + u(64) + u(26) + u(8));

        // ─── Leader line endpoints at formula edges ───
        const coulEndX = R(ljLx + coul.w + u(3)); // right side of Coulomb + gap
        const coulEndY = R(coulY + coul.h * 0.25); // level with the numerator, so the leader clears the H shell
        const bndEndX  = bndLx - u(4);            // left side of Bond + gap
        const bndEndY  = R(bndY + bnd.h / 2);
        const angEndX  = R(angLx + ang.w + u(4)); // right side of Angle + gap
        const angEndY  = R(angY + ang.h / 2);
        const dihEndX  = dihLx - u(4);            // left side of Dihedral + gap
        const dihEndY  = R(dihY + dih.h * 0.38);

        return (
          <g {...anim(1.2)}>
            <g strokeWidth={u(1.5)} strokeOpacity="0.5" strokeLinecap="round" fill="none">
              {/* "charges" → Coulomb: drops first, then sweeps left under LJ */}
              <path d={`M ${R(nbStartX)} ${R(nbStartY)} C ${R(nbStartX)} ${R(nbStartY + u(30))}, ${R(coulEndX + u(30))} ${R(coulEndY)}, ${R(coulEndX)} ${R(coulEndY)}`} stroke={C.coulomb} />
              <circle cx={coulEndX} cy={coulEndY} r={u(2)} fill={C.coulomb} />

              {/* C-curve: bond stretch → bond formula (bows left) */}
              <path d={makeCCurve(bsStartX, bsStartY, bndEndX, bndEndY, -u(50))} stroke={C.stretch} />
              <circle cx={bndEndX} cy={bndEndY} r={u(2)} fill={C.stretch} />

              {/* C-curve: angle bend → angle formula (bows right) */}
              <path d={makeCCurve(abStartX, abStartY, angEndX, angEndY, u(50))} stroke={C.angle} />
              <circle cx={angEndX} cy={angEndY} r={u(2)} fill={C.angle} />

              {/* φ → dihedral formula: drops first, then sweeps right into the formula */}
              <path d={`M ${dhStartX} ${dhStartY} C ${dhStartX} ${R(dhStartY + u(30))}, ${R(dihEndX - u(30))} ${dihEndY}, ${dihEndX} ${dihEndY}`} stroke={C.torsion} />
              <circle cx={dihEndX} cy={dihEndY} r={u(2)} fill={C.torsion} />
            </g>

            <MathSvg formulaKey="lj"       x={ljLx}  y={ljY}   width={lj.w}  height={lj.h}   color={C.lj}      anchor="start" />
            <MathSvg formulaKey="coulomb"   x={ljLx}  y={coulY} width={coul.w} height={coul.h} color={C.coulomb} anchor="start" />
            <MathSvg formulaKey="bond"      x={bndLx} y={bndY}  width={bnd.w} height={bnd.h}  color={C.stretch} anchor="start" />
            <MathSvg formulaKey="angle"     x={angLx} y={angY}  width={ang.w} height={ang.h}  color={C.angle}   anchor="start" />
            <MathSvg formulaKey="dihedral"  x={dihLx} y={dihY}  width={dih.w} height={dih.h}  color={C.torsion} anchor="start" />
          </g>
        );
      })()}

      </g>{/* end centering transform */}
      </AtomPaintProvider>
    </svg>
  );
}
