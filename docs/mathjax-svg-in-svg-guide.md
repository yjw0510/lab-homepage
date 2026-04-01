# KaTeX vs. SVG: Complete Technical Audit & MathJax Migration Guide

---

## Table of Contents

1. [The Core Conflict, Precisely Stated](#1-the-core-conflict-precisely-stated)
2. [The Five Root Causes](#2-the-five-root-causes)
   - 2.1 KaTeX Has No SVG Output Mode
   - 2.2 CSS Cascade Into `<foreignObject>` — What Is True and What Is Overstated
   - 2.3 The `@font-face` Async Load / SSR Race Condition
   - 2.4 SVG Coordinate System vs. CSS Pixel System
   - 2.5 `<foreignObject>` Is Excluded From SVG Serialization
3. [What the Previous Explanation Got Right](#3-what-the-previous-explanation-got-right)
4. [What the Previous Explanation Overstated](#4-what-the-previous-explanation-overstated)
5. [The Decision Rule](#5-the-decision-rule)
6. [Solution A — Native SVG `<text>` (Simple Formulas)](#6-solution-a--native-svg-text-simple-formulas)
7. [Solution B — KaTeX in `<foreignObject>` (Valid Workaround with Caveats)](#7-solution-b--katex-in-foreignobject-valid-workaround-with-caveats)
8. [Solution C — MathJax SVG Output (Correct Native Solution)](#8-solution-c--mathjax-svg-output-correct-native-solution)
   - 8.1 Why MathJax SVG Works Where KaTeX Fails
   - 8.2 What the MathJax SVG Output Actually Looks Like
   - 8.3 Installation and Next.js Configuration
   - 8.4 Server-Side Generator (`lib/mathSvg.server.ts`)
   - 8.5 Client Component (`components/MathInSvg.tsx`)
   - 8.6 Integration: Pages Router (`getStaticProps`)
   - 8.7 Integration: App Router (Server Component)
9. [Color in MathJax SVG](#9-color-in-mathjax-svg)
   - 9.1 Color Subexpressions with TeX Commands
   - 9.2 Color the Entire Formula via Container
   - 9.3 Named and Custom Colors
   - 9.4 Color Inside Embedded SVG Diagrams
10. [Summary Comparison Table](#10-summary-comparison-table)
11. [Final Recommendation](#11-final-recommendation)

---

## 1. The Core Conflict, Precisely Stated

**KaTeX is an HTML/CSS math layout engine, not an SVG math generator.**

KaTeX's documented output modes are `html`, `mathml`, and `htmlAndMathml`. It does not provide native SVG output. KaTeX maintainers explicitly state that math inside SVG `<text>` will not work, and that wrapping KaTeX inside SVG `<foreignObject>` is only a possible workaround, not the primary supported rendering model.

The conflicting point is not "KaTeX is broken in SVG in every sense." It is narrower and more exact:

> **KaTeX is compatible with HTML. SVG `<foreignObject>` can host HTML. But your requirement is not merely "display math somehow inside an SVG viewport" — your requirement is "have math behave as true SVG diagram content." KaTeX does not produce that output model.**

The strongest technical statement is:

> **KaTeX is unsuitable here not because `<foreignObject>` categorically breaks CSS, but because KaTeX's renderer is HTML/CSS-based while the target artifact is native, scalable, export-stable SVG.**

---

## 2. The Five Root Causes

### 2.1 KaTeX Has No SVG Output Mode (Architectural, Not Fixable)

This is the deepest issue. KaTeX outputs exactly one thing: an HTML+CSS tree of nested `<span>` elements. GitHub issue #375 — "SVG output, as offered by MathJax, would be great to have" — has been open since October 2015 and has never been resolved. It is not a bug. It is an architectural trade-off: HTML+CSS is synchronous and browser-native, while SVG path generation requires a full font metric table and glyph outline compiler. KaTeX never built that.

```typescript
// What katex.renderToString() ALWAYS returns — no escape hatch:
katex.renderToString('\\frac{\\sigma}{r}', { throwOnError: false });
// → '<span class="katex"><span class="katex-html" aria-hidden="true">
//      <span class="base"><span class="mord">...</span></span>
//    </span></span>'
//
// It is ALWAYS a <span>. There is no { output: 'svg' } option.
// Contrast with MathJax: tex2svg(), tex2chtml(), tex2mml() — three separate renderers.
```

Every other problem below is a downstream consequence of this: you are forced to use `<foreignObject>` because KaTeX gives you HTML, and `<foreignObject>` is where all the other failures live.

---

### 2.2 CSS Cascade Into `<foreignObject>` — What Is True and What Is Overstated

**Important correction from the reference document:** The statement "KaTeX CSS doesn't cascade into `<foreignObject>`" is **not the general rule**. HTML inside `<foreignObject>` is valid and CSS can style it — `<foreignObject>` is specifically designed to embed XHTML/HTML inside SVG, and MDN documents this as a standard use case.

If you saw raw TeX-like text (e.g., `rho(mathbfr)`), that is more consistent with one of these specific failure modes:

- Invalid input or wrong escaping of the LaTeX string
- Missing KaTeX CSS or fonts at render time (KaTeX's docs flag missing stylesheet as a known failure mode)
- Not actually inserting KaTeX's rendered HTML as intended

However, even when CSS does cascade correctly into `<foreignObject>`, there are three remaining browser-level failure modes:

**2.2a — Print / offscreen contexts:** SVG is often used for canvas export, PDF generation, or `<img src="data:image/svg+xml,...">`. In all these contexts, `<foreignObject>` is silently ignored or its CSS is stripped entirely.

**2.2b — Browser inconsistency with `@font-face`:** Some WebKit builds and mobile browsers have had bugs where `@font-face` rules declared outside `<foreignObject>` do not propagate in. KaTeX relies on 8+ separate `@font-face` families.

**2.2c — CSS Modules scope in Next.js:** Next.js processes `import 'katex/dist/katex.min.css'` as global CSS. The webpack CSS chunk order during production builds is not guaranteed to match the dev build, which can silently break specificity chains.

```tsx
// This import in a .tsx file processed by Next.js:
import 'katex/dist/katex.min.css';

// @font-face rules inside reference relative paths like:
//   url('fonts/KaTeX_Main-Regular.woff2')
// These resolve relative to the CSS file's location in /_next/static/css/.
// If the chunk hash changes, the font URL changes, and cached fonts become stale.
```

---

### 2.3 The `@font-face` Async Load / SSR Race Condition

This is the specific reason for the `rho(mathbfr)` symptom — raw LaTeX command names appearing as literal text. Here is the exact event chain:

```
Timeline:
  T=0ms   Next.js SSR runs on the server. Server has no browser, no fonts.
           katex.renderToString() generates HTML with CSS class names.
           The HTML contains: class="katex mord msupsub vlist-t..."

  T=0ms   Server sends pre-rendered HTML to the browser.
           CSS classes ARE in the DOM. Structurally complete.

  T=Xms   Browser downloads katex.min.css.

  T=Yms   Browser sees 8 @font-face declarations:
           @font-face { font-family: KaTeX_Main; src: url('KaTeX_Main-Regular.woff2'); }
           @font-face { font-family: KaTeX_Math; src: url('KaTeX_Math-Italic.woff2'); }
           ... (8 total families, ~30 total variants)
           Fonts are queued for download. Browser uses fallback fonts for layout.

  T=Zms   React hydrates. DOM matches SSR output.
           React does NOT re-render when fonts finish loading.
           React has no knowledge of font load events.

  T=Wms   .woff2 files arrive. Browser swaps fonts. BUT:
           Layout was already committed using fallback font metrics.
           KaTeX's fraction bars, subscript drops, and superscript heights
           are CSS pixel offsets computed from KaTeX_Main metrics.
           With a fallback font (e.g., Times New Roman), x-height ≠ KaTeX_Main x-height.
           Result: fraction bar at wrong vertical position, subscripts drift.
```

---

### 2.4 SVG Coordinate System vs. CSS Pixel System

The more accurate way to describe this failure (correcting the original explanation) is: **KaTeX lays out HTML/CSS boxes, while SVG `viewBox` transforms SVG user space. These are two separate layout systems.** SVG `viewBox` applies a coordinate-space transform to SVG content; once you place HTML inside `<foreignObject>`, you are mixing the two systems, and they do not share the same metric basis.

```tsx
// Your schematic setup:
const K = 1.2;
const u = (n: number) => +(n * K).toFixed(1);

<svg viewBox="0 0 700 420" style={{ width: '528px' }}>
  {/* Scale factor: 528/700 = 0.754 */}

  <foreignObject x={u(20)} y={u(100)} width={u(200)} height={u(60)}>
    <div xmlns="http://www.w3.org/1999/xhtml">
      <span style={{ fontSize: u(14 * 1.4) }}>  {/* fontSize = 23.5 SVG units */}
        {/* KaTeX-rendered math */}
      </span>
    </div>
  </foreignObject>
</svg>
```

`fontSize: 23.5` inside `<foreignObject>` is in SVG user-unit coordinates. After the viewBox scaling factor of 0.754, this renders at `23.5 × 0.754 ≈ 17.7 CSS pixels` on screen. KaTeX's internal metric engine computes all sub/superscript positions and delimiter scaling from the **nominal** font size as if it were a direct CSS pixel count — not the post-scale rendered size.

```
KaTeX computes subscript drop for fontSize=23.5:
  subscript_drop = 0.3 * x_height(KaTeX_Main, 23.5px) ≈ 7.1 SVG units

What appears on screen:
  7.1 SVG units × 0.754 scale factor = 5.4 CSS pixels on screen

What KaTeX expected:
  7.1 CSS pixels (no scaling applied)

Drift: 1.7px per subscript/superscript — visible at schematic scale
```

This is not the primary reason to avoid KaTeX in SVG (the output model mismatch is), but it is a real secondary failure mode when the SVG uses a scaled viewBox.

---

### 2.5 `<foreignObject>` Is Excluded From SVG Serialization

```typescript
const svgEl = document.querySelector('svg');
const svgString = new XMLSerializer().serializeToString(svgEl);
// <foreignObject>...</foreignObject> is present in the string,
// but its HTML content (the KaTeX spans) is serialized as XML,
// losing all CSS cascade — producing invalid output.

// Attempting to use the SVG as an <img> src:
const blob = new Blob([svgString], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);
// KaTeX math renders as: nothing.
// <foreignObject> in SVG-as-image is silently dropped by browsers for security reasons.
```

This makes the schematic unprintable, un-exportable, and un-shareable as a standalone image. KaTeX formulas simply vanish.

---

## 3. What the Previous Explanation Got Right

The practical failure mode is correctly identified: the problem centers on KaTeX's HTML span tree, CSS/font dependency, and the fact that the schematic is SVG-based rather than HTML-based. The directional conclusion — that using KaTeX for equations inside an SVG diagram creates a model mismatch — is correct. The symptom of `4epsilonleft[left(fracsigmarright)^12` appearing as literal text is also a genuine observable failure.

---

## 4. What the Previous Explanation Overstated

**First:** "KaTeX CSS doesn't cascade into `<foreignObject>`" is not a general rule. CSS can style HTML inside `<foreignObject>`. The correct statement is that KaTeX's output model is HTML/CSS, while the target is native SVG — that mismatch is the fundamental issue.

**Second:** Framing the viewBox coordinate mismatch as the core problem is too narrow. The stronger and cleaner technical statement is that KaTeX produces HTML layout boxes while SVG `viewBox` operates on SVG user space — mixing these two layout systems is the real source of trouble, not a specific pixel arithmetic error.

---

## 5. The Decision Rule

| Requirement | Correct tool |
|---|---|
| Simple formulas in an SVG schematic | Native SVG `<text>` / `<tspan>` |
| Full TeX-quality math as actual SVG graphics | MathJax SVG output |
| Browser-only HTML overlay inside SVG, accepting HTML/CSS dependencies | KaTeX in `<foreignObject>` (workaround, not the native-SVG solution) |

---

## 6. Solution A — Native SVG `<text>` (Simple Formulas)

This is the right approach when formulas are short and schematic-style. Unicode superscripts and `baselineShift` are sufficient for `K_r(r-r₀)²`, `4ε[(σ/r)¹²-(σ/r)⁶]`, and similar expressions.

**Why it works:** `<text>` and `<tspan>` are native SVG elements. `fontSize`, `baselineShift`, and `fill` are SVG presentation attributes that scale with the viewBox transform automatically. Unicode superscripts (², ⁶, ¹²) and subscripts are single glyphs in any font — no layout engine is needed.

**Trade-off:** No true TeX-quality fraction bars or large delimiters. For simple force-field labels this is sufficient and fully reliable.

---

## 7. Solution B — KaTeX in `<foreignObject>` (Valid Workaround with Caveats)

This is not wrong — it is simply **not native SVG math**. It still depends on KaTeX CSS and fonts being present, exactly as KaTeX documents. It will fail on SVG export, in `<img>` contexts, and on some mobile browsers.

**Remaining limitations even when it renders correctly:**
- CSS must be globally loaded and fonts must resolve
- Breaks on SVG serialization and `<img>` usage
- Sub/superscripts drift under `viewBox` scaling
- Not usable in SSG/SSR without hydration

---

## 8. Solution C — MathJax SVG Output (Correct Native Solution)

### 8.1 Why MathJax SVG Works Where KaTeX Fails

MathJax's SVG output processor uses SVG data instead of font files. It is not affected by user-based web-font blocking, or character-placement issues that occur with HTML-based output. It is relatively self-contained — not relying on CSS — so it can be saved and used as an independent image.

Concretely: every glyph is rendered as an `<path d="...">` element containing the glyph outline. No font file, no `@font-face`, no CSS class. The SVG scales perfectly with any `viewBox` transform because paths are vectors. This is the correct tool for embedding math inside an SVG schematic.

### 8.2 What the MathJax SVG Output Actually Looks Like

```html
<!-- KaTeX output (HTML+CSS — cannot live in SVG natively) -->
<span class="katex">
  <span class="katex-html" aria-hidden="true">
    <span class="base">
      <span class="mord">
        <span class="mfrac">
          <span class="vlist-t vlist-t2">
            <!-- σ numerator — positioned by KaTeX font metrics (CSS px) -->
            <!-- r denominator — positioned by KaTeX font metrics (CSS px) -->
            <!-- Requires KaTeX_Math-Italic.woff2 to be loaded -->
          </span>
        </span>
      </span>
    </span>
  </span>
</span>
<!-- Breaks in: SVG foreignObject export, SSR, scaled viewBox, <img> tag -->

<!-- ─────────────────────────────────────────────────────────────── -->

<!-- MathJax SVG output (pure SVG paths — works natively inside any SVG) -->
<svg xmlns="http://www.w3.org/2000/svg"
     width="1.737ex" height="3.009ex"
     viewBox="0 -1006 768 1330"
     role="img" focusable="false">
  <defs>
    <!-- Glyph outlines compiled from MathJax's internal TeX fonts -->
    <!-- No external font file dependency -->
    <path id="MJX-TEX-IT-3C3" d="M184 -11Q116 -11 74 34T31 147Q31 247 104 333T275 ..."/>
    <path id="MJX-TEX-IT-72" d="M21 287Q22 290 23 295T28 317T38 348T53 381T73 411T98 ..."/>
  </defs>
  <!-- Fraction bar as a <rect> — no font needed -->
  <rect x="85" y="-85" width="598" height="60"/>
  <!-- σ numerator — positioned by MathJax's TeX metric tables, not CSS -->
  <g transform="translate(85,477)">
    <use xlink:href="#MJX-TEX-IT-3C3"/>
  </g>
  <!-- r denominator -->
  <g transform="translate(202,-399)">
    <use xlink:href="#MJX-TEX-IT-72"/>
  </g>
</svg>
<!-- Requires: nothing. No CSS. No font files. No @font-face. -->
<!-- Works in: any SVG context, SVG-as-image, SSR, any viewBox scale, export -->
```

### 8.3 Installation and Next.js Configuration

```bash
npm install mathjax-full
```

`mathjax-full` (not `mathjax`) gives direct access to the source modules needed for server-side use. It has been confirmed to work without errors on Vercel deployments with the `liteAdaptor` pattern.

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // mathjax-full is server-only; never bundle it for the client
      config.resolve.alias['mathjax-full'] = false;
    }
    return config;
  },
};
module.exports = nextConfig;
```

### 8.4 Server-Side Generator (`lib/mathSvg.server.ts`)

```typescript
// lib/mathSvg.server.ts
// ⚠️  SERVER-SIDE ONLY. Never import this in client components.

import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

// ─── Singleton initialization ─────────────────────────────────────────
let _adaptor: ReturnType<typeof liteAdaptor> | null = null;
let _mathDoc: ReturnType<typeof mathjax.document> | null = null;

function getMathJax() {
  if (_adaptor && _mathDoc) return { adaptor: _adaptor, mathDoc: _mathDoc };

  _adaptor = liteAdaptor();
  RegisterHTMLHandler(_adaptor);

  _mathDoc = mathjax.document('', {
    InputJax: new TeX({
      packages: AllPackages,
      formatError: (_jax: unknown, error: Error) => { throw error; },
    }),
    OutputJax: new SVG({
      fontCache: 'none',
    }),
  });

  return { adaptor: _adaptor, mathDoc: _mathDoc };
}

// ─── Types ────────────────────────────────────────────────────────────

export interface MathSvgResult {
  svgString: string;
  widthEx: number;
  heightEx: number;
  viewBox: string;
}

// ─── Core conversion ──────────────────────────────────────────────────

export function tex2svgData(latex: string, display = false): MathSvgResult {
  const { adaptor, mathDoc } = getMathJax();

  const containerNode = mathDoc.convert(latex, { display });
  const svgNode = adaptor.firstChild(containerNode);

  const svgString = adaptor.serializeXML(svgNode);

  const widthAttr = adaptor.getAttribute(svgNode, 'width') as string;
  const heightAttr = adaptor.getAttribute(svgNode, 'height') as string;
  const viewBox = (adaptor.getAttribute(svgNode, 'viewBox') as string) ?? '0 0 0 0';

  const widthEx = parseFloat(widthAttr ?? '0');
  const heightEx = parseFloat(heightAttr ?? '0');

  return { svgString, widthEx, heightEx, viewBox };
}

export function batchTex2svg(
  formulas: Array<{ key: string; latex: string; display?: boolean }>
): Record<string, MathSvgResult> {
  return Object.fromEntries(
    formulas.map(({ key, latex, display }) => [key, tex2svgData(latex, display)])
  );
}
```

### 8.5 Client Component (`components/MathInSvg.tsx`)

```tsx
// components/MathInSvg.tsx
import React, { useMemo } from 'react';
import type { MathSvgResult } from '@/lib/mathSvg.server';

interface MathInSvgProps {
  math: MathSvgResult;
  x: number;
  y: number;
  heightSvgUnits: number;
  color?: string;
  anchor?: 'left' | 'center' | 'right';
}

export function MathInSvg({
  math, x, y, heightSvgUnits, color = 'currentColor', anchor = 'left',
}: MathInSvgProps) {
  const aspectRatio = math.widthEx / math.heightEx;
  const widthSvgUnits = heightSvgUnits * aspectRatio;

  const adjustedX = useMemo(() => {
    if (anchor === 'center') return x - widthSvgUnits / 2;
    if (anchor === 'right') return x - widthSvgUnits;
    return x;
  }, [x, widthSvgUnits, anchor]);

  const innerSvgContent = useMemo(() => {
    return math.svgString
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
  }, [math.svgString]);

  return (
    <svg
      x={adjustedX}
      y={y}
      width={widthSvgUnits}
      height={heightSvgUnits}
      viewBox={math.viewBox}
      overflow="visible"
      color={color}
    >
      <g dangerouslySetInnerHTML={{ __html: innerSvgContent }} />
    </svg>
  );
}
```

### 8.6 Integration: Pages Router (`getStaticProps`)

Pre-compute all formulas at build time in `getStaticProps`, pass as serializable props to the page component.

### 8.7 Integration: App Router (Server Component)

Server components can call `tex2svgData()` directly and pass results as props to client components.

---

## 9. Color in MathJax SVG

**Color is not a blocker with MathJax.** MathJax's color TeX extension provides `\color`, `\textcolor`, `\colorbox`, `\fcolorbox`, and `\definecolor`, and all work correctly with MathJax's SVG output processor.

### 9.1 Color Subexpressions with TeX Commands

`\textcolor{#hex}{...}` colors specific subexpressions. The color is baked into the SVG path `fill` attributes.

### 9.2 Color the Entire Formula via Container

MathJax's SVG output paths use `fill="currentColor"`, so the container's CSS `color` value propagates correctly.

### 9.3 Named and Custom Colors

MathJax supports `\definecolor` with RGB, `rgb`, and grayscale color spaces.

### 9.4 Color Inside Embedded SVG Diagrams

When using nested `<svg>` embedding:
- The `color` prop on the nested `<svg>` propagates via `currentColor` into all MathJax-generated paths.
- `\textcolor{...}{...}` in the TeX source applies color before SVG generation — subexpression colors are baked into path fills.

---

## 10. Summary Comparison Table

| Criterion | KaTeX + `<foreignObject>` | Native SVG `<text>` | MathJax SVG |
|---|---|---|---|
| Output format | HTML+CSS `<span>` tree | SVG primitives | SVG `<path>` elements |
| Font dependency | 8+ WOFF2 files required | System fonts | None (paths encode glyphs) |
| CSS dependency | Full KaTeX stylesheet | None | None |
| Works in scaled `viewBox` | ❌ Metric mismatch | ✅ Native | ✅ Paths scale with viewBox |
| Works in SVG-as-`<img>` | ❌ `foreignObject` dropped | ✅ | ✅ |
| SSR safe | ❌ Font load race condition | ✅ | ✅ Computed at build time |
| Serializable / exportable | ❌ Content lost | ✅ | ✅ Self-contained |
| TeX-quality fractions | ✅ (when it works) | ❌ | ✅ |
| Large delimiters / integrals | ✅ (when it works) | ❌ | ✅ |
| Color support | ✅ (CSS) | ✅ (SVG fill) | ✅ (`\textcolor`, `currentColor`) |
| Client bundle cost | ~270KB (KaTeX) | Zero | Zero (server-only) |

---

## 11. Final Recommendation

**Use MathJax with SVG output.**

For schematic diagrams in a Next.js / React application, MathJax's `tex2svg` pipeline with the `liteAdaptor` server pattern is the only solution that satisfies all five hard requirements simultaneously:

1. **TeX-quality layout** — correct fraction bars, large delimiters, sub/superscript positioning
2. **Native SVG output** — embeds as actual SVG geometry, not HTML embedded in SVG
3. **Zero client-side cost** — computed server-side; `mathjax-full` never enters the client bundle
4. **Full color support** — `\textcolor{#hex}{...}` colors subexpressions; `color` CSS colors the whole formula; both work correctly in SVG output
5. **Export and serialization stability** — the result is a self-contained SVG that works in `<img>`, canvas, PDF, and any serialization context

KaTeX is the right tool for math inside HTML documents. Native SVG `<text>` is the right tool for simple schematic labels. For anything in between — TeX-quality math that must live as true SVG diagram content — MathJax SVG output is the correct and complete solution.
