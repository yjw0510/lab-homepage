# DESIGN — Yu Lab (멀티스케일 분자 전산화학 연구실)

A locked design system for this site. Every page redesign reads this file before
emitting code. Extend or amend this file when the system needs to grow; never
improvise a value that is not declared here.

Direction: **"Ledger & Instrument"** — a printed scientific journal for the site
chrome, a precision instrument for the interactive science. Light mode is
**Korean 오방색 on White** (L21, koreancoloratlas.com): neutral white paper,
near-black ink, and the five cardinal colors as working roles — 적 red signals,
청 blue links, 황 yellow highlights. Dark mode is **Flexoki Dark** (D9,
stephango.com/flexoki): warm black (not pure black), analog paper-ink text,
watercolor ink accents. Interactive viewers follow the selected mode while
scientific marks retain their domain colors.

- Genre: editorial (hallmark), brand register (impeccable)
- Dials: `DESIGN_VARIANCE: 6` · `MOTION_INTENSITY: 4` · `VISUAL_DENSITY: 5`
- Audience: prospective grad/undergrad students (recruitment), peer researchers,
  funding reviewers. Bilingual ko/en; Korean is the primary voice.
- The one memorable thing: the site reads as a **continuous zoom across length
  scales**. Hairline "scale rulers" with real tick marks and mono scale
  annotations (Å → nm → µm) structure the home page and the footer colophon.

## 1. Color — palette-exact hex, three accent roles

Anchor palettes are external systems chosen deliberately (color-palettes-v2:
light **L21 Korean 오방색 on White**, dark **D9 Flexoki Dark**). Token values
are the exact published hex — no OKLCH re-derivation, no improvised tints
beyond the derived neutrals declared below. (Scientific content — CPK atoms,
plots, orbital surfaces, schematic accents — keeps its own domain palette;
chrome never borrows from it.)

Accent policy (rev.2 — the palettes must be FELT, not glimpsed). Hue held
across modes; color appears through fixed roles, several of them broad-area:

- **Signal red** (적 `#C3272B` / Flexoki red `#D14D41`): active nav underline,
  focus rings, square heading anchors, scale-ruler origin tick, PI name
  highlight, and the **primary button fill** (light `#C3272B`+`#F5F5F5` text,
  dark `#D14D41`+`#FFFCF0` text).
- **Link blue** (청 `#1E4C9A` / Flexoki blue `#4385BE`): links, ledger
  year/date numerals in margin columns.
- **Highlight yellow** (황 wash `#F6EFD3` / Flexoki yellow tint `#2F2610`):
  selection and active-toggle background tint; never text on background.
- **Level identity colors** — the four length scales each own a color, used
  wherever a surface belongs to that level (instrument tabs, scene titles,
  mechanism panel headers and boxes, scale-ruler segment labels, home method
  rows): DFT **청** · MLFF **적** · 전원자 **황** · 메조 **묵**. Declared as
  `--lv-{dft,mlff,aa,meso}` triads (mark/ink + `-line` hairline + `-wash`
  broad tint) in globals.css; light values derive from L21, dark from the
  Flexoki 400 inks (`#4385BE` `#D14D41` `#D0A215`) and base-300. Washes are
  broad-area by design (whole panel headers, plot boxes) — the old ≤3% cap
  applies only to signal-red marks. Colored text on a wash: headings and
  labels ≥14px; body text on washes stays `--foreground`.
- Remaining Flexoki accents (orange `#DA702C`, green `#879A39`, cyan
  `#3AA99F`, purple `#8B7EC8`, magenta `#CE5D97`) stay reserved for the
  scientific layer.

### Light ("ledger" — 오방색 on White)

```css
:root {
  color-scheme: light;
  --background:        #F5F5F5;  /* 백 — neutral white */
  --foreground:        #1A1A1A;  /* 흑 — ink, 16:1 */
  --primary:           #C3272B;  /* 적 — signal red (marks) 5.3:1 */
  --accent-ink:        #1E4C9A;  /* 청 — link blue 7.5:1 */
  --primary-foreground: #F5F5F5;
  --card:              #FCFCFC;  /* raised surface (rare; prefer rules) */
  --muted:             #E9E9E9;  /* recessed fills */
  --muted-foreground:  #565656;  /* secondary text 6.7:1 */
  --border:            #DCDCDC;  /* hairline rule */
  --border-strong:     #ACACAC;  /* emphasis rule / double rules */
  --accent:            #F6EFD3;  /* 황 wash (selection, active bg tint) */
  --accent-foreground: #6E5A0A;  /* ochre text on 황 wash 5.9:1 */
  --surface-raised:    #FCFCFC;
  --surface-sunken:    #EEEEEE;
}
```

