# Yu Lab homepage

Bilingual website for the Multiscale Molecular Computational Chemistry Lab at Ajou University. The site includes lab information, publications, research topics, and an interactive multiscale molecular-modeling feature.

## Technical overview

- Next.js 16 App Router with React 19 and strict TypeScript
- Korean and English routes under `src/app/[lang]`
- Tailwind CSS 4 plus shared theme tokens in `src/app/globals.css`
- MDX content for publications, news, and multiscale research pages
- Static export configured in `next.config.ts`; production output is written to `out/`
- Three.js, React Three Fiber, Mol*, and D3 for scientific visualizations

Set `NEXT_PUBLIC_BASE_PATH` when the static export is hosted below a domain subpath. The application normalizes that value through `src/lib/basePath.ts`.

## Local development

Install the locked dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/ko` or `http://localhost:3000/en`.

## Repository structure

- `src/app/` — layouts, localized routes, metadata, and global styles
- `src/components/` — shared UI and feature components
- `src/providers/` — application-wide React providers
- `src/lib/` and `src/hooks/` — shared libraries and hooks
- `content/` — MDX publications, news, and multiscale articles
- `data/` — typed site, people, funding, navigation, and topic data
- `public/data/` — scientific datasets consumed by visualizations
- `public/images/` — static image assets
- `scripts/` — data generation, capture, and validation tools
- `docs/multiscale-scene-checklist.yaml` — the eight-scene capture checklist

Generated screenshots, traces, reports, and videos are written below `artifacts/` and are intentionally ignored by Git.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create the static export and optimize exported images. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the Vitest suite once. |
| `npm run parse-jcr -- <xlsx>` | Convert a JCR workbook to the impact-factor dataset. |
| `npm run generate:math-svg` | Regenerate the multiscale mathematical SVG data module. |
| `npm run capture:multiscale-scenes` | Capture scenes from the YAML checklist. |
| `npm run capture:multiscale-eight` | Audit all eight live scenes in Korean and English. |
| `npm run verify:mlff-visuals` | Run the focused two-scene MLFF visual audit. |
| `npm run validate:multiscale-scenes` | Validate checklist captures and scientific data. |

## Multiscale capture and validation

Run the site in one terminal, then capture from another:

```bash
npm run dev
npm run capture:multiscale-scenes
npm run validate:multiscale-scenes
```

`capture:multiscale-scenes` reads `docs/multiscale-scene-checklist.yaml`. Use `RESEARCH_BASE_URL`, `RESEARCH_LEVEL`, or `RESEARCH_SCENE` to target a different running server or a checklist subset.

The bilingual audit accepts command-line options:

```bash
npm run capture:multiscale-eight -- --base-url=http://localhost:3000 --langs=ko,en --run-id=local
```

The Python validator requires NumPy, PyYAML, Pillow, and scikit-image in the active `python3` environment.
