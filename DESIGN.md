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
```

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
domain palette in both modes.

Existing Tailwind semantic names (`bg-background`, `text-foreground`,
`text-primary`, `border-border`, `bg-card`, `text-muted-foreground`,
`bg-muted`, `bg-accent`, `text-accent-foreground`, `bg-surface-raised`,
`bg-surface-sunken`) are KEPT and re-pointed at these values, so the multiscale
engine re-skins without engine edits. New utilities: `text-accent-ink`,
`border-border-strong`.

## 2. Typography — one family, committed extremes, mono register

- `--font-sans`: **Pretendard Variable** (kept; carries ko + en). Weight roles:
  - **display** 830, `tracking -0.03em`, `leading 1.08`, `text-wrap: balance`
  - **heading** 650, `tracking -0.015em`, `leading 1.2`
  - **body** 430, `leading 1.7` (Korean needs air); dark mode body 400
  - **strong** 600 (inline emphasis; never italic for Korean, never italic headings)
- `--font-mono`: **Geist Mono** (kept) — the *scientific metadata register*:
  dates, years, DOIs, volume/page, scale ticks (`10⁻¹⁰ m`), counts, index
  numerals. `font-feature-settings: "tnum"`. Sizes 11–13px, `tracking 0.01em`.
  Mono appears only in this role; never as body prose.
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

## 4. Components

- **Nav (masthead)**: hairline bottom rule; wordmark left = `Yu Lab` display-650
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
  a fade** so H.264's residual backdrop drift never draws a rectangle. Reduced
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
  below `sm`, stops when the reader picks a specimen, and carries a visible pause
  control. Everything else: micro (hover lift, underline sweep).
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
  CTAs, then a full-width readout band and an eight-cell specimen tray on the
  bottom edge. The hero rotates through the eight renders and carries a pause
  control; below `lg` the masthead comes first and the tray degrades to ruler
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
- Pretendard weight roles + Geist Mono metadata register.
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
one: at the shipped operating point a matched VP9 encode measures ~7% smaller and
~0.4 dB better, so H.264-only costs a little efficiency to avoid a second ladder.

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
`#a5f3fc` `#f43f5e` `#8b5cf6` `#e2e8f0` `#111a3e`. MLFF force-arrow magnitude interpolants (data, `#3b82f6`→`#ef4444`
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