### Dark ("instrument" — Flexoki)

```css
.dark {
  color-scheme: dark;
  --background:        #100F0F;  /* Flexoki black — warm, not pure */
  --foreground:        #CECDC3;  /* tx (base-200) 11.9:1 */
  --primary:           #D14D41;  /* red-400 — signal marks, button fill */
  --accent-ink:        #4385BE;  /* blue-400 — links 4.8:1 */
  --primary-foreground: #FFFCF0;  /* paper label on red fill */
  --card:              #1C1B1A;  /* base-950 */
  --muted:             #282726;  /* base-900 */
  --muted-foreground:  #878580;  /* tx-2 (base-500) 5.2:1 */
  --border:            #343331;  /* base-850 */
  --border-strong:     #575653;  /* base-700 */
  --accent:            #2F2610;  /* yellow-tint active bg */
  --accent-foreground: #D0A215;  /* yellow-400, 6.6:1 on the tint */
  --surface-raised:    #1C1B1A;
  --surface-sunken:    #0A0909;  /* below-black viewer well */
}
```

Level triads (`--lv-{dft,mlff,aa,meso}` + `-line` + `-wash`, globals.css):

```css
/* light inks */  #1E4C9A  #C3272B  #7A6000 /* 황 text-grade */  #1A1A1A
/* dark inks  */  #4385BE  #D14D41  #D0A215  #B7B5AC /* base-300 */
/* lines/washes = rgba() of the ink (light: 황 wash from #F9D537) */
/* text-grade  */ --lv-mlff-text: #C3272B light / #E8705F dark
/* text-grade  */ --lv-dft-text:  #1E4C9A light / #66A0C8 dark  /* Flexoki blue-300 */
```

Two level inks do not survive as text on their own wash in dark mode, so each has a
text-grade sibling. Measured against the level's `-wash` composited over
`--surface-raised`: DFT mark `#4385BE` gives **3.71:1**, under AA; Flexoki blue-300
`#66A0C8` gives **5.16:1**. MLFF mark `#D14D41` gives **3.48:1**; `#E8705F` gives
**4.96:1**. 황 (5.93:1) and 묵 (7.26:1) need no split. The mark values stay
palette-exact for fills, rules and ticks.

The MLFF mark ink is the one level colour that does not survive as small type:
`#D14D41` on `#100F0F` measures 4.42:1, under the AA floor. `--lv-mlff-text`
carries a lightened red (`#E8705F`, 6.3:1) for level ink at 11–13px; the mark
value stays palette-exact for fills, rules and ticks. Light mode needs no split
(`#C3272B` is 5.28:1). This is the same mark-versus-text split the 황 ink
already uses.

Rules: no pure #000/#fff anywhere — Flexoki black `#100F0F` and paper
`#FFFCF0` are the extremes, and paper is reserved (body text is tx `#CECDC3`
per the Flexoki dark spec). Dark-mode elevation = lighter surface, never
shadows. Accent roles never switch hue between modes; the neutral axis is
neutral in light (오방색 백) and warm in dark (Flexoki base) — that
temperature split is the theme, not drift. Scrim and sheet-shadow color is
`rgba(16, 15, 15, α)` in both modes. Unused Flexoki accents (orange `#DA702C`,
green `#879A39`, cyan `#3AA99F`, purple `#8B7EC8`, magenta `#CE5D97`) are
declared reserves — never in chrome. WebGL and Molstar viewports derive their
background from the active site theme; scientific representations keep their
domain palette in both modes. The mesoscale R3F scene's lighting rig is part of that
domain layer and is declared here so the gate can verify chrome against it: ambient
`#E2E8F0`, hemisphere `#DBEAFE`/`#09090F`, fill `#93C5FD`, bounce `#FCA5A5`, ambient
occlusion `#000010`.

Existing Tailwind semantic names (`bg-background`, `text-foreground`,
`text-primary`, `border-border`, `bg-card`, `text-muted-foreground`,
`bg-muted`, `bg-accent`, `text-accent-foreground`, `bg-surface-raised`,
`bg-surface-sunken`) are KEPT and re-pointed at these values, so the multiscale
engine re-skins without engine edits. New utilities: `text-accent-ink`,
`border-border-strong`.

## 2. Typography — one family, one weight ladder, a register not a second face

**Pretendard Variable is the only text family**, carrying Korean and English alike
(`wght 45–930`, `tnum`, and the whole scientific character set the site needs:
`Å µ ≈ → ⁻¹ ₀ α Δ ρ ∑`). KaTeX remains the mathematical register (below). A second
Latin-only face was retired because it carried no Hangul, so every Korean metadata
string silently broke into two typefaces inside one line.

