import Link from "next/link";
import type { MultiscaleArea } from "@/types/multiscale";

/* Method-aware ruler: MLFF and classical all-atom share atomistic resolution. */
const rulerMarks = [
  { slug: "dft", scale: "Å–nm", ko: "전자 명시 · DFT", en: "electrons explicit · DFT" },
  { slug: "atomistic", scale: "nm", ko: "원자 해상도 분기 · MLFF / 고전 역장", en: "atomistic fork · MLFF / classical FF" },
  { slug: "meso", scale: "10 nm–μm", ko: "집단 변수 · 메조", en: "collective variables · meso" },
];

/* Level identity text colors (mode-aware tokens in globals.css). Full literal
   class strings so Tailwind can compile them; the atomistic fork carries the
   MLFF mark. */
const rulerMarkText: Record<string, string> = {
  dft: "text-lv-dft",
  atomistic: "text-lv-mlff",
  meso: "text-lv-meso",
};

export function MultiscaleOverview({
  areas,
  lang,
}: {
  areas: MultiscaleArea[];
  lang: string;
}) {
  if (areas.length === 0) return null;

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        {/* Masthead */}
        <header className="max-w-3xl">
          <h2 className="type-display text-4xl text-foreground sm:text-5xl">
            {lang === "ko" ? "방법을 더 살펴보기" : "Study the methods in depth"}
          </h2>
          <p className="mt-5 break-keep leading-relaxed text-muted-foreground">
            {lang === "ko"
              ? "인터랙티브 여정에서 본 흐름을 각 방법의 연구 맥락, 적용 범위, 그리고 다음 해상도로 이어지는 연결까지 확장해 읽어 보세요."
              : "Extend the interactive journey with each method's research context, scope of use, and connection to the next resolution."}
          </p>
        </header>

        {/* Scale ruler — signature system (DESIGN.md §7c) */}
        <div className="mt-12">
          <div className="scale-ruler" aria-hidden="true" />
          <div className="mt-2 grid grid-cols-1 gap-y-1 sm:grid-cols-3 sm:gap-x-6">
            {rulerMarks.map((mark, i) => (
              <span
                key={mark.slug}
                className={`type-mono-meta whitespace-nowrap text-xs ${rulerMarkText[mark.slug] ?? "text-muted-foreground"} ${
                  i === 1 ? "sm:justify-self-center" : i === 2 ? "sm:justify-self-end" : ""
                }`}
              >
                {mark.scale} {lang === "ko" ? mark.ko : mark.en}
              </span>
            ))}
          </div>
        </div>

        {/* Area index — margin-column ledger rows */}
        <div className="mt-16 border-b border-border">
          {areas.map((area) => (
            <Link
              key={area.slug}
              href={`/${lang}/multiscale/${area.slug}`}
              className="group grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border py-7 transition-colors hover:bg-muted/50 md:grid-cols-12"
            >
              <div className="type-mono-meta pt-1 text-[12px] text-muted-foreground md:col-span-3">
                {area.scale}
              </div>
              <div className="md:col-span-9">
                <h2 className="type-heading text-xl text-foreground sm:text-2xl">
                  {lang === "ko" && area.titleKo ? area.titleKo : area.title}
                </h2>
                <p className="mt-2 max-w-[42rem] break-keep text-sm leading-relaxed text-muted-foreground">
                  {lang === "ko" && area.shortDescriptionKo
                    ? area.shortDescriptionKo
                    : area.shortDescription}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
