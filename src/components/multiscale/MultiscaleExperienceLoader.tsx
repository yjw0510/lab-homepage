"use client";

import dynamic from "next/dynamic";
import type { MultiscaleArea } from "@/types/multiscale";
import type { Publication } from "@/types/publication";

const MultiscalePinned = dynamic(
  () =>
    import("./MultiscalePinned").then((m) => m.MultiscalePinned),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-gray-950" />,
  }
);

export function MultiscaleExperienceLoader({
  areas,
  publications,
  lang,
}: {
  areas: MultiscaleArea[];
  publications: Record<string, Publication[]>;
  lang: string;
}) {
  return (
    <MultiscalePinned
      areas={areas}
      publications={publications}
      lang={lang}
    />
  );
}