**The master rule: weight encodes emphasis, size encodes scale, and the two are set
independently.** A role keeps its weight at 15px and at 49px. **Adjacent levels never
sit closer than 100 apart** — the retired system ran 830 / 650 / 600 / 430, so
`heading` and `strong` differed by 50 and were indistinguishable, which is how a site
ends up using six weights that read as two.

| role | weight | what carries it |
|---|---|---|
| `type-display` | **900** Black | the page's own name; **one per page** |
| `type-title` | **800** ExtraBold | section openings (`h2`), 26–49px |
| `type-heading` | **700** Bold | block titles (`h3`), 15–24px |
| `type-lead` | **600** SemiBold | the one sentence a block turns on; inline `strong` |
| body | **430** | prose, `leading 1.7` (Korean needs air); dark mode 400 |
| `type-mono-meta` | **500** | the metadata register, 11–13px |
| `type-quiet` | **300** Light | large readouts only, **≥21px** |

Two constraints keep the ladder from decaying back into a palette:
- **At most one level above 600 per composition block.** A block with a title does not
  also get a heavier sub-label.
- **300 is forbidden below 21px.** Small text needs more weight, not less, which is why
  the metadata register sits at 500 while the large numeric readouts sit at 300. Thin
  strokes read as instrument precision at 30px and as a rendering fault at 12px.

**Metadata register** (`type-mono-meta`): dates, years, DOIs, volume/page, scale ticks,
counts, index numerals, provenance lines. `font-variant-numeric: tabular-nums`,
weight 500, `tracking 0.055em`, sizes 11–13px. It is a *style*, not a family — the open
tracking and locked figure widths are what make it read as instrument metadata, and
they work in both scripts. Never as body prose. `--font-mono` still resolves to a real
system monospace and is reserved for actual code and raw numeric dumps.
- **Mathematical notation**: KaTeX's LaTeX/Computer-Modern-derived family is
  the sole mathematical register. Block equations render at 21px in display
  style; inline equations stay at 1em–1.05em on the prose baseline. Never type
  equations with Pretendard, Geist Mono, Unicode lookalikes, or ad-hoc SVG
  text. This is a domain-specific exception to the two-family text system.
- Scale (≈1.33 ratio): 12.5 / 14 / 16 (base) / 18 / 21 / 28 / 37 / 49 / 65px;
  display clamp ceiling 5.5rem. Body measure ≤ 34rem ko / 65ch en.
- Hero headline ≤ 2 lines; subtext ≤ 20 words / ≤ 2 lines Korean.

## 3. Spacing, shape, layout

- **Height breakpoints.** Width alone cannot budget a full-viewport composition, so
  the specimen hero also switches on viewport height: `820px` (the stacked plate
  label appears), `800px` (tray cells tighten), `700px` and `660px` (type rhythm and
  plate shrink). These four values are viewport thresholds, not spacing; nothing
  else in the system may introduce a height query without declaring it here.
- 4-pt Tailwind scale. Section rhythm: `py-20 sm:py-28` standard,
  `py-28 sm:py-40` for major breaks. Content container: `max-w-6xl px-6 sm:px-8`.
- **Shape lock: sharp.** `border-radius: 0` on every redesigned element
  (buttons, inputs, panels, images containers). The print/instrument register
  has no pills. Exception: none. (Engine overlay chrome is restyled to match.)
- Layout language: asymmetric **margin-column grid** — a 12-col grid where
  left cols 1–3 carry mono metadata (dates, years, scale ticks, section
  labels) and cols 4–12 carry content. Hairline `border-t` rules open sections;
  double rules (`border-t border-b` 1px pair, 3px apart) mark the page masthead
  and footer only.
- Cards are retired site-wide. Grouping = whitespace + hairlines + margin
  column. No side-stripe borders, no icon+heading+text tile grids, no pills
  as tags (tags render as mono text with `[brackets]` or plain).
- Zebra/zigzag splits: never more than 2 consecutive; home uses ≥4 layout
  families (full-bleed hero / margin-column index / ledger list / colophon).

## 3a. Bounded columns — the reading policy

A bounded column is any panel given a fixed height and asked to hold reading matter:
today only the multiscale rail, but the rules are the general ones. They exist because
this column shipped twice in a state where the reader could not read it. First the body
copy sat inside a box of literally zero height on a 1024x768 laptop; then, after that
was "fixed" by flattening to a single scroller, the body had 336-476px of height and
sat entirely below the fold, so the reader still met zero lines of prose. Both states
would pass a rule about box height or about share of the column. Hence R1.

