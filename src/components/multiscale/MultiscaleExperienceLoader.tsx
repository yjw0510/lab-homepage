"use client";

import dynamic from "next/dynamic";

const MultiscalePinned = dynamic(
  () =>
    import("./MultiscalePinned").then((m) => m.MultiscalePinned),
  {
    ssr: false,
    loading: () => (
      // Same frame as the instrument that replaces it (pt-16 under the masthead, the 900px
      // split, the rail's clamp), so nothing jumps when the bundle arrives.
      <div
        className="min-h-[100dvh] bg-background pt-16"
        aria-busy="true"
      >
        <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 gap-px bg-border min-[900px]:grid-cols-[minmax(0,1fr)_clamp(340px,32vw,460px)]">
          <div className="bg-surface-sunken" />
          <div className="space-y-4 bg-surface-sunken p-6">
            <div className="h-3 w-24 bg-muted" />
            <div className="h-7 w-3/4 bg-muted" />
            <div className="h-3 w-full bg-muted/70" />
            <div className="h-3 w-5/6 bg-muted/70" />
          </div>
        </div>
      </div>
    ),
  }
);

export function MultiscaleExperienceLoader({
  lang,
}: {
  lang: string;
}) {
  return (
    <div
      role="region"
      aria-label={
        lang === "ko"
          ? "멀티스케일 계산 방법 살펴보기"
          : "Explore multiscale modeling methods"
      }
    >
      <MultiscalePinned lang={lang} />
    </div>
  );
}
