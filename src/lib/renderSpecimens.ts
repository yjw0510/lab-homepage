import { withBasePath } from "./basePath";

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
 * Mono-register constraint: `method` and `size` render in Geist Mono, whose loaded Latin
 * subset has no U+2248 (≈), U+2192 (→), superscript four, subscript digits, or Greek. Keep
 * those out of both fields or they silently fall back to another face.
 */
export const SPECIMENS: Specimen[] = [
  {
    slug: "woven-cof",
    tier: "dft",
    name: { en: "Woven COF-505", ko: "직조 골격체 COF-505" },
    method: {
      en: "PBE plane-wave SCF density · Quantum ESPRESSO",
      ko: "PBE 평면파 SCF 전자밀도 · Quantum ESPRESSO",
    },
    size: { en: "1,056-atom cell · periodic", ko: "원자 1,056개 · 주기 격자" },
    source: "simulations/01_cof505/density.cube",
  },
  {
    slug: "molecular-knot",
    tier: "dft",
    name: { en: "Heteroaromatic trefoil knot", ko: "헤테로방향족 삼엽 매듭" },
    method: {
      en: "GFN2-xTB density · Multiwfn cube",
      ko: "GFN2-xTB 전자밀도 · Multiwfn 큐브",
    },
    size: { en: "330 atoms · C, H, N, O", ko: "원자 330개 · C·H·N·O" },
    source: "structures/knot_hetero_xtb.xyz",
  },
  {
    slug: "buckycatcher",
    tier: "mlff",
    name: { en: "Buckyball catcher", ko: "버키볼 캐처" },
    method: {
      en: "MACE machine-learned force field · 3 ps NVT MD",
      ko: "MACE 머신러닝 역장 · 3 ps NVT MD",
    },
    size: { en: "148 atoms · host–guest complex", ko: "원자 148개 · 호스트-게스트 착물" },
    source: "simulations/03_buckycatcher/traj.xyz",
  },
  {
    slug: "nanotube",
    tier: "mlff",
    name: { en: "Double-walled carbon nanotube", ko: "이중벽 탄소나노튜브" },
    method: {
      en: "MACE force field · 300 K Langevin MD",
      ko: "MACE 역장 · 300 K 랑주뱅 MD",
    },
    size: { en: "480 atoms · concentric walls", ko: "원자 480개 · 동심 이중벽" },
    source: "simulations/04_dwcnt/traj.xyz",
  },
  {
    slug: "goldberg-cage",
    tier: "allatom",
    name: { en: "Pd₃₀L₆₀ Goldberg cage", ko: "Pd₃₀L₆₀ 골드버그 케이지" },
    method: {
      en: "All-atom assembly · g-xTB ligand geometry",
      ko: "전원자 조립 · g-xTB 리간드 구조",
    },
    size: { en: "2,070 atoms · hollow polyhedron", ko: "원자 2,070개 · 속 빈 다면체" },
    source: "structures/pd30l60.xyz",
  },
  {
    slug: "dendrimer",
    tier: "allatom",
    name: { en: "PAMAM G5 dendrimer", ko: "PAMAM 5세대 덴드리머" },
    method: {
      en: "All-atom model · MMFF94s relaxation",
      ko: "전원자 모형 · MMFF94s 이완",
    },
    size: { en: "4,548 atoms · fractal branching", ko: "원자 4,548개 · 프랙탈 가지" },
    source: "structures/pamam_g5_real.pdb",
  },
  {
    slug: "double-gyroid",
    tier: "meso",
    name: { en: "DPD double gyroid", ko: "DPD 이중 자이로이드" },
    method: {
      en: "HOOMD-blue DPD · A21-B39 diblock melt",
      ko: "HOOMD-blue DPD · A21-B39 다이블록 용융체",
    },
    size: { en: "196,500 beads · bicontinuous", ko: "비드 196,500개 · 이중 연속상" },
    source: "simulations/07_gyroid/gyroid_direct_c40_n1_aG34_final.gsd",
  },
  {
    slug: "capsid",
    tier: "meso",
    name: { en: "Icosahedral viral capsid", ko: "정이십면체 바이러스 캡시드" },
    method: {
      en: "Elastic network model · CCMV (PDB 1cwp)",
      ko: "탄성 네트워크 모형 · CCMV (PDB 1cwp)",
    },
    size: { en: "28,620 beads · one per residue", ko: "비드 28,620개 · 잔기당 하나" },
    source: "simulations/08_capsid/capsid_cg.pdb",
  },
];

/** Compact tier names, shared by every surface that captions a specimen so the site does
 *  not grow a second vocabulary. Matches the footer scale ruler. */
export const TIER_LABEL: Record<SpecimenTier, Record<"en" | "ko", string>> = {
  dft: { en: "DFT", ko: "제일원리" },
  mlff: { en: "MLFF", ko: "MLFF" },
  allatom: { en: "All-atom", ko: "전원자" },
  meso: { en: "Meso", ko: "메조" },
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

export function specimensByTier(tier: SpecimenTier): Specimen[] {
  return SPECIMENS.filter((specimen) => specimen.tier === tier);
}
