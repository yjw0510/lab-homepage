"use client";

import type { ReactNode } from "react";

export function MechanismBadge({
  children,
  tone = "schematic",
}: {
  children: ReactNode;
  tone?: "schematic" | "trajectory" | "calculated";
}) {
  const color =
    tone === "trajectory"
      ? "border-cyan-300/35 text-cyan-100"
      : tone === "calculated"
        ? "border-slate-200/35 text-slate-100"
        : "border-amber-300/35 text-amber-100";
  return (
    <span className={`inline-flex border px-2 py-1 font-mono text-[0.78125rem] font-semibold tracking-[0.08em] ${color}`}>
      {children}
    </span>
  );
}

export function MechanismPanel({
  ariaLabel,
  badge,
  title,
  note,
  children,
  position = "lower",
  width = "wide",
}: {
  ariaLabel: string;
  badge: ReactNode;
  title: string;
  note?: string;
  children: ReactNode;
  position?: "upper" | "lower" | "full";
  width?: "narrow" | "wide" | "full";
}) {
  const positionClass =
    position === "upper"
      ? "left-3 top-28 md:left-5 md:top-28"
      : position === "full"
        ? "inset-3 md:inset-5"
        : "bottom-3 left-3 md:bottom-5 md:left-5";
  const widthClass =
    width === "narrow"
      ? "w-[min(430px,calc(100%-1.5rem))]"
      : width === "full"
        ? "w-auto"
        : "w-[min(620px,calc(100%-1.5rem))]";

  return (
    <section
      role="img"
      aria-label={ariaLabel}
      className={`absolute ${positionClass} ${widthClass} border border-white/14 bg-[#07101c]/96 p-4 text-slate-100 md:p-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {badge}
        <span className="font-mono text-[0.78125rem] tracking-[0.06em] text-cyan-100/78">
          CLASSICAL ALL-ATOM
        </span>
      </div>
      <p className="mt-3 max-w-[46ch] text-base font-semibold leading-[1.55] text-white/94 md:text-[1.0625rem]">
        {title}
      </p>
      <div className="mt-4">{children}</div>
      {note && (
        <p className="mt-4 border-t border-white/10 pt-3 text-[0.8125rem] leading-[1.55] text-slate-300/82">
          {note}
        </p>
      )}
    </section>
  );
}

export function HairlineArrow() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1 text-cyan-200/70">
      <span className="h-px w-5 bg-current" />
      <span className="text-sm">›</span>
    </span>
  );
}