Every block in a bounded column declares `data-rail-role`, and the numbers below are
checked against what the browser laid out, not against what the classes intended, by
`.superloopy/evidence/frontend/20260729-parity/probe-rail-policy.mjs` reading
`rail-policy.json`. That script is the binding half of this section; if the two ever
disagree, the script is right and this text is stale.

| role | what it is |
|---|---|
| `frame` | orients the reader: the scale descriptor, the tier tabs, the applicability lede |
| `instrument` | the reader acts on it: a slider, a term selector, an interactive plot |
| `body` | the prose the page exists to deliver, plus its takeaway |
| `provenance` | where the numbers on screen came from |
| `readout` | a live measurement taken from the scene |
| `nav` | moving between steps, or out to the method notes |

- **R1 — eight lines of prose on screen before any scrolling.** At `scrollTop 0`, the
  intersection of `[data-rail-role=body]` with the scroller's viewport is at least
  `8lh`. Eight is not taste: it is the largest floor payable at every declared viewport
  by ordering alone, verified at 202px of chrome against a 495-695px scroll viewport.
  A measurement that comes back null fails; only a rail short enough that nothing
  scrolls is exempt, because then all of it is on screen.
- **R2 — at most 55% of the scroll viewport may precede the body.** The ratio form of
  R1, and the one that fails first when a block is added, naming the block. Measured
  after the reordering: 23-40% at every viewport, in both locales.
- **R3 — exactly one scroll container.** The rail scrolls; nothing inside it does.
  Nested scrollbars were the visible symptom a reader reported.
- **R4 — nothing may be pinned above the body except the scale descriptor, the tier
  tabs and the applicability lede.** The equation, the controls, the provenance strip
  and the interaction hint render after the body. On desktop the stage sits in the
  left column beside the rail, so a control's vertical position in the rail does not
  separate it from what it drives. The stacked path leads with controls instead,
  because there the stage is above.
- **R5 — a reading floor is written in `lh`, on the element that carries the prose
  `line-height`.** `lh` resolves against the element it is written on, so a floor set
  on a wrapper silently uses the wrong number.
- **R6 — `min-h-0` is a permission, never a floor.** `flex: 1` is `1 1 0%`; zero is a
  conforming used size. Any `flex-1` + `overflow-y-auto` element holding text needs a
  declared minimum as well.
- **R7 — the scroll container is keyboard-reachable and named.** It carries
  `tabindex="0"`, `role="region"`, an accessible name, and `data-rail-scroll`, and any
  window-level arrow-key handler stands down inside it. Without the stand-down,
  ArrowDown advances the step and roughly 1500px of prose cannot be reached at all.
- **R8 — no `overscroll-behavior: contain` on a column that is the only wheel path to
  what lies below it.** The instrument is a full-viewport pane with the overview
  section beneath it.
- **R9 — budget in the longer locale, per step.** English applicability lines ran 277px
  against Korean's 194px at 1024x768; sizing against Korean alone passed the gate and
  shipped the defect in English. The gate runs `ko` and `en` at every viewport.
- **R10 — a bare length is never a grid track.** Use `minmax(0, ...)`, `fit-content()`
  or a length inside `min()`. A fixed `rem` track doubles under text resize and clipped
  a paragraph by 35px at 200%.

Content is a layout instrument here, not a fixed input. Where a block will not fit its
budget, shortening the copy is a legitimate and preferred fix, and
`src/components/multiscale/consistency.test.ts` keeps the eight steps inside one shape
so that shortening one does not make it an outlier.

## 3b. Drawn surfaces — what a check on the DOM cannot see

Section 3a governs boxes of prose, where `getBoundingClientRect` is ground truth. This
section governs everything drawn: SVG schematics, WebGL canvases, and annotations laid
over them. It exists because a full apparatus of DOM-geometry gates certified this page
green while a reader opened it and found molecules poking through five bordered boxes,
labels painting at four pixels, and an equation sliced in half. None of those are visible
to element geometry, so each rule below names the measurement that does see it.

- **R11 — a fixed `viewBox` is a silent font shrinker.** `fontSize="12"` inside
  `viewBox="0 0 520 180"` is twelve *user units*. Drop that svg into a 184px box and the
  reader gets 4.25px while `getComputedStyle` still reports 12, which is why every
  style-based check passed. Either the viewBox tracks the measured pixel box so one unit
  is one pixel (`DftMechanism`, `PlotContainer`), or every declared size must clear the
  floor at the *narrowest* container the element is ever given (`MlffValueSchematic`,
  trimmed to its real extent and floored at 13.5 units). Floor: 9px hard, 11px intended.
  Measured by `probe-tiny-text.mjs` through `getScreenCTM`, never through the cascade.
