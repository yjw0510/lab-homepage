"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

const AtomPaintIdContext = createContext<string | null>(null);

function useAtomPaintPrefix() {
  const prefix = useContext(AtomPaintIdContext);
  if (!prefix) {
    throw new Error("Atom paint definitions require an AtomPaintProvider.");
  }
  return prefix;
}

function atomPaintId(prefix: string, name: string) {
  return `${prefix}-${name}`;
}

/** Scopes atom gradient and filter IDs to one SVG. */
export function AtomPaintProvider({ children }: { children: ReactNode }) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <AtomPaintIdContext.Provider value={`atom-paint-${reactId}`}>
      {children}
    </AtomPaintIdContext.Provider>
  );
}

export function AtomDefs() {
  const prefix = useAtomPaintPrefix();
  const id = (name: string) => atomPaintId(prefix, name);
  return (
    <>
      <radialGradient id={id("atomg-o")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffe6e6" />
        <stop offset="26%" stopColor="#f77a7a" />
        <stop offset="62%" stopColor="#dd4141" />
        <stop offset="86%" stopColor="#b62828" />
        <stop offset="100%" stopColor="#8d1b1b" />
      </radialGradient>
      <radialGradient id={id("atomg-c")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#eef1f5" />
        <stop offset="28%" stopColor="#adb4bf" />
        <stop offset="64%" stopColor="#6f7783" />
        <stop offset="88%" stopColor="#454c57" />
        <stop offset="100%" stopColor="#2a2f38" />
      </radialGradient>
      <radialGradient id={id("atomg-n")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#e7efff" />
        <stop offset="26%" stopColor="#7ba6f6" />
        <stop offset="62%" stopColor="#3f6fdd" />
        <stop offset="86%" stopColor="#2850b6" />
        <stop offset="100%" stopColor="#1b357f" />
      </radialGradient>
      <radialGradient id={id("atomg-h")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="34%" stopColor="#eef1f5" />
        <stop offset="70%" stopColor="#cfd6e0" />
        <stop offset="100%" stopColor="#9aa2b0" />
      </radialGradient>
      <radialGradient id={id("atomg-amber")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffe9c7" />
        <stop offset="28%" stopColor="#f7b24d" />
        <stop offset="64%" stopColor="#e0891f" />
        <stop offset="88%" stopColor="#b56a12" />
        <stop offset="100%" stopColor="#8a4f0c" />
      </radialGradient>
      <radialGradient id={id("atomg-cyan")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#dbfaff" />
        <stop offset="28%" stopColor="#5fd0e6" />
        <stop offset="64%" stopColor="#1fa2c0" />
        <stop offset="88%" stopColor="#137d97" />
        <stop offset="100%" stopColor="#0c5a6e" />
      </radialGradient>
      <radialGradient id={id("atomg-slate")} cx="34%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#eef1f6" />
        <stop offset="28%" stopColor="#b7c0cf" />
        <stop offset="64%" stopColor="#7e8a9e" />
        <stop offset="88%" stopColor="#586377" />
        <stop offset="100%" stopColor="#3a4457" />
      </radialGradient>
      <radialGradient id={id("atomg-hl")} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
        <stop offset="52%" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <filter id={id("atomg-shadow")} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </>
  );
}

export function AtomSphere({
  cx,
  cy,
  r,
  grad,
  label,
  fs = 0,
  shadow = true,
  labelFill = "#ffffff",
}: {
  cx: number;
  cy: number;
  r: number;
  grad: string;
  label?: string;
  fs?: number;
  shadow?: boolean;
  labelFill?: string;
}) {
  const prefix = useAtomPaintPrefix();
  const paintId = (name: string) => atomPaintId(prefix, name);
  return (
    <g>
      {shadow ? (
        <ellipse
          cx={cx}
          cy={cy + r * 0.96}
          rx={r * 0.8}
          ry={r * 0.2}
          fill="rgba(15,23,42,0.2)"
          filter={`url(#${paintId("atomg-shadow")})`}
        />
      ) : null}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${paintId(grad)})`} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(17,20,28,0.14)"
        strokeWidth={Math.max(0.5, r * 0.045)}
      />
      <ellipse
        cx={cx - r * 0.28}
        cy={cy - r * 0.32}
        rx={r * 0.52}
        ry={r * 0.42}
        fill={`url(#${paintId("atomg-hl")})`}
      />
      <circle
        cx={cx - r * 0.36}
        cy={cy - r * 0.4}
        r={Math.max(0.8, r * 0.12)}
        fill="#ffffff"
        fillOpacity="0.9"
      />
      {label ? (
        <text
          x={cx}
          y={cy + fs * 0.34}
          textAnchor="middle"
          fontSize={fs}
          fontWeight="600"
          fill={labelFill}
          fillOpacity="0.92"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}
