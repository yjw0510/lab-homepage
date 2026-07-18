export const MULTISCALE_TYPE = {
  sceneTitle: "text-xl leading-7 sm:text-[1.75rem] sm:leading-9",
  panelTitle: "text-lg font-semibold leading-7 text-foreground",
  semititle: "text-base font-semibold leading-6 text-foreground",
  description: "text-[0.9375rem] leading-6 text-muted-foreground",
  body: "text-base leading-6 text-foreground",
  metadata: "type-mono-meta text-xs tracking-[0.08em] text-muted-foreground",
  metric: "text-3xl font-semibold tabular-nums text-foreground",
  formula: "text-[1.5rem] text-foreground",
  formulaCompact: "text-[1.125rem] text-foreground",
  schematicTitle: "text-sm font-semibold leading-5 text-foreground",
  schematicCaption: "text-[0.8125rem] leading-5 text-muted-foreground",
  schematicMeta: "type-mono-meta text-xs leading-4 tracking-[0.06em] text-muted-foreground",
} as const;

export const MULTISCALE_PANEL = {
  surface: "border border-border bg-surface-raised/95 text-foreground",
  desktopOverlay:
    "absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8",
  mobileOverlay: "absolute inset-3",
  divider: "border-border",
} as const;

export const MULTISCALE_MOTION = {
  stateCycleMs: 3000,
  outputCycleMs: 2400,
  scfFrameMs: 900,
  finalStateHoldMs: 1800,
  stateTransition: "transition-opacity duration-300",
} as const;
