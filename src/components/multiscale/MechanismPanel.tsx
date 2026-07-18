import type { ReactNode } from "react";
import {
  MULTISCALE_PANEL,
  MULTISCALE_TYPE,
} from "./visualRules";

type Tone = "amber" | "sky" | "neutral";

const HEADER_TONE: Record<Tone, string> = {
  amber: "border-amber-300/25 bg-amber-950/16",
  sky: "border-sky-300/25 bg-sky-950/12",
  neutral: "border-white/12 bg-[#080812]/80",
};

const TITLE_TONE: Record<Tone, string> = {
  amber: "text-amber-100",
  sky: "text-sky-100",
  neutral: "text-slate-50",
};

export function MechanismPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${MULTISCALE_PANEL.surface} ${className}`}>
      {children}
    </div>
  );
}

export function MechanismHeader({
  title,
  description,
  aside,
  tone = "neutral",
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  tone?: Tone;
}) {
  return (
    <header
      className={`grid items-center gap-5 border-b px-5 py-3.5 lg:grid-cols-[minmax(0,1fr)_auto] ${HEADER_TONE[tone]}`}
    >
      <div>
        <h3 className={`${MULTISCALE_TYPE.panelTitle} ${TITLE_TONE[tone]}`}>
          {title}
        </h3>
        {description ? (
          <p className={`mt-1 ${MULTISCALE_TYPE.description}`}>
            {description}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

