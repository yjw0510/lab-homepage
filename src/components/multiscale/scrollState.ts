// Pure progress → state derivation for the single-pinned multiscale visualization.

export type LevelId = "meso" | "allatom" | "mlff" | "dft";

export interface LevelConfig {
  id: LevelId;
  label: Record<"en" | "ko", string>;
  color: string;
  steps: number;
  scale: Record<"en" | "ko", string>;
}

export const LEVELS: LevelConfig[] = [
  { id: "meso", label: { en: "Mesoscale", ko: "메조스케일" }, color: "#f59e0b", steps: 6, scale: { en: "~10 nm – 1 μm", ko: "~10 nm – 1 μm" } },
  { id: "allatom", label: { en: "All-Atom", ko: "전원자" }, color: "#06b6d4", steps: 5, scale: { en: "~1 – 10 nm", ko: "~1 – 10 nm" } },
  { id: "mlff", label: { en: "MLFF", ko: "MLFF" }, color: "#8b5cf6", steps: 7, scale: { en: "~1 – 10 nm (ab initio)", ko: "~1 – 10 nm (제일원리 수준)" } },
  { id: "dft", label: { en: "Ab-initio", ko: "제일원리" }, color: "#f97316", steps: 9, scale: { en: "~0.1 – 1 nm", ko: "~0.1 – 1 nm" } },
];

const TOTAL_STEPS = LEVELS.reduce((sum, l) => sum + l.steps, 0);

// Precompute level boundaries as progress ranges [start, end)
interface LevelBoundary {
  start: number;
  end: number;
  stepStart: number; // global step index where this level starts
}

const BOUNDARIES: LevelBoundary[] = [];
{
  let cumSteps = 0;
  for (const level of LEVELS) {
    const start = cumSteps / TOTAL_STEPS;
    cumSteps += level.steps;
    const end = cumSteps / TOTAL_STEPS;
    BOUNDARIES.push({ start, end, stepStart: cumSteps - level.steps });
  }
}

export interface ScrollState {
  level: LevelId;
  levelIndex: number;
  step: number; // 0-based within level
  stepCount: number;
  levelProgress: number; // 0–1 within level
  stepProgress: number; // 0–1 within current step
  masterProgress: number;
}

// Transition zone width (fraction of master progress) on each side of a boundary
export const TRANSITION_ZONE = 0.025;

export function getScrollState(progress: number): ScrollState {
  const p = Math.max(0, Math.min(1, progress));

  let levelIndex = 0;
  for (let i = 0; i < BOUNDARIES.length; i++) {
    if (p < BOUNDARIES[i].end || i === BOUNDARIES.length - 1) {
      levelIndex = i;
      break;
    }
  }

  const b = BOUNDARIES[levelIndex];
  const level = LEVELS[levelIndex];
  const levelRange = b.end - b.start;
  const levelProgress = levelRange > 0 ? Math.max(0, Math.min(1, (p - b.start) / levelRange)) : 0;

  const rawStep = levelProgress * level.steps;
  const step = Math.min(Math.floor(rawStep), level.steps - 1);
  const stepProgress = rawStep - step;

  return {
    level: level.id,
    levelIndex,
    step,
    stepCount: level.steps,
    levelProgress,
    stepProgress,
    masterProgress: p,
  };
}

/**
 * Returns snap positions for GSAP ScrollTrigger.
 * One snap point per step boundary + level boundaries.
 */
export function getSnapPositions(): number[] {
  const positions: number[] = [0];
  for (let i = 0; i < TOTAL_STEPS; i++) {
    positions.push((i + 1) / TOTAL_STEPS);
  }
  return positions;
}

/**
 * Convert level index + local step to a global step index.
 */
export function globalStepFromLevel(levelIndex: number, localStep: number): number {
  let global = 0;
  for (let i = 0; i < levelIndex && i < LEVELS.length; i++) {
    global += LEVELS[i].steps;
  }
  return global + localStep;
}

/**
 * Check if master progress is in a transition zone between levels.
 * Returns null if not in transition, or { from, to, t } where t is 0–1.
 */
export function getTransition(
  progress: number
): { fromIndex: number; toIndex: number; t: number } | null {
  for (let i = 0; i < BOUNDARIES.length - 1; i++) {
    const boundary = BOUNDARIES[i].end;
    const zoneStart = boundary - TRANSITION_ZONE;
    const zoneEnd = boundary + TRANSITION_ZONE;
    if (progress >= zoneStart && progress <= zoneEnd) {
      const t = (progress - zoneStart) / (zoneEnd - zoneStart);
      return { fromIndex: i, toIndex: i + 1, t };
    }
  }
  return null;
}
