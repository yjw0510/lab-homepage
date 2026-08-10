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
  accentColor: string,
  interactiveTerms?: readonly AllAtomForceFieldTerm[],
  hoveredTerm?: AllAtomForceFieldTerm | null,
  selectedTerm?: AllAtomForceFieldTerm | null,
  onTermHover?: (term: AllAtomForceFieldTerm) => void,
  onTermLeave?: () => void,
  onTermClick?: (term: AllAtomForceFieldTerm) => void,
  lang = "en",
) {
  return segments.map((seg, i) => {
    const html = katex.renderToString(seg.latex, {
      throwOnError: false,
      displayMode: false,
    });
    const isActive = seg.termId ? activeTerms.includes(seg.termId) : false;
    const isInteractive = !!seg.termId && !!interactiveTerms?.includes(seg.termId as AllAtomForceFieldTerm);
    const isHovered = !!seg.termId && hoveredTerm === seg.termId;
    const isSelected = !!seg.termId && selectedTerm === seg.termId;

    return (
      <span
        key={i}
        data-term={seg.termId || undefined}
        className={`inline-block transition-[color,opacity,transform,filter] duration-300 ${isInteractive ? "cursor-pointer" : ""}`}
        style={{
          color: isActive ? accentColor : undefined,
          transform: isActive || isHovered || isSelected ? "scale(1.05)" : undefined,
          filter: seg.termId && !isActive ? "opacity(0.5)" : undefined,
        }}
        onMouseEnter={isInteractive ? () => onTermHover?.(seg.termId as AllAtomForceFieldTerm) : undefined}
        onMouseLeave={isInteractive ? onTermLeave : undefined}
        onClick={isInteractive ? () => onTermClick?.(seg.termId as AllAtomForceFieldTerm) : undefined}
        onFocus={isInteractive ? () => onTermHover?.(seg.termId as AllAtomForceFieldTerm) : undefined}
        onBlur={isInteractive ? onTermLeave : undefined}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={
          isInteractive
            ? `${lang === "ko" ? "역장 항 선택" : "Select force-field term"}: ${seg.termId}`
            : undefined
        }
        aria-pressed={isInteractive ? isSelected : undefined}
        onKeyDown={
          isInteractive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTermClick?.(seg.termId as AllAtomForceFieldTerm);
                }
              }
            : undefined
        }
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
  selectedTerm,
  onTermHover,
  onTermLeave,
  onTermClick,
  lang = "en",
}: {
  equationKey: string;
  activeTerms: string[];
  accentColor: string;
  detailMode?: "single" | "grouped" | "hidden";
  interactiveTerms?: readonly AllAtomForceFieldTerm[];
  hoveredTerm?: AllAtomForceFieldTerm | null;
  selectedTerm?: AllAtomForceFieldTerm | null;
  onTermHover?: (term: AllAtomForceFieldTerm) => void;
  onTermLeave?: () => void;
  onTermClick?: (term: AllAtomForceFieldTerm) => void;
  lang?: string;
}) {
  const eqSet = EQUATIONS[equationKey];
  const subEquations = eqSet?.subs;

  const activeSub = useMemo(() => {
    if (!subEquations || detailMode !== "single" || activeTerms.length === 0) return null;
    for (let i = activeTerms.length - 1; i >= 0; i--) {
      const sub = subEquations.find((s) => s.termId === activeTerms[i]);
      if (sub) return sub;
    }
    return null;
  }, [activeTerms, detailMode, subEquations]);

  const groupedSubs = useMemo(() => {
    if (!subEquations || detailMode !== "grouped") return [] as SubEquation[];
    if (activeTerms.length === 0) return [] as SubEquation[];
    return subEquations.filter((sub) => activeTerms.includes(sub.termId));
  }, [activeTerms, detailMode, subEquations]);

  if (!eqSet) return null;

  return (
    <div
      className="border-y border-border py-3"
      aria-label={eqSet.main.ariaLabel}
    >
      <div className="scientific-equation flex flex-wrap items-baseline gap-x-0 overflow-x-auto px-1 py-1 text-foreground">
        {renderSegments(
          eqSet.main.segments,
          activeTerms,
          accentColor,
          interactiveTerms,
          hoveredTerm,
          selectedTerm,
          onTermHover,
          onTermLeave,
          onTermClick,
          lang,
        )}
      </div>

      {detailMode === "grouped" && groupedSubs.length > 0 && (
        <div className="mt-2 grid gap-2 border-t border-border pt-2">
          {groupedSubs.map((sub) => (
            <div
              key={sub.termId}
              className="scientific-equation-sub border border-border bg-muted/40 px-3 py-2.5 text-muted-foreground"
              aria-label={sub.ariaLabel}
            >
              <div className="flex flex-wrap items-baseline gap-x-0.5">
                {renderSegments(
                  sub.segments,
                  activeTerms,
                  accentColor,
                  interactiveTerms,
                  hoveredTerm,
                  selectedTerm,
                  onTermHover,
                  onTermLeave,
                  onTermClick,
                  lang,
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {detailMode === "single" && activeSub && (
        <div
          className="scientific-equation-sub mt-3 flex flex-wrap items-baseline gap-x-0 border-t border-border pt-3 text-muted-foreground"
          aria-label={activeSub.ariaLabel}
        >
          {renderSegments(
            activeSub.segments,
            activeTerms,
            accentColor,
            interactiveTerms,
            hoveredTerm,
            selectedTerm,
            onTermHover,
            onTermLeave,
            onTermClick,
            lang,
          )}
        </div>
      )}
    </div>
  );
}
