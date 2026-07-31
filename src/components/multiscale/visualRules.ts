export const MULTISCALE_TYPE = {
  sceneTitle: "text-xl leading-7 sm:text-[1.75rem] sm:leading-9",
  panelTitle: "text-lg font-semibold leading-7 text-foreground",
  semititle: "text-base font-semibold leading-6 text-foreground",
  description: "text-[0.9375rem] leading-6 text-muted-foreground",
  body: "text-base leading-6 text-foreground",
  metadata: "type-mono-meta text-xs tracking-[0.08em] text-muted-foreground",
  metric: "type-quiet text-3xl text-foreground",
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
  // On a phone the mechanism is a band in the document flow, not an overlay. Pinning it
  // with `absolute inset-3` inside a fixed-height parent is what silently threw away
  // 386-534px of the mesoscale mapping page: `overflow-hidden` on an absolutely
  // positioned box clips without producing anything to scroll.
  mobileBand: "relative m-3",
  divider: "border-border",
} as const;

/**
 * Height of the scene (canvas or schematic) on a phone, per sceneKey. This is the only
 * fixed dimension left on the mobile stage — the mechanism band below it is content-sized,
 * so copy can grow without anyone re-tuning a pixel value.
 *
 * Deliberately fixed pixels rather than a viewport fraction. A `min(px, dvh)` cap was
 * measured and rejected: it cut the scene to 242px in landscape, and a collapsing mobile
 * toolbar fired 14 ResizeObserver callbacks mid-scroll, each one re-fitting the camera
 * (`svh` measured identically). A definite height costs nothing and never churns.
 */
export const MOBILE_SCENE_HEIGHT: Record<string, number> = {
  D6_outputs: 460,
  D4_scf: 460,
  L1_why: 1520,
  L5_energy_force: 1640,
  A6_observables: 420,
  A3_forcefield: 420,
  M5_collective: 380,
  M2_mapping: 540,
};

export const DEFAULT_MOBILE_SCENE_HEIGHT = 460;

export const MULTISCALE_MOTION = {
  stateCycleMs: 3000,
  outputCycleMs: 2400,
  scfFrameMs: 900,
  finalStateHoldMs: 1800,
  stateTransition: "transition-opacity duration-300",
} as const;
