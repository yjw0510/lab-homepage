# DESIGN — Yu Lab (멀티스케일 분자 전산화학 연구실)

A locked design system for this site. Every page redesign reads this file before
emitting code. Extend or amend this file when the system needs to grow; never
improvise a value that is not declared here.

Direction: **"Ledger & Instrument"** — a printed scientific journal for the site
chrome, a precision instrument for the interactive science. Light mode reads as
a typeset research ledger (cool paper, hairline rules, mono metadata). Dark mode
and every WebGL/Molstar viewer read as the lab's instrument: deep blue-black,
lifted panels, the same vermilion signal accent. The two registers share one
hue system so the dark viewers sitting inside light pages look intentional,
not accidental.

- Genre: editorial (hallmark), brand register (impeccable)
- Dials: `DESIGN_VARIANCE: 6` · `MOTION_INTENSITY: 4` · `VISUAL_DENSITY: 5`
- Audience: prospective grad/undergrad students (recruitment), peer researchers,
  funding reviewers. Bilingual ko/en; Korean is the primary voice.
- The one memorable thing: the site reads as a **continuous zoom across length
  scales**. Hairline "scale rulers" with real tick marks and mono scale
  annotations (Å → nm → µm) structure the home page and the footer colophon.

## 1. Color — OKLCH only, one accent

Anchor hues: neutrals lean cool blue (hue 250–268, chroma 0.004–0.015);
accent is **vermilion** (hue 35–45). Zero other chromatic hues in chrome.
(Scientific content — CPK atoms, plots, orbital surfaces — keeps its own
domain palette; chrome never borrows from it.)

Accent discipline: accent occupies ≤ 3% of any viewport. It marks: active nav
item, links, focus rings, the scale-ruler tick origin, small square heading
anchors, PI name highlight in author lists. It never fills buttons or sections.

### Light ("ledger")

```css
:root {
  color-scheme: light;
  --background:        oklch(97.6% 0.004 250);  /* paper */
  --foreground:        oklch(21%   0.015 260);  /* ink */
  --primary:           oklch(58%   0.19  35);   /* vermilion — marks, large type only */
  --accent-ink:        oklch(46%   0.165 35);   /* text-grade vermilion (links) ≥4.5:1 */
  --primary-foreground: oklch(97.6% 0.004 250);
  --card:              oklch(99%   0.002 250);  /* raised surface (rare; prefer rules) */
  --muted:             oklch(93%   0.006 250);  /* recessed fills */
  --muted-foreground:  oklch(43%   0.012 255);  /* secondary text ≥5:1 */
  --border:            oklch(88.5% 0.006 250);  /* hairline rule */
  --border-strong:     oklch(72%   0.01  252);  /* emphasis rule / double rules */
  --accent:            oklch(94%   0.025 45);   /* pale vermilion wash (active bg tint) */
  --accent-foreground: oklch(40%   0.15  35);
  --surface-raised:    oklch(99%   0.002 250);
  --surface-sunken:    oklch(95.2% 0.005 250);
}
```

### Dark ("instrument")

```css
.dark {
  color-scheme: dark;
  --background:        oklch(14%   0.014 268);
  --foreground:        oklch(92.5% 0.008 255);
  --primary:           oklch(68%   0.155 42);
  --accent-ink:        oklch(72%   0.14  45);
  --primary-foreground: oklch(13%  0.014 268);
  --card:              oklch(17.5% 0.014 266);
  --muted:             oklch(21%   0.014 265);
  --muted-foreground:  oklch(71%   0.01  255);
  --border:            oklch(27%   0.012 264);
  --border-strong:     oklch(38%   0.012 262);
  --accent:            oklch(24%   0.04  45);
  --accent-foreground: oklch(78%   0.12  48);
  --surface-raised:    oklch(17.5% 0.014 266);
  --surface-sunken:    oklch(11.5% 0.012 270);
}
```

Rules: no pure #000/#fff anywhere. Dark-mode elevation = lighter surface, never
shadows. Never switch hue between modes. The Molstar viewport keeps `#050510`
(instrument canvas); panels above it use the dark tokens.

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
- Scale (≈1.33 ratio): 12.5 / 14 / 16 (base) / 18 / 21 / 28 / 37 / 49 / 65px;
  display clamp ceiling 5.5rem. Body measure ≤ 34rem ko / 65ch en.
- Hero headline ≤ 2 lines; subtext ≤ 20 words / ≤ 2 lines Korean.

