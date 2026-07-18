# Multiscale MLFF schematic: remaining work

Updated: 2026-07-17  
Scope: Multiscale page, 8-page sequence, with the former single MLFF page expanded into two connected schematic pages.

## 1. Fixed design intent

This is a scientific schematic, not a full neural-network architecture diagram.

The MLFF section must explain only the essential logic with a clear left-to-right rhythm:

1. **Page 1 — what an MLFF does**
   - DFT reference configurations with energy and force labels
   - a compact, geometry-aware MLFF block
   - a learned approximate potential energy surface
   - energy, forces, and molecular motion generated from the same learned potential

2. **Page 2 — how the MLFF works internally**
   - one atom-centered local graph within a cutoff
   - a schematic equivariant interaction/message-passing block
   - scalar and vector feature cues, without reproducing a complete MACE/NequIP/Allegro architecture
   - atomic energy contributions
   - total energy and forces derived from the same differentiable energy

The intended Page 2 flow is:

`local atomic graph → geometry-aware interaction → atomic energies → total energy and forces`

## 2. User feedback that must remain binding

- Do not use one large Mol* scene as a background with an HTML diagram merely overlaid on it.
- Mol* structures inside the schematic must not be draggable or rotate automatically.
- Do not explain invariance by showing several structures that all rotate together or independently.
- The diagram must be understandable without guessing what each object means.
- Use real mathematical typesetting for equations and symbols.
- Keep typography consistent across all 8 Multiscale pages.
- The ML block should look considered and contemporary, but it must remain a schematic rather than a full architecture specification.
- Decoration must support the scientific explanation. The only semantic motion is the user-requested neighbor-to-center message pulse and arrival glow; it follows exact projected atom coordinates and has a static reduced-motion state.

## 3. Work already implemented

- Added a dedicated MLFF schematic stage:
  - `src/components/multiscale/mlff/MlffSchematicStage.tsx`
- Routed MLFF pages away from the large shared 3D background in:
  - `src/components/multiscale/VisualStage.tsx`
- Embedded Mol* only in bounded schematic regions for:
  - the DFT configuration set
  - the learned PES/output molecule
  - the local atom-centered graph
  - the final force-output molecule
- Disabled direct interaction on those schematic Mol* viewports with `pointer-events: none` and disabled auto-rotation.
- Removed the former rotated/translated/permuted multi-structure comparison from Page 2.
- Replaced the generic fully connected neural-network drawing with a compact equivariant-interaction schematic.
- Added scalar/vector feature cues and atomic-energy outputs.
- Replaced plain-text equations with KaTeX-backed math labels.
- Added shared schematic typography tokens in:
  - `src/components/multiscale/visualRules.ts`
- Removed the moving flow-dot animation; connectors are now static.
- Hid MLFF camera controls because the diagrams are explanatory, fixed compositions.
- Raised the estimated mobile height of MLFF Page 1 after increasing the model-panel height.
- `npx tsc --noEmit` passed after the latest structural change.
- Replaced the unlabeled rectangular PES mesh with isoenergy contours on an explicitly defined schematic 2D configuration-space slice.
- Made the local graph data definition explicit and reproducible:
  - source coordinates and cutoff are in ångström
  - `r_cut = 3.60 Å`
  - 42 atom centers satisfy the cutoff, with maximum selected distance `3.587039 Å`
  - the two legacy `local_core` entries outside `3.60 Å` were removed from the asset and generator
- Projected the cutoff sphere silhouette and message paths through the live Mol* camera instead of using hand-positioned HTML rays.
- Clipped all signal light to the exact projected cutoff silhouette.
- Added phase-sampled animation checks: all six pulses start at the highlighted neighbor atom center and end at atom `i`, with maximum measured error below `3.2e-5 px`.
- Added final reduced-motion, normal-motion, mobile, bilingual, and all-eight-page evidence under `artifacts/`.

## 4. Completed implementation work

### A. Finish the two MLFF compositions