- **R12 — never clamp a measured dimension.** `PlotContainer` floored its own measured
  width at 320, so in a 254px column the viewBox stopped matching pixels and every label
  in three plots shrank by that ratio. If a floor is needed for layout maths, apply it to
  the derived margins, not to the measurement.
- **R13 — `overflow: hidden` may never be what makes content fit.** It does not scroll,
  does not warn, and does not report; it stops painting. `probe-clipped-content.mjs`
  walks every clipping ancestor and fails on any leaf painted past its edge.
- **R14 — centre inside a bounded box with `safe center`.** Plain `center` pushes the
  overflow out of *both* ends: the MLFF interaction core printed its first box straight
  over the panel's own header at 1024. `safe` centres while it fits and top-aligns when
  it does not.
- **R15 — a bounded scroll pane says whether it continues.** A pane that cuts a line
  through the middle with no cue reads as a finished paragraph. Signal it with a mask,
  not a painted gradient, so it carries no colour of its own and is right in both themes;
  apply it only to an edge that really has more behind it, and keep the fade shorter than
  one line box so it costs none of the eight lines R1 requires.
- **R16 — an annotation over a drawn scene is placed by clearance, not by offset.** A
  constant offset knows nothing about what is under it: `center.x + 12` put the `i` chip
  on a neighbouring atom, and `cutoffEnd - 56` made the `r_cut` label erase the arc it
  names. Search candidate positions and score them against the things already drawn.
- **R17 — what a canvas paints must fit inside the canvas, use it, and be centred in
  it.** Three separate failures, three separate measurements, all in
  `probe-canvas-fit.mjs`: content reaching two or more edges is a camera cutting the
  scene; a bounding box spanning under 25% of the canvas is a stage the scene does not
  use; margins skewed by more than 30% of a dimension is a scene pinned to one end. Do
  not gate on *inked* pixels — a ball-and-stick molecule covers about 5% of its own
  bounding box because it is spheres with gaps, so an ink rule flags a perfectly framed
  scene and says nothing about framing. Ink is reported as context only.
  `probe-frame-fit.mjs` applies the same pixel reading to the bands between framed boxes.
  Both crop the *composited* page, so both must discard the pixels the canvas does not own:
  a step counter or a nav button drawn over the canvas is otherwise counted as scene
  content, which is how a scene starting 60px down reported a top margin of zero. Mask by
  DOM geometry, never by hit-testing — a decorative overlay is `pointer-events-none`, so
  `elementFromPoint` returns the canvas straight through it, and the all-atom title card was
  being read as molecule. The tell was margins of exactly 32/33/32px on two differently
  sized canvases: that is a CSS inset, not a camera result. Scene probes also run with
  `reducedMotion: "reduce"`, which pins the trajectory to one frame; without it the same
  layout measured differently in light and dark because the captures landed on different
  frames of a playing animation.
- **R19 — no text may be printed over other text.** Distinct from R13: nothing overflows
  and nothing is clipped, both boxes are exactly where their CSS put them, and they simply
  collide. Seven MLFF panels each reserved a guessed `top-[Xrem]` for a header they did not
  measure (3.2, 4.5, 4.6 and 4.8rem, each right for exactly one string); at 1024 in English
  that header wrapped to five lines and printed straight through the card beneath it. The
  fix is structural: the header sits in flow and the body takes `flex-1`, so there is no
  number to guess. `probe-overlap.mjs` enforces it, and like every geometry check it has to
  intersect each rect with its scrollports first — comparing raw rects made a rail body
  taller than its scroller appear to sit on the pager below it.
- **R18 — a decorative floor is not a visibility guarantee.** `Math.max(0.1, …)` on the
  atom layer read on near-black and vanished on near-white, taking half of an
  atom-to-bead mapping with it. Opacity floors are checked against the light surface,
  which is the one that loses.
- **R20 — frame what is painted, and own the camera that does it.** Mol* re-frames onto its
  own visible bounding sphere after any commit that grows it, which on a playing trajectory
  is most of them. It silently overwrote every placement this app computed: the force-field
  page asked for a camera distance of 8.35 and ended up at 20.63, so `padding`,
  `targetOccupancy` and the whole zoom ladder were configuration nothing read, and the
  values in them had been "tuned" against a pipeline that discarded them.
  `canvas3d.camera.manualReset = true` takes that back, and once it does the camera must
  also write `radiusMax` itself, because `Camera.update()` returns early while that is 0.
  What gets framed is the **painted** set, measured from the committed layer list — not the
  asset's camera metadata, which describes the whole solvated box while a page paints the
  24-atom solute (framing 10.4 Å for a 4.2 Å subject rendered it at 21% of the frame).
  `canvas3d.boundingSphereVisible` is the same measurement but is a stale object between
  Mol*'s own commits: read when a placement is computed it is still 0. Centre on the
  midpoint of the extremes, never a centroid — a centroid weighted by atom count sits inside
  whichever cluster is denser and leaves the frame lopsided. And whatever sets the radius
  sets the near plane and the fog, so a frame tightened without it clips the context out.

