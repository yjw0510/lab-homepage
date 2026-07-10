"use client";

import type { AllAtomForceFieldTerm } from "../allatom/allAtomPagePolicy";
import { forceFieldTermFamily } from "../allatom/allAtomPagePolicy";
import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

const TERM_COLORS: Record<AllAtomForceFieldTerm, string> = {
  Ubond: "#22d3ee",
  Uangle: "#22c55e",
  Udihedral: "#f59e0b",
  UvdW: "#8b5cf6",
  UCoul: "#3b82f6",
};

const TERMS: Array<{
  id: AllAtomForceFieldTerm;
  label: Record<"en" | "ko", string>;
  lane: "bonded" | "nonbonded";
}> = [
  { id: "Ubond", label: { en: "bond", ko: "결합" }, lane: "bonded" },
  { id: "Uangle", label: { en: "angle", ko: "각도" }, lane: "bonded" },
  { id: "Udihedral", label: { en: "dihedral", ko: "이면각" }, lane: "bonded" },
  { id: "UvdW", label: { en: "vdW", ko: "vdW" }, lane: "nonbonded" },
  { id: "UCoul", label: { en: "Coulomb", ko: "쿨롱" }, lane: "nonbonded" },
];

export function AllAtomForceFieldPlot({
  accentColor,
  lang = "en",
  activeTerm,
  selectedTerm,
  onTermHover,
  onTermLeave,
  onTermToggle,
}: {
  progress: number;
  accentColor: string;
  lang?: string;
  rdfActiveRadius?: number;
  activeTerm?: AllAtomForceFieldTerm | null;
  selectedTerm?: AllAtomForceFieldTerm | null;
  onTermHover?: (term: AllAtomForceFieldTerm) => void;
  onTermLeave?: () => void;
  onTermToggle?: (term: AllAtomForceFieldTerm) => void;
}) {
  return (
    <PlotContainer
      ariaLabel={lang === "ko" ? "결합 항과 비결합 항을 합쳐 전체 U를 만드는 전원자 힘장" : "Classical all-atom force field: bonded and non-bonded term families summing to total U"}
      aspectRatio={0.8}
      minHeight={255}
      maxHeight={320}
    >
      {({ innerWidth, innerHeight, margin, font }) => {
        const highlightFamily = activeTerm ? forceFieldTermFamily(activeTerm) : null;

        // ── Derived geometry ──
        const cx = margin.left + innerWidth * 0.5;
        const cy = margin.top + innerHeight * 0.5;
        const cR = Math.min(innerWidth, innerHeight) * 0.11;
        const laneW = innerWidth * 0.22;
        const pillH = Math.max(28, innerHeight * 0.105);
        const bondedLaneX = margin.left + innerWidth * 0.04;
        const nonBondedLaneX = margin.left + innerWidth - laneW - innerWidth * 0.04;

        // Bonded: 3 terms, step = innerHeight * 0.217, vertically centered
        const bondedStep = innerHeight * 0.217;
        const bondedSpan = (2 * bondedStep) + pillH;
        const bondedTopY = margin.top + (innerHeight - bondedSpan) / 2;

        // NonBonded: 2 terms, step = innerHeight * 0.267, vertically centered
        const nonBondedStep = innerHeight * 0.267;
        const nonBondedSpan = nonBondedStep + pillH;
        const nonBondedTopY = margin.top + (innerHeight - nonBondedSpan) / 2;

        // Spine X: just outside each lane
        const bSpineX = bondedLaneX + laneW + 5;
        const nbSpineX = nonBondedLaneX - 5;

        // Connector endpoints at center U
        const uLeft = cx - cR - 3;
        const uRight = cx + cR + 3;

        const bondedTerms = TERMS.filter((t) => t.lane === "bonded");
        const nonBondedTerms = TERMS.filter((t) => t.lane === "nonbonded");

        const renderTerms = (
          terms: typeof TERMS,
          lane: "bonded" | "nonbonded",
          laneX: number,
          topY: number,
          step: number,
          spineX: number,
        ) => {
          const firstMid = topY + pillH / 2;
          const lastMid = topY + (terms.length - 1) * step + pillH / 2;
          const connEndX = lane === "bonded" ? uLeft : uRight;

          return (
            <g>
              {/* Vertical spine */}
              <line
                x1={spineX} y1={firstMid} x2={spineX} y2={lastMid}
                stroke={highlightFamily === lane ? accentColor : PLOT_COLORS.grid}
                strokeWidth={1.3}
                opacity={highlightFamily === lane ? 0.55 : 0.25}
              />
              {/* Spine → center U */}
              <line
                x1={spineX} y1={cy} x2={connEndX} y2={cy}
                stroke={highlightFamily === lane ? accentColor : PLOT_COLORS.grid}
                strokeWidth={1.3}
                opacity={highlightFamily === lane ? 0.55 : 0.25}
              />
              {terms.map((term, i) => {
                const y = topY + i * step;
                const mid = y + pillH / 2;
                const isActive = activeTerm === term.id;
                const isSelected = selectedTerm === term.id;
                const isFam = highlightFamily === lane;
                const color = TERM_COLORS[term.id];
                const edgeX = lane === "bonded" ? laneX + laneW : laneX;
                const label = term.label[lang === "ko" ? "ko" : "en"];

                return (
                  <g
                    key={term.id}
                    onMouseEnter={() => onTermHover?.(term.id)}
                    onMouseLeave={onTermLeave}
                    onClick={() => onTermToggle?.(term.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onTermToggle?.(term.id);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${lang === "ko" ? "힘장 항 선택" : "Select force-field term"}: ${label}`}
                    aria-pressed={isSelected}
                  >
                    {/* Hit area slightly larger than pill */}
                    <rect
                      x={laneX - 4} y={y - 4}
                      width={laneW + 8} height={pillH + 8}
                      fill="transparent"
                    />
                    {/* Pill */}
                    <rect
                      x={laneX} y={y} width={laneW} height={pillH}
                      rx={0} fill={color}
                      opacity={isActive ? 0.32 : isFam ? 0.16 : 0.1}
                      stroke={isActive ? color : `${color}80`}
                      strokeWidth={isActive ? 1.8 : 1}
                    />
                    <text
                      x={laneX + laneW / 2} y={y + pillH * 0.6}
                      textAnchor="middle"
                      fill={isActive ? "#f8fafc" : color}
                      fontSize={font.tick} fontWeight={700}
                    >
                      {label}
                    </text>
                    {/* Branch: pill → spine */}
                    <line
                      x1={edgeX} y1={mid} x2={spineX} y2={mid}
                      stroke={color}
                      strokeWidth={isActive ? 2.2 : 1.2}
                      opacity={isActive ? 0.85 : isFam ? 0.35 : 0.16}
                    />
                  </g>
                );
              })}
            </g>
          );
        };

        return {
          svg: (
            <g>
              {/* Central U node */}
              <circle cx={cx} cy={cy} r={cR * 1.3}
                fill="none" stroke={accentColor}
                strokeWidth={1.3} strokeDasharray="4,3" opacity={0.35}
              />
              <circle cx={cx} cy={cy} r={cR}
                fill="#07111f" stroke={accentColor} strokeWidth={1.8}
              />
              <text
                x={cx} y={cy + font.tick * 0.38}
                textAnchor="middle" fill={accentColor}
                fontSize={font.tick * 1.3} fontWeight={700}
              >
                U
              </text>

              {/* Term lanes */}
              {renderTerms(bondedTerms, "bonded", bondedLaneX, bondedTopY, bondedStep, bSpineX)}
              {renderTerms(nonBondedTerms, "nonbonded", nonBondedLaneX, nonBondedTopY, nonBondedStep, nbSpineX)}

              {/* Lane headings (SVG for fontWeight control) */}
              <text
                x={bondedLaneX + laneW / 2} y={bondedTopY - font.tick * 0.6}
                textAnchor="middle"
                fill={highlightFamily === "bonded" ? accentColor : PLOT_COLORS.text}
                fontSize={font.tick} fontWeight={700}
              >
                {lang === "ko" ? "결합" : "bonded"}
              </text>
              <text
                x={nonBondedLaneX + laneW / 2} y={nonBondedTopY - font.tick * 0.6}
                textAnchor="middle"
                fill={highlightFamily === "nonbonded" ? accentColor : PLOT_COLORS.text}
                fontSize={font.tick} fontWeight={700}
              >
                {lang === "ko" ? "비결합" : "non-bonded"}
              </text>
            </g>
          ),
        };
      }}
    </PlotContainer>
  );
}
