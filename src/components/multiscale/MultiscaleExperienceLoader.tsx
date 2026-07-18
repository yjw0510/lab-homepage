"use client";

import dynamic from "next/dynamic";

const MultiscalePinned = dynamic(
  () =>
    import("./MultiscalePinned").then((m) => m.MultiscalePinned),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[100dvh] bg-background p-6 pt-24"
        aria-busy="true"
        aria-label="Loading multiscale viewer"
      >
        <div className="mx-auto grid h-[calc(100dvh-7.5rem)] max-w-7xl grid-cols-1 gap-px bg-border lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]">
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
    <MultiscalePinned
      lang={lang}
    />
  );
}