## 4. Components

- **Nav (masthead)**: hairline bottom rule; wordmark left = `Yu Lab` at `type-heading` 700
  + mono `MMCC` tag; links right, `text-[13.5px]` weight 500; active item =
  `text-foreground` + 2px signal-red underline (offset 6px); inactive
  `text-muted-foreground`. No pill backgrounds, no backdrop-blur glass. Height
  64px. Mobile: full-width sheet below masthead, hairline-separated rows.
- **Footer (colophon)**: double rule top; one dense band: wordmark + lab full
  name, mono address/email block, inline link row; beneath it the **scale
  ruler**: a full-width hairline with tick marks and mono labels
  `Å · nm · µm` linking DFT → MLFF → all-atom → meso pages; mono copyright line.
- **Buttons**: primary = signal-red fill (`bg-primary text-primary-foreground`
  with light `#F5F5F5` / dark `#FFFCF0` label), sharp, `px-6 py-3`, weight
  600, label ≤ 3 words; hover = translateY(-1px) + `bg-primary/90`; active =
  translateY(0). Secondary = 1px `border-strong` hairline, transparent bg;
  hover = `bg-muted`. Focus (all interactives): 2px signal-red ring, 2px
  offset, instant.
- **Links**: `text-accent-ink`, underline 1px, `underline-offset-[3px]`;
  hover → `text-primary`. External links keep ↗ icon (lucide, 14px).
- **Ledger row** (publications, news, funding, topic index): `border-t
  border-border` on each row group; left margin column mono metadata; row
  hover = `bg-muted/50`; no boxes.
- **Section heading**: display-650 28–37px, left-aligned. Every top-level
  section heading carries the 10px signal-red square anchor (the ruler-origin
  mark); in the three sanctioned scale-ruler locations the ruler itself is the
  section's mark and sits below the anchored heading. Subsection headings
  inside a document (CV blocks, drawer internals) stay plain. Never an anchor
  AND a mono label on the same heading; label budget below.
- **Empty states**: mono label + one body line inside a hairline-ruled block
  (no dashed boxes). Loading: skeleton bars matching final layout. Error:
  plain body + accent-ink retry link.
- **Icons**: lucide-react (kept, already project-wide), `strokeWidth 1.75`,
  16–20px, functional only (external-link, menu, theme, zoom). Never
  decorative tiles.
- **Icon button** (masthead theme/language/menu, hero transport): no border, no
  fill, no tile — `h-11 w-11`, glyph 16–20px, `text-muted-foreground` →
  `hover:bg-muted hover:text-foreground`. This is the site's only icon-button
  language; a bordered cell is not an alternative, because no border token
  reaches the 3:1 that WCAG 1.4.11 asks of a boundary identifying a control
  (`--border` measures 1.26:1 light / 1.52:1 dark on `--background`,
  `--border-strong` 2.08 / 2.61).
- **Hero transport**: the terminal column of the home specimen tray, not a widget
  in the readout band — it shares the row's `border-l` separator, its `border-t-2`
  baseline and its height ladder, so it reads as part of the ruler rather than as
  a control sitting on top of it. `basis-11 sm:basis-14`. Pause and play are the
  lucide glyphs in the icon-button treatment above; the held state additionally
  fills the column's 2px baseline with `foreground`, the same grammar the tray
  uses for the current cell. Chrome stays neutral: level identity ink is scoped to
  surfaces that belong to a level, and the transport belongs to the mechanism.