- [x] Verify Page 1 at the actual desktop aspect ratio.
- [x] Rebalance the three Page 1 widths so the DFT set, MLFF block, and learned PES are legible at once.
- [x] Confirm that five DFT configurations read as separate training samples rather than one composite molecule.
- [x] Ensure energy and force labels are legible but secondary to the configuration geometry.
- [x] Confirm the learned-PES panel clearly communicates `energy surface → force → trajectory`.
- [x] Verify Page 2 after its reduction from four narrow panels to three larger stages.
- [x] Make the cutoff boundary unambiguous and centered on the projected selected atom.
- [x] Ensure the interaction block reads as one repeated geometry-aware operation, not a generic MLP.
- [x] Check that scalar features and vector features are visually distinct without adding explanatory paragraphs.
- [x] Ensure the transition from atomic energies to total energy and forces is visually continuous.
- [x] Remove the redundant Page 1 atomic-energy row and keep the detailed sum only on Page 2.

### B. Remove residual motion and interaction ambiguity

- [x] Confirm every MLFF Mol* canvas has `autoRotate: false` at runtime.
- [x] Drag-test all four embedded Mol* regions and confirm their camera cannot move.
- [x] Capture two frames several seconds apart and pixel-compare them to detect unintended motion.
- [x] Check that no legacy MLFF scene or mechanism layer is mounted behind the new schematic.
- [x] Confirm there is no ambient particle, flow-dot, camera, or trajectory motion. The sole semantic message pulse is coordinate-bound, cutoff-clipped, and disabled under reduced motion.

### C. Normalize typography across all 8 pages

Use a single hierarchy across DFT, MLFF, all-atom, and mesoscale pages:

| Role | Target | Notes |
|---|---:|---|
| Scene title | 28 px desktop / 20 px mobile | Same component on all pages |
| Panel title | 14–18 px | One consistent tier per panel type |
| Body/caption | 13–16 px | Avoid arbitrary one-off sizes |
| Metadata/short labels | 12 px minimum | Monospace only where semantically useful |
| Display equation | 18–24 px | KaTeX, not a sans-serif imitation |
| Inline math | At least surrounding text size | Baseline-aligned |

Required audit:

- [x] Search for all one-off `text-[…]` values in Multiscale components.
- [x] Remove visible text smaller than 12 px, including labels embedded in overlays.
- [x] Check Korean and English separately because Korean text often wraps earlier.
- [x] Compare the same role across all eight pages, not only within MLFF.
- [x] Verify line height and panel padding along with font size; matching nominal sizes alone is insufficient.

### D. Mobile layout verification

- [x] Verify 390×844 and 430×932 viewports for both MLFF pages.
- [x] Replace heuristic mobile heights where English captions or formulas clipped.
- [x] Ensure each flow arrow remains between its source and destination panels after stacking.
- [x] Confirm the scene-title card never overlaps the first schematic panel.
- [x] Confirm no horizontal page overflow.
- [x] Confirm equations fit without scaling below the typography floor.

### E. Repair and update visual-QA tooling

- [x] Update `scripts/verify-mlff-visuals.mjs` to target `.mlff-schematic-stage`.
- [x] Make the verifier capture:
  - MLFF Page 1 desktop
  - MLFF Page 2 desktop
  - both pages at 390×844
  - both pages at 430×932
- [x] Add checks for:
  - minimum visible font size of 12 px
  - horizontal overflow
  - clipped panel content
  - title-panel collision
  - hidden legacy MLFF overlays
  - absence of active camera controls on MLFF
- [x] Add an all-eight-pages capture script with these scene keys:
  - DFT: `D6_outputs`, `D4_scf`
  - MLFF: `L1_why`, `L5_energy_force`
  - All-atom: `A6_observables`, `A3_forcefield`
  - Mesoscale: `M5_collective`, `M6_characterize`
- [x] Store the final evidence in new pass directories rather than overwriting older passes.

## 5. Required visual revision passes

The request calls for at least ten careful revisions. These should be actual render-review-adjust cycles, not ten arbitrary code edits.

