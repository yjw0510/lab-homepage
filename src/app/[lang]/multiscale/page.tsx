import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllMultiscaleAreas } from "@/lib/multiscale";
import { getDictionary, hasLocale } from "../dictionaries";
import { MultiscaleExperienceLoader } from "@/components/multiscale/MultiscaleExperienceLoader";
import { MultiscaleOverview } from "@/components/multiscale/MultiscaleOverview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.multiscale.title, description: dict.multiscale.subtitle };
}

export default async function MultiscalePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const areas = getAllMultiscaleAreas();

  return (
    <div className="-mt-16 overflow-hidden">
      {/* Server-rendered so the exported page has its h1 before the client-only instrument
          loads, and keeps it when scripts never run. */}
      <h1 className="sr-only">
        {lang === "ko"
          ? "멀티스케일 분자 시뮬레이션, 전자 계산에서 재료의 집단 거동까지"
          : "Multiscale molecular simulation, from electron calculations to collective material behavior"}
      </h1>
      <MultiscaleExperienceLoader
        lang={lang}
      />
      <MultiscaleOverview areas={areas} lang={lang} />
    </div>
  );
}
