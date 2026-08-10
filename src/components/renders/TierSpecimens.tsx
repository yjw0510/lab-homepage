"use client";

import { SpecimenPlate } from "@/components/renders/SpecimenPlate";
import {
  specimensByTier,
  TIER_LABEL,
  TIER_SCALE,
  type SpecimenTier,
} from "@/lib/renderSpecimens";

/** Full literal class strings: Tailwind cannot compile names built at runtime. */
const TIER_INK: Record<SpecimenTier, string> = {
  dft: "text-lv-dft",
  mlff: "text-lv-mlff-text",
  allatom: "text-lv-aa",
  meso: "text-lv-meso",
};

/**
 * The two systems this tier was actually run on, as plate plus printed label.
 *
 * Playback is left to each plate's own visibility: a pointer-driven "active plate" made the
 * second specimen unreachable for keyboard and touch readers, and on a phone it played the
 * loop on whichever plate had scrolled off screen. Each plate carries its own transport, so
 * stopping one to read its figcaption leaves the other running.
 */
export function TierSpecimens({
  tier,
  lang,
}: {
  tier: SpecimenTier;
  lang: string;
}) {
  const specimens = specimensByTier(tier);
  const ko = lang === "ko";
  if (specimens.length === 0) return null;

  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
      {specimens.map((specimen, i) => (
        <figure key={specimen.slug}>
          <SpecimenPlate
            specimen={specimen}
            play
            priority={i === 0}
            controls={{
              play: ko ? "애니메이션 재생" : "Play animation",
              pause: ko ? "애니메이션 멈춤" : "Pause animation",
            }}
            className="aspect-square w-full"
          />
          {/* Printed plate label (DESIGN.md §4): tier name in the level's ink, then the
              system name, then method and size under hairlines. */}
          <figcaption className="mt-4 border-t border-border-strong pt-3">
            <p className={`type-mono-meta text-[12px] ${TIER_INK[tier]}`}>
              {ko ? TIER_LABEL[tier].ko : TIER_LABEL[tier].en}
              <span className="text-muted-foreground">
                {" · "}
                {TIER_SCALE[tier]}
              </span>
            </p>
            <h3 className="type-heading mt-2 break-keep text-[17px] text-foreground">
              {ko ? specimen.name.ko : specimen.name.en}
            </h3>
            <p className="type-mono-meta mt-2.5 break-keep border-t border-border pt-2 text-[12px] leading-relaxed text-muted-foreground">
              {ko ? specimen.method.ko : specimen.method.en}
            </p>
            <p className="type-mono-meta mt-2 break-keep border-t border-border pt-2 text-[12px] leading-relaxed text-muted-foreground">
              {ko ? specimen.size.ko : specimen.size.en}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
