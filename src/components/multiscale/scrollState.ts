// Pure progress → state derivation for the single-pinned multiscale visualization.

export type LevelId = "meso" | "allatom" | "mlff" | "dft";

export interface LevelConfig {
  id: LevelId;
  label: Record<"en" | "ko", string>;
  /** The level identity ink, as a CSS token. Consumed by the rail equation accent. */
  color: string;
  steps: number;
  scale: Record<"en" | "ko", string>;
}

export const LEVELS: LevelConfig[] = [
  {
    id: "dft",
    label: { en: "Density Functional Theory", ko: "밀도범함수이론" },
    color: "var(--lv-dft-text)",
    steps: 2,
    scale: { en: "electron density · selected structures", ko: "전자 밀도 · 선택한 구조" },
  },
  {
    id: "mlff",
    label: { en: "Machine-Learning Force Fields", ko: "머신러닝 역장" },
    color: "var(--lv-mlff-text)",
    steps: 2,
    scale: { en: "atoms · learned forces", ko: "원자 · 학습한 힘" },
  },
  {
    id: "allatom",
    label: { en: "All-Atom Molecular Dynamics", ko: "전원자 분자동역학" },
    color: "var(--lv-aa)",
    steps: 2,
    scale: { en: "atoms · fixed interaction rules", ko: "원자 · 고정된 상호작용 규칙" },
  },
  {
    id: "meso",
    label: { en: "Mesoscale Modeling", ko: "메조스케일 모델링" },
    color: "var(--lv-meso)",
    steps: 2,
    scale: { en: "beads · collective motion", ko: "비드 · 집단 운동" },
  },
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
 * Convert level index + local step to a global step index.
 */
export function globalStepFromLevel(levelIndex: number, localStep: number): number {
  let global = 0;
  for (let i = 0; i < levelIndex && i < LEVELS.length; i++) {
    global += LEVELS[i].steps;
  }
  return global + localStep;
}
