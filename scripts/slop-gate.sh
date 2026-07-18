#!/bin/bash
# Mechanical anti-slop gate (DESIGN.md "Anti-slop enforcement").
# Greps the redesigned chrome surfaces for banned signatures. Exit 1 on hits.
cd "$(dirname "$0")/.." || exit 1

CHROME="src/components/layout src/components/ui src/components/home src/components/publications src/components/news src/components/people src/components/contact src/components/funding src/components/topics src/app/[lang]/page.tsx src/app/[lang]/publications src/app/[lang]/news src/app/[lang]/people src/app/[lang]/contact src/app/[lang]/funding src/app/[lang]/research-topics"
MSCHROME="src/components/multiscale/MultiscaleOverview.tsx src/components/multiscale/ConceptText.tsx src/components/multiscale/RightRail.tsx src/components/multiscale/MobileStatusRow.tsx src/components/multiscale/MobileViewerToolbar.tsx"

fail=0
check() {
  local name="$1"; shift
  local hits
  hits=$(grep -rn "$@" 2>/dev/null)
  if [ -n "$hits" ]; then
    echo "FAIL: $name"
    echo "$hits" | head -12
    echo "---"
    fail=1
  else
    echo "pass: $name"
  fi
}

# Comment lines (// , /* , {/* ) are code, not visible copy; skip them.
# shellcheck disable=SC2086
check "em/en-dash in visible strings (tsx)" -P '^(?!\s*(//|/?\*|\{/\*)).*[—–]' $CHROME $MSCHROME --include='*.tsx'
check "em/en-dash in dict strings" -E '[—–]' messages/ data/topics.ts
# shellcheck disable=SC2086
check "rounded corners in chrome" -E 'rounded-(sm|md|lg|xl|2xl|3xl|full)' $CHROME $MSCHROME --include='*.tsx'
# shellcheck disable=SC2086
check "backdrop blur / glass" -E 'backdrop-blur' $CHROME $MSCHROME --include='*.tsx'
# shellcheck disable=SC2086
check "gradient text" -E 'bg-clip-text' $CHROME $MSCHROME --include='*.tsx'
# shellcheck disable=SC2086
check "side-stripe accents" -E 'border-l-(2|4|8) |border-l-(2|4|8)"' $CHROME $MSCHROME --include='*.tsx'
# shellcheck disable=SC2086
check "scroll cue / bounce" -E 'animate-bounce' $CHROME $MSCHROME --include='*.tsx'
# shellcheck disable=SC2086
check "rainbow tag/category color usage" -E 'getTagColor|getCategoryColor' $CHROME --include='*.tsx'
# shellcheck disable=SC2086
check "raw tailwind palette colors in chrome" -E '(text|bg|border)-(red|blue|green|amber|purple|violet|cyan|teal|emerald|sky|fuchsia|orange|yellow|pink|rose|indigo|lime|slate|gray|zinc|stone|neutral)-[0-9]' $CHROME $MSCHROME --include='*.tsx'
# shellcheck disable=SC2086
check "uppercase-tracked eyebrows (budget: audit manually if >0)" -E 'uppercase[^"]*tracking-|tracking-\[[^]]*\][^"]*uppercase' $CHROME --include='*.tsx'

echo
if [ $fail -eq 0 ]; then echo "SLOP GATE: ALL PASS"; else echo "SLOP GATE: FAILURES ABOVE"; fi
exit $fail
