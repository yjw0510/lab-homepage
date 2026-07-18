export const MULTISCALE_TYPE = {
  sceneTitle: "text-xl leading-7 sm:text-[1.75rem] sm:leading-9",
  panelTitle: "text-lg font-semibold leading-7 text-slate-50",
  semititle: "text-base font-semibold leading-6 text-slate-100",
  description: "text-[0.9375rem] leading-6 text-slate-400",
  body: "text-base leading-6 text-slate-300",
  metadata: "type-mono-meta text-xs tracking-[0.08em] text-slate-400",
  metric: "text-3xl font-semibold tabular-nums text-slate-50",
  formula: "text-[1.5rem] text-slate-100",
  formulaCompact: "text-[1.125rem] text-slate-100",
  schematicTitle: "text-sm font-semibold leading-5 text-slate-100",
  schematicCaption: "text-[0.8125rem] leading-5 text-slate-400",
  schematicMeta: "type-mono-meta text-xs leading-4 tracking-[0.06em] text-slate-400",
} as const;

export const MULTISCALE_PANEL = {
  surface: "border border-white/14 bg-[#070712]/94 text-slate-100",
  desktopOverlay:
    "absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8",
  mobileOverlay: "absolute inset-3",
  divider: "border-white/12",
} as const;

export const MULTISCALE_MOTION = {
  stateCycleMs: 3000,
  outputCycleMs: 2400,
  scfFrameMs: 900,
  finalStateHoldMs: 1800,
  stateTransition: "transition-opacity duration-300",
} as const;
