import type { ReactNode } from "react";
import {
  MULTISCALE_PANEL,
  MULTISCALE_TYPE,
} from "./visualRules";

// Tone names are legacy keys mapped to level-identity triads (amber -> aa, sky -> dft).
type Tone = "amber" | "sky" | "mlff" | "meso" | "neutral";

const HEADER_TONE: Record<Tone, string> = {
  amber: "border-lv-aa-line bg-lv-aa-wash",
  sky: "border-lv-dft-line bg-lv-dft-wash",
  mlff: "border-lv-mlff-line bg-lv-mlff-wash",
  meso: "border-lv-meso-line bg-lv-meso-wash",
  neutral: "border-border bg-muted/40",
};

const TITLE_TONE: Record<Tone, string> = {
  amber: "text-lv-aa",
  sky: "text-lv-dft",
  mlff: "text-lv-mlff",
  meso: "text-lv-meso",
  neutral: "text-foreground",
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
