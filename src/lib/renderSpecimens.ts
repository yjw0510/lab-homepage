import { withBasePath } from "./basePath";
import { LOOP_LADDER } from "./loopSources.generated";

export type SpecimenTier = "dft" | "mlff" | "allatom" | "meso";

export interface Specimen {
  slug: string;
  tier: SpecimenTier;
  name: Record<"en" | "ko", string>;
  method: Record<"en" | "ko", string>;
  size: Record<"en" | "ko", string>;
  /** The file the render scene loads, relative to the render project. Every count and
   *  method string below is derived from this file and its solver output, never from a
   *  planning document. */
  source: string;
}

/**
 * Rendered from the lab's own simulation output; one pair per multiscale tier.
 *
 * Provenance rule: `method` and `size` describe what actually produced the picture, taken
 * from `molecular-backgrounds/systems/<id>.json`, `simulations/README.md` and the solver
 * output. The render project's `SPEC.md` §3 is a planning table whose numbers diverged
 * from production, so it is not a source for anything here. The audit trail is in
 * `.superloopy/evidence/frontend/20260719-multiscale-renders/PROVENANCE.md`.
 *
 * `method` and `size` render in the metadata register, which is Pretendard with tabular
 * figures. That font carries the whole scientific character set these fields need, so the
 * glyph restriction the old second family imposed no longer applies.
 */
export const SPECIMENS: Specimen[] = [
  {
    slug: "woven-cof",
    tier: "dft",
    name: { en: "Woven framework COF-505", ko: "직조형 구조 COF-505" },
    method: {
      en: "Quantum electron-density calculation (DFT)",
      ko: "양자 전자 밀도 계산(DFT)",
    },
    size: { en: "1,056-atom periodic cell", ko: "주기 셀 원자 1,056개" },
    source: "simulations/01_cof505/density.cube",
  },
  {
    slug: "molecular-knot",
    tier: "dft",
    name: { en: "Trefoil molecular knot", ko: "세잎매듭 분자" },
    method: {
      en: "Approximate electron-density calculation",
      ko: "근사 전자 밀도 계산",
    },
    size: { en: "330 atoms", ko: "원자 330개" },
    source: "structures/knot_hetero_xtb.xyz",
  },
  {
    slug: "buckycatcher",
    tier: "mlff",
    name: { en: "Buckycatcher molecule", ko: "Buckycatcher 분자" },
    method: {
      en: "Trajectory from a quantum-trained force model (MLFF)",
      ko: "양자 계산을 학습한 힘 모형(MLFF)의 궤적",
    },
    size: { en: "148 atoms", ko: "원자 148개" },
    source: "simulations/03_buckycatcher/traj.xyz",
  },
  {
    slug: "nanotube",
    tier: "mlff",
    name: { en: "Double-walled carbon nanotube", ko: "이중벽 탄소나노튜브" },
    method: {
      en: "Trajectory from a quantum-trained force model (MLFF)",
      ko: "양자 계산을 학습한 힘 모형(MLFF)의 궤적",
    },
    size: { en: "480 atoms", ko: "원자 480개" },
    source: "simulations/04_dwcnt/traj.xyz",
  },
  {
    slug: "goldberg-cage",
    tier: "allatom",
    name: { en: "Pd₃₀L₆₀ Goldberg cage", ko: "Pd₃₀L₆₀ 골드버그 케이지" },
    method: {
      en: "All-atom molecular model",
      ko: "전원자 분자 모형",
    },
    size: { en: "2,070 atoms", ko: "원자 2,070개" },
    source: "structures/pd30l60.xyz",
  },
  {
    slug: "dendrimer",
    tier: "allatom",
    name: { en: "Branched PAMAM molecule", ko: "가지형 PAMAM 분자" },
    method: {
      en: "All-atom molecular model",
      ko: "전원자 분자 모형",
    },
    size: { en: "4,548 atoms", ko: "원자 4,548개" },
    source: "structures/pamam_g5_real.pdb",
  },
  {
    slug: "double-gyroid",
    tier: "meso",
    name: { en: "Double-gyroid polymer structure", ko: "이중 자이로이드 고분자 구조" },
    method: {
      en: "Polymer trajectory with grouped particles",
      ko: "여러 원자를 묶어 표현한 고분자 궤적",
    },
    size: { en: "196,500 model particles", ko: "모형 입자 196,500개" },
    source: "simulations/07_gyroid/gyroid_direct_c40_n1_aG34_final.gsd",
  },
  {
    slug: "capsid",
    tier: "meso",
    name: { en: "Icosahedral viral capsid", ko: "정이십면체 바이러스 캡시드" },
    method: {
      en: "Elastic model with grouped particles",
      ko: "여러 원자를 묶어 표현한 탄성 모형",
    },
    size: { en: "28,620 model particles", ko: "모형 입자 28,620개" },
    source: "simulations/08_capsid/capsid_cg.pdb",
  },
];

/** Compact tier names, shared by every surface that captions a specimen so the site does
 *  not grow a second vocabulary. Matches the footer scale ruler. */
export const TIER_LABEL: Record<SpecimenTier, Record<"en" | "ko", string>> = {
  dft: { en: "Electron density", ko: "전자 밀도" },
  mlff: { en: "Learned atomic forces", ko: "학습한 원자 힘" },
  allatom: { en: "All atoms", ko: "모든 원자" },
  meso: { en: "Grouped particles", ko: "묶은 입자" },
};

export const TIER_SCALE: Record<SpecimenTier, string> = {
  dft: "Å",
  mlff: "Å · nm",
  allatom: "nm",
  meso: "nm · µm",
};

export type SpecimenMode = "light" | "dark";

export function posterSrc(slug: string, mode: SpecimenMode, small = false): string {
  return withBasePath(`/renders/${slug}/poster-${mode}${small ? "-sm" : ""}.webp`);
}

export function loopSrc(slug: string, mode: SpecimenMode): string {
  return withBasePath(`/renders/${slug}/loop-${mode}.mp4`);
}

export interface LoopSource {
  src: string;
  type: string;
  media?: string;
}

/**
 * The `<source>` list for one specimen and theme, in the order the browser walks it.
 *
 * Two things this list has to get right. The `codecs` parameter is read out of each encoded
 * file by the bake script rather than written by hand, because the browser picks the first
 * source whose type it believes it can decode and never returns to the list if that source
 * then fails. And the high-resolution rung is gated on viewport width, so a phone that can
 * decode AV1 is not handed a file sized for a 27-inch display; its plate renders at 226 CSS
 * px and asks for 678 device pixels, which the floor already covers.
 *
 * The last rung carries no media query and no codec the platform can refuse, so the list
 * cannot leave a visitor worse off than the single file it replaces.
 */
export function loopSources(slug: string, mode: SpecimenMode): LoopSource[] {
  const rungs = LOOP_LADDER[slug]?.[mode];
  // A specimen with no baked ladder still plays. Without this a slug added to the set but not
  // yet run through the bake would render a `<video>` with no sources at all.
  if (!rungs?.length) return [{ src: loopSrc(slug, mode), type: "video/mp4" }];
  return rungs.map((rung) => ({
    src: withBasePath(rung.src),
    type: `video/mp4; codecs="${rung.codecs}"`,
    ...(rung.width > 1024 ? { media: "(min-width: 1024px)" } : {}),
  }));
}

export function specimensByTier(tier: SpecimenTier): Specimen[] {
  return SPECIMENS.filter((specimen) => specimen.tier === tier);
}