- **Specimen plate** (`SpecimenPlate`): one Cycles render of a system the lab
  actually simulated, **square at every breakpoint** (the `lg` hero plate is
  height-driven and capped at `58vw` so a tall viewport cannot crop it), full-bleed
  inside its box, no border and no shadow. The assets in `public/renders/<slug>/`
  are composited over the two background tokens at bake time, and the poster is
  frame 0 of its own loop, so poster and loop agree pixel for pixel and the plate
  sits on `bg-background` with no visible edge. Both posters ship in the markup and
  swap by the `dark:` variant (so the right one paints before hydration) and stay
  painted underneath; the loop mounts over them only after hydration, only while on
  screen, and fades in on `playing`. The loop's outer **2% on each axis is masked to
  a fade** so the codec's residual backdrop drift never draws a rectangle. Reduced
  motion, Save-Data and 2G hold the poster.
  Its caption is a **printed plate label**, not a title, in one of two shapes:
  - *stacked* (tier page figcaption, hero left field at `lg` on a tall viewport):
    tier name and scale tick in that level's identity ink, then the system name at
    `type-heading`, then method and size as `type-mono-meta` lines each opened by a
    hairline.
  - *inline* (hero readout band): index, tier name in level ink, system name, and —
    wherever the stacked label is not shown — method and size on a wrapped second row.
  Never set caption text over the render.

## 5. Motion — quiet, GPU-only, visible-by-default

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`; durations
  `--dur-fast: 180ms`, `--dur-med: 320ms`, `--dur-slow: 600ms`.
- The home hero rotates through the eight specimen plates, crossfading each loop
  in over its poster at 600ms. Rotation is 7s, pauses off screen, is suppressed
  below `sm`, and stops when the reader picks a specimen. **Playback and rotation
  are separate states**: picking a specimen holds the carousel and leaves the
  picture moving, and the transport (§4) holds or releases both together. Pause
  freezes the loop on its current frame and play resumes from it, which means the
  element is held, never unmounted. Everything else: micro (hover lift, underline
  sweep).
- **Reveal policy (hard rule)**: content is visible without JS. Reveal-on-
  scroll may only ADD a transform/opacity animation via a `.pre-reveal` class
  that JS applies before observing; no CSS that hides content by default.
- `prefers-reduced-motion: reduce` → all entrances collapse to instant.
- Animate transform/opacity only. The global
  `* { transition: background-color, border-color }` rule is retired; theme
  transition applies to `body` and surfaces explicitly.

## 6. Depth

Flat + hairlines. No box-shadows in light mode (rules carry structure). Dark
mode: elevation via surface lightness steps only. The single permitted shadow:
the mobile nav sheet and the topic drawer may use
`0 8px 32px rgba(16, 15, 15, 0.24)`; the drawer scrim is
`rgba(16, 15, 15, 0.45)`.

## 7. Signature system — the scale ruler

The lab's identity is multiscale. The ruler motif encodes it with real data:
a hairline with tick marks and mono labels of real length scales. Used in
exactly three places: (a) home research-scale index (section spine),
(b) footer colophon, (c) multiscale overview header. It is the site's single
"named brand system"; no other decorative rules/crosshairs allowed.

**Mono-label budget** (eyebrow discipline): ≤ 1 uppercase/mono section label
per 3 sections per page. The ruler labels in (a)–(c) are the budget spenders;
plain headings elsewhere.

## 8. Per-page macrostructure families

- **Home**: full-viewport specimen hero — left-aligned display type and 2 CTAs
  over a clean field, a square specimen plate anchored to the right edge from
  `lg` (its left third dissolved by a mask), the printed plate label under the
  CTAs, then a full-width readout band and, on the bottom edge, a row of eight
  specimen cells closed by the transport column (§4). The hero rotates through the
  eight renders; below `lg` the masthead comes first and the tray degrades to ruler
  ticks. No scroll cue. → scale-index of research areas (margin-column + ruler
  spine) → publications ledger (top 3) → news colophon rows. No cards anywhere.
- **Multiscale tier pages**: the two specimens run at that tier lead the
  document, each a plate with its printed label, above the article sections.
- **Content pages** (publications, news, funding): ledger/index — title block
  with double rule, then hairline rows, mono year/date margin column. Filters
  render as mono text toggles with accent active state, not pills.
- **People / Contact**: document register — CV sections with hairline rules
  (people page largely keeps its structure, restyled); contact recruitment
  block reads as a short letter with a hairline frame.
- **Research topics**: margin-column index rows mapped to the drawer (bento
  grid retired; rainbow accents retired).
- **Multiscale**: instrument register preserved structurally; chrome, panels,
  plots, and viewer backgrounds derive from the site tokens (sharp corners,
  mono readouts). Scientific representation colors remain mode-stable.

## What every page MUST share

- The token palette (signal red, link blue, highlight yellow; zero other
  chrome hues).
- The Pretendard weight ladder + the metadata register (§2).
- Sharp shape lock, hairline rule language, margin-column grid.
- CTA voice (one contact-intent label: `연구실 참여` / `Join the lab`).
- Nav masthead + footer colophon.

## What pages MAY differ on

- Macrostructure within their family (above).
- The hero visual (home = rotating specimen plate; multiscale = viewer; others = typographic).
- Ledger metadata column content (year vs date vs scale).

## Appendix — scientific layer (declared domain tokens)

Chrome never uses these; they belong to schematics, plots, and the molecular
viewers. Declared here so the compliance gate can verify chrome
against them. Light: `#334155` `#64748b` `#2B2D42` `#6b7280` `#475569`
`#cbd5e1` `#94a3b8`. Dark: `#9ca3af` `#57606b` `#c8d0db` `#3d4450` `#b2bcc8`
`#f8fafc` `#6f7a89`. The WebGL bridge uses `#ededed` in light mode and
`#0a0909` in dark mode; its no-WebGL state derives from the semantic surface
tokens. CPK/element colors inside WebGL scenes are data, not design tokens.