## 3. Spacing, shape, layout

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
  `text-foreground` + 2px vermilion underline (offset 6px); inactive
  `text-muted-foreground`. No pill backgrounds, no backdrop-blur glass. Height
  64px. Mobile: full-width sheet below masthead, hairline-separated rows.
- **Footer (colophon)**: double rule top; one dense band: wordmark + lab full
  name, mono address/email block, inline link row; beneath it the **scale
  ruler**: a full-width hairline with tick marks and mono labels
  `Å · nm · µm` linking DFT → MLFF → all-atom → meso pages; mono copyright line.
- **Buttons**: primary = ink fill (`bg-foreground text-background`), sharp,
  `px-6 py-3`, weight 600, label ≤ 3 words; hover = translateY(-1px) +
  `bg-foreground/90`; active = translateY(0). Secondary = 1px `border-strong`
  hairline, transparent bg; hover = `bg-muted`. Focus (all interactives):
  2px vermilion ring, 2px offset, instant.
- **Links**: `text-accent-ink`, underline 1px, `underline-offset-[3px]`;
  hover → `text-primary`. External links keep ↗ icon (lucide, 14px).
- **Ledger row** (publications, news, funding, topic index): `border-t
  border-border` on each row group; left margin column mono metadata; row
  hover = `bg-muted/50`; no boxes.
- **Section heading**: display-650 28–37px, left-aligned. Every top-level
  section heading carries the 10px vermilion square anchor (the ruler-origin
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

## 5. Motion — quiet, GPU-only, visible-by-default

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`; durations
  `--dur-fast: 180ms`, `--dur-med: 320ms`, `--dur-slow: 600ms`.
- One orchestrated hero entrance on home (type lines stagger 60ms, WebGL scene
  crossfades in). Everything else: micro (hover lift, underline sweep).
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
`0 8px 32px oklch(14% 0.014 268 / 0.24)`.

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

- **Home**: full-viewport marquee hero (WebGL molecular scene right/back,
  left-aligned display type, 2 CTAs, no scroll cue) → scale-index of research
  areas (margin-column + ruler spine) → publications ledger (top 3) → news
  colophon rows. No cards anywhere.
- **Content pages** (publications, news, funding): ledger/index — title block
  with double rule, then hairline rows, mono year/date margin column. Filters
  render as mono text toggles with accent active state, not pills.
- **People / Contact**: document register — CV sections with hairline rules
  (people page largely keeps its structure, restyled); contact recruitment
  block reads as a short letter with a hairline frame.
- **Research topics**: margin-column index rows mapped to the drawer (bento
  grid retired; rainbow accents retired).
- **Multiscale**: instrument register preserved structurally; chrome retinted
  to tokens (dark panels, sharp corners, mono readouts). The dark viewer inside
  light pages is intentional and framed by a hairline + mono caption.

## What every page MUST share

- The token palette (one vermilion accent, zero other chrome hues).
- Pretendard weight roles + Geist Mono metadata register.
- Sharp shape lock, hairline rule language, margin-column grid.
- CTA voice (one contact-intent label: `연구실 참여` / `Join the lab`).
- Nav masthead + footer colophon.

## What pages MAY differ on

- Macrostructure within their family (above).
- The hero visual (home = WebGL scene; multiscale = viewer; others = typographic).
- Ledger metadata column content (year vs date vs scale).

## Appendix — scientific layer (declared domain tokens)

Chrome never uses these; they belong to schematics, plots, and the Molstar
instrument canvas. Declared here so the compliance gate can verify chrome
against them. Light: `#334155` `#64748b` `#2B2D42` `#6b7280` `#475569`
`#cbd5e1` `#94a3b8`. Dark: `#9ca3af` `#57606b` `#c8d0db` `#3d4450` `#b2bcc8`
`#f8fafc` `#6f7a89`. Instrument canvas: `#050510` plus the msp-no-webgl
fallback gradient stops `rgba(17,24,39,.92)` `rgba(5,5,16,.98)`
`rgba(241,245,249,.9)`. CPK/element colors inside WebGL scenes are data,
not design tokens.

## Anti-slop enforcement (binding)

Zero em/en-dashes in visible copy (Korean gains 없음: use `,`/`·`/period —
middle dot ≤ 1 per line). No gradient text, no glassmorphism, no side-stripes,
no icon-tile grids, no scroll cues, no decorative dots, no section-number
eyebrows, no version labels, no fake metrics. Copy is preserved from the
existing dictionaries; visible-string changes only where layout demands
shorter labels (flag them).
