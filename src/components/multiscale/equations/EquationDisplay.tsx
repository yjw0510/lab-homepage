"use client";

import "katex/dist/katex.min.css";
import { useMemo } from "react";
import katex from "katex";
import { EQUATIONS } from "./equationConfigs";
import type { EquationSegment, SubEquation } from "./equationConfigs";
import type { AllAtomForceFieldTerm } from "../allatom/allAtomPagePolicy";

function renderSegments(
  segments: EquationSegment[],
  activeTerms: string[],
  accentColor: string
  ,
  interactiveTerms?: readonly AllAtomForceFieldTerm[],
  hoveredTerm?: AllAtomForceFieldTerm | null,
  onTermHover?: (term: AllAtomForceFieldTerm) => void,
  onTermLeave?: () => void,
  onTermClick?: (term: AllAtomForceFieldTerm) => void,
) {
  return segments.map((seg, i) => {
    const html = katex.renderToString(seg.latex, {
      throwOnError: false,
      displayMode: false,
    });
    const isActive = seg.termId ? activeTerms.includes(seg.termId) : false;
    const isInteractive = !!seg.termId && !!interactiveTerms?.includes(seg.termId as AllAtomForceFieldTerm);
    const isHovered = !!seg.termId && hoveredTerm === seg.termId;

    return (
      <span
        key={i}
        data-term={seg.termId || undefined}
        className={`inline-block transition-all duration-300 ${isInteractive ? "cursor-pointer" : ""}`}
        style={{
          color: isActive ? accentColor : undefined,
          textShadow: isActive || isHovered ? `0 0 12px ${accentColor}60` : undefined,
          transform: isActive || isHovered ? "scale(1.05)" : undefined,
          filter: seg.termId && !isActive ? "opacity(0.5)" : undefined,
        }}
        onMouseEnter={isInteractive ? () => onTermHover?.(seg.termId as AllAtomForceFieldTerm) : undefined}
        onMouseLeave={isInteractive ? onTermLeave : undefined}
        onClick={isInteractive ? () => onTermClick?.(seg.termId as AllAtomForceFieldTerm) : undefined}
        onFocus={isInteractive ? () => onTermHover?.(seg.termId as AllAtomForceFieldTerm) : undefined}
        onBlur={isInteractive ? onTermLeave : undefined}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export function EquationDisplay({
  equationKey,
  activeTerms,
  accentColor,
  detailMode = "single",
  interactiveTerms,
  hoveredTerm,
  onTermHover,
  onTermLeave,
  onTermClick,
}: {
  equationKey: string;
  activeTerms: string[];
  accentColor: string;
  detailMode?: "single" | "grouped" | "hidden";
  interactiveTerms?: readonly AllAtomForceFieldTerm[];
  hoveredTerm?: AllAtomForceFieldTerm | null;
  onTermHover?: (term: AllAtomForceFieldTerm) => void;
  onTermLeave?: () => void;
  onTermClick?: (term: AllAtomForceFieldTerm) => void;
}) {
  const eqSet = EQUATIONS[equationKey];
  if (!eqSet) return null;

  const activeSub = useMemo(() => {
    if (detailMode !== "single" || activeTerms.length === 0) return null;
    for (let i = activeTerms.length - 1; i >= 0; i--) {
      const sub = eqSet.subs.find((s) => s.termId === activeTerms[i]);
      if (sub) return sub;
    }
    return null;
  }, [activeTerms, detailMode, eqSet.subs]);

  const groupedSubs = useMemo(() => {
    if (detailMode !== "grouped") return [] as SubEquation[];
    if (activeTerms.length === 0) return [] as SubEquation[];
    return eqSet.subs.filter((sub) => activeTerms.includes(sub.termId));
  }, [activeTerms, detailMode, eqSet.subs]);

  return (
    <div
      className="p-3 rounded-lg bg-white/5 border border-white/10"
      aria-label={eqSet.main.ariaLabel}
    >
      {/* Main equation */}
      <div className="flex flex-wrap items-baseline gap-x-0.5 text-gray-300 overflow-x-auto">
        {renderSegments(eqSet.main.segments, activeTerms, accentColor, interactiveTerms, hoveredTerm, onTermHover, onTermLeave, onTermClick)}
      </div>

      {/* Sub-equation (expanded term) */}
      {detailMode === "grouped" && groupedSubs.length > 0 && (
        <div className="mt-2 grid gap-2 border-t border-white/5 pt-2">
          {groupedSubs.map((sub) => (
            <div
              key={sub.termId}
              className="rounded-md border border-white/8 bg-white/[0.03] px-2.5 py-2 text-sm text-gray-400"
              aria-label={sub.ariaLabel}
            >
              <div className="flex flex-wrap items-baseline gap-x-0.5">
                {renderSegments(sub.segments, activeTerms, accentColor, interactiveTerms, hoveredTerm, onTermHover, onTermLeave, onTermClick)}
              </div>
            </div>
          ))}
        </div>
      )}

      {detailMode === "single" && activeSub && (
        <div
          className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-baseline gap-x-0.5 text-gray-400 text-sm"
          aria-label={activeSub.ariaLabel}
        >
          {renderSegments(activeSub.segments, activeTerms, accentColor, interactiveTerms, hoveredTerm, onTermHover, onTermLeave, onTermClick)}
        </div>
      )}
    </div>
  );
}