Rendered specimens (`public/renders/`, baked by `tools/build-render-assets.py`)
are photographic content, not tokens — but their **backdrop** is a token and is
load-bearing. Each render is composited over `#F5F5F5` (light) / `#100F0F`
(dark) from the straight-alpha Cycles master, and the poster is frame 0 of the
same loop, which is what lets a plate meet the page with no seam.

The encoder's sample range and the container's colour tag must agree. The loops
are encoded limited-range and left **untagged**, which matches what a browser
assumes by default, so the dark backdrop decodes to (15,15,15) — one level off
the token, invisible. Tagging the stream full-range BT.709 (or an sRGB transfer)
without matching the encode makes the browser apply a transfer conversion the
pixels never went through, crushing the same backdrop to (0,0,0) and drawing a
hard rectangle. Measured in Chrome across element sizes; the shipped pages sample
0–1 level of difference in both modes. Do not add colour metadata to these
encodes. A 2% edge fade on the loop (see §4) covers the residual.

The single video format is a repo-size and simplicity decision, not a quality
one: the loops ship a two-rung ladder: AV1 (`av01.0.12M.10`) at width 2048 over an
H.264 floor (`avc1.640020`), gated at `(min-width: 1024px)`. The rationale is in
scripts/encode-specimen-loops.py.

Schematic accent tokens (`--sch-*` in globals.css): every chromatic accent a
schematic animates (SCF ring, packets, force-field term colors, electron
density) is declared as a light/dark pair. Hue is held across modes; dark
raises lightness one step so animated strokes read on the viewer ground.
Light: `--sch-amber #d97706` `--sch-amber-bright #f59e0b` `--sch-amber-label
#92400e` `--sch-density #1d4ed8` `--sch-stretch #0891b2` `--sch-angle #16a34a`
`--sch-lj #7e22ce` `--sch-coulomb #4f46e5` `--sch-delta-plus #2563eb`
`--sch-delta-minus #c026d3` `--sch-packet #c41e3a` `--sch-peripheral #475569`
`--sch-meso-n #7c8db0` `--sch-meso-o #b07c7c`. Dark: `#f59e0b` `#fbbf24`
`#fbbf24` `#60a5fa` `#22d3ee` `#4ade80` `#c084fc` `#818cf8` `#60a5fa`
`#e879f9` `#fb7185` `#94a3b8` `#9fb0d0` `#cf9d9d`. Mode-stable scientific
literals (CPK-adjacent mid tones, HOMO/LUMO, frame hairlines, MLFF cyan
packets, MLFF glyph atoms/PES mesh) stay inline: `#ef4444` `#dc2626`
`#f1f5f9` `#3b82f6` `#06b6d4` `#f97316` `#9ca3af` `#cbd5e1` `#67e8f9`
`#a5f3fc` `#f43f5e` `#8b5cf6` `#e2e8f0` `#111a3e` `#22c55e` (force-field angle
term in the plot legend) `#07111f` (plot well fill). MLFF force-arrow magnitude interpolants (data, `#3b82f6`→`#ef4444`
per-atom): `#3e80f2` `#3f80f1` `#427fee` `#497ce7` `#4b7ce5` `#5678da`
`#5e75d2` `#6374ce` `#6573cc` `#6d70c4` `#6f6fc1` `#786cb9` `#97629a`
`#9f5f92` `#a05f91` `#a55d8c` `#a75c8a` `#aa5b88` `#ac5a85` `#b7577a`
`#bb5576` `#c15370`.

## Anti-slop enforcement (binding)

Zero em/en-dashes in visible copy (Korean gains 없음: use `,`/`·`/period —
middle dot ≤ 1 per line). No gradient text, no glassmorphism, no side-stripes,
no icon-tile grids, no scroll cues, no decorative dots, no section-number
eyebrows, no version labels, no fake metrics. Copy is preserved from the
existing dictionaries; visible-string changes only where layout demands
shorter labels (flag them).