- [x] Pass 01 — desktop composition and reading order; rebalanced three columns (`pass-01`).
- [x] Pass 02 — Page 1 DFT sample separation; five vertically separated configurations and per-sample labels (`pass-02`).
- [x] Pass 03 — Page 1 model-block clarity; compact local-geometry/equivariant/potential chain (`pass-03`).
- [x] Pass 04 — Page 1 PES, force, and trajectory relationship; explicit energy-to-force-to-motion flow (`pass-04`).
- [x] Pass 05 — Page 2 local graph and cutoff clarity; centered cutoff and later exact projected Å-coordinate refinement (`pass-05b`, `pass-10-exact-cutoff-silhouette`).
- [x] Pass 06 — Page 2 interaction-block scientific credibility; repeated equivariant message operation with scalar/vector channels (`pass-06`).
- [x] Pass 07 — atomic-energy sum and force derivation flow; continuous `Σ` and `-∇` handoff (`pass-07`).
- [x] Pass 08 — typography consistency across all 8 pages; 16 bilingual desktop cases (`artifacts/multiscale-eight-page-audit/20260717-final-coherence`).
- [x] Pass 09 — 390 px and 430 px mobile layouts; both pages and languages without clipping or overflow (`pass-09`, `pass-09-en`, `pass-09-final`).
- [x] Pass 10 — motion, clipping, overflow, and final polish; 12 reduced-motion cases plus 6 normal-motion endpoint cases (`pass-12-final-reduced`, `pass-13-final-motion`).

For each pass, save a screenshot and record the concrete issue fixed. Do not count a pass unless the new render was inspected.

## 6. Verification completed

Run after the visual work is complete:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build
```

Results on 2026-07-17:

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 0 errors; 29 pre-existing warnings remain outside the MLFF completion scope.
- `npm run test:run`: 5 files and 42 tests passed.
- `npm run build`: Next.js production build and image postbuild passed; 74 static pages generated.
- MLFF reduced-motion deep QA: 12/12 passed in `pass-12-final-reduced`.
- MLFF normal-motion endpoint QA: 6/6 passed in `pass-13-final-motion`.
- Eight-page bilingual typography/coherence audit: 16/16 passed in `20260717-final-coherence`.
- MLFF bilingual math render check: 0 KaTeX/LaTeX console warnings after the ångström-unit cleanup.

## 7. Final acceptance criteria

The work is complete only when all of the following are true:

- [x] MLFF has exactly two connected schematic pages.
- [x] Page 1 reads unambiguously as `DFT labels → learned potential → energy/forces/motion`.
- [x] Page 2 reads unambiguously as `local graph → equivariant interaction → atomic energies → total energy/forces`.
- [x] No MLFF molecule rotates, drags, or changes camera on its own.
- [x] No large Mol* background sits behind the MLFF schematic.
- [x] No generic dense MLP graphic remains.
- [x] The architecture cue is modern but intentionally schematic.
- [x] Every scientific equation uses KaTeX or equivalent math typography.
- [x] No visible Multiscale label is smaller than 12 px.
- [x] Equivalent text roles use consistent sizes across all 8 pages.
- [x] Desktop and both mobile target sizes have no clipping or horizontal overflow.
- [x] Ten render-review-adjust passes are documented with evidence.
- [x] Type check, lint, tests, production build, and visual-QA checks pass.

## 8. Principal files changed

- `src/components/multiscale/mlff/MlffSchematicStage.tsx`
- `src/components/multiscale/visualRules.ts`
- `src/components/multiscale/MultiscalePinned.tsx`
- `src/app/globals.css`
- `scripts/verify-mlff-visuals.mjs`
- `scripts/capture-multiscale-eight-pages.mjs`
- `scripts/generate-mlff-data.py`
- `public/data/multiscale/mlff/system.json`

Avoid broad edits to unrelated dirty-worktree files. The repository already contains changes outside this MLFF task, and those must be preserved.
